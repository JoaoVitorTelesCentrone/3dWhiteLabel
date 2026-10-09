import { randomUUID } from "crypto";
import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requirePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { formatCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm, PaymentForm } from "./forms";

export default async function FinancePage() {
  const context = await requirePermission("finance.view");
  const supabase = await createClient();
  const [{ data: orders, error }, { data: payments, error: paymentsError }, { data: expenses, error: expensesError }] = await Promise.all([
    supabase.from("sales_orders").select("id,number,status,total_price_cents").eq("tenant_id", context.tenantId).order("number", { ascending: false }),
    supabase.from("order_payments").select("id,order_id,amount_cents,method,received_at").eq("tenant_id", context.tenantId).order("received_at", { ascending: false }),
    supabase.from("operational_expenses").select("id,category,amount_cents,description,incurred_on").eq("tenant_id", context.tenantId).order("incurred_on", { ascending: false }).limit(100),
  ]);
  const canEdit = roleAllows(context.role, "finance.edit") && context.licenseStatus !== "suspended";
  const balances = orders?.map((order) => {
    const paid = payments?.filter((payment) => payment.order_id === order.id).reduce((sum, payment) => sum + BigInt(payment.amount_cents), 0n) ?? 0n;
    return { ...order, paid, due: BigInt(order.total_price_cents) - paid };
  }) ?? [];
  const openBalances = balances.filter((order) => order.due > 0n && order.status !== "canceled");
  const balanceTotal = openBalances.reduce((sum, order) => sum + order.due, 0n);
  const paymentOrders = openBalances.map((order) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    totalCents: String(order.total_price_cents),
    paidCents: order.paid.toString(),
    dueCents: order.due.toString(),
  }));

  return <main className="management-page management-page--sections">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Gestão · {context.tenantName}</p><h1 className="page-title">Financeiro</h1><p className="page-desc">Acompanhe recebimentos por pedido e despesas operacionais registradas.</p></div><div className="page-actions">{canEdit ? <RecordCreateSheet title="Registrar recebimento" description="Vincule um pagamento ao pedido."><PaymentForm idempotencyKey={randomUUID()} orders={paymentOrders} /></RecordCreateSheet> : null}{canEdit ? <RecordCreateSheet title="Registrar despesa" description="Adicione uma despesa operacional."><ExpenseForm idempotencyKey={randomUUID()} today={new Date().toISOString().slice(0, 10)} /></RecordCreateSheet> : null}</div></header>
    {error || paymentsError || expensesError ? <p className="error" role="alert">Não foi possível carregar os lançamentos.</p> : null}
    {!error && !paymentsError ? <section className="finance-summary" aria-label="Resumo de recebimentos"><div><span>Saldo a receber</span><strong>{formatCents(balanceTotal)}</strong><small>{openBalances.length} pedidos em aberto</small></div></section> : null}
    <section className="panel"><header className="panel-head"><h2 className="panel-title">Pedidos a receber</h2><span className="muted">{openBalances.length} em aberto</span></header>
      {openBalances.map((order) => <div className="data-row finance-row" key={order.id}><div><p className="data-row-title">Pedido #{order.number}</p><p className="data-row-meta"><span>{order.status === "in_production" ? "Em produção" : order.status === "ready" ? "Pronto" : "Aberto"}</span><span>Recebido {formatCents(order.paid)}</span></p></div><div className="finance-balance"><span>Saldo</span><strong>{formatCents(order.due)}</strong></div></div>)}
      {!openBalances.length && !error && !paymentsError ? <p className="empty-inline">Nenhum saldo em aberto.</p> : null}
    </section>
    <section className="panel"><header className="panel-head"><h2 className="panel-title">Recebimentos recentes</h2></header>
      {payments?.slice(0, 20).map((payment) => <div className="data-row finance-row" key={payment.id}><div><p className="data-row-title">{payment.method}</p><p className="data-row-meta">{new Date(payment.received_at).toLocaleDateString("pt-BR")}</p></div><strong className="finance-amount">{formatCents(BigInt(payment.amount_cents))}</strong></div>)}
      {!payments?.length && !paymentsError ? <p className="empty-inline">Nenhum recebimento registrado.</p> : null}
    </section>
    <section className="panel"><header className="panel-head"><h2 className="panel-title">Despesas recentes</h2></header>
      {expenses?.slice(0, 20).map((expense) => <div className="data-row finance-row" key={expense.id}><div><p className="data-row-title">{expense.category}</p><p className="data-row-meta"><span>{new Date(expense.incurred_on + "T12:00:00").toLocaleDateString("pt-BR")}</span><span>{expense.description}</span></p></div><strong className="finance-amount">{formatCents(BigInt(expense.amount_cents))}</strong></div>)}
      {!expenses?.length && !expensesError ? <p className="empty-inline">Nenhum recebimento registrado.</p> : null}
    </section>
  </main>;
}
