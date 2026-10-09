import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { formatCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { summarizeProduction } from "@/lib/production-progress";
import { RecordCreateSheet } from "@/components/record-create-sheet";
import { OrderForm } from "./order-form";
import { type OrderRecord } from "./order-detail-sheet";
import { OrderTable } from "./order-table";

const PAGE_SIZE = 10;
const statuses = ["open", "in_production", "ready", "shipped", "delivered", "canceled"];
const statusLabels: Record<string, string> = {
  open: "Aberto", in_production: "Em produção", ready: "Pronto para envio",
  shipped: "Enviado", delivered: "Entregue", canceled: "Cancelado",
};

type OrderPageRow = {
  id: string;
  number: number;
  customer_id: string;
  customer_name: string;
  status: string;
  total_price_cents: number;
  total_cost_cents: number;
  created_at: string;
  item_summary: string;
  can_edit: boolean;
  edit_item_id: string | null;
  edit_variant_id: string | null;
  edit_quantity: number | null;
};

type OrderPageData = { rows: OrderPageRow[]; count: number; page: number };

export default async function OrdersPage({ searchParams }: {
  searchParams: Promise<{ pedido?: string; pagina?: string; busca?: string; status?: string }>;
}) {
  const context = await requireModulePermission("orders", "orders.view");
  const params = await searchParams;
  const selectedOrderId = params.pedido && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.pedido)
    ? params.pedido : undefined;
  const requestedPage = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);
  const search = (params.busca ?? "").trim().slice(0, 120);
  const status = statuses.includes(params.status ?? "") ? params.status! : "";
  const supabase = await createClient();
  const canCreate = roleAllows(context.role, "orders.create") && context.licenseStatus !== "suspended";
  const canDelete = roleAllows(context.role, "orders.cancel") && context.licenseStatus !== "suspended";
  const canRelease = roleAllows(context.role, "production.plan") && context.modules.includes("production") && context.licenseStatus !== "suspended";
  const canViewCosts = roleAllows(context.role, "costs.view");

  const [pageResult, customersResult, productsResult, variantsResult] = await Promise.all([
    supabase.rpc("list_sales_orders_page", {
      p_tenant_id: context.tenantId,
      p_page: requestedPage,
      p_page_size: PAGE_SIZE,
      p_search: search,
      p_status: status,
      p_selected_order_id: selectedOrderId ?? null,
    }),
    canCreate ? supabase.from("customers").select("id,name,archived_at").eq("tenant_id", context.tenantId).order("name") : Promise.resolve({ data: [], error: null }),
    canCreate ? supabase.from("products").select("id,name").eq("tenant_id", context.tenantId).eq("active", true) : Promise.resolve({ data: [], error: null }),
    canCreate ? supabase.from("product_variants").select("id,product_id,name,price_cents,cost_cents").eq("tenant_id", context.tenantId).eq("active", true).not("cost_cents", "is", null).order("name") : Promise.resolve({ data: [], error: null }),
  ]);
  const pageData = pageResult.data as OrderPageData | null;
  const rows = Array.isArray(pageData?.rows) ? pageData.rows : [];
  const orderIds = rows.map((row) => row.id);
  const productionResult = orderIds.length
    ? await supabase.from("production_orders").select("id,sales_order_id,target_qty,status").eq("tenant_id", context.tenantId).in("sales_order_id", orderIds)
    : { data: [], error: null };
  const productionIds = (productionResult.data ?? []).map((production) => production.id);
  const jobsResult = productionIds.length
    ? await supabase.from("production_jobs").select("production_order_id,status,quantity,good_qty").eq("tenant_id", context.tenantId).in("production_order_id", productionIds)
    : { data: [], error: null };
  const loadError = pageResult.error || customersResult.error || productsResult.error || variantsResult.error || productionResult.error || jobsResult.error || !pageData;

  const productNames = new Map(productsResult.data?.map((product) => [product.id, product.name]));
  const customerOptions = customersResult.data?.filter((customer) => !customer.archived_at).map((customer) => ({ id: customer.id, label: customer.name })) ?? [];
  const variantOptions = variantsResult.data?.filter((variant) => productNames.has(variant.product_id)).map((variant) => ({
    id: variant.id,
    label: `${productNames.get(variant.product_id)}${variant.name === "Padrão" ? "" : ` · ${variant.name}`} · ${formatCents(BigInt(variant.price_cents))}`,
  })) ?? [];
  const productionByOrder = new Map<string, Array<{ id: string; sales_order_id: string; target_qty: number; status: string }>>();
  for (const production of productionResult.data ?? []) {
    const linked = productionByOrder.get(production.sales_order_id) ?? [];
    linked.push(production);
    productionByOrder.set(production.sales_order_id, linked);
  }
  const jobsByProduction = new Map<string, Array<{ production_order_id: string; status: string; quantity: number; good_qty: number | null }>>();
  for (const job of jobsResult.data ?? []) {
    const linked = jobsByProduction.get(job.production_order_id) ?? [];
    linked.push(job);
    jobsByProduction.set(job.production_order_id, linked);
  }
  const records: OrderRecord[] = rows.map((row) => {
    const linkedProduction = productionByOrder.get(row.id) ?? [];
    const linkedJobs = linkedProduction.flatMap((production) => jobsByProduction.get(production.id) ?? []);
    return {
      id: row.id,
      number: row.number,
      customerId: row.customer_id,
      customerName: row.customer_name,
      status: row.status,
      statusLabel: statusLabels[row.status] ?? row.status,
      statusStyle: row.status,
      totalPriceCents: row.total_price_cents,
      totalCostCents: canViewCosts ? row.total_cost_cents : 0,
      createdAt: row.created_at,
      itemSummary: row.item_summary,
      items: row.can_edit && row.edit_item_id && row.edit_quantity ? [{
        id: row.edit_item_id, description: "", quantity: row.edit_quantity,
        unitPriceCents: 0, variantId: row.edit_variant_id, hasRevision: false,
      }] : [],
      canEdit: canCreate && row.can_edit,
      canDelete: canDelete && row.can_edit,
      canRelease: canRelease && row.status === "open",
      canShip: canCreate,
      canViewCosts,
      production: linkedProduction.length ? summarizeProduction(linkedProduction, linkedJobs) : null,
    };
  });
  const totalCount = pageData?.count ?? 0;
  const currentPage = pageData?.page ?? 1;

  return <main className="management-page">
    <header className="page-head management-page-head">
      <div className="page-head-main"><h1 className="page-title">Pedidos</h1><p className="page-desc">Cadastre, acompanhe e corrija pedidos da sua operação.</p></div>
      <div className="page-actions">{canCreate ? <RecordCreateSheet title="Novo pedido" description="Escolha o cliente, o produto e a quantidade vendida."><OrderForm customers={customerOptions} variants={variantOptions} /></RecordCreateSheet> : null}</div>
    </header>
    {loadError ? <p className="error" role="alert">Não foi possível carregar os pedidos. Atualize a página para tentar novamente.</p> : null}
    {!loadError && (totalCount > 0 || search || status) ? <section className="order-results" aria-label="Pedidos cadastrados">
      <div className="order-list-summary">{totalCount} pedido{totalCount === 1 ? "" : "s"} {search || status ? "encontrado" : "cadastrado"}{totalCount === 1 ? "" : "s"}</div>
      <OrderTable orders={records} customers={customerOptions} variants={variantOptions} canViewCosts={canViewCosts} canChangeStatus={canCreate} canRelease={canRelease} selectedOrderId={selectedOrderId} page={currentPage} totalCount={totalCount} search={search} status={status} />
    </section> : null}
    {!loadError && totalCount === 0 && !search && !status ? <div className="empty-state"><h2 className="empty-state-title">Nenhum pedido cadastrado</h2><p className="empty-state-hint">Registre a venda com cliente, produto e quantidade para iniciar a operação.</p></div> : null}
  </main>;
}
