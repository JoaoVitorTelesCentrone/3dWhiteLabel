import { expect, test } from "@playwright/test";
import { readFixture, type E2EFixture } from "./support/fixture.js";
import { signIn } from "./support/auth.js";

test("login rejeita senha inválida e protege rotas autenticadas", async ({ page }) => {
  const fixture = await readFixture();
  const owner = fixture.users.owner!;
  await page.goto(`http://${fixture.tenants.primary.host}:3007/login`);
  await page.getByLabel("E-mail").fill(owner.email);
  await page.getByLabel("Senha").fill("senha-incorreta-e2e");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.goto(`http://${fixture.tenants.primary.host}:3007/financeiro`);
  await expect(page).toHaveURL(/\/login/);
});

test("dados de outro tenant não aparecem mesmo ao abrir sua URL", async ({ page }) => {
  const fixture = await signIn(page);
  await page.goto(`http://${fixture.tenants.primary.host}:3007/clientes`);
  await expect(page.getByText(`Privado Tenant B ${fixture.runTag}`)).toHaveCount(0);

  const otherOwner = fixture.users.otherOwner!;
  await page.goto(`http://${fixture.tenants.secondary.host}:3007/login`);
  await page.getByLabel("E-mail").fill(otherOwner.email);
  await page.getByLabel("Senha").fill(otherOwner.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`http://${fixture.tenants.secondary.host}:3007/clientes`);
  await expect(page.getByText(`Privado Tenant B ${fixture.runTag}`)).toBeVisible();
  await expect(page.getByText(`Cliente E2E ${fixture.runTag}`)).toHaveCount(0);
});

test("licença suspensa permite consulta e esconde cadastros", async ({ page }) => {
  const fixture = await readFixture();
  const owner = fixture.users.otherOwner!;
  await page.goto(`http://${fixture.tenants.secondary.host}:3007/login`);
  await page.getByLabel("E-mail").fill(owner.email);
  await page.getByLabel("Senha").fill(owner.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`http://${fixture.tenants.secondary.host}:3007/clientes`);
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar cliente", exact: true })).toHaveCount(0);
  await expect(page.getByText(`Privado Tenant B ${fixture.runTag}`)).toBeVisible();
});

test("papéis veem apenas áreas e ações autorizadas", async ({ browser }) => {
  const fixture: E2EFixture = await readFixture();

  const salesContext = await browser.newContext();
  const salesPage = await salesContext.newPage();
  await signIn(salesPage, "sales", fixture);
  await expect(salesPage.getByRole("link", { name: "Pedidos", exact: true })).toBeVisible();
  await expect(salesPage.getByRole("button", { name: "Produção", exact: true })).toHaveCount(0);
  await salesPage.goto(`http://${fixture.tenants.primary.host}:3007/producao`);
  await expect(salesPage).toHaveURL(/acesso-negado|dashboard/);
  await salesContext.close();

  const operatorContext = await browser.newContext();
  const operatorPage = await operatorContext.newPage();
  await signIn(operatorPage, "operator", fixture);
  await operatorPage.goto(`http://${fixture.tenants.primary.host}:3007/producao`);
  await expect(operatorPage.getByRole("heading", { name: "Produção", exact: true })).toBeVisible();
  await expect(operatorPage.getByRole("link", { name: "Financeiro", exact: true })).toHaveCount(0);
  await operatorPage.goto(`http://${fixture.tenants.primary.host}:3007/financeiro`);
  await expect(operatorPage).toHaveURL(/acesso-negado|dashboard/);
  await operatorContext.close();

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await signIn(viewerPage, "viewer", fixture);
  await viewerPage.goto(`http://${fixture.tenants.primary.host}:3007/pedidos`);
  await expect(viewerPage.getByRole("button", { name: "Novo pedido", exact: true })).toHaveCount(0);
  await viewerContext.close();
});
