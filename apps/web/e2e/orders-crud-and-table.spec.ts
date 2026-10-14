import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth.js";
import { createOrder } from "./support/orders.js";

test("pedido pode ser criado com mais de um produto", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Novo pedido" });
  await dialog.getByLabel("Cliente").selectOption(fixture.ids.customerId);
  await dialog.getByLabel("Produto").selectOption(fixture.ids.variantId);
  await dialog.getByLabel("Quantidade").fill("2");
  await dialog.getByRole("button", { name: "Adicionar produto" }).click();
  await dialog.getByLabel("Produto").nth(1).selectOption(fixture.ids.secondVariantId);
  await dialog.getByLabel("Quantidade").nth(1).fill("3");
  await dialog.getByLabel("CEP").fill("01310-100");
  await dialog.getByLabel("Rua ou avenida").fill("Avenida Paulista");
  await dialog.getByLabel("Número").fill("1000");
  await dialog.getByLabel("Bairro").fill("Bela Vista");
  await dialog.getByLabel("Cidade").fill("São Paulo");
  await dialog.getByLabel("UF").fill("SP");
  await dialog.getByRole("button", { name: "Cadastrar pedido" }).click();
  await expect(dialog).toBeHidden();
  const row = page.locator("tr.order-table-row-trigger").filter({ hasText: "2 ×" }).filter({ hasText: "3 ×" }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole("dialog", { name: /Pedido #/ }).getByText("Avenida Paulista, 1000")).toBeVisible();
});

test("pedido aberto pode ser editado e excluído com confirmação", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  const { number } = await createOrder(page, fixture, 1);
  const row = page.locator("tr.order-table-row-trigger").filter({ hasText: `Pedido #${number}` });

  await row.getByRole("button", { name: `Editar pedido #${number}` }).click();
  const editDialog = page.getByRole("dialog", { name: `Editar pedido #${number}` });
  await editDialog.getByLabel("Quantidade").fill("4");
  await editDialog.getByRole("button", { name: "Salvar pedido" }).click();
  await expect(row).toContainText("4 ×");
  await expect(row).toContainText("R$ 320,00");
  await page.keyboard.press("Escape");
  await expect(editDialog).toBeHidden();

  await row.hover();
  await row.getByRole("button", { name: `Excluir pedido #${number}` }).click();
  const deleteDialog = page.getByRole("dialog", { name: `Excluir pedido #${number}` });
  await expect(deleteDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(row).toBeVisible();

  await row.hover();
  await row.getByRole("button", { name: `Excluir pedido #${number}` }).click();
  await page.getByRole("dialog", { name: `Excluir pedido #${number}` }).getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(row).toHaveCount(0);
});

test("filtro e paginação funcionam fora da tabela com mais de dez registros", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  for (let index = 0; index < 11; index += 1) await createOrder(page, fixture, 1);

  const filter = page.getByRole("searchbox", { name: "Filtrar pedidos" });
  await filter.fill("CLIENTE E2E");
  await expect(page.getByText(/\d+ resultados/)).toBeVisible();
  await expect(page.locator("tr.order-table-row-trigger")).toHaveCount(10);
  await filter.fill("cliente inexistente");
  await expect(page.getByText("0 resultados")).toBeVisible();
  await expect(page.getByText("Nenhum pedido corresponde ao filtro.")).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtro" }).click();

  const pagination = page.getByRole("navigation", { name: "Paginação de dos pedidos" });
  await expect(pagination).toBeVisible();
  await pagination.getByRole("button", { name: "Próxima página" }).click();
  await expect(pagination).toContainText("Página 2 de");
  await expect(pagination.getByRole("button", { name: "Página anterior" })).toBeEnabled();
});
