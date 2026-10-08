import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export type E2ERole = "owner" | "sales" | "production" | "operator" | "stock" | "finance" | "viewer" | "platform";
export type E2EUser = { id: string; email: string; password: string; role: E2ERole };
export type E2EFixture = {
  runId: string;
  runTag: string;
  tenants: {
    primary: { id: string; slug: string; host: string };
    secondary: { id: string; slug: string; host: string };
  };
  users: Partial<Record<"owner" | "otherOwner" | "sales" | "production" | "operator" | "stock" | "finance" | "viewer" | "platformAdmin", E2EUser>>;
  ids: { customerId: string; productId: string; variantId: string; materialId: string; printerId: string; spoolId: string; designId: string; revisionId: string; recipeId: string; foreignCustomerId: string };
};

export function getFixturePath() {
  const runId = process.env.AGENCIA3D_E2E_RUN_ID;
  if (!runId || !/^[\da-f-]{36}$/i.test(runId)) throw new Error("Playwright did not provide a valid E2E run id.");
  return resolve(process.cwd(), ".tmp", `forja-e2e-${runId}.json`);
}

export function assertLocalSupabaseUrl(url: string) {
  const parsed = new URL(url);
  const config = readFileSync(resolve(process.cwd(), "supabase", "config.toml"), "utf8");
  const apiSection = config.split(/^\[api\]\s*$/m)[1]?.split(/^\[/m)[0];
  const port = apiSection?.match(/^\s*port\s*=\s*(\d+)\s*$/m)?.[1];
  if (!port || !(parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") || parsed.port !== port) {
    throw new Error(`Refusing E2E access because ${parsed.origin} does not match the local Supabase API in supabase/config.toml.`);
  }
}

export async function readFixture(): Promise<E2EFixture> {
  return JSON.parse(await readFile(getFixturePath(), "utf8")) as E2EFixture;
}

export function createLocalAdminClient() {
  process.loadEnvFile(resolve(process.cwd(), ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("E2E cleanup requires local Supabase credentials in .env.local.");
  assertLocalSupabaseUrl(url);
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function executeLocalSql(sql: string, label: string) {
  const runId = process.env.AGENCIA3D_E2E_RUN_ID;
  if (!runId || !/^[\da-f-]{36}$/i.test(runId) || !/^[a-z0-9-]+$/i.test(label)) throw new Error("Refusing SQL without a valid E2E run id and file label.");
  const directory = resolve(process.cwd(), ".tmp");
  const sqlPath = resolve(directory, `forja-e2e-${runId}-${label}.sql`);
  await mkdir(directory, { recursive: true });
  await writeFile(sqlPath, sql, { encoding: "utf8", mode: 0o600 });
  try {
    const cli = resolve(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
    try {
      execFileSync(process.execPath, [cli, "db", "query", "--local", "--file", sqlPath], { cwd: process.cwd(), stdio: "pipe" });
    } catch (error) {
      const result = error as NodeJS.ErrnoException & { stderr?: Buffer; stdout?: Buffer };
      throw new Error([result.stderr?.toString("utf8"), result.stdout?.toString("utf8"), result.message].filter(Boolean).join("\n"));
    }
  } finally {
    await rm(sqlPath, { force: true });
  }
}

async function removeTenantStorage(admin: SupabaseClient, tenantId: string) {
  for (const bucket of ["forja-products", "forja-designs", "forja-branding"]) {
    const folders = [`tenants/${tenantId}`];
    const paths: string[] = [];
    while (folders.length) {
      const folder = folders.pop()!;
      const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
      if (error) throw new Error(`Could not list ${bucket}/${folder} during E2E cleanup: ${error.message}`);
      for (const entry of data ?? []) {
        const path = `${folder}/${entry.name}`;
        if (entry.id === null) folders.push(path);
        else paths.push(path);
      }
    }
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error) throw new Error(`Could not remove ${bucket} E2E objects: ${error.message}`);
    }
  }
}

export async function cleanupFixture(admin: SupabaseClient, input: { users: E2EFixture["users"]; tenantIds: string[] }) {
  const errors: Error[] = [];
  const tenantIds = [...new Set(input.tenantIds)];
  for (const tenantId of tenantIds) {
    if (!/^[\da-f-]{36}$/i.test(tenantId)) throw new Error("Refusing cleanup with an invalid E2E tenant id.");
    try { await removeTenantStorage(admin, tenantId); }
    catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
  }
  if (tenantIds.length) {
    const ids = tenantIds.map((id) => `'${id}'::uuid`).join(", ");
    const userIds = Object.values(input.users).flatMap((user) => user?.id && /^[\\da-f-]{36}$/i.test(user.id) ? [`'${user.id}'::uuid`] : []);
    const actors = userIds.length ? userIds.join(", ") : "null::uuid";
    const sql = `do $$ begin
      delete from public.platform_audit_events where tenant_id in (${ids}) or actor_id in (${actors});
      delete from public.production_job_requests where tenant_id in (${ids});
      delete from public.job_failures where tenant_id in (${ids});
      delete from public.material_reservations where tenant_id in (${ids});
      delete from public.spool_movements where tenant_id in (${ids});
      delete from public.production_jobs where tenant_id in (${ids});
      delete from public.production_orders where tenant_id in (${ids});
      delete from public.order_payments where tenant_id in (${ids});
      delete from public.order_shipments where tenant_id in (${ids});
      delete from public.sales_orders where tenant_id in (${ids});
      delete from public.maintenance_logs where tenant_id in (${ids});
      delete from public.maintenance_plans where tenant_id in (${ids});
      delete from public.profiles where tenant_id in (${ids});
      delete from platform.tenants where id in (${ids});
    end $$;`;
    try { await executeLocalSql(sql, "cleanup"); }
    catch (error) {
      errors.push(new Error(`Could not cascade-delete E2E tenant data: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  for (const user of Object.values(input.users)) {
    if (!user?.id) continue;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error && !/user not found/i.test(error.message)) errors.push(new Error(`Could not delete E2E user ${user.id}: ${error.message}`));
  }
  if (errors.length) throw new AggregateError(errors, "One or more E2E fixture cleanup steps failed.");
}
