import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? fallback : args[index + 1];
};
const baseUrl = option("base-url", "http://127.0.0.1:3000").replace(/\/$/, "");
const email = option("email", process.env.AGENCIA3D_BENCH_EMAIL);
const password = process.env.AGENCIA3D_BENCH_PASSWORD;
const runs = Math.max(1, Math.min(10, Number(option("runs", "3")) || 3));
const output = option("output", "");
const channel = option("channel", process.platform === "win32" ? "chrome" : "");
const routes = ["/dashboard", "/pedidos", "/clientes", "/materiais"];

if (!email || !password) {
  throw new Error("Defina AGENCIA3D_BENCH_EMAIL e AGENCIA3D_BENCH_PASSWORD antes de medir.");
}

const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
try {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 120_000 }),
    page.getByRole("button", { name: "Entrar", exact: true }).click(),
  ]);

  const samples = [];
  for (let run = 0; run <= runs; run++) {
    for (const route of routes) {
      const started = performance.now();
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.locator("main h1").first().waitFor({ state: "visible", timeout: 120_000 });
      const visibleMs = Math.round(performance.now() - started);
      const navigation = await page.evaluate(() => {
        const entry = performance.getEntriesByType("navigation")[0];
        return entry ? {
          ttfbMs: Math.round(entry.responseStart),
          responseMs: Math.round(entry.responseEnd - entry.requestStart),
          domReadyMs: Math.round(entry.domContentLoadedEventEnd),
          transferBytes: entry.transferSize,
        } : null;
      });
      if (response?.status() !== 200) throw new Error(`${route} retornou HTTP ${response?.status()}`);
      if (run > 0) samples.push({ mode: "full", route, visibleMs, ...navigation });
    }
  }

  for (let run = 0; run <= runs; run++) {
    for (const route of routes) {
      const source = route === "/dashboard" ? "/pedidos" : "/dashboard";
      await page.goto(`${baseUrl}${source}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.locator("main h1").first().waitFor({ state: "visible", timeout: 120_000 });
      await page.evaluate(() => performance.clearResourceTimings());
      const link = page.locator(`a[href="${route}"]`).first();
      if (!(await link.count())) throw new Error(`Link de navegação ${route} não encontrado.`);
      if (!(await link.isVisible())) {
        const group = link.locator('xpath=ancestor::*[contains(@class,"agencia3d-menu-group")]').first();
        await group.locator("button").first().click();
      }
      const started = performance.now();
      await Promise.all([
        page.waitForURL((url) => url.pathname === route, { timeout: 120_000 }),
        link.click(),
      ]);
      await page.locator("main h1").first().waitFor({ state: "visible", timeout: 120_000 });
      const visibleMs = Math.round(performance.now() - started);
      const rsc = await page.evaluate((path) => {
        const entries = performance.getEntriesByType("resource")
          .filter((entry) => new URL(entry.name).pathname === path && entry.name.includes("_rsc="));
        const entry = entries.at(-1);
        return entry ? { rscMs: Math.round(entry.duration), rscBytes: entry.transferSize } : null;
      }, route);
      if (run > 0) samples.push({ mode: "client", route, visibleMs, ...rsc });
    }
  }

  const summary = Object.fromEntries(["full", "client"].flatMap((mode) => routes.map((route) => {
    const matching = samples.filter((sample) => sample.mode === mode && sample.route === route);
    const percentile = (key, fraction) => {
      const values = matching.map((sample) => sample[key]).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
      return values.length ? values[Math.ceil(values.length * fraction) - 1] : null;
    };
    return [`${mode}:${route}`, {
      visibleP50Ms: percentile("visibleMs", 0.5),
      visibleP95Ms: percentile("visibleMs", 0.95),
      ttfbP50Ms: percentile("ttfbMs", 0.5),
      rscP50Ms: percentile("rscMs", 0.5),
    }];
  })));
  const result = {
    baseUrl,
    recordedAt: new Date().toISOString(),
    runs,
    note: "Primeira passagem descartada para evitar custo de compilação e aquecimento.",
    summary,
    samples,
  };
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(result, null, 2), "utf8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}
