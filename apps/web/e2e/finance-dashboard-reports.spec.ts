import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth.js";
import { createOrder } from "./support/orders.js";

function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

test("pagamento parcial, despesa, dashboard, relatório e CSV concordam", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  const { number } = await createOrder(page, fixture, 3);

  await page.goto(`http://${fixture.tenants.primary.host}:3007/financeiro`);
  await page.getByRole("button", { name: "Registrar recebimento", exact: true }).click();
  const paymentDialog = page.getByRole("dialog", { name: "Registrar recebimento" });
  const orderSelect = paymentDialog.getByLabel("Pedido");
  const orderOption = orderSelect.locator("option").filter({ hasText: `Pedido #${number}` });
  await orderSelect.selectOption((await orderOption.getAttribute("value")) ?? "");
  await paymentDialog.getByLabel("Valor (R$)").fill("80,00");
  await paymentDialog.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(paymentDialog.getByRole("status")).toContainText("Pagamento registrado.");
  await expect(page.locator(".finance-row").filter({ hasText: `Pedido #${number}` })).toContainText("R$ 160,00");
  await page.keyboard.press("Escape");
  await expect(paymentDialog).toBeHidden();

  await page.getByRole("button", { name: "Registrar despesa", exact: true }).click();
  const expenseDialog = page.getByRole("dialog", { name: "Registrar despesa" });
  await expenseDialog.getByLabel("Categoria").selectOption("supplies");
  await expenseDialog.getByLabel("Valor (R$)").fill("12,00");
  await expenseDialog.getByLabel("Descrição").fill(`Insumo E2E ${fixture.runTag}`);
  await expenseDialog.getByLabel("Data").fill(localToday());
  await expenseDialog.getByRole("button", { name: "Registrar despesa" }).click();
  await expect(expenseDialog.getByRole("status")).toContainText("Despesa registrada.");
  await expect(page.getByText(`Insumo E2E ${fixture.runTag}`)).toBeVisible();

  await page.goto(`http://${fixture.tenants.primary.host}:3007/dashboard`);
  const summary = page.getByRole("region", { name: "Resumo financeiro do mês" });
  await expect(summary).toContainText("R$ 240,00");
  await expect(summary).toContainText("R$ 80,00");
  await expect(summary).toContainText("R$ 12,00");
  await expect(summary).toContainText("R$ 147,00");

  const today = localToday();
  await page.goto(`http://${fixture.tenants.primary.host}:3007/relatorios?start=${today}&end=${today}`);
  const report = page.locator(".report-grid-finance");
  await expect(report).toContainText("R$ 240,00");
  await expect(report).toContainText("R$ 81,00");
  await expect(report).toContainText("R$ 159,00");
  await expect(report).toContainText("R$ 80,00");
  await expect(report).toContainText("R$ 12,00");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("The report CSV was not saved by Playwright.");
  const csv = await readFile(path, "utf8");
  expect(csv).toContain("vendas_centavos,24000");
  expect(csv).toContain("recebido_centavos,8000");
  expect(csv).toContain("despesas_centavos,1200");
});
