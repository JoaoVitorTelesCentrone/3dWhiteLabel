"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { createOpportunity, moveOpportunity, type OpportunityState } from "./actions";

const initial: OpportunityState = {};
export const stageLabels: Record<string, string> = {
  lead: "Lead", contact: "Contato", quote_requested: "Orçamento solicitado",
  quote_sent: "Orçamento enviado", negotiation: "Negociação", won: "Ganho", lost: "Perdido",
};

export function OpportunityForm({ customers }: { customers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createOpportunity, initial);
  return <form action={action} className="panel"><h2>Nova oportunidade</h2>
    <label>Cliente <select name="customerId" required defaultValue=""><option value="" disabled>Selecione</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>Título <input name="title" required minLength={2} maxLength={160} /></label>
    <label>Observações <textarea name="notes" maxLength={4000} rows={3} /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending || !customers.length}>{pending ? "Salvando…" : "Cadastrar oportunidade"}</Button>
  </form>;
}

export function OpportunityMoveForm({ id, stage }: { id: string; stage: string }) {
  const [state, action, pending] = useActionState(moveOpportunity, initial);
  return <form action={action}><input name="id" type="hidden" value={id} />
    <label>Etapa <select name="stage" defaultValue={stage}>{Object.entries(stageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label>Motivo da perda (quando aplicável) <input name="lostReason" maxLength={500} /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Atualizar etapa"}</Button>
  </form>;
}
