"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/watermelon-ui/button";
import { showToast } from "@/components/toast-center";
import { useRecordCreateSheet } from "@/components/record-create-sheet";
import { createOrder, type CreateOrderState } from "./actions";
import { ProductImagePreview } from "./product-image-preview";

type Option = { id: string; label: string };
type VariantOption = Option & { imageUrl: string | null };
const initialState: CreateOrderState = {};

export function OrderForm({ customers, variants }: { customers: Option[]; variants: VariantOption[] }) {
  const [state, action, pending] = useActionState(createOrder, initialState);
  const [items, setItems] = useState([{ key: 0, variantId: "" }]);
  const nextItemKey = useRef(1);
  const closeSheet = useRecordCreateSheet();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    setItems([{ key: nextItemKey.current++, variantId: "" }]);
    closeSheet?.();
    showToast(state.success);
    router.refresh();
  }, [state, closeSheet, router]);

  const addItem = () => {
    if (items.length >= 50) return;
    setItems((current) => [...current, { key: nextItemKey.current++, variantId: "" }]);
  };
  const removeItem = (key: number) => setItems((current) => current.filter((item) => item.key !== key));
  const selectVariant = (key: number, variantId: string) => setItems((current) => current.map((item) => item.key === key ? { ...item, variantId } : item));

  return <form ref={formRef} action={action} className="panel order-create-form">
    <label>Cliente<select name="customerId" required defaultValue="" disabled={!customers.length}><option value="" disabled>{customers.length ? "Selecione" : "Cadastre um cliente primeiro"}</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.label}</option>)}</select></label>
    <fieldset className="order-item-list">
      <legend>Produtos</legend>
      <p className="form-hint">Preço e custo são copiados do catálogo no momento da venda.</p>
      {items.map((item, index) => {
        const selectedVariant = variants.find((variant) => variant.id === item.variantId);
        return <div className="order-item-row" key={item.key}>
        <span className="order-item-number" aria-hidden="true">{index + 1}</span>
        <ProductImagePreview imageUrl={selectedVariant?.imageUrl ?? null} name={selectedVariant?.label ?? `Produto ${index + 1}`} />
        <label>Produto<select name="variantId" required value={item.variantId} disabled={!variants.length} onChange={(event) => selectVariant(item.key, event.target.value)}><option value="" disabled>{variants.length ? "Selecione" : "Cadastre um produto com preço e custo"}</option>{variants.map((variant) => <option value={variant.id} key={variant.id}>{variant.label}</option>)}</select></label>
        <label className="order-item-quantity">Quantidade<input name="quantity" type="number" min="1" max="100000" defaultValue="1" required /></label>
        <Button type="button" variant="ghost" size="icon" className="order-item-remove" aria-label={`Remover produto ${index + 1}`} title="Remover produto" disabled={items.length === 1 || pending} onClick={() => removeItem(item.key)}><Trash2 aria-hidden="true" /></Button>
      </div>;})}
      <Button type="button" variant="outline" className="order-add-item" disabled={pending || !variants.length || items.length >= 50} onClick={addItem}><Plus aria-hidden="true" />Adicionar produto</Button>
    </fieldset>
    <fieldset className="order-address-fields">
      <legend>Endereço de entrega</legend>
      <label>CEP<input name="postalCode" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" pattern="\d{5}-?\d{3}" maxLength={9} required /></label>
      <label className="order-address-street">Rua ou avenida<input name="street" autoComplete="address-line1" minLength={2} maxLength={160} required /></label>
      <label>Número<input name="addressNumber" autoComplete="address-line2" maxLength={30} required /></label>
      <label className="order-address-complement">Complemento<input name="complement" maxLength={120} /></label>
      <label>Bairro<input name="neighborhood" minLength={2} maxLength={100} required /></label>
      <label className="order-address-city">Cidade<input name="city" autoComplete="address-level2" minLength={2} maxLength={100} required /></label>
      <label>UF<input name="state" autoComplete="address-level1" minLength={2} maxLength={2} pattern="[A-Za-z]{2}" placeholder="SP" required /></label>
    </fieldset>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    <Button type="submit" disabled={pending || !customers.length || !variants.length}>{pending ? "Salvando…" : "Cadastrar pedido"}</Button>
  </form>;
}
