import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { archiveCustomer } from "./actions";
import { CustomerForm } from "./customer-form";
import { CustomerEditForm } from "./customer-edit-form";

export default async function CustomersPage() {
  const context = await requireModulePermission("crm", "crm.view");
  const supabase = await createClient();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, company_name, email, phone, notes, created_at")
    .eq("tenant_id", context.tenantId)
    .is("archived_at", null)
    .order("name");
  const canEdit = roleAllows(context.role, "crm.edit") && context.licenseStatus !== "suspended";

  return (
    <main className="management-page">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Cadastros · {context.tenantName}</p><h1 className="page-title">Clientes</h1><p className="page-desc">Cadastre os clientes usados nos pedidos.</p></div><div className="page-actions">{canEdit ? <RecordCreateSheet title="Cadastrar cliente" description="Adicione os dados de contato do cliente."><CustomerForm /></RecordCreateSheet> : null}</div></header>
      {error ? <p className="error" role="alert">Não foi possível carregar a lista de clientes.</p> : null}
      {customers?.length ? (
        <section className="panel" aria-label="Lista de clientes">
          {customers.map((customer) => (
            <article className="customer-record" key={customer.id}>
              <header><div><h2>{customer.name}</h2>{customer.company_name ? <p>{customer.company_name}</p> : null}</div><span className="customer-since">Cliente desde {new Date(customer.created_at).toLocaleDateString("pt-BR")}</span></header>
              <p>{[customer.email, customer.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</p>
              {canEdit ? (
                <>
                  <CustomerEditForm customer={customer} />
                  <form action={archiveCustomer} className="action-form action-form-danger">
                    <input type="hidden" name="id" value={customer.id} />
                    <button type="submit">Arquivar cliente</button>
                  </form>
                </>
              ) : null}
            </article>
          ))}
        </section>
      ) : !error ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhum cliente cadastrado</h2><p className="empty-state-hint">Cadastre um cliente para registrar o primeiro pedido.</p></div> : null}
      
    </main>
  );
}
