"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { deliverOrder, shipOrder, type ShipmentState } from "./actions";

const initial: ShipmentState = {};
export function ShipOrderForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(shipOrder, initial);
  return <form action={action} className="action-form"><h3>Expedir pedido</h3><input name="id" type="hidden" value={id} />
    <label>Transportadora <input name="carrier" maxLength={120} /></label>
    <label>Rastreio <input name="trackingCode" maxLength={160} /></label>
    <Button type="submit" disabled={pending}>{pending ? "Expedindo…" : "Marcar como expedido"}</Button>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
  </form>;
}
export function DeliverOrderForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deliverOrder, initial);
  return <form action={action} className="action-form"><input name="id" type="hidden" value={id} /><Button type="submit" disabled={pending}>{pending ? "Confirmando…" : "Confirmar entrega"}</Button>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
  </form>;
}
