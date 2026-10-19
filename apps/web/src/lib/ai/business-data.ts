import "server-only";

import { roleAllows, type Permission } from "@/lib/auth/permissions";
import type { TenantContext } from "@/lib/tenant/context";
import type { createClient } from "@/lib/supabase/server";

export type BusinessArea = "overview" | "orders" | "customers" | "production" | "inventory" | "finance" | "catalog" | "quotes";
export type BusinessQuery = { area: BusinessArea; query: string | null; days: number; limit: number; includeContact: boolean };
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
const AI_QUERY_ROW_CAP = 1_000;

const access: Record<Exclude<BusinessArea, "overview">, { permission: Permission; module?: TenantContext["modules"][number] }> = {
  orders: { permission: "orders.view", module: "orders" },
  customers: { permission: "crm.view", module: "crm" },
  production: { permission: "production.view", module: "production" },
  inventory: { permission: "stock.view", module: "stock" },
  finance: { permission: "finance.view" },
  catalog: { permission: "catalog.view", module: "catalog" },
  quotes: { permission: "quotes.view", module: "quotes" },
};

function canAccess(context: TenantContext, area: Exclude<BusinessArea, "overview">) {
  const rule = access[area];
  return roleAllows(context.role, rule.permission) && (!rule.module || context.modules.includes(rule.module));
}

function bounded(input: BusinessQuery) {
  return {
    days: Math.min(Math.max(Math.trunc(input.days), 1), 3650),
    limit: Math.min(Math.max(Math.trunc(input.limit), 1), 25),
    query: input.query?.trim().slice(0, 120) || "",
  };
}

function since(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function groupCount(values: Array<string | null | undefined>) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = value || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

async function overview(supabase: SupabaseClient, context: TenantContext, days: number) {
  const start = since(days);
  const [customers, orders, jobs, products, spools, printers] = await Promise.all([
    canAccess(context, "customers") ? supabase.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).is("archived_at", null) : null,
    canAccess(context, "orders") ? supabase.from("sales_orders").select("status,total_price_cents,total_cost_cents,created_at", { count: "exact" }).eq("tenant_id", context.tenantId).gte("created_at", start).neq("status", "canceled").limit(AI_QUERY_ROW_CAP) : null,
    canAccess(context, "production") ? supabase.from("production_jobs").select("status,good_qty,bad_qty,actual_minutes,created_at", { count: "exact" }).eq("tenant_id", context.tenantId).gte("created_at", start).limit(AI_QUERY_ROW_CAP) : null,
    canAccess(context, "catalog") ? supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("active", true) : null,
    canAccess(context, "inventory") ? supabase.from("material_spools").select("status,current_gross_g,tare_g", { count: "exact" }).eq("tenant_id", context.tenantId).limit(AI_QUERY_ROW_CAP) : null,
    canAccess(context, "production") ? supabase.from("printers").select("status").eq("tenant_id", context.tenantId).eq("active", true).limit(500) : null,
  ]);
  const error = customers?.error ?? orders?.error ?? jobs?.error ?? products?.error ?? spools?.error ?? printers?.error;
  if (error) throw error;
  const orderRows = orders?.data ?? [];
  const jobRows = jobs?.data ?? [];
  const spoolRows = spools?.data ?? [];
  return {
    company: context.tenantName,
    periodDays: days,
    customers: customers?.count ?? null,
    activeProducts: products?.count ?? null,
    orders: orderRows.length ? {
      count: orderRows.length,
      byStatus: groupCount(orderRows.map((row) => row.status)),
      revenueCents: orderRows.reduce((sum, row) => sum + row.total_price_cents, 0),
      plannedCostCents: roleAllows(context.role, "costs.view") ? orderRows.reduce((sum, row) => sum + row.total_cost_cents, 0) : null,
    } : canAccess(context, "orders") ? { count: 0, byStatus: {}, revenueCents: 0, plannedCostCents: roleAllows(context.role, "costs.view") ? 0 : null } : null,
    production: canAccess(context, "production") ? {
      jobs: jobRows.length,
      byStatus: groupCount(jobRows.map((row) => row.status)),
      goodQty: jobRows.reduce((sum, row) => sum + (row.good_qty ?? 0), 0),
      badQty: jobRows.reduce((sum, row) => sum + (row.bad_qty ?? 0), 0),
      printersByStatus: groupCount((printers?.data ?? []).map((row) => row.status)),
    } : null,
    inventory: canAccess(context, "inventory") ? {
      spoolsByStatus: groupCount(spoolRows.map((row) => row.status)),
      availableMaterialG: spoolRows.reduce((sum, row) => sum + Math.max(0, row.current_gross_g - row.tare_g), 0),
    } : null,
    limits: {
      truncated: Boolean(
        (orders?.count ?? 0) > orderRows.length ||
        (jobs?.count ?? 0) > jobRows.length ||
        (spools?.count ?? 0) > spoolRows.length,
      ),
      rowCap: AI_QUERY_ROW_CAP,
    },
  };
}

