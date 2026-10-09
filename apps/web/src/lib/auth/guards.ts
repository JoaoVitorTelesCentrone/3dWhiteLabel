import "server-only";

import { redirect } from "next/navigation";
import { getTenantContext, type TenantContext } from "@/lib/tenant/context";
import type { ModuleKey } from "@/lib/tenant/modules";
import { roleAllows, type Permission } from "./permissions";
import { getRequestUserId } from "./session";

export async function requireTenantContext(): Promise<TenantContext> {
  const userId = await getRequestUserId();
  if (!userId) redirect("/login");

  const context = await getTenantContext(userId);
  if (!context) redirect("/login?error=tenant");
  return context;
}

export async function requirePermission(permission: Permission, options: { write?: boolean } = {}): Promise<TenantContext> {
  const context = await requireTenantContext();
  if (options.write && context.licenseStatus === "suspended") redirect("/licenca-suspensa");
  if (!roleAllows(context.role, permission)) redirect("/acesso-negado");
  return context;
}

export async function requireModule(module: ModuleKey, options: { write?: boolean } = {}): Promise<TenantContext> {
  const context = await requireTenantContext();
  if (!context.modules.includes(module)) redirect("/modulo-indisponivel");
  if (options.write && context.licenseStatus === "suspended") redirect("/licenca-suspensa");
  return context;
}

export async function requireModulePermission(
  module: ModuleKey,
  permission: Permission,
  options: { write?: boolean } = {},
): Promise<TenantContext> {
  const context = await requireModule(module, options);
  if (!roleAllows(context.role, permission)) redirect("/acesso-negado");
  return context;
}
