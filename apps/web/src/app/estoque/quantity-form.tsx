"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/base-ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/toast-center";
import { setFinishedGoodsInlineQuantity, type FinishedGoodsState } from "./actions";

const initial: FinishedGoodsState = {};

export function FinishedGoodsQuantityForm({ variantId, productName, quantity }: { variantId: string; productName: string; quantity: number }) {
  const [state, action, pending] = useActionState(setFinishedGoodsInlineQuantity, initial);
  const [value, setValue] = useState(String(quantity));
  const router = useRouter();

  useEffect(() => setValue(String(quantity)), [quantity]);
  useEffect(() => {
    if (state.success) {
      showToast(state.success);
      router.refresh();
    }
  }, [state, router]);

  return <form action={action} className="finished-goods-quantity-form" onSubmit={(event) => {
    if (Number(value) === quantity) event.preventDefault();
  }}>
    <input type="hidden" name="variantId" value={variantId} />
    <label htmlFor={`quantity-${variantId}`} className="sr-only">Quantidade pronta de {productName}</label>
    <Input id={`quantity-${variantId}`} name="quantity" type="number" min={0} max={1000000} step={1}
      value={value} onChange={(event) => setValue(event.target.value)} required aria-label={`Quantidade pronta de ${productName}`} />
    <span aria-hidden="true">un.</span>
    <Button type="submit" variant="ghost" size="icon-sm" disabled={pending || value === ""}
      aria-label={`Salvar estoque de ${productName}`} title="Salvar quantidade"><Check aria-hidden="true" /></Button>
    {state.error ? <small className="finished-goods-quantity-error" role="alert">{state.error}</small> : null}
  </form>;
}
