import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth.js";
import { createOrder } from "./support/orders.js";

test("pedido percorre produção, expedição e entrega com dados sincronizados", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  const { row, number } = await createOrder(page, fixture, 2);

  await expect(row).toContainText("Aberto");
  await expect(row).toContainText("R$ 160,00");
  await expect(row).toContainText("R$ 106,00");

  await row.locator(".order-status-menu").getByRole("button", { name: /Alterar status do pedido/ }).click();
  await page.getByRole("button", { name: "Em produção", exact: true }).click();
  await expect(row).toContainText("Em produção");

  await page.goto(`http://${fixture.tenants.primary.host}:3007/producao`);
  const card = page.locator(".production-stage-card").filter({ hasText: `Pedido #${number}` });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Na fila");
  await card.getByRole("button", { name: "Alterar etapa da produção" }).click();
  await page.getByRole("button", { name: "Imprimindo", exact: true }).click();
  await expect(page.locator('.production-stage-card[data-pipeline-stage="running"]').filter({ hasText: `Pedido #${number}` })).toBeVisible();

  await page.getByRole("button", { name: `Ver detalhes do pedido #${number}` }).click();
  const details = page.getByRole("dialog", { name: `Pedido #${number}` });
  await expect(details).toBeVisible();
  await expect(details.locator(".production-job")).toContainText("Imprimindo");
  const expectedMaterial = Number(await details.getByLabel("Consumo real (g)").getAttribute("max"));
  expect(expectedMaterial).toBeGreaterThan(0);
  await expect(details.locator(".production-job")).toContainText(`${expectedMaterial} g`);
  await details.getByLabel("Tempo real (min)").fill("150");
  await details.getByLabel("Consumo real (g)").fill(String(expectedMaterial - 10));
  await details.getByRole("button", { name: "Concluir job" }).click();
  await expect(page.locator('.production-stage-card[data-pipeline-stage="completed"]').filter({ hasText: `Pedido #${number}` })).toBeVisible({ timeout: 20_000 });

  await page.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  const completedOrder = page.locator("tr.order-table-row-trigger").filter({ hasText: `Pedido #${number}` });
  await expect(completedOrder).toContainText("Pronto para envio");
  await completedOrder.locator(".order-status-menu").getByRole("button", { name: /Alterar status do pedido/ }).click();
  await page.getByRole("button", { name: "Enviado", exact: true }).click();
  await expect(completedOrder).toContainText("Enviado");
  await completedOrder.locator(".order-status-menu").getByRole("button", { name: /Alterar status do pedido/ }).click();
  await page.getByRole("button", { name: "Entregue", exact: true }).click();
  await expect(completedOrder).toContainText("Entregue");

  await completedOrder.getByRole("button", { name: `Ver detalhes do pedido #${number}` }).click();
  const orderDetails = page.getByRole("dialog", { name: `Pedido #${number}` });
  await expect(orderDetails).toContainText("Pedido entregue e concluído.");
  await expect(orderDetails.locator(".record-shipment")).toContainText("entregue");
});

test("falha registrada permite replanejar as peças restantes", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  const { number } = await createOrder(page, fixture, 2);
  const row = page.locator("tr.order-table-row-trigger").filter({ hasText: `Pedido #${number}` });
  await row.locator(".order-status-menu").getByRole("button", { name: /Alterar status do pedido/ }).click();
  await page.getByRole("button", { name: "Em produção", exact: true }).click();

  await page.goto(`http://${fixture.tenants.primary.host}:3007/producao`);
  const card = page.locator(".production-stage-card").filter({ hasText: `Pedido #${number}` });
  await card.getByRole("button", { name: "Alterar etapa da produção" }).click();
  await page.getByRole("button", { name: "Imprimindo", exact: true }).click();
  await page.getByRole("button", { name: `Ver detalhes do pedido #${number}` }).click();
  const details = page.getByRole("dialog", { name: `Pedido #${number}` });
  await details.getByLabel("Motivo da falha").fill("Bico entupido durante a impressão");
  await details.getByLabel("Tempo utilizado (min)").fill("20");
  await details.getByLabel("Material consumido (g)").fill("10");
  await details.getByRole("button", { name: "Registrar falha" }).click();
  const queuedCard = page.locator('.production-stage-card[data-pipeline-stage="queued"]').filter({ hasText: `Pedido #${number}` });
  await expect(queuedCard).toBeVisible({ timeout: 20_000 });
  await queuedCard.getByRole("button", { name: "Alterar etapa da produção" }).click();
  await page.getByRole("button", { name: "Imprimindo", exact: true }).click();
  await expect(page.locator('.production-stage-card[data-pipeline-stage="running"]').filter({ hasText: `Pedido #${number}` })).toBeVisible();
});
