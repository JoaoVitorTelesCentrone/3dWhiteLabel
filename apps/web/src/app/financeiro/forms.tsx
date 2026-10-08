"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { recordExpense, recordPayment, type FinanceState } from "./actions";

const initial: FinanceState = {};
export function PaymentForm({ orders, idempotencyKey }: { orders: { id: string; label: string }[]; idempotencyKey: string }) {
  const [state, action, pending] = useActionState(recordPayment, initial);
  const [key, setKey] = useState(idempotencyKey);
  useEffect(() => { if (state.success) setKey(crypto.randomUUID()); }, [state]);
  return <form action={action} className="panel"><h2>Registrar recebimento</h2><input name="key" type="hidden" value={key} />
    <label>Pedido <select name="orderId" required defaultValue=""><option value="" disabled>Selecione</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
    <label>Valor (R$) <input name="amount" inputMode="decimal" required /></label>
    <label>Forma <select name="method"><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="card">Cartão</option><option value="bank_transfer">Transferência</option><option value="other">Outro</option></select></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending || !orders.length}>{pending ? "Salvando…" : "Registrar pagamento"}</Button>
  </form>;
}
export function ExpenseForm({ idempotencyKey, today }: { idempotencyKey: string; today: string }) {
  const [state, action, pending] = useActionState(recordExpense, initial);
  const [key, setKey] = useState(idempotencyKey);
  useEffect(() => { if (state.success) setKey(crypto.randomUUID()); }, [state]);
  return <form action={action} className="panel"><h2>Registrar despesa</h2><input name="key" type="hidden" value={key} />
    <label>Categoria <select name="category"><option value="rent">Aluguel</option><option value="energy">Energia</option><option value="maintenance">Manutenção</option><option value="payroll">Pessoal</option><option value="supplies">Insumos</option><option value="shipping">Frete</option><option value="other">Outra</option></select></label>
    <label>Valor (R$) <input name="amount" inputMode="decimal" required /></label>
    <label>Descrição <input name="description" required minLength={2} maxLength={500} /></label>
    <label>Data <input name="incurredOn" type="date" defaultValue={today} required /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Registrar despesa"}</Button>
  </form>;
}
