"use client";

import { useActionState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { createMaintenancePlan, recordMaintenance, type MaintenanceState } from "./actions";

const initial: MaintenanceState = {};
export function MaintenancePlanForm({ printers }: { printers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createMaintenancePlan, initial);
  return <form action={action} className="panel"><h2>Novo plano de manutenção</h2>
    <label>Impressora <select name="printerId" required defaultValue=""><option value="" disabled>Selecione</option>{printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Intervalo (horas de uso) <input name="intervalHours" type="number" min={1} max={100000} defaultValue={500} required /></label>
    <label>Alertar antes (horas) <input name="alertHours" type="number" min={0} max={100000} defaultValue={20} required /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending || !printers.length}>{pending ? "Salvando…" : "Criar plano"}</Button>
  </form>;
}
export function MaintenanceLogForm({ planId }: { planId: string }) {
  const [state, action, pending] = useActionState(recordMaintenance, initial);
  return <form action={action}><h3>Registrar serviço</h3><input name="planId" type="hidden" value={planId} />
    <label>Custo (R$) <input name="cost" inputMode="decimal" defaultValue="0,00" required /></label>
    <label>Serviço realizado <textarea name="notes" minLength={2} maxLength={4000} required rows={2} /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Registrando…" : "Registrar manutenção"}</Button>
  </form>;
}
