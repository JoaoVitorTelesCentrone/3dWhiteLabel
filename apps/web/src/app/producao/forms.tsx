"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { cancelQueuedJob, completeJob, createJob, failJob, releaseOrder, startJob, type ProductionState } from "./actions";

const initial: ProductionState = {};
type Option = { id: string; label: string };
function Feedback({ state }: { state: ProductionState }) {
  return <>{state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}</>;
}
export function ReleaseOrderForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(releaseOrder, initial);
  return <form action={action} className="action-form"><input name="orderId" type="hidden" value={orderId} /><Button disabled={pending}>{pending ? "Enviando…" : "Enviar para produção"}</Button><Feedback state={state} /></form>;
}
export function JobForm({ requestId, productionOrderId, remaining, estimatedMinutes, estimatedG, spools }: { requestId: string; productionOrderId: string; remaining: number; estimatedMinutes?: number; estimatedG?: number; spools: Option[] }) {
  const [state, action, pending] = useActionState(createJob, initial);
  return <form action={action} className="action-form"><h3>Novo job</h3><input name="requestId" type="hidden" value={requestId} /><input name="productionOrderId" type="hidden" value={productionOrderId} />
    <label>Bobina <select name="spoolId" required defaultValue=""><option value="" disabled>Selecione</option>{spools.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
    <label>Quantidade (até {remaining}) <input name="quantity" type="number" min={1} max={remaining} defaultValue={remaining} required /></label>
    <label>Tempo estimado (min) <input name="estimatedMinutes" type="number" min={1} max={100000} defaultValue={estimatedMinutes} required /></label>
    <label>Material reservado (g) <input name="estimatedG" type="number" min={1} max={100000} defaultValue={estimatedG} required /></label>
    <Button type="submit" disabled={pending || !remaining || !spools.length}>{pending ? "Salvando…" : "Criar job"}</Button><Feedback state={state} />
  </form>;
}
export function CancelQueuedJobForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState(cancelQueuedJob, initial);
  return <form action={action} className="action-form"><input name="jobId" type="hidden" value={jobId} />
    <label>Motivo do cancelamento <input name="reason" required minLength={2} maxLength={500} /></label>
    <Button type="submit" disabled={pending}>{pending ? "Cancelando..." : "Cancelar job e liberar material"}</Button><Feedback state={state} />
  </form>;
}
export function StartJobForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState(startJob, initial);
  return <form action={action} className="action-form"><input name="jobId" type="hidden" value={jobId} /><Button disabled={pending}>{pending ? "Iniciando…" : "Iniciar impressão"}</Button><Feedback state={state} /></form>;
}
export function CompleteJobForm({ jobId, quantity, estimatedMinutes, estimatedG }: { jobId: string; quantity: number; estimatedMinutes: number; estimatedG: number }) {
  const [state, action, pending] = useActionState(completeJob, initial);
  return <form action={action} className="action-form"><h4>Concluir job</h4><input name="jobId" type="hidden" value={jobId} />
    <label>Tempo real (min) <input name="actualMinutes" type="number" min={1} max={1000000} defaultValue={estimatedMinutes} required /></label>
    <label>Consumo real (g) <input name="consumedG" type="number" min={0} max={estimatedG} defaultValue={estimatedG} required /></label>
    <label>Peças boas <input name="goodQty" type="number" min={0} max={quantity} defaultValue={quantity} required /></label>
    <label>Peças defeituosas <input name="badQty" type="number" min={0} max={quantity} defaultValue={0} required /></label>
    <Button disabled={pending}>{pending ? "Concluindo…" : "Concluir job"}</Button><Feedback state={state} />
  </form>;
}
export function FailJobForm({ jobId, running, estimatedMinutes, estimatedG }: { jobId: string; running: boolean; estimatedMinutes: number; estimatedG: number }) {
  const [state, action, pending] = useActionState(failJob, initial);
  return <form action={action} className="action-form"><input name="jobId" type="hidden" value={jobId} />
    <label>Motivo da falha <input name="reason" required minLength={2} maxLength={500} /></label>
    <label>Tempo utilizado (min) <input name="actualMinutes" type="number" min={running ? 1 : 0} max={1000000} defaultValue={running ? estimatedMinutes : 0} required /></label>
    <label>Material consumido (g) <input name="consumedG" type="number" min={0} max={running ? estimatedG : 0} defaultValue={running ? estimatedG : 0} required /></label>
    <Button disabled={pending}>{pending ? "Registrando…" : "Registrar falha"}</Button><Feedback state={state} />
  </form>;
}
