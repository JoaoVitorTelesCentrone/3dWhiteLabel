import Link from "next/link";
import { ArrowRight, ClipboardList, Factory, Package } from "lucide-react";
import { formatCents } from "@/lib/pricing";
import { requireTenantContext } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ActivityItem = { id: string; title: string; detail: string; href: string; createdAt: string };

export default async function DashboardPage() {
  const context = await requireTenantContext();
  const supabase = await createClient();
  const canOrders = context.modules.includes("orders") && roleAllows(context.role, "orders.view");
  const canViewCosts = roleAllows(context.role, "costs.view");
  const canFinance = roleAllows(context.role, "finance.view");
  const canProduction = context.modules.includes("production") && roleAllows(context.role, "production.view");
  const canCatalog = context.modules.includes("catalog") && roleAllows(context.role, "catalog.view");
  const [ordersResult, jobsResult, recentOrdersResult, expensesResult, paymentsResult, productsResult] = await Promise.all([
    supabase.from("sales_orders").select("id,status,total_price_cents,total_cost_cents,created_at").eq("tenant_id", context.tenantId).neq("status", "canceled"),
    supabase.from("production_jobs").select("id,status").eq("tenant_id", context.tenantId).in("status", ["queued", "running", "failed"]),
    supabase.from("sales_orders").select("id,number,status,created_at").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }).limit(4),
    supabase.from("operational_expenses").select("id,category,amount_cents,description,incurred_on").eq("tenant_id", context.tenantId).order("incurred_on", { ascending: false }),
    supabase.from("order_payments").select("id,order_id,amount_cents,method,received_at").eq("tenant_id", context.tenantId).order("received_at", { ascending: false }),
    supabase.from("products").select("id").eq("tenant_id", context.tenantId).eq("active", true),
  ]);

  const activeJobs = jobsResult.data?.filter((job) => ["queued", "running"].includes(job.status)).length ?? 0;
  const ongoingOrders = ordersResult.data?.filter((order) => ["open", "in_production"].includes(order.status)).length ?? 0;
  const flow = [
    { visible: canOrders, label: "Pedidos em andamento", value: ordersResult.error ? "—" : ongoingOrders, detail: "abertos ou em produção", href: "/pedidos", icon: ClipboardList },
    { visible: canProduction, label: "Na fábrica", value: jobsResult.error ? "—" : activeJobs, detail: "jobs planejados ou em execução", href: "/producao", icon: Factory },
    { visible: canCatalog, label: "Produtos ativos", value: productsResult.error ? "—" : productsResult.data?.length ?? 0, detail: "prontos para vender", href: "/catalogo/produtos", icon: Package },
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
  const activityUnavailable = (canOrders && !!recentOrdersResult.error) || (canFinance && (!!paymentsResult.error || !!expensesResult.error));
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = context.fullName.trim().split(/\s+/)[0];
  const monthParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .formatToParts(now).reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});
  const monthNumber = Number(monthParts.month);
  const localMonthStart = new Date(Date.UTC(Number(monthParts.year), monthNumber - 1, 1) + 3 * 60 * 60 * 1000);
  const localNextMonthStart = new Date(Date.UTC(Number(monthParts.year), monthNumber, 1) + 3 * 60 * 60 * 1000);
  const monthStartDate = `${monthParts.year}-${monthParts.month}-01`;
  const monthOrders = ordersResult.data?.filter((order) => {
    const createdAt = new Date(order.created_at);
    return createdAt >= localMonthStart && createdAt < localNextMonthStart;
  }) ?? [];
  const salesCents = monthOrders.reduce((total, order) => total + BigInt(order.total_price_cents), 0n);
  const costsCents = monthOrders.reduce((total, order) => total + BigInt(order.total_cost_cents), 0n);
  const receivedCents = paymentsResult.data?.filter((payment) => new Date(payment.received_at) >= localMonthStart && new Date(payment.received_at) < localNextMonthStart)
    .reduce((total, payment) => total + BigInt(payment.amount_cents), 0n) ?? 0n;
  const expensesCents = expensesResult.data?.filter((expense) => expense.incurred_on >= monthStartDate)
    .reduce((total, expense) => total + BigInt(expense.amount_cents), 0n) ?? 0n;
  const grossProfitCents = salesCents - costsCents;
  const operatingResultCents = grossProfitCents - expensesCents;
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(now);

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div><h1>Painel da operação</h1><p className="dashboard-intro">{context.tenantName} <span aria-hidden="true">·</span> {dateLabel}</p></div>
      </header>

      <section className="dashboard-welcome-card" aria-label="Resumo da operação">
        <div className="dashboard-welcome-copy">
          <p className="dashboard-welcome-greeting">{greeting}{firstName ? `, ${firstName}` : ""}!</p>
          {canOrders ? <>
            <h2>{ordersResult.error ? "Pedidos indisponíveis" : `${ongoingOrders} pedido${ongoingOrders === 1 ? "" : "s"} em andamento`}</h2>
            <p>{ordersResult.error ? "Atualize a página para consultar seus pedidos." : "Confira o que precisa seguir para produção ou entrega."}</p>
          </> : <><h2>Bem-vindo à sua operação</h2><p>Acompanhe o trabalho da equipe ao longo do dia.</p></>}
        </div>
        {canOrders && !ordersResult.error ? <Link className="dashboard-welcome-link" href="/pedidos">Ver pedidos<ArrowRight size={18} aria-hidden="true" /></Link> : null}
      </section>

      {canOrders ? <section className="dashboard-financials" aria-label="Resumo financeiro do mês">
        <div><span>Vendas no mês</span><strong>{ordersResult.error ? "—" : formatCents(salesCents)}</strong><small>{monthOrders.length} pedido{monthOrders.length === 1 ? "" : "s"} cadastrado{monthOrders.length === 1 ? "" : "s"}</small></div>
        {canFinance ? <><div><span>Recebido no mês</span><strong>{paymentsResult.error ? "—" : formatCents(receivedCents)}</strong><small>pagamentos registrados no período</small></div><div><span>Gastos operacionais</span><strong>{expensesResult.error ? "—" : formatCents(expensesCents)}</strong><small>despesas lançadas no período</small></div>{canViewCosts ? <div><span>Resultado estimado</span><strong>{ordersResult.error || expensesResult.error ? "—" : formatCents(operatingResultCents)}</strong><small>margem prevista menos gastos</small></div> : null}</> : null}
      </section> : null}

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
