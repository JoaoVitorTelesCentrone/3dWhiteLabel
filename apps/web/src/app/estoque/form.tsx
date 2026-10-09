"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/toast-center";
import { useRecordCreateSheet } from "@/components/record-create-sheet";
import { setFinishedGoodsQuantity, type FinishedGoodsState } from "./actions";

const initial: FinishedGoodsState = {};
export function FinishedGoodsForm({ variants }: { variants: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(setFinishedGoodsQuantity, initial);
  const close = useRecordCreateSheet();
  const router = useRouter();
  useEffect(() => { if (state.success) { close?.(); showToast(state.success); router.refresh(); } }, [state.success, close, router]);
  return <form action={action} className="material-form">
    <label>Produto ou variação<select name="variantId" required defaultValue=""><option value="" disabled>Selecione um produto</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select></label>
    <label>Quantidade pronta<input name="quantity" type="number" min={0} max={1000000} required placeholder="0" /></label>
    <label>Motivo do ajuste<Input name="reason" minLength={2} maxLength={500} required placeholder="Ex.: contagem do estoque físico" /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    <Button type="submit" disabled={pending || !variants.length}>{pending ? "Salvando…" : "Atualizar estoque"}</Button>
  </form>;
}
