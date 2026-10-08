import { expect, type Page } from "@playwright/test";
import type { E2EFixture } from "./fixture.js";

export async function createOrder(page: Page, fixture: E2EFixture, quantity: number) {
  await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Novo pedido" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Cliente").selectOption(fixture.ids.customerId);
  await dialog.getByLabel("Produto").selectOption(fixture.ids.variantId);
  await dialog.getByLabel("Quantidade").fill(String(quantity));
  await dialog.getByRole("button", { name: "Cadastrar pedido" }).click();
  await expect(dialog).toBeHidden();
  const row = page.locator("tr.order-table-row-trigger").filter({ hasText: `Cliente E2E ${fixture.runTag}` }).filter({ hasText: `${quantity} ×` }).first();
  await expect(row).toBeVisible();
  const orderText = await row.locator("td").first().innerText();
  const match = orderText.match(/#(\d+)/);
  if (!match) throw new Error(`Could not read created order number from: ${orderText}`);
  return { row, number: match[1] };
}
