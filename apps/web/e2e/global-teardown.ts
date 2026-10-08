import { rm } from "node:fs/promises";
import { createLocalAdminClient, cleanupFixture, getFixturePath, type E2EFixture } from "./support/fixture.js";

export default async function globalTeardown() {
  let fixture: E2EFixture;
  try {
    fixture = JSON.parse(await (await import("node:fs/promises")).readFile(getFixturePath(), "utf8")) as E2EFixture;
  } catch {
    return;
  }
  const admin = createLocalAdminClient();
  try {
    await cleanupFixture(admin, { users: fixture.users, tenantIds: [fixture.tenants.primary.id, fixture.tenants.secondary.id] });
  } catch (error) {
    if (error instanceof AggregateError) console.error("E2E cleanup errors:", error.errors.map((item) => item instanceof Error ? item.message : String(item)));
    throw error;
  } finally {
    await rm(getFixturePath(), { force: true });
  }
}
