import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth.js";

test("material, bobina e ajuste atualizam a tabela de estoque", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/materiais`);

  await page.getByRole("button", { name: "Cadastrar material", exact: true }).click();
  const materialDialog = page.getByRole("dialog", { name: "Cadastrar material" });
  const materialName = `PETG E2E ${fixture.runTag}`;
  await materialDialog.getByLabel("Nome do material").fill(materialName);
  await materialDialog.getByLabel("Tipo").selectOption("PETG");
  await materialDialog.getByLabel("Cor").fill("Azul");
  await materialDialog.getByLabel("Custo por kg (R$)").fill("72,50");
  await materialDialog.getByRole("button", { name: "Cadastrar material" }).click();
  await expect(materialDialog).toBeHidden();
  await expect(page.getByRole("status")).toContainText("Material cadastrado.");

  await page.getByRole("button", { name: "Receber bobina", exact: true }).click();
  const spoolDialog = page.getByRole("dialog", { name: "Receber bobina" });
  const spoolCode = `PETG-${fixture.runTag}`;
  await spoolDialog.getByLabel("Material").selectOption({ label: materialName });
  await spoolDialog.getByLabel("Código da bobina").fill(spoolCode);
  await spoolDialog.getByLabel("Peso bruto (g)").fill("2100");
  await spoolDialog.getByLabel("Tara (g)").fill("100");
  await spoolDialog.getByRole("button", { name: "Receber bobina" }).click();
  await expect(spoolDialog).toBeHidden();
  const spoolRow = page.locator("tr").filter({ hasText: materialName }).filter({ hasText: spoolCode });
  await expect(spoolRow).toContainText("2.000 g");

  await spoolRow.getByRole("button", { name: `Ajustar peso da bobina ${spoolCode}` }).click();
  const adjustDialog = page.locator(".material-adjust-sheet");
  await adjustDialog.getByLabel("Novo peso bruto (g)").fill("1450");
  await adjustDialog.getByLabel("Motivo do ajuste").fill("Pesagem E2E após conferência");
  await adjustDialog.getByRole("button", { name: "Salvar ajuste" }).click();
  await expect(adjustDialog).toBeHidden();
  await expect(page.locator("tr").filter({ hasText: spoolCode })).toContainText("1.350 g");
});

test("impressora pode ser cadastrada e desativada enquanto está ociosa", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/impressoras`);
  const printerName = `Impressora E2E criada ${fixture.runTag}`;
  await page.getByRole("button", { name: "Cadastrar impressora", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cadastrar impressora" });
  await dialog.getByLabel("Nome").fill(printerName);
  await dialog.getByLabel("Modelo").fill("CoreXY teste");
  await dialog.getByRole("button", { name: "Cadastrar impressora" }).click();
  await expect(dialog.getByRole("status")).toContainText("Impressora cadastrada.");
  await page.reload();

  const printerCard = page.locator(".printer-card").filter({ hasText: printerName });
  await expect(printerCard).toContainText("CoreXY teste");
  await printerCard.getByRole("button", { name: "Desativar" }).click();
  await expect(printerCard).toContainText("Inativa");
});
