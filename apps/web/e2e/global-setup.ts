import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertLocalSupabaseUrl, cleanupFixture, executeLocalSql, getFixturePath, type E2EFixture, type E2ERole } from "./support/fixture.js";

const modules = ["crm", "quotes", "orders", "catalog", "stock", "printers", "production", "maintenance", "quality", "qr_codes", "actual_costs", "planner", "advanced_reports"];

function assertNoError(error: { message: string } | null, context: string): asserts error is null {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function addUser(admin: SupabaseClient, email: string, fullName: string, role: E2ERole, tenantId?: string) {
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  assertNoError(error, `Could not create ${role} E2E user`);
  if (!data.user) throw new Error(`Supabase did not return the ${role} E2E user.`);
  const user = { id: data.user.id, email, password, role };
  if (tenantId) {
    const { error: profileError } = await admin.from("profiles").insert({ id: user.id, tenant_id: tenantId, full_name: fullName, email, role });
    assertNoError(profileError, `Could not create ${role} profile`);
  }
  return user;
}

async function createTenant(admin: SupabaseClient, name: string, slug: string, host: string, owner: { id: string; email: string }) {
  const { data, error } = await admin.rpc("provision_tenant_with_owner", {
    p_name: name, p_slug: slug, p_host: host, p_owner_id: owner.id, p_owner_name: name, p_owner_email: owner.email,
  });
  assertNoError(error, `Could not provision ${name}`);
  if (typeof data !== "string") throw new Error(`Provisioning ${name} returned no tenant identifier.`);
  const tenantId = data;
  const { error: modulesError } = await admin.from("tenant_modules").upsert(
    modules.map((module_key) => ({ tenant_id: tenantId, module_key, enabled: true })),
    { onConflict: "tenant_id,module_key" },
  );
  assertNoError(modulesError, `Could not enable E2E modules for ${name}`);
  return tenantId;
}

async function seedTenantA(admin: SupabaseClient, fixture: E2EFixture) {
  const { ids, tenants, runTag } = fixture;
  const inserts = await Promise.all([
    admin.from("customers").insert({ id: ids.customerId, tenant_id: tenants.primary.id, name: `Cliente E2E ${runTag}`, email: `cliente-${runTag}@example.test` }),
    admin.from("products").insert({ id: ids.productId, tenant_id: tenants.primary.id, name: `Produto E2E ${runTag}`, active: true }),
    admin.from("materials").insert({ id: ids.materialId, tenant_id: tenants.primary.id, name: `PLA E2E ${runTag}`, kind: "PLA", cost_per_kg_cents: 5000, active: true }),
    admin.from("printers").insert({ id: ids.printerId, tenant_id: tenants.primary.id, name: `Impressora E2E ${runTag}`, status: "idle", active: true }),
  ]);
  for (const result of inserts) assertNoError(result.error, "Could not seed primary tenant fixture");
  const { error: variantError } = await admin.from("product_variants").insert({
    id: ids.variantId, tenant_id: tenants.primary.id, product_id: ids.productId, name: "Padrão", sku: `E2E-${runTag}`,
    attributes: {}, price_cents: 8000, cost_cents: 2700, active: true, is_default: true,
  });
  assertNoError(variantError, "Could not seed product variant");
  const { error: spoolError } = await admin.from("material_spools").insert({
    id: ids.spoolId, tenant_id: tenants.primary.id, material_id: ids.materialId, code: `E2E-${runTag}`,
    tare_g: 100, initial_gross_g: 5100, current_gross_g: 5100, status: "active",
  });
  assertNoError(spoolError, "Could not seed material spool");
  const { error: designError } = await admin.from("designs").insert({
    id: ids.designId, tenant_id: tenants.primary.id, name: `Modelo E2E ${runTag}`, created_by: fixture.users.owner?.id,
  });
  assertNoError(designError, "Could not seed design");
  const { error: revisionError } = await admin.from("design_revisions").insert({
    id: ids.revisionId, tenant_id: tenants.primary.id, design_id: ids.designId, version: "1.0", created_by: fixture.users.owner?.id,
  });
  assertNoError(revisionError, "Could not seed design revision");
  const { error: recipeError } = await admin.from("production_recipes").insert({
    id: ids.recipeId, tenant_id: tenants.primary.id, product_variant_id: ids.variantId, design_revision_id: ids.revisionId,
    material_id: ids.materialId, version: 1, estimated_g: 60, estimated_minutes: 80, units_per_plate: 1, active: true,
    created_by: fixture.users.owner?.id,
  });
  assertNoError(recipeError, "Could not seed production recipe");
}

export default async function globalSetup() {
  process.env.SUPABASE_TELEMETRY_DISABLED ??= "true";
  process.loadEnvFile(resolve(process.cwd(), ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Local E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the repository root .env.local.");
  assertLocalSupabaseUrl(url);

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const runId = process.env.AGENCIA3D_E2E_RUN_ID ?? randomUUID();
  const runTag = runId.replaceAll("-", "").slice(0, 10);
  const tenantSlug = `e2e-${runTag}`;
  const otherTenantSlug = `e2e-b-${runTag}`;
  const tenantIds: string[] = [];
  const users: E2EFixture["users"] = {};
  let fixture: E2EFixture | undefined;
  try {
    users.owner = await addUser(admin, `owner-${runTag}@example.test`, "Agencia 3D E2E Owner", "owner");
    users.otherOwner = await addUser(admin, `owner-b-${runTag}@example.test`, "Agencia 3D E2E Tenant B", "owner");
    users.platformAdmin = await addUser(admin, `platform-${runTag}@example.test`, "Agencia 3D E2E Platform Admin", "platform");
    const { error: platformAdminError } = await admin.from("platform_admins").insert({ id: users.platformAdmin.id, full_name: "Agencia 3D E2E Platform Admin" });
    assertNoError(platformAdminError, "Could not create platform administrator fixture");
    const primaryId = await createTenant(admin, `Agencia 3D E2E ${runTag}`, tenantSlug, `${tenantSlug}.localhost`, users.owner);
    tenantIds.push(primaryId);
    const secondaryId = await createTenant(admin, `Agencia 3D E2E B ${runTag}`, otherTenantSlug, `${otherTenantSlug}.localhost`, users.otherOwner);
    tenantIds.push(secondaryId);
    await executeLocalSql(`update platform.tenants set license_status = 'suspended' where id = '${secondaryId}'::uuid;`, "suspend-secondary");
    users.sales = await addUser(admin, `sales-${runTag}@example.test`, "Agencia 3D E2E Sales", "sales", primaryId);
    users.production = await addUser(admin, `production-${runTag}@example.test`, "Agencia 3D E2E Production", "production", primaryId);
    users.operator = await addUser(admin, `operator-${runTag}@example.test`, "Agencia 3D E2E Operator", "operator", primaryId);
    users.stock = await addUser(admin, `stock-${runTag}@example.test`, "Agencia 3D E2E Stock", "stock", primaryId);
    users.finance = await addUser(admin, `finance-${runTag}@example.test`, "Agencia 3D E2E Finance", "finance", primaryId);
    users.viewer = await addUser(admin, `viewer-${runTag}@example.test`, "Agencia 3D E2E Viewer", "viewer", primaryId);
    const ids = {
      customerId: randomUUID(), productId: randomUUID(), variantId: randomUUID(), materialId: randomUUID(),
      printerId: randomUUID(), spoolId: randomUUID(), designId: randomUUID(), revisionId: randomUUID(),
      recipeId: randomUUID(), foreignCustomerId: randomUUID(),
    };
    fixture = {
      runId, runTag,
      tenants: {
        primary: { id: primaryId, slug: tenantSlug, host: `${tenantSlug}.localhost` },
        secondary: { id: secondaryId, slug: otherTenantSlug, host: `${otherTenantSlug}.localhost` },
      },
      users, ids,
    };
    await seedTenantA(admin, fixture);
    const { error: foreignCustomerError } = await admin.from("customers").insert({ id: ids.foreignCustomerId, tenant_id: secondaryId, name: `Privado Tenant B ${runTag}` });
    assertNoError(foreignCustomerError, "Could not seed secondary tenant fixture");
    await mkdir(resolve(process.cwd(), ".tmp"), { recursive: true });
    await writeFile(getFixturePath(), JSON.stringify(fixture), { encoding: "utf8", mode: 0o600 });
  } catch (error) {
    await cleanupFixture(admin, { users, tenantIds }).catch((cleanupError) => {
      throw new AggregateError([error, cleanupError], "E2E setup failed and cleanup also failed.");
    });
    throw error;
  }
}
