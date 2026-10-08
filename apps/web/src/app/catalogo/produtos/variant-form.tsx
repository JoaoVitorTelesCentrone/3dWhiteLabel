"use client";

import { useActionState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/ui/input";
import { createVariant, type ProductFormState } from "./actions";

const initialState: ProductFormState = {};

export function VariantForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(createVariant, initialState);
  return (
    <form action={action} className="product-variant-form">
      <input type="hidden" name="productId" value={productId} />
      <label className="product-field">Nome da variação<Input name="name" placeholder="Tamanho G, kit com 3…" required maxLength={120} /></label>
      <label className="product-field">SKU<Input name="sku" required maxLength={80} /></label>
      <label className="product-field">Preço de venda (R$)<Input name="price" inputMode="decimal" placeholder="49,90" required /></label>
      <label className="product-field">Custo (R$)<Input name="cost" inputMode="decimal" placeholder="Não informado" /></label>
      <label className="product-field">Atributos<Input name="attributes" placeholder="cor=preto, tamanho=G" maxLength={600} /></label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Adicionar variação"}</Button>
    </form>
  );
}
