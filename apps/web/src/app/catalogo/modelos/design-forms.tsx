"use client";

import { useActionState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { createDesign, createRevision, type DesignFormState } from "./actions";

const initialState: DesignFormState = {};

export function DesignForm() {
  const [state, action, pending] = useActionState(createDesign, initialState);
  return <form action={action} className="panel"><h2>Novo modelo</h2>
    <label>Nome <input name="name" required minLength={2} maxLength={160} /></label>
    <label>Categoria <input name="category" maxLength={80} /></label>
    <label>Descrição <textarea name="description" maxLength={4000} rows={3} /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Cadastrar modelo"}</Button>
  </form>;
}

export function RevisionForm({ designId }: { designId: string }) {
  const [state, action, pending] = useActionState(createRevision, initialState);
  return <form action={action}><input type="hidden" name="designId" value={designId} />
    <label>Nova revisão <input name="version" required maxLength={40} placeholder="ex.: 1.0" /></label>
    <label>Observações <input name="notes" maxLength={4000} /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Criar revisão"}</Button>
  </form>;
}
