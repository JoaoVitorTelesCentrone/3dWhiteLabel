import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/permissions";
import { getEnabledModules, type ModuleKey, type Plan } from "./modules";
import type { TenantLicenseStatus } from "@agencia3d/db/types";
import { canUseSelectedTenantFallback, resolveRequestHost } from "./host";

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

export const getRequestTenantDomain = cache(async (): Promise<{ tenant_id: string } | null> => {
  const host = resolveRequestHost(await headers());
  const supabase = await createClient();

  if (host) {
    const { data, error } = await supabase.from("tenant_domains")
      .select("tenant_id").eq("host", host).eq("status", "active").maybeSingle();
    if (!error && data) return data;
  }

  if (!canUseSelectedTenantFallback(host)) return null;

  const selectedTenantId = (await cookies()).get("agencia3d_selected_tenant")?.value;
  if (selectedTenantId && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(selectedTenantId)) {
    const { data: claims, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || typeof claims?.claims?.sub !== "string") return null;
    const { data, error } = await supabase.from("tenant_domains")
      .select("tenant_id").eq("tenant_id", selectedTenantId).eq("status", "active").maybeSingle();
    if (!error && data) return data;
  }

  return null;
});

export const getTenantContext = cache(async function getTenantContext(userId: string): Promise<TenantContext | null> {
  const supabase = await createClient();
  const [domain, { data: profile, error: profileError }] = await Promise.all([
    getRequestTenantDomain(),
    supabase.from("profiles").select("id, tenant_id, full_name, role, active").eq("id", userId).maybeSingle(),
  ]);

  if (profileError || !domain || !profile || !profile.active) return null;
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
