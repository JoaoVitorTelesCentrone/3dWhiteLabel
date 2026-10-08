"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/watermelon-ui/button";
import { showToast } from "@/components/toast-center";
import { useRecordCreateSheet } from "@/components/record-create-sheet";
import { createOrder, type CreateOrderState } from "./actions";

type Option = { id: string; label: string };
const initialState: CreateOrderState = {};

export function OrderForm({ customers, variants }: { customers: Option[]; variants: Option[] }) {
  const [state, action, pending] = useActionState(createOrder, initialState);
  const closeSheet = useRecordCreateSheet();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    closeSheet?.();
    showToast(state.success);
    router.refresh();
  }, [state, closeSheet, router]);

  return <form ref={formRef} action={action} className="panel">
    <p className="form-hint">O valor e o custo são copiados do produto no momento da venda.</p>
    <label>Cliente<select name="customerId" required defaultValue="" disabled={!customers.length}><option value="" disabled>{customers.length ? "Selecione" : "Cadastre um cliente primeiro"}</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.label}</option>)}</select></label>
    <label>Produto<select name="variantId" required defaultValue="" disabled={!variants.length}><option value="" disabled>{variants.length ? "Selecione" : "Cadastre um produto com preço e custo"}</option>{variants.map((variant) => <option value={variant.id} key={variant.id}>{variant.label}</option>)}</select></label>
    <label>Quantidade <input name="quantity" type="number" min="1" max="100000" defaultValue="1" required /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    <Button type="submit" disabled={pending || !customers.length || !variants.length}>{pending ? "Salvando…" : "Cadastrar pedido"}</Button>
  </form>;
}
