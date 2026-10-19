import { randomUUID } from "crypto";
import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requirePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { formatCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { ExpenseForm, PaymentForm } from "./forms";

const financeSummarySchema = z.object({
  open_order_count: z.number(),
  open_balance_cents: z.number(),
  open_orders: z.array(z.object({
    id: z.string(),
    number: z.number(),
    status: z.string(),
    total_price_cents: z.number(),
    paid_cents: z.number(),
    due_cents: z.number(),
  })),
});

export default async function FinancePage() {
  const context = await requirePermission("finance.view");
  const supabase = await createClient();
  const [{ data: financeSummaryData, error }, { data: payments, error: paymentsError }, { data: expenses, error: expensesError }] = await Promise.all([
    supabase.rpc("get_finance_summary"),
    supabase.from("order_payments").select("id,order_id,amount_cents,method,received_at").eq("tenant_id", context.tenantId).order("received_at", { ascending: false }).limit(20),
    supabase.from("operational_expenses").select("id,category,amount_cents,description,incurred_on").eq("tenant_id", context.tenantId).order("incurred_on", { ascending: false }).limit(20),
  ]);
  const parsedSummary = financeSummarySchema.safeParse(financeSummaryData);
  const financeSummary = parsedSummary.success ? parsedSummary.data : null;
  const canEdit = roleAllows(context.role, "finance.edit") && context.licenseStatus !== "suspended";
  const openBalances = financeSummary?.open_orders.map((order) => ({
    ...order,
    paid: BigInt(order.paid_cents),
    due: BigInt(order.due_cents),
  })) ?? [];
  const balanceTotal = BigInt(financeSummary?.open_balance_cents ?? 0);
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
    {error || !financeSummary || paymentsError || expensesError ? <p className="error" role="alert">Não foi possível carregar os lançamentos.</p> : null}
    {!error && financeSummary && !paymentsError ? <section className="finance-summary" aria-label="Resumo de recebimentos"><div><span>Saldo a receber</span><strong>{formatCents(balanceTotal)}</strong><small>{financeSummary.open_order_count} pedidos em aberto{financeSummary.open_order_count > openBalances.length ? " (mostrando os 100 primeiros)" : ""}</small></div></section> : null}
    <section className="panel"><header className="panel-head"><h2 className="panel-title">Pedidos a receber</h2><span className="muted">{openBalances.length} em aberto</span></header>
      {openBalances.map((order) => <div className="data-row finance-row" key={order.id}><div><p className="data-row-title">Pedido #{order.number}</p><p className="data-row-meta"><span>{order.status === "in_production" ? "Em produção" : order.status === "ready" ? "Pronto" : "Aberto"}</span><span>Recebido {formatCents(order.paid)}</span></p></div><div className="finance-balance"><span>Saldo</span><strong>{formatCents(order.due)}</strong></div></div>)}
      {!openBalances.length && !error && financeSummary && !paymentsError ? <p className="empty-inline">Nenhum saldo em aberto.</p> : null}
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
