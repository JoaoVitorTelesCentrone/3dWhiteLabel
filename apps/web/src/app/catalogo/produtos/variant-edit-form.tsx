"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateVariant, type ProductFormState } from "./actions";

type Variant = {
  id: string;
  name: string;
  sku: string;
  attributes: Record<string, string>;
  price_cents: number;
  cost_cents: number | null;
};
const initialState: ProductFormState = {};

export function VariantEditForm({ variant }: { variant: Variant }) {
  const [state, action, pending] = useActionState(updateVariant, initialState);
  const attributes = Object.entries(variant.attributes).map(([key, value]) => `${key}=${value}`).join(", ");
  const price = (variant.price_cents / 100).toFixed(2).replace(".", ",");
  const cost = variant.cost_cents == null ? "" : (variant.cost_cents / 100).toFixed(2).replace(".", ",");
  return (
    <details className="product-variant-edit">
      <summary>Editar variação</summary>
      <form action={action} className="product-variant-form">
        <input type="hidden" name="id" value={variant.id} />
        <label className="product-field">Nome<Input name="name" defaultValue={variant.name} required maxLength={120} /></label>
        <label className="product-field">SKU<Input name="sku" defaultValue={variant.sku} required maxLength={80} /></label>
        <label className="product-field">Preço de venda (R$)<Input name="price" defaultValue={price} inputMode="decimal" required /></label>
        <label className="product-field">Custo (R$)<Input name="cost" defaultValue={cost} inputMode="decimal" placeholder="Não informado" /></label>
        <label className="product-field">Atributos<Input name="attributes" defaultValue={attributes} maxLength={600} /></label>
        {state.error ? <p className="error" role="alert">{state.error}</p> : null}
        {state.success ? <p role="status">{state.success}</p> : null}
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar variação"}</Button>
      </form>
    </details>
  );
}
