import { RecordCreateSheet } from "@/components/record-create-sheet";
import Link from "next/link";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { QuoteForm } from "@/app/orcamentos/forms";
import { OpportunityForm, OpportunityMoveForm, stageLabels } from "./forms";

export default async function OpportunitiesPage() {
  const context = await requireModulePermission("crm", "crm.view");
  const supabase = await createClient();
  const [{ data: opportunities, error }, { data: customers, error: customerError }, { data: quotes }, { data: variants }, { data: revisions }, { data: designs }] = await Promise.all([
    supabase.from("opportunities").select("id,customer_id,title,stage,notes,lost_reason").eq("tenant_id", context.tenantId).order("updated_at", { ascending: false }),
    supabase.from("customers").select("id,name").eq("tenant_id", context.tenantId).is("archived_at", null).order("name"),
    supabase.from("quotes").select("id,opportunity_id,number,status").eq("tenant_id", context.tenantId).not("opportunity_id", "is", null).order("number", { ascending: false }),
    supabase.from("product_variants").select("id,name,sku,active").eq("tenant_id", context.tenantId).eq("active", true).order("name"),
    supabase.from("design_revisions").select("id,design_id,version").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }),
    supabase.from("designs").select("id,name").eq("tenant_id", context.tenantId).eq("active", true),
  ]);
  const canEdit = roleAllows(context.role, "crm.edit") && context.licenseStatus !== "suspended";
  const canCreateQuote = context.modules.includes("quotes") && roleAllows(context.role, "quotes.create") && context.licenseStatus !== "suspended";
  const names = new Map(customers?.map((c) => [c.id, c.name]));
  const designNames = new Map(designs?.map((d) => [d.id, d.name]));
  const quoteStatusLabels: Record<string, string> = { draft: "Rascunho", sent: "Enviado", approved: "Aprovado", rejected: "Rejeitado" };
  return <main className="management-page">
    <header className="page-head management-page-head"><div className="page-head-main"><h1 className="page-title">Oportunidades</h1><p className="page-desc">Conduza a negociação, crie a proposta e gere o pedido quando o cliente aprovar.</p></div><div className="page-actions">{canEdit ? <RecordCreateSheet title="Nova oportunidade" description="Registre uma negociação e acompanhe suas etapas."><OpportunityForm customers={customers ?? []} /></RecordCreateSheet> : null}</div></header>
    {error || customerError ? <p className="error" role="alert">Não foi possível carregar as oportunidades.</p> : null}
    <div className="kanban opportunity-board" aria-label="Etapas das oportunidades">{Object.entries(stageLabels).map(([stage, label]) => {
      const items = opportunities?.filter((item) => item.stage === stage) ?? [];
      return <section className="panel kanban-column opportunity-stage" key={stage}><header className="kanban-column-head"><h2 className="kanban-column-title">{label}</h2><span className="kanban-count">{items.length}</span></header><div className="opportunity-cards">{items.map((item) => {
        const customerName = names.get(item.customer_id) ?? "Cliente indisponível";
        const relatedQuotes = quotes?.filter((quote) => quote.opportunity_id === item.id) ?? [];
        const canQuoteThisOpportunity = canCreateQuote && !["lost", "won"].includes(item.stage);
        return <article className="kanban-card" key={item.id}>
        <strong className="kanban-card-title">{item.title}</strong><p className="kanban-card-meta">{names.get(item.customer_id) ?? "Cliente indisponível"}</p>
        {item.notes ? <p className="opportunity-notes">{item.notes}</p> : null}{item.lost_reason ? <p className="opportunity-lost">Motivo: {item.lost_reason}</p> : null}
        <div className="opportunity-proposal-actions">
          {canQuoteThisOpportunity ? <RecordCreateSheet title="Criar proposta" description="Defina o item, o custo e a margem desta negociação."><QuoteForm
            customers={[]}
            opportunities={[]}
            variants={variants?.map((variant) => ({ id: variant.id, label: variant.sku + " · " + variant.name })) ?? []}
            revisions={revisions?.filter((revision) => designNames.has(revision.design_id)).map((revision) => ({ id: revision.id, label: designNames.get(revision.design_id) + " · " + revision.version })) ?? []}
            linkedOpportunity={{ id: item.id, title: item.title, customerId: item.customer_id, customerName }}
          /></RecordCreateSheet> : null}
          {relatedQuotes.length ? <Link className="opportunity-proposals-link" href={`/orcamentos?oportunidade=${item.id}`}>{relatedQuotes.length} proposta{relatedQuotes.length === 1 ? "" : "s"} · {quoteStatusLabels[relatedQuotes[0].status] ?? relatedQuotes[0].status}</Link> : null}
        </div>
        {canEdit ? <OpportunityMoveForm id={item.id} stage={item.stage} /> : null}
      </article>;
      })}</div>{!items.length ? <p className="opportunity-empty">Nenhuma oportunidade nesta etapa.</p> : null}</section>;
    })}</div>
    {!opportunities?.length && !error ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhuma oportunidade cadastrada</h2><p className="empty-state-hint">Registre uma negociação; a proposta é criada dentro dela.</p></div> : null}
    
  </main>;
}
