"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";
import { Button } from "@/components/base-ui/button";
import { recordExpense, recordPayment, type FinanceState } from "./actions";

const initial: FinanceState = {};

type PaymentOrder = {
  id: string;
  number: number;
  status: string;
  totalCents: string;
  paidCents: string;
  dueCents: string;
};

const orderStatus: Record<string, string> = { open: "Aberto", in_production: "Em produção", ready: "Pronto" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatCents = (cents: string) => money.format(Number(cents) / 100);

function amountToCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export function PaymentForm({ orders, idempotencyKey }: { orders: PaymentOrder[]; idempotencyKey: string }) {
  const [state, action, pending] = useActionState(recordPayment, initial);
  const [key, setKey] = useState(idempotencyKey);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const selectedOrder = useMemo(() => orders.find((order) => order.id === orderId), [orderId, orders]);
  const amountCents = amountToCents(amount);
  const remainingCents = selectedOrder && amountCents !== null ? Math.max(0, Number(selectedOrder.dueCents) - amountCents) : null;
  const exceedsDue = selectedOrder && amountCents !== null && amountCents > Number(selectedOrder.dueCents);
  const paidPercentage = selectedOrder && Number(selectedOrder.totalCents) > 0 ? Math.round((Number(selectedOrder.paidCents) / Number(selectedOrder.totalCents)) * 100) : 0;

  useEffect(() => { if (state.success) { setKey(crypto.randomUUID()); setAmount(""); } }, [state.success]);

  return <form action={action} className="panel payment-form">
    <h2>Registrar recebimento</h2>
    <input name="key" type="hidden" value={key} />
    <label>Pedido
      <select name="orderId" required value={orderId} onChange={(event) => setOrderId(event.target.value)}>
        <option value="" disabled>Selecione um pedido</option>
        {orders.map((order) => <option key={order.id} value={order.id}>Pedido #{order.number} · saldo {formatCents(order.dueCents)}</option>)}
      </select>
    </label>
    {selectedOrder ? <section className="payment-order-summary" aria-label={`Resumo do pedido ${selectedOrder.number}`}>
      <header><div className="payment-order-title"><ReceiptText aria-hidden="true" /><div><span>Pedido #{selectedOrder.number}</span><strong>{orderStatus[selectedOrder.status] ?? selectedOrder.status}</strong></div></div><span className="payment-order-badge">Em aberto</span></header>
      <div className="payment-order-metrics">
        <div><span>Total do pedido</span><strong>{formatCents(selectedOrder.totalCents)}</strong></div>
        <div><span>Já recebido</span><strong>{formatCents(selectedOrder.paidCents)}</strong></div>
        <div className="payment-order-due"><span>Saldo atual</span><strong>{formatCents(selectedOrder.dueCents)}</strong></div>
      </div>
      <div className="payment-progress"><div><span>Pagamento do pedido</span><span>{paidPercentage}%</span></div><progress value={Number(selectedOrder.paidCents)} max={Number(selectedOrder.totalCents)} /></div>
    </section> : <p className="payment-order-hint"><WalletCards aria-hidden="true" />Selecione um pedido para conferir o saldo antes de registrar.</p>}
    <div className="payment-inputs">
      <label>Valor recebido (R$)<input name="amount" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></label>
      <label>Forma<select name="method"><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="card">Cartão</option><option value="bank_transfer">Transferência</option><option value="other">Outro</option></select></label>
    </div>
    {selectedOrder && amountCents !== null ? <p className={exceedsDue ? "payment-after payment-after-error" : "payment-after"}><CircleDollarSign aria-hidden="true" />{exceedsDue ? "O valor é maior que o saldo em aberto." : <>Saldo após este recebimento: <strong>{formatCents(String(remainingCents))}</strong></>}</p> : null}
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
