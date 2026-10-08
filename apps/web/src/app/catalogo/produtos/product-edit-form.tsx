"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProduct, type ProductFormState } from "./actions";

type Product = { id: string; name: string; category: string | null; description: string | null };
const initialState: ProductFormState = {};

export function ProductEditForm({ product }: { product: Product }) {
  const [state, action, pending] = useActionState(updateProduct, initialState);
  return (
    <form action={action} className="product-edit-fields">
      <input type="hidden" name="id" value={product.id} />
      <label className="product-field">Nome<Input name="name" defaultValue={product.name} required minLength={2} maxLength={160} /></label>
      <label className="product-field">Categoria<Input name="category" defaultValue={product.category ?? ""} maxLength={80} /></label>
      <label className="product-field">Descrição<textarea className="product-textarea" name="description" defaultValue={product.description ?? ""} maxLength={4000} rows={3} /></label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar produto"}</Button>
    </form>
  );
}
