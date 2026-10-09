import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "./customer-form";
import { CustomerList } from "./customer-list";

export default async function CustomersPage() {
  const context = await requireModulePermission("crm", "crm.view");
  const supabase = await createClient();
  const canViewSales = context.modules.includes("orders") && roleAllows(context.role, "orders.view");
  const [{ data: customers, error }, { data: sales, error: salesError }] = await Promise.all([
    supabase.from("customers")
      .select("id, name, company_name, email, phone, notes, created_at")
      .eq("tenant_id", context.tenantId)
      .is("archived_at", null)
      .order("name"),
    canViewSales
      ? supabase.from("sales_orders")
        .select("id, customer_id, number, status, total_price_cents, created_at")
        .eq("tenant_id", context.tenantId)
        .neq("status", "canceled")
        .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  const canEdit = roleAllows(context.role, "crm.edit") && context.licenseStatus !== "suspended";

  return (
    <main className="management-page">
      <header className="page-head management-page-head">
        <div className="page-head-main">
          <p className="page-context">Cadastros · {context.tenantName}</p>
          <h1 className="page-title">Clientes</h1>
          <p className="page-desc">Cadastre os clientes usados nos pedidos.</p>
        </div>
        <div className="page-actions">
          {canEdit ? <RecordCreateSheet title="Cadastrar cliente" description="Adicione os dados de contato do cliente."><CustomerForm /></RecordCreateSheet> : null}
        </div>
      </header>
      {error ? <p className="error" role="alert">Não foi possível carregar a lista de clientes.</p> : null}
      {customers?.length ? <CustomerList customers={customers} sales={sales ?? []} canEdit={canEdit} canViewSales={canViewSales} salesError={Boolean(salesError)} /> : null}
      {!customers?.length && !error ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhum cliente cadastrado</h2><p className="empty-state-hint">Cadastre um cliente para registrar o primeiro pedido.</p></div> : null}
    </main>
  );
}