async function orders(supabase: SupabaseClient, context: TenantContext, query: string, limit: number) {
  const result = await supabase.rpc("list_sales_orders_page", {
    p_tenant_id: context.tenantId, p_page: 1, p_page_size: limit, p_search: query, p_status: "", p_selected_order_id: null,
  });
  if (result.error) throw result.error;
  const payload = result.data as { rows?: Array<Record<string, unknown>>; count?: number } | null;
  const mayViewCosts = roleAllows(context.role, "costs.view");
  return {
    totalMatches: payload?.count ?? 0,
    orders: (payload?.rows ?? []).map((row) => ({
      number: row.number, customer: row.customer_name, status: row.status, items: row.item_summary,
      totalPriceCents: row.total_price_cents, totalCostCents: mayViewCosts ? row.total_cost_cents : undefined,
      createdAt: row.created_at,
    })),
  };
}

async function customers(supabase: SupabaseClient, context: TenantContext, query: string, limit: number, includeContact: boolean) {
  let request = supabase.from("customers").select("name,company_name,email,phone,notes,created_at").eq("tenant_id", context.tenantId).is("archived_at", null).order("name").limit(limit);
  const safeQuery = query.replace(/[%_]/g, "");
  if (safeQuery) request = request.ilike("name", `%${safeQuery}%`);
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []).map((customer) => ({
    name: customer.name, company: customer.company_name, notes: customer.notes,
    email: includeContact ? customer.email : undefined, phone: includeContact ? customer.phone : undefined,
    customerSince: customer.created_at,
  }));
}

async function production(supabase: SupabaseClient, context: TenantContext, limit: number) {
  const [ordersResult, jobsResult, printersResult] = await Promise.all([
    supabase.from("production_orders").select("id,sales_order_id,target_qty,status,created_at").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }).limit(Math.min(limit, AI_QUERY_ROW_CAP)),
    supabase.from("production_jobs").select("production_order_id,status,quantity,good_qty,bad_qty,estimated_minutes,actual_minutes,estimated_g,consumed_g,printer_id,created_at").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }).limit(Math.min(limit * 3, AI_QUERY_ROW_CAP)),
    supabase.from("printers").select("id,name,model,status,runtime_min").eq("tenant_id", context.tenantId).eq("active", true).limit(500),
  ]);
  if (ordersResult.error || jobsResult.error || printersResult.error) throw ordersResult.error ?? jobsResult.error ?? printersResult.error;
  const printerNames = new Map((printersResult.data ?? []).map((printer) => [printer.id, printer.name]));
  return {
    productionOrders: ordersResult.data,
    jobs: (jobsResult.data ?? []).map((job) => ({ ...job, printer: job.printer_id ? printerNames.get(job.printer_id) ?? null : null, printer_id: undefined })),
    printers: printersResult.data,
  };
}

async function inventory(supabase: SupabaseClient, context: TenantContext, limit: number) {
  const [materialsResult, spoolsResult, stockResult, variantsResult, productsResult] = await Promise.all([
    supabase.from("materials").select("id,name,kind,color,cost_per_kg_cents,active").eq("tenant_id", context.tenantId).eq("active", true).limit(limit),
    supabase.from("material_spools").select("material_id,code,tare_g,current_gross_g,status,updated_at").eq("tenant_id", context.tenantId).order("updated_at", { ascending: false }).limit(limit * 3),
    supabase.from("finished_goods_stock").select("product_variant_id,quantity,updated_at").eq("tenant_id", context.tenantId).order("quantity", { ascending: false }).limit(limit),
    supabase.from("product_variants").select("id,product_id,name,sku").eq("tenant_id", context.tenantId).limit(1000),
    supabase.from("products").select("id,name").eq("tenant_id", context.tenantId).limit(500),
  ]);
  const error = materialsResult.error || spoolsResult.error || stockResult.error || variantsResult.error || productsResult.error;
  if (error) throw error;
  const materials = new Map((materialsResult.data ?? []).map((material) => [material.id, material.name]));
  const products = new Map((productsResult.data ?? []).map((product) => [product.id, product.name]));
  const variants = new Map((variantsResult.data ?? []).map((variant) => [variant.id, { name: products.get(variant.product_id), variant: variant.name, sku: variant.sku }]));
  const mayViewCosts = roleAllows(context.role, "costs.view");
  return {
    materials: (materialsResult.data ?? []).map((material) => ({
      id: material.id,
      name: material.name,
      kind: material.kind,
      color: material.color,
      active: material.active,
      costPerKgCents: mayViewCosts ? material.cost_per_kg_cents : undefined,
    })),
    spools: (spoolsResult.data ?? []).map((spool) => ({ ...spool, material: materials.get(spool.material_id) ?? null, availableG: Math.max(0, spool.current_gross_g - spool.tare_g), material_id: undefined })),
    finishedGoods: (stockResult.data ?? []).map((stock) => ({ ...variants.get(stock.product_variant_id), quantity: stock.quantity, updatedAt: stock.updated_at })),
  };
}

