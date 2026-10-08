import type { Database, TenantModuleKey, TenantPlan } from "@agencia3d/db/types";

export type Plan = TenantPlan;
export type ModuleKey = TenantModuleKey;

const modulesByPlan: Record<Plan, readonly ModuleKey[]> = {
  start: ["crm", "quotes", "orders", "catalog", "stock", "printers", "production"],
  pro: [
    "crm", "quotes", "orders", "catalog", "stock", "printers", "production",
    "maintenance", "quality", "qr_codes", "actual_costs", "planner", "advanced_reports",
  ],
  business: [
    "crm", "quotes", "orders", "catalog", "stock", "printers", "production",
    "maintenance", "quality", "qr_codes", "actual_costs", "planner", "advanced_reports",
    "customer_portal", "api", "integrations", "ai", "multiunit", "remove_branding",
  ],
};

export function getEnabledModules(
  plan: Plan,
  overrides: Pick<Database["public"]["Tables"]["tenant_modules"]["Row"], "module_key" | "enabled">[],
): ModuleKey[] {
  const enabled = new Set<ModuleKey>(modulesByPlan[plan]);
  for (const override of overrides) {
    if (override.enabled) enabled.add(override.module_key);
    else enabled.delete(override.module_key);
  }
  return [...enabled];
}
