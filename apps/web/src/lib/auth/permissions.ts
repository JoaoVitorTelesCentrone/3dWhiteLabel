export type Role = "owner" | "admin" | "sales" | "production" | "operator" | "stock" | "finance" | "viewer";
export type Permission =
  | "crm.view" | "crm.edit"
  | "quotes.view" | "quotes.create" | "quotes.approve" | "quotes.discount"
  | "orders.view" | "orders.create" | "orders.cancel"
  | "catalog.view" | "catalog.edit" | "designs.view" | "designs.edit" | "designs.delete"
  | "production.view" | "production.plan" | "production.start" | "production.cancel"
  | "printers.view" | "printers.edit" | "printers.control"
  | "maintenance.view" | "maintenance.manage" | "quality.view" | "quality.inspect"
  | "stock.view" | "stock.adjust" | "stock.purchase" | "stock.discard" | "stock.consume"
  | "suppliers.view" | "suppliers.edit"
  | "finance.view" | "finance.edit" | "costs.view" | "margins.view"
  | "reports.view" | "reports.export"
  | "users.manage" | "settings.manage" | "branding.manage" | "modules.manage" | "license.view";

const allTenantPermissions: readonly Permission[] = [
  "crm.view", "crm.edit", "quotes.view", "quotes.create", "quotes.approve", "quotes.discount",
  "orders.view", "orders.create", "orders.cancel", "catalog.view", "catalog.edit",
  "designs.view", "designs.edit", "designs.delete", "production.view", "production.plan",
  "production.start", "production.cancel", "printers.view", "printers.edit", "printers.control",
  "maintenance.view", "maintenance.manage", "quality.view", "quality.inspect", "stock.view",
  "stock.adjust", "stock.purchase", "stock.discard", "stock.consume", "suppliers.view",
  "suppliers.edit", "finance.view", "finance.edit", "costs.view", "margins.view",
  "reports.view", "reports.export", "users.manage", "settings.manage", "branding.manage",
  "modules.manage", "license.view",
];

const rolePermissions: Record<Role, readonly Permission[]> = {
  owner: allTenantPermissions,
  admin: allTenantPermissions.filter((permission) => permission !== "license.view" && permission !== "modules.manage"),
  sales: ["crm.view", "crm.edit", "quotes.view", "quotes.create", "quotes.approve", "orders.view", "orders.create", "catalog.view", "designs.view"],
  production: ["catalog.view", "designs.view", "production.view", "production.plan", "production.start", "production.cancel", "printers.view", "printers.control", "maintenance.view", "quality.view", "quality.inspect", "stock.view", "costs.view"],
  operator: ["production.view", "production.start", "printers.view", "printers.control", "stock.view", "stock.consume"],
  stock: ["catalog.view", "stock.view", "stock.adjust", "stock.purchase", "stock.discard", "suppliers.view", "suppliers.edit"],
  finance: ["orders.view", "finance.view", "finance.edit", "costs.view", "margins.view", "reports.view", "reports.export"],
  viewer: ["crm.view", "quotes.view", "orders.view", "catalog.view", "designs.view", "production.view", "printers.view", "stock.view", "suppliers.view", "quality.view", "reports.view"],
};

export function roleAllows(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