async function finance(supabase: SupabaseClient, context: TenantContext, days: number) {
  const start = since(days);
  const date = start.slice(0, 10);
  const [ordersResult, paymentsResult, expensesResult] = await Promise.all([
    supabase.from("sales_orders").select("total_price_cents,total_cost_cents,status", { count: "exact" }).eq("tenant_id", context.tenantId).gte("created_at", start).neq("status", "canceled").limit(AI_QUERY_ROW_CAP),
    supabase.from("order_payments").select("amount_cents,method,received_at", { count: "exact" }).eq("tenant_id", context.tenantId).gte("received_at", start).limit(AI_QUERY_ROW_CAP),
    supabase.from("operational_expenses").select("amount_cents,category,incurred_on", { count: "exact" }).eq("tenant_id", context.tenantId).gte("incurred_on", date).limit(AI_QUERY_ROW_CAP),
  ]);
  if (ordersResult.error || paymentsResult.error || expensesResult.error) throw ordersResult.error ?? paymentsResult.error ?? expensesResult.error;
  const orderRows = ordersResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  return {
    periodDays: days,
    salesCents: orderRows.reduce((sum, row) => sum + row.total_price_cents, 0),
    plannedCostCents: roleAllows(context.role, "costs.view") ? orderRows.reduce((sum, row) => sum + row.total_cost_cents, 0) : null,
    receivedCents: payments.reduce((sum, row) => sum + row.amount_cents, 0),
    expensesCents: expenses.reduce((sum, row) => sum + row.amount_cents, 0),
    paymentsByMethod: groupCount(payments.map((row) => row.method)),
    expensesByCategory: expenses.reduce<Record<string, number>>((totals, row) => { totals[row.category] = (totals[row.category] ?? 0) + row.amount_cents; return totals; }, {}),
    limits: {
      truncated: Boolean(
        (ordersResult.count ?? 0) > orderRows.length ||
        (paymentsResult.count ?? 0) > payments.length ||
        (expensesResult.count ?? 0) > expenses.length,
      ),
      rowCap: AI_QUERY_ROW_CAP,
    },
  };
}

async function catalog(supabase: SupabaseClient, context: TenantContext, query: string, limit: number) {
  let productRequest = supabase.from("products").select("id,name,category,description,active").eq("tenant_id", context.tenantId).order("name").limit(limit);
  if (query) productRequest = productRequest.ilike("name", `%${query.replace(/[%_]/g, "")}%`);
  const productsResult = await productRequest;
  if (productsResult.error) throw productsResult.error;
  const ids = (productsResult.data ?? []).map((product) => product.id);
  const variantsResult = ids.length ? await supabase.from("product_variants").select("product_id,name,sku,price_cents,cost_cents,active").eq("tenant_id", context.tenantId).in("product_id", ids).limit(Math.min(limit * 20, AI_QUERY_ROW_CAP)) : { data: [], error: null };
  if (variantsResult.error) throw variantsResult.error;
  const mayViewCosts = roleAllows(context.role, "costs.view");
  return (productsResult.data ?? []).map((product) => ({ ...product, variants: (variantsResult.data ?? []).filter((variant) => variant.product_id === product.id).map((variant) => ({ name: variant.name, sku: variant.sku, priceCents: variant.price_cents, costCents: mayViewCosts ? variant.cost_cents : undefined, active: variant.active })) }));
}

async function quotes(supabase: SupabaseClient, context: TenantContext, days: number, limit: number) {
  const { data, error } = await supabase.from("quotes").select("number,status,total_price_cents,total_cost_cents,margin_bps,created_at,sent_at,approved_at").eq("tenant_id", context.tenantId).gte("created_at", since(days)).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  const mayViewCosts = roleAllows(context.role, "costs.view");
  return (data ?? []).map((quote) => ({ ...quote, total_cost_cents: mayViewCosts ? quote.total_cost_cents : undefined, margin_bps: roleAllows(context.role, "margins.view") ? quote.margin_bps : undefined }));
}

export async function consultBusinessData(supabase: SupabaseClient, context: TenantContext, input: BusinessQuery) {
  const { days, limit, query } = bounded(input);
  if (input.area !== "overview" && !canAccess(context, input.area)) return { error: `Sem permissão para consultar ${input.area}.` };
  switch (input.area) {
    case "overview": return overview(supabase, context, days);
    case "orders": return orders(supabase, context, query, limit);
    case "customers": return customers(supabase, context, query, limit, input.includeContact);
    case "production": return production(supabase, context, limit);
    case "inventory": return inventory(supabase, context, limit);
    case "finance": return finance(supabase, context, days);
    case "catalog": return catalog(supabase, context, query, limit);
    case "quotes": return quotes(supabase, context, days, limit);
  }
}
