import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth.js";
import { readFixture } from "./support/fixture.js";

test("plano de manutenção e registro de serviço ficam ligados à impressora", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/manutencao`);
  await page.getByRole("button", { name: "Criar plano", exact: true }).click();
  const createDialog = page.getByRole("dialog", { name: "Criar plano" });
  await createDialog.getByLabel("Impressora").selectOption(fixture.ids.printerId);
  await createDialog.getByLabel("Intervalo (horas de uso)").fill("100");
  await createDialog.getByLabel("Alertar antes (horas)").fill("10");
  await createDialog.getByRole("button", { name: "Criar plano" }).click();
  await expect(createDialog.getByRole("status")).toContainText("Plano de manutenção criado.");
  await page.reload();

  const card = page.locator(".maintenance-card").filter({ hasText: `Impressora E2E ${fixture.runTag}` });
  await expect(card).toContainText("Intervalo de 100 h");
  await card.getByLabel("Custo (R$)").fill("25,00");
  await card.getByLabel("Serviço realizado").fill("Limpeza e lubrificação E2E");
  await card.getByRole("button", { name: "Registrar manutenção" }).click();
  await expect(card.getByText("Limpeza e lubrificação E2E")).toBeVisible({ timeout: 20_000 });
});

test("marca da empresa e acesso da equipe podem ser atualizados", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/configuracoes/marca`);
  const displayName = `Marca E2E ${fixture.runTag}`;
  await page.getByLabel("Nome exibido").fill(displayName);
  await page.getByLabel("Cor principal").fill("#ffffff");
  await page.getByLabel("Cor de destaque").fill("#fef3c7");
  await page.getByRole("button", { name: "Salvar marca" }).click();
  await expect(page.locator(".brand-form").getByRole("status")).toContainText("Marca atualizada.");
  await page.goto(`http://${fixture.tenants.primary.host}:3007/dashboard`);
  await expect(page.getByRole("link", { name: `${displayName}: visão geral` })).toBeVisible();

  await page.goto(`http://${fixture.tenants.primary.host}:3007/configuracoes/usuarios`);
  const sales = page.locator(".user-record").filter({ hasText: fixture.users.sales!.email });
  await sales.getByLabel("Papel").selectOption("viewer");
  await sales.getByRole("button", { name: "Atualizar acesso" }).click();
  await expect(sales.getByRole("status")).toContainText("Usuário atualizado.");
  await page.reload();
  await expect(page.locator(".user-record").filter({ hasText: fixture.users.sales!.email })).toContainText("Consulta");
});

test("admin da plataforma pode entrar e suspender/restaurar uma licença", async ({ page }) => {
  const fixture = await readFixture();
  const platformAdmin = fixture.users.platformAdmin!;
  await page.goto("http://admin.localhost:3007/admin/login");
  await page.getByLabel("E-mail").fill(platformAdmin.email);
  await page.getByLabel("Senha").fill(platformAdmin.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();

  const tenantCard = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: `Agencia 3D E2E ${fixture.runTag}`, exact: true }) });
  await expect(tenantCard).toBeVisible();
  const licenseSelect = tenantCard.getByLabel("Licença");
  await licenseSelect.selectOption("suspended");
  await tenantCard.getByRole("button", { name: "Atualizar plano e licença" }).click();
  await expect(tenantCard).toContainText("licença suspended");

  await page.goto(`http://${fixture.tenants.primary.host}:3007/login`);
  await page.getByLabel("E-mail").fill(fixture.users.owner!.email);
  await page.getByLabel("Senha").fill(fixture.users.owner!.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toHaveCount(0);

  await page.goto("http://admin.localhost:3007/admin");
  await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
  const restoreCard = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: `Agencia 3D E2E ${fixture.runTag}`, exact: true }) });
  await restoreCard.getByLabel("Licença").selectOption("active");
  await restoreCard.getByRole("button", { name: "Atualizar plano e licença" }).click();
  await expect(restoreCard).toContainText("licença active");
});
