"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { changeQuoteStatus, createQuote, type QuoteState } from "./actions";

const initial: QuoteState = {};
type Option = { id: string; label: string };
type LinkedOpportunity = { id: string; title: string; customerId: string; customerName: string };
export function QuoteForm({ customers, opportunities, variants, revisions, linkedOpportunity }: {
  customers: Option[];
  opportunities: Option[];
  variants: Option[];
  revisions: Option[];
  linkedOpportunity?: LinkedOpportunity;
}) {
  const [state, action, pending] = useActionState(createQuote, initial);
  return <form action={action} className="panel"><h2>Novo orçamento</h2>
    <p>Informe o item e os custos por unidade. Os demais custos são opcionais.</p>
    {linkedOpportunity ? <><input name="customerId" type="hidden" value={linkedOpportunity.customerId} /><input name="opportunityId" type="hidden" value={linkedOpportunity.id} /><div className="quote-linked-opportunity"><strong>{linkedOpportunity.title}</strong><span>{linkedOpportunity.customerName}</span></div></> : <label>Cliente <select name="customerId" required defaultValue=""><option value="" disabled>Selecione</option>{customers.map((c) => <option value={c.id} key={c.id}>{c.label}</option>)}</select></label>}
    <label>Descrição do item <input name="description" minLength={2} maxLength={500} required /></label>
    <label>Quantidade <input name="quantity" type="number" min={1} max={100000} defaultValue={1} required /></label>
    <label>Material por unidade (R$) <input name="material" inputMode="decimal" defaultValue="0,00" required /></label>
    <label>Máquina por unidade (R$) <input name="machine" inputMode="decimal" defaultValue="0,00" required /></label>
    <label>Margem (%) <input name="margin" inputMode="decimal" defaultValue="30" required /></label>
    <details className="form-optional-fields">
      <summary>Mais opções de preço e produto</summary>
      <div className="form-optional-fields-content">
        {!linkedOpportunity ? <label>Oportunidade <select name="opportunityId" defaultValue=""><option value="">Nenhuma</option>{opportunities.map((o) => <option value={o.id} key={o.id}>{o.label}</option>)}</select></label> : null}
        <label>Variação do produto <select name="variantId" defaultValue=""><option value="">Nenhuma</option>{variants.map((v) => <option value={v.id} key={v.id}>{v.label}</option>)}</select></label>
        <label>Revisão do modelo <select name="revisionId" defaultValue=""><option value="">Usar a revisão da receita ativa</option>{revisions.map((r) => <option value={r.id} key={r.id}>{r.label}</option>)}</select></label>
        <label>Energia por unidade (R$) <input name="energy" inputMode="decimal" defaultValue="0,00" required /></label>
        <label>Mão de obra por unidade (R$) <input name="labor" inputMode="decimal" defaultValue="0,00" required /></label>
        <label>Consumíveis por unidade (R$) <input name="consumables" inputMode="decimal" defaultValue="0,00" required /></label>
        <label>Depreciação por unidade (R$) <input name="depreciation" inputMode="decimal" defaultValue="0,00" required /></label>
        <label>Risco (%) <input name="risk" inputMode="decimal" defaultValue="0" required /></label>
        <label>Taxas (%) <input name="fees" inputMode="decimal" defaultValue="0" required /></label>
      </div>
    </details>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending || !customers.length}>{pending ? "Calculando…" : "Criar orçamento"}</Button>
  </form>;
}

export function QuoteTransitionForm({ id, transition, label }: { id: string; transition: "sent" | "rejected" | "approved"; label: string }) {
  const [state, action, pending] = useActionState(changeQuoteStatus, initial);
  return <form action={action} className={transition === "rejected" ? "action-form action-form-danger" : "action-form"}><input type="hidden" name="id" value={id} /><input type="hidden" name="transition" value={transition} />
    <Button disabled={pending}>{pending ? "Salvando…" : label}</Button>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
  </form>;
}
