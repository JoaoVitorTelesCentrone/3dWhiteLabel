import { expect, type Page } from "@playwright/test";
import { readFixture, type E2EFixture, type E2ERole } from "./fixture.js";

export async function signIn(page: Page, role: E2ERole = "owner", fixture?: E2EFixture, host?: string) {
  const data = fixture ?? await readFixture();
  const user = data.users[role];
  if (!user) throw new Error(`The E2E fixture has no user for role ${role}.`);
  await page.goto(`http://${host ?? data.tenants.primary.host}:3007/login`);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return data;
}
