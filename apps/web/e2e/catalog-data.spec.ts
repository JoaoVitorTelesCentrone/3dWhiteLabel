import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth.js";

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z0cAAAAASUVORK5CYII=", "base64");

test("produto com imagem, variação adicional e valores aparece no catálogo", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/catalogo/produtos`);
  const productName = `Produto criado E2E ${fixture.runTag}`;
  await page.getByRole("button", { name: "Cadastrar produto", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cadastrar produto" });
  await dialog.locator('input[name="image"]').setInputFiles({ name: "produto-e2e.png", mimeType: "image/png", buffer: onePixelPng });
  await dialog.getByLabel("Nome do produto").fill(productName);
  await dialog.getByLabel("Preço de venda").fill("45,00");
  await dialog.getByLabel("Custo").fill("12,50");
  await dialog.getByRole("button", { name: "Cadastrar produto" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status")).toContainText("Produto cadastrado.");

  await page.getByRole("button", { name: `Ver detalhes de ${productName}` }).click();
  const details = page.locator(".product-detail-sheet-panel");
  await expect(details).toContainText("R$ 45,00");
  await expect(details).toContainText("R$ 12,50");
  await details.locator("details.product-add-variant > summary").click();
  const variantForm = details.locator("details.product-add-variant .product-variant-form");
  await variantForm.getByLabel("Nome da variação").fill("Kit E2E");
  await variantForm.getByLabel("SKU").fill(`KIT-${fixture.runTag}`);
  await variantForm.getByLabel("Preço de venda (R$)").fill("80,00");
  await variantForm.getByLabel("Custo (R$)").fill("27,00");
  await variantForm.getByLabel("Atributos").fill("cor=azul, tamanho=G");
  await variantForm.getByRole("button", { name: "Adicionar variação" }).click();
  await expect(variantForm.getByRole("status")).toContainText("Variação cadastrada.");
});
