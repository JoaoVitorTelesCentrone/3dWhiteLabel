import Link from "next/link";
import { ArrowRight, ClipboardList, Factory, Package } from "lucide-react";
import { formatCents } from "@/lib/pricing";
import { requireTenantContext } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DashboardCharts, type OrderStatusPoint, type RevenuePoint } from "./dashboard-charts";

export const dynamic = "force-dynamic";

type ActivityItem = { id: string; title: string; detail: string; href: string; createdAt: string };

const dashboardSummarySchema = z.object({
  orders: z.object({
    ongoing_count: z.number(),
    month_order_count: z.number(),
    month_sales_cents: z.number(),
    month_cost_cents: z.number().nullable(),
    statuses: z.record(z.string(), z.number()),
    sales_by_month: z.array(z.object({ key: z.string(), sales_cents: z.number(), order_count: z.number() })),
  }).nullable(),
  production: z.object({ active_job_count: z.number() }).nullable(),
  catalog: z.object({ active_product_count: z.number() }).nullable(),
  finance: z.object({
    month_received_cents: z.number(),
    month_expenses_cents: z.number(),
    received_by_month: z.array(z.object({ key: z.string(), received_cents: z.number() })),
  }).nullable(),
});

export default async function DashboardPage() {
  const context = await requireTenantContext();
  const supabase = await createClient();
  const canOrders = context.modules.includes("orders") && roleAllows(context.role, "orders.view");
  const canViewCosts = roleAllows(context.role, "costs.view");
  const canFinance = roleAllows(context.role, "finance.view");
  const canProduction = context.modules.includes("production") && roleAllows(context.role, "production.view");
  const canCatalog = context.modules.includes("catalog") && roleAllows(context.role, "catalog.view");
  const now = new Date();
  const monthParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now).reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});
  const monthStartDate = `${monthParts.year}-${monthParts.month}-01`;
  const monthEndDate = `${monthParts.year}-${monthParts.month}-${monthParts.day}`;
  const chartStart = new Date(Date.UTC(Number(monthParts.year), Number(monthParts.month) - 6, 1));
  const chartStartDate = `${chartStart.getUTCFullYear()}-${String(chartStart.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const [summaryResult, recentOrdersResult, expensesResult, paymentsResult] = await Promise.all([
    supabase.rpc("get_dashboard_summary", { p_month_start: monthStartDate, p_month_end: monthEndDate, p_chart_start: chartStartDate, p_chart_end: monthEndDate }),
    canOrders ? supabase.from("sales_orders").select("id,number,status,created_at").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
    canFinance ? supabase.from("operational_expenses").select("id,category,amount_cents,description,incurred_on").eq("tenant_id", context.tenantId).order("incurred_on", { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
    canFinance ? supabase.from("order_payments").select("id,order_id,amount_cents,method,received_at").eq("tenant_id", context.tenantId).order("received_at", { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
  ]);
  const parsedSummary = dashboardSummarySchema.safeParse(summaryResult.data);
  const summary = parsedSummary.success ? parsedSummary.data : null;
  const summaryUnavailable = Boolean(summaryResult.error) || !summary;
  const ordersSummary = summary?.orders;
  const financeSummary = summary?.finance;
  const ongoingOrders = ordersSummary?.ongoing_count ?? 0;
  const activeJobs = summary?.production?.active_job_count ?? 0;
  const activeProducts = summary?.catalog?.active_product_count ?? 0;
  const flow = [
    { visible: canOrders, label: "Pedidos em andamento", value: summaryUnavailable || !ordersSummary ? "—" : ongoingOrders, detail: "abertos ou em produção", href: "/pedidos", icon: ClipboardList },
    { visible: canProduction, label: "Na fábrica", value: summaryUnavailable || !summary?.production ? "—" : activeJobs, detail: "jobs planejados ou em execução", href: "/producao", icon: Factory },
    { visible: canCatalog, label: "Produtos ativos", value: summaryUnavailable || !summary?.catalog ? "—" : activeProducts, detail: "prontos para vender", href: "/catalogo/produtos", icon: Package },
  ].filter((item) => item.visible);
  const orderStatus: Record<string, string> = { open: "Aberto", in_production: "Em produção", ready: "Pronto para envio", shipped: "Enviado", delivered: "Entregue", canceled: "Cancelado" };
  const activity: ActivityItem[] = [
    ...(canOrders ? recentOrdersResult.data?.map((order) => ({
      id: `order-${order.id}`, title: `Pedido #${order.number}`, detail: orderStatus[order.status] ?? order.status,
      href: "/pedidos", createdAt: order.created_at,
    })) ?? [] : []),
    ...(canFinance ? paymentsResult.data?.map((payment) => ({
      id: `payment-${payment.id}`, title: "Recebimento registrado", detail: `${payment.method} · ${formatCents(BigInt(payment.amount_cents))}`,
      href: "/financeiro", createdAt: payment.received_at,
    })) ?? [] : []),
    ...(canFinance ? expensesResult.data?.map((expense) => ({
      id: `expense-${expense.id}`, title: `Despesa: ${expense.category}`, detail: formatCents(BigInt(expense.amount_cents)),
      href: "/financeiro", createdAt: `${expense.incurred_on}T12:00:00.000Z`,
    })) ?? [] : []),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const activityUnavailable = summaryUnavailable || (canOrders && !!recentOrdersResult.error) || (canFinance && (!!paymentsResult.error || !!expensesResult.error));
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = context.fullName.trim().split(/\s+/)[0];
  const monthNumber = Number(monthParts.month);
  const monthOrdersCount = ordersSummary?.month_order_count ?? 0;
  const salesCents = BigInt(ordersSummary?.month_sales_cents ?? 0);
  const costsCents = BigInt(ordersSummary?.month_cost_cents ?? 0);
  const receivedCents = BigInt(financeSummary?.month_received_cents ?? 0);
  const expensesCents = BigInt(financeSummary?.month_expenses_cents ?? 0);
  const grossProfitCents = salesCents - costsCents;
  const operatingResultCents = grossProfitCents - expensesCents;
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(now);
  const chartMonths: Array<RevenuePoint & { key: string }> = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(Number(monthParts.year), monthNumber - 6 + index, 1));
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const label = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date).replace(".", "");
    return { key: `${year}-${month}`, month: label.charAt(0).toUpperCase() + label.slice(1), sales: 0, received: 0 };
  });
  const revenueByMonth = new Map(chartMonths.map((item) => [item.key, item]));
  ordersSummary?.sales_by_month.forEach((month) => {
    const point = revenueByMonth.get(month.key);
    if (point) point.sales = month.sales_cents / 100;
  });
  financeSummary?.received_by_month.forEach((month) => {
    const point = revenueByMonth.get(month.key);
    if (point) point.received = month.received_cents / 100;
  });
  const revenueChartData = chartMonths.map(({ month, sales, received }) => ({ month, sales, received }));
  const statusChartOrder = ["open", "in_production", "ready", "shipped", "delivered"];
  const orderStatusChartData: OrderStatusPoint[] = statusChartOrder.map((status) => ({
    key: status,
    label: orderStatus[status],
    value: ordersSummary?.statuses[status] ?? 0,
    fill: `var(--color-${status})`,
  })).filter((item) => item.value > 0);

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div><h1>Painel da operação</h1><p className="dashboard-intro">{context.tenantName} <span aria-hidden="true">·</span> {dateLabel}</p></div>
      </header>

      <section className="dashboard-welcome-card" aria-label="Resumo da operação">
        <div className="dashboard-welcome-copy">
          <p className="dashboard-welcome-greeting">{greeting}{firstName ? `, ${firstName}` : ""}!</p>
          {canOrders ? <>
            <h2>{summaryUnavailable || !ordersSummary ? "Pedidos indisponíveis" : `${ongoingOrders} pedido${ongoingOrders === 1 ? "" : "s"} em andamento`}</h2>
            <p>{summaryUnavailable || !ordersSummary ? "Atualize a página para consultar seus pedidos." : "Confira o que precisa seguir para produção ou entrega."}</p>
          </> : <><h2>Bem-vindo à sua operação</h2><p>Acompanhe o trabalho da equipe ao longo do dia.</p></>}
        </div>
        {canOrders && !summaryUnavailable && ordersSummary ? <Link className="dashboard-welcome-link" href="/pedidos">Ver pedidos<ArrowRight size={18} aria-hidden="true" /></Link> : null}
      </section>

      {canOrders ? <section className="dashboard-financials" aria-label="Resumo financeiro do mês">
        <div><span>Vendas no mês</span><strong>{summaryUnavailable || !ordersSummary ? "—" : formatCents(salesCents)}</strong><small>{monthOrdersCount} pedido{monthOrdersCount === 1 ? "" : "s"} cadastrado{monthOrdersCount === 1 ? "" : "s"}</small></div>
        {canFinance ? <><div><span>Recebido no mês</span><strong>{summaryUnavailable || !financeSummary ? "—" : formatCents(receivedCents)}</strong><small>pagamentos registrados no período</small></div><div><span>Gastos operacionais</span><strong>{summaryUnavailable || !financeSummary ? "—" : formatCents(expensesCents)}</strong><small>despesas lançadas no período</small></div>{canViewCosts ? <div><span>Resultado estimado</span><strong>{summaryUnavailable || !ordersSummary || !financeSummary ? "—" : formatCents(operatingResultCents)}</strong><small>margem prevista menos gastos</small></div> : null}</> : null}
      </section> : null}

      {canOrders && !summaryUnavailable && ordersSummary ? <DashboardCharts revenue={revenueChartData} orderStatuses={orderStatusChartData} showReceived={canFinance && !!financeSummary} /> : null}

      {flow.length > 0 ? <section className="dashboard-flow" aria-labelledby="dashboard-flow-title">
        <div className="dashboard-section-heading"><div><h2 id="dashboard-flow-title">Operação agora</h2><p>Acompanhe pedidos, produção e catálogo.</p></div></div>
        <div className="dashboard-flow-list">{flow.map((item) => {
          const Icon = item.icon;
          return <Link href={item.href} key={item.href} className="dashboard-flow-item">
            <span className="dashboard-flow-icon"><Icon size={19} aria-hidden="true" /></span>
            <span className="dashboard-flow-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
            <span className="dashboard-flow-value">{item.value}</span><ArrowRight className="dashboard-flow-arrow" size={17} aria-hidden="true" />
          </Link>;
        })}</div>
      </section> : null}

      <section className="dashboard-lower-section dashboard-activity-section" aria-labelledby="dashboard-activity-title">
          <div className="dashboard-section-heading"><div><h2 id="dashboard-activity-title">Últimas movimentações</h2><p>Pedidos, recebimentos e gastos recentes.</p></div></div>
          {activity.length ? <ul className="dashboard-activity-list">{activity.map((item) => <li key={item.id}>
            <Link href={item.href}><span><strong>{item.title}</strong><small>{item.detail}</small></span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(item.createdAt))}</time></Link>
          </li>)}</ul> : <div className="dashboard-empty-activity"><strong>{activityUnavailable ? "Não foi possível carregar as movimentações" : "Nenhuma movimentação ainda"}</strong><p>{activityUnavailable ? "Atualize a página para tentar novamente." : "Pedidos, recebimentos e gastos aparecerão aqui."}</p></div>}
      </section>
      {context.licenseStatus === "suspended" ? <p className="error">A licença está suspensa. O sistema permanece disponível para consulta.</p> : null}
    </main>
  );
}
