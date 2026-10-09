"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { createPrinter, setPrinterActive, type PrinterState } from "./actions";

const initial: PrinterState = {};
export function PrinterForm() {
  const [state, action, pending] = useActionState(createPrinter, initial);
  return <form action={action} className="panel"><h2>Nova impressora</h2>
    <label>Nome <input name="name" required minLength={2} maxLength={120} /></label>
    <label>Modelo <input name="model" maxLength={120} /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Cadastrar impressora"}</Button>
  </form>;
}
export function PrinterActiveForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(setPrinterActive, initial);
  return <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="active" value={String(!active)} />
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : active ? "Desativar" : "Reativar"}</Button>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
  </form>;
}
