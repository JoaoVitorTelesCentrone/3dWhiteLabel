"use client";

import { useActionState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { createProduct, type ProductFormState } from "./actions";

const initialState: ProductFormState = {};

export function ProductForm() {
  const [state, action, pending] = useActionState(createProduct, initialState);
  return (
    <form action={action} className="panel">
      <h2>Novo produto</h2>
      <label>Nome <input name="name" required minLength={2} maxLength={160} /></label>
      <label>Categoria <input name="category" maxLength={80} /></label>
      <label>Descrição <textarea name="description" maxLength={4000} rows={3} /></label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Cadastrar produto"}</Button>
    </form>
  );
}
