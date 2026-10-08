import Link from "next/link";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { formatCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { QuoteTransitionForm } from "./forms";

const quoteStatusLabels: Record<string, string> = { draft: "Rascunho", sent: "Enviado", approved: "Aprovado", rejected: "Rejeitado" };
const quoteStatusStyles: Record<string, string> = { draft: "planned", sent: "in_progress", approved: "completed", rejected: "canceled" };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ oportunidade?: string }> }) {
  const context = await requireModulePermission("quotes", "quotes.view");
  const supabase = await createClient();
  const opportunityId = (await searchParams).oportunidade;
  const quoteQuery = supabase.from("quotes").select("id,number,customer_id,status,total_price_cents,created_at,opportunity_id").eq("tenant_id", context.tenantId).order("number", { ascending: false });
  const [{ data: quotes, error }, { data: items, error: itemError }, { data: customers }] = await Promise.all([
    opportunityId ? quoteQuery.eq("opportunity_id", opportunityId) : quoteQuery,
    supabase.from("quote_items").select("quote_id,description,quantity,unit_price_cents").eq("tenant_id", context.tenantId),
    supabase.from("customers").select("id,name").eq("tenant_id", context.tenantId).is("archived_at", null).order("name"),
  ]);
  const names = new Map(customers?.map((c) => [c.id, c.name]));
  const canApprove = roleAllows(context.role, "quotes.approve") && context.licenseStatus !== "suspended";
  return <main className="management-page">
    <header className="page-head management-page-head"><div className="page-head-main"><h1 className="page-title">Propostas</h1><p className="page-desc">Acompanhe a proposta desta negociação. Novas propostas são criadas dentro da oportunidade.</p></div><div className="page-actions"><Link className="btn btn-secondary" href="/oportunidades">Voltar para oportunidades</Link></div></header>
    {error || itemError ? <p className="error" role="alert">Não foi possível carregar os orçamentos.</p> : null}
    {quotes?.map((quote) => <section className="panel commerce-record" key={quote.id}>
      <header className="panel-head"><div><p className="record-kicker">{names.get(quote.customer_id) ?? "Cliente arquivado"}</p><h2 className="panel-title">Orçamento #{quote.number}</h2></div><span className={`status-chip status-chip--${quoteStatusStyles[quote.status] ?? "planned"}`}>{quoteStatusLabels[quote.status] ?? quote.status}</span></header>
      <div className="record-lines">{items?.filter((item) => item.quote_id === quote.id).map((item) => <div className="record-line" key={item.description}><span>{item.quantity} × {item.description}</span><small>{formatCents(BigInt(item.unit_price_cents))} por unidade</small></div>)}</div>
      <div className="record-total"><span>Valor do orçamento</span><strong>{formatCents(BigInt(quote.total_price_cents))}</strong></div>
      {canApprove && quote.status === "draft" ? <QuoteTransitionForm id={quote.id} transition="sent" label="Marcar como enviado" /> : null}
      {canApprove && quote.status === "sent" ? <><QuoteTransitionForm id={quote.id} transition="approved" label="Aprovar e criar pedido" /><QuoteTransitionForm id={quote.id} transition="rejected" label="Marcar como rejeitado" /></> : null}
    </section>)}
    {!quotes?.length && !error ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhuma proposta nesta negociação</h2><p className="empty-state-hint">Volte para a oportunidade e crie a primeira proposta.</p></div> : null}
    
  </main>;
}
