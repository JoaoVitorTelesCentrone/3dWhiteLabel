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

test("nova receita vira ativa e preserva a versão anterior", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/catalogo/receitas`);
  await page.getByRole("button", { name: "Nova receita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nova receita" });
  await dialog.getByLabel("Variação").selectOption(fixture.ids.variantId);
  await dialog.getByLabel("Revisão 3D").selectOption(fixture.ids.revisionId);
  await dialog.locator('select[name="materialId"]').selectOption(fixture.ids.materialId);
  await dialog.getByLabel("Material estimado por placa (g)").fill("70");
  await dialog.getByLabel("Tempo estimado por placa (min)").fill("90");
  await dialog.getByLabel("Unidades por placa").fill("1");
  await dialog.getByRole("button", { name: "Ativar nova receita" }).click();
  await expect(dialog.getByRole("status")).toContainText("Nova versão da receita ativada.");
  await expect(page.getByText("Versão 2", { exact: false })).toBeVisible();
  await expect(page.getByText("Versão 1", { exact: false })).toBeVisible();
  await expect(page.getByText("Histórica")).toBeVisible();
});

test("modelo, revisão e arquivo técnico ficam vinculados", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/catalogo/modelos`);
  const designName = `Modelo criado E2E ${fixture.runTag}`;
  await page.getByRole("button", { name: "Cadastrar modelo", exact: true }).click();
  const createDialog = page.getByRole("dialog", { name: "Cadastrar modelo" });
  await createDialog.getByLabel("Nome").fill(designName);
  await createDialog.getByLabel("Categoria").fill("Protótipo");
  await createDialog.getByRole("button", { name: "Cadastrar modelo" }).click();
  await expect(createDialog.getByRole("status")).toContainText("Modelo cadastrado.");
  await page.reload();

  const design = page.locator(".catalog-record").filter({ hasText: designName });
  await design.getByLabel("Nova revisão").fill("2.0");
  await design.getByLabel("Observações").fill("Revisão de teste E2E");
  await design.getByRole("button", { name: "Criar revisão" }).click();
  await expect(design.getByRole("status")).toContainText("Revisão criada.");
  await page.reload();

  const revision = design.locator(".revision-record").filter({ hasText: "Revisão 2.0" });
  await revision.getByLabel(/Arquivo 3D/).setInputFiles({ name: `peca-${fixture.runTag}.stl`, mimeType: "model/stl", buffer: Buffer.from("solid e2e\nendsolid e2e\n") });
  const uploadResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.includes("/storage/v1/object/forja-designs/"));
  await revision.getByRole("button", { name: "Enviar arquivo" }).click();
  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.ok(), `Storage upload failed: ${await uploadResponse.text()}`).toBe(true);
  await expect(revision.getByText(new RegExp(`peca-${fixture.runTag}\\.stl`))).toBeVisible({ timeout: 15_000 });
});
