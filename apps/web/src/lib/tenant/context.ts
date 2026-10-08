import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/permissions";
import { getEnabledModules, type ModuleKey, type Plan } from "./modules";
import type { TenantLicenseStatus } from "@agencia3d/db/types";

export type TenantContext = {
  userId: string;
  tenantId: string;
  tenantName: string;
  fullName: string;
  role: Role;
  plan: Plan;
  licenseStatus: TenantLicenseStatus;
  modules: ModuleKey[];
};

export function resolveTenantHost(value: string): string {
  const host = value.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

  if (
    process.env.NODE_ENV === "development" &&
    process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN === "true" &&
    (host === "localhost" || host === "127.0.0.1")
  ) {
    return "demo.localhost";
  }

  return host;
}

export function resolveRequestHost(requestHeaders: Pick<Headers, "get">): string | null {
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const host = forwardedHost ?? requestHeaders.get("host")?.trim();
  const origin = requestHeaders.get("origin");
  if (origin && (!host || /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host))) {
    try {
      const originHost = new URL(origin).host;
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(originHost)) return resolveTenantHost(originHost);
    } catch {
      // Ignore invalid Origin values and use the request host.
    }
  }
  return host ? resolveTenantHost(host) : null;
}

export const getTenantContext = cache(async function getTenantContext(userId: string): Promise<TenantContext | null> {
  const requestHeaders = await headers();
  const host = resolveRequestHost(requestHeaders);
  if (!host) return null;
  const supabase = await createClient();
  const [{ data: domain, error: domainError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("tenant_domains").select("tenant_id").eq("host", host).eq("status", "active").maybeSingle(),
    supabase.from("profiles").select("id, tenant_id, full_name, role, active").eq("id", userId).maybeSingle(),
  ]);

  if (domainError || profileError || !domain || !profile || !profile.active) return null;
  if (domain.tenant_id !== profile.tenant_id) return null;

  const [{ data: tenant, error: tenantError }, { data: overrides, error: modulesError }] = await Promise.all([
    supabase
      .from("tenant_runtime")
      .select("name, plan, license_status")
      .eq("id", domain.tenant_id)
      .maybeSingle(),
    supabase.from("tenant_modules").select("module_key, enabled").eq("tenant_id", domain.tenant_id),
  ]);

  if (tenantError || modulesError || !tenant) return null;
  const roles: Role[] = ["owner", "admin", "sales", "production", "operator", "stock", "finance", "viewer"];
  if (!roles.includes(profile.role as Role)) return null;
  const role = profile.role as Role;
  const modules = getEnabledModules(tenant.plan, overrides);

  return {
    userId,
    tenantId: domain.tenant_id,
    tenantName: tenant.name,
    fullName: profile.full_name,
    role,
    plan: tenant.plan,
    licenseStatus: tenant.license_status,
    modules,
  };
});
