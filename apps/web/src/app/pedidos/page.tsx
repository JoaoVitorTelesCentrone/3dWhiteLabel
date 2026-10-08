import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { formatCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { summarizeProduction } from "@/lib/production-progress";
import { RecordCreateSheet } from "@/components/record-create-sheet";
import { OrderForm } from "./order-form";
import { type OrderRecord } from "./order-detail-sheet";
import { OrderTable } from "./order-table";

const statusLabels: Record<string, string> = {
  open: "Aberto", in_production: "Em produção", ready: "Pronto para envio",
  shipped: "Enviado", delivered: "Entregue", canceled: "Cancelado",
};
const statusStyles: Record<string, string> = {
  open: "open", in_production: "in_production", ready: "ready",
  shipped: "shipped", delivered: "delivered", canceled: "canceled",
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const context = await requireModulePermission("orders", "orders.view");
  const selectedOrderId = (await searchParams).pedido;
  const supabase = await createClient();
  const [ordersResult, itemsResult, customersResult, productsResult, variantsResult, shipmentsResult, paymentsResult, productionResult, jobsResult] = await Promise.all([
    supabase.from("sales_orders").select("id,number,customer_id,quote_id,status,total_price_cents,total_cost_cents,created_at").eq("tenant_id", context.tenantId).order("number", { ascending: false }),
    supabase.from("sales_order_items").select("id,order_id,product_variant_id,quote_item_id,description,quantity,unit_price_cents,design_revision_id").eq("tenant_id", context.tenantId),
    supabase.from("customers").select("id,name,archived_at").eq("tenant_id", context.tenantId),
    supabase.from("products").select("id,name").eq("tenant_id", context.tenantId).eq("active", true),
    supabase.from("product_variants").select("id,product_id,name,price_cents,cost_cents").eq("tenant_id", context.tenantId).eq("active", true).not("cost_cents", "is", null).order("name"),
    supabase.from("order_shipments").select("order_id,carrier,tracking_code,shipped_at,delivered_at").eq("tenant_id", context.tenantId),
    supabase.from("order_payments").select("order_id").eq("tenant_id", context.tenantId),
    supabase.from("production_orders").select("id,sales_order_id,target_qty,status").eq("tenant_id", context.tenantId),
    supabase.from("production_jobs").select("production_order_id,status,quantity,good_qty").eq("tenant_id", context.tenantId),
  ]);
  const loadError = ordersResult.error || itemsResult.error || customersResult.error || productsResult.error || variantsResult.error || shipmentsResult.error;
  const names = new Map(customersResult.data?.map((customer) => [customer.id, customer.name]));
  const productNames = new Map(productsResult.data?.map((product) => [product.id, product.name]));
  const customerOptions = customersResult.data?.filter((customer) => !customer.archived_at).map((customer) => ({ id: customer.id, label: customer.name })) ?? [];
  const variantOptions = variantsResult.data?.filter((variant) => productNames.has(variant.product_id)).map((variant) => ({
    id: variant.id,
    label: `${productNames.get(variant.product_id)}${variant.name === "Padrão" ? "" : ` · ${variant.name}`} · ${formatCents(BigInt(variant.price_cents))}`,
  })) ?? [];
  const hasPayment = new Set(paymentsResult.data?.map((payment) => payment.order_id));
  const hasProduction = new Set(productionResult.data?.map((production) => production.sales_order_id));
  const hasShipment = new Set(shipmentsResult.data?.map((shipment) => shipment.order_id));
  const canCreate = roleAllows(context.role, "orders.create") && context.licenseStatus !== "suspended";
  const canDelete = roleAllows(context.role, "orders.cancel") && context.licenseStatus !== "suspended";
  const canRelease = roleAllows(context.role, "production.plan") && context.modules.includes("production") && context.licenseStatus !== "suspended";
  const canViewCosts = roleAllows(context.role, "costs.view");
  const records: OrderRecord[] = (ordersResult.data ?? []).map((order) => {
    const orderItems = itemsResult.data?.filter((item) => item.order_id === order.id) ?? [];
    const linkedProduction = productionResult.data?.filter((production) => production.sales_order_id === order.id) ?? [];
    const production = linkedProduction.length ? summarizeProduction(linkedProduction, jobsResult.data ?? []) : null;
    const editable = order.status === "open" && !order.quote_id && orderItems.length === 1
      && !orderItems[0].quote_item_id && !hasPayment.has(order.id) && !hasProduction.has(order.id) && !hasShipment.has(order.id);
    return {
      id: order.id,
      number: order.number,
      customerId: order.customer_id,
      customerName: names.get(order.customer_id) ?? "Cliente arquivado",
      status: order.status,
      statusLabel: statusLabels[order.status] ?? order.status,
      statusStyle: statusStyles[order.status] ?? "planned",
      totalPriceCents: order.total_price_cents,
      totalCostCents: order.total_cost_cents,
      createdAt: order.created_at,
      items: orderItems.map((item) => ({
        id: item.id, description: item.description, quantity: item.quantity,
        unitPriceCents: item.unit_price_cents, variantId: item.product_variant_id,
        hasRevision: Boolean(item.design_revision_id),
      })),
      shipments: (shipmentsResult.data ?? []).filter((shipment) => shipment.order_id === order.id).map((shipment) => ({
        carrier: shipment.carrier, trackingCode: shipment.tracking_code,
        shippedAt: shipment.shipped_at, deliveredAt: shipment.delivered_at,
      })),
      canEdit: canCreate && editable,
      canDelete: canDelete && editable,
      canRelease: canRelease && order.status === "open",
      canShip: canCreate,
      canViewCosts,
      production,
    };
  });

  return <main className="management-page">
    <header className="page-head management-page-head">
      <div className="page-head-main"><h1 className="page-title">Pedidos</h1><p className="page-desc">Cadastre, acompanhe e corrija pedidos da sua operação.</p></div>
      <div className="page-actions">{canCreate ? <RecordCreateSheet title="Novo pedido" description="Escolha o cliente, o produto e a quantidade vendida."><OrderForm customers={customerOptions} variants={variantOptions} /></RecordCreateSheet> : null}</div>
    </header>
    {loadError ? <p className="error" role="alert">Não foi possível carregar os pedidos. Atualize a página para tentar novamente.</p> : null}
    {!loadError && records.length ? <section className="order-results" aria-label="Pedidos cadastrados">
      <div className="order-list-summary">{records.length} pedido{records.length === 1 ? "" : "s"} cadastrado{records.length === 1 ? "" : "s"}</div>
      <OrderTable orders={records} customers={customerOptions} variants={variantOptions} canViewCosts={canViewCosts} canChangeStatus={canCreate} canRelease={canRelease} selectedOrderId={selectedOrderId} />
    </section> : null}
    {!loadError && !records.length ? <div className="empty-state"><h2 className="empty-state-title">Nenhum pedido cadastrado</h2><p className="empty-state-hint">Registre a venda com cliente, produto e quantidade para iniciar a operação.</p></div> : null}
  </main>;
}
