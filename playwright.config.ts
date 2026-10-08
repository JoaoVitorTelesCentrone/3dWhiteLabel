import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const localChromium = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
process.env.AGENCIA3D_E2E_RUN_ID ??= randomUUID();
process.env.AGENCIA3D_E2E_FIXTURE_PATH ??= resolve(process.cwd(), ".tmp", `forja-e2e-${process.env.AGENCIA3D_E2E_RUN_ID}.json`);

export default defineConfig({
  testDir: "./apps/web/e2e",
  globalSetup: "./apps/web/e2e/global-setup.ts",
  globalTeardown: "./apps/web/e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }], ["junit", { outputFile: "test-results/e2e-junit.xml" }]],
  outputDir: "test-results/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:3007",
    browserName: "chromium",
    headless: true,
    launchOptions: { executablePath: process.env.CI ? undefined : existsSync(localChromium) ? localChromium : undefined },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm --filter @agencia3d/web dev:e2e",
    url: "http://127.0.0.1:3007/login",
    env: { AGENCIA3D_ADMIN_HOST: "admin.localhost:3007", AGENCIA3D_E2E: "true" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
