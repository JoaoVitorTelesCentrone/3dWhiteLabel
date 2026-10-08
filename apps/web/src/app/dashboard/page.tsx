import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Factory, Package, TriangleAlert } from "lucide-react";
import { formatCents } from "@/lib/pricing";
import { requireTenantContext } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AttentionItem = { title: string; detail: string; href: string; label: string };
type ActivityItem = { id: string; title: string; detail: string; href: string; createdAt: string };

export default async function DashboardPage() {
  const context = await requireTenantContext();
  const supabase = await createClient();
  const canOrders = context.modules.includes("orders") && roleAllows(context.role, "orders.view");
  const canViewCosts = roleAllows(context.role, "costs.view");
  const canFinance = roleAllows(context.role, "finance.view");
  const canProduction = context.modules.includes("production") && roleAllows(context.role, "production.view");
  const canStock = context.modules.includes("stock") && roleAllows(context.role, "stock.view");
  const canCatalog = context.modules.includes("catalog") && roleAllows(context.role, "catalog.view");
  const canMaintenance = context.modules.includes("printers") && roleAllows(context.role, "maintenance.view");
  const [ordersResult, jobsResult, spoolsResult, reservationsResult, plansResult, printersResult, recentOrdersResult, expensesResult, paymentsResult, productsResult] = await Promise.all([
    supabase.from("sales_orders").select("id,status,total_price_cents,total_cost_cents,created_at").eq("tenant_id", context.tenantId).neq("status", "canceled"),
    supabase.from("production_jobs").select("id,status").eq("tenant_id", context.tenantId).in("status", ["queued", "running", "failed"]),
    supabase.from("material_spools").select("id,current_gross_g,tare_g,status").eq("tenant_id", context.tenantId).eq("status", "active"),
    supabase.from("material_reservations").select("spool_id,reserved_g").eq("tenant_id", context.tenantId).eq("status", "active"),
    supabase.from("maintenance_plans").select("printer_id,interval_min,alert_before_min,last_service_runtime_min,active").eq("tenant_id", context.tenantId).eq("active", true),
    supabase.from("printers").select("id,runtime_min").eq("tenant_id", context.tenantId),
    supabase.from("sales_orders").select("id,number,status,created_at").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }).limit(4),
    supabase.from("operational_expenses").select("id,category,amount_cents,description,incurred_on").eq("tenant_id", context.tenantId).order("incurred_on", { ascending: false }),
    supabase.from("order_payments").select("id,order_id,amount_cents,method,received_at").eq("tenant_id", context.tenantId).order("received_at", { ascending: false }),
    supabase.from("products").select("id").eq("tenant_id", context.tenantId).eq("active", true),
  ]);

  const lowSpools = spoolsResult.data?.filter((spool) => {
    const reserved = reservationsResult.data?.filter((reservation) => reservation.spool_id === spool.id).reduce((sum, reservation) => sum + reservation.reserved_g, 0) ?? 0;
    return spool.current_gross_g - spool.tare_g - reserved < 200;
  }).length ?? 0;
  const activeJobs = jobsResult.data?.filter((job) => ["queued", "running"].includes(job.status)).length ?? 0;
  const failedJobs = jobsResult.data?.filter((job) => job.status === "failed").length ?? 0;
  const runtime = new Map(printersResult.data?.map((printer) => [printer.id, printer.runtime_min]));
  const dueMaintenance = plansResult.data?.filter((plan) =>
    (runtime.get(plan.printer_id) ?? 0) >= plan.last_service_runtime_min + plan.interval_min - plan.alert_before_min
  ).length ?? 0;
  const dataUnavailable = (canOrders && !!ordersResult.error)
    || (canProduction && !!jobsResult.error) || (canStock && (!!spoolsResult.error || !!reservationsResult.error))
    || (canCatalog && !!productsResult.error)
    || (canMaintenance && (!!plansResult.error || !!printersResult.error))
    || (canFinance && (!!expensesResult.error || !!paymentsResult.error));

  const attention: AttentionItem[] = [
    ...(canProduction && failedJobs > 0 ? [{
      title: `${failedJobs} impressão${failedJobs === 1 ? "" : "ões"} com falha`,
      detail: "Confira o resultado e planeje a próxima tentativa.", href: "/producao", label: "Abrir produção",
    }] : []),
    ...(canStock && lowSpools > 0 ? [{
      title: `${lowSpools} bobina${lowSpools === 1 ? "" : "s"} com menos de 200 g`,
      detail: "Confira o material antes de iniciar novas impressões.", href: "/materiais", label: "Ver materiais",
    }] : []),
    ...(canMaintenance && dueMaintenance > 0 ? [{
      title: `${dueMaintenance} manutenção${dueMaintenance === 1 ? "" : "ões"} próxima${dueMaintenance === 1 ? "" : "s"}`,
      detail: "Verifique as máquinas antes dos próximos trabalhos.", href: "/manutencao", label: "Ver manutenção",
    }] : []),
  ];
  const flow = [
    { visible: canOrders, label: "Pedidos em andamento", value: ordersResult.error ? "—" : ordersResult.data?.filter((order) => ["open", "in_production"].includes(order.status)).length ?? 0, detail: "abertos ou em produção", href: "/pedidos", icon: ClipboardList },
    { visible: canProduction, label: "Na fábrica", value: jobsResult.error ? "—" : activeJobs, detail: "jobs planejados ou em execução", href: "/producao", icon: Factory },
    { visible: canCatalog, label: "Produtos ativos", value: productsResult.error ? "—" : productsResult.data?.length ?? 0, detail: "prontos para vender", href: "/catalogo/produtos", icon: Package },
    { visible: canStock, label: "Material baixo", value: spoolsResult.error ? "—" : lowSpools, detail: lowSpools === 1 ? "bobina abaixo de 200 g" : "bobinas abaixo de 200 g", href: "/materiais", icon: Package },
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
  const monthParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .formatToParts(new Date()).reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});
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
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
  const primary = attention[0]
    ? { title: attention[0].title, detail: attention[0].detail, href: attention[0].href, label: attention[0].label }
    : dataUnavailable
      ? { title: "Confira os dados da operação", detail: "Alguns indicadores não carregaram. Atualize a página para tentar novamente.", href: "", label: "" }
    : canOrders && (ordersResult.data?.filter((order) => ["open", "in_production"].includes(order.status)).length ?? 0) > 0
      ? { title: `${ordersResult.data?.filter((order) => ["open", "in_production"].includes(order.status)).length} pedido${(ordersResult.data?.filter((order) => ["open", "in_production"].includes(order.status)).length ?? 0) === 1 ? "" : "s"} em andamento`, detail: "Confira o que precisa seguir para a produção ou entrega.", href: "/pedidos", label: "Ver pedidos" }
    : canOrders
        ? { title: "Acompanhe os pedidos", detail: "Veja o que está em andamento e o que pode ser enviado.", href: "/pedidos", label: "Ver pedidos" }
        : canProduction
          ? { title: "Acompanhe a produção", detail: "Veja as impressões em andamento e as próximas tarefas.", href: "/producao", label: "Ver produção" }
          : { title: "Sua operação em um só lugar", detail: "Escolha uma área no menu para começar.", href: "/dashboard", label: "Visão geral" };

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div><h1>Painel da operação</h1><p className="dashboard-intro">{context.tenantName} <span aria-hidden="true">·</span> {dateLabel}</p></div>
        <span className={`dashboard-status ${dataUnavailable ? "dashboard-status--partial" : attention.length ? "dashboard-status--alert" : ""}`}>
          {dataUnavailable ? "Dados parciais" : attention.length ? `${attention.length} área${attention.length === 1 ? "" : "s"} pedem atenção` : "Sem alertas"}
        </span>
      </header>

      <section className="dashboard-lead" aria-label="Prioridade da operação">
        <div className="dashboard-lead-main">
          <p className="dashboard-section-label">{attention.length ? "Prioridade agora" : dataUnavailable ? "Dados incompletos" : "Seu próximo passo"}</p>
          <h2>{primary.title}</h2><p>{primary.detail}</p>
          {primary.href && primary.href !== "/dashboard" ? <Link className="dashboard-primary-link" href={primary.href}>{primary.label}<ArrowRight size={18} aria-hidden="true" /></Link> : null}
        </div>
        <div className="dashboard-lead-aside">
          <span className="dashboard-lead-aside-icon" aria-hidden="true">{attention.length || dataUnavailable ? <TriangleAlert size={29} /> : <CheckCircle2 size={29} />}</span>
          <strong>{dataUnavailable ? "Atualize para conferir" : attention.length ? "Resolva o que está pendente" : "Operação sob controle"}</strong>
          <span>{dataUnavailable ? "Os números podem estar incompletos." : attention.length ? "As áreas abaixo mostram onde agir." : "Quando algo precisar de atenção, aparecerá aqui."}</span>
        </div>
      </section>

      {canOrders ? <section className="dashboard-financials" aria-label="Resumo financeiro do mês">
        <div><span>Vendas no mês</span><strong>{ordersResult.error ? "—" : formatCents(salesCents)}</strong><small>{monthOrders.length} pedido{monthOrders.length === 1 ? "" : "s"} cadastrado{monthOrders.length === 1 ? "" : "s"}</small></div>
        {canFinance ? <><div><span>Recebido no mês</span><strong>{paymentsResult.error ? "—" : formatCents(receivedCents)}</strong><small>pagamentos registrados no período</small></div><div><span>Gastos operacionais</span><strong>{expensesResult.error ? "—" : formatCents(expensesCents)}</strong><small>despesas lançadas no período</small></div>{canViewCosts ? <div><span>Resultado estimado</span><strong>{ordersResult.error || expensesResult.error ? "—" : formatCents(operatingResultCents)}</strong><small>margem prevista menos gastos</small></div> : null}</> : null}
      </section> : null}

      {flow.length > 0 ? <section className="dashboard-flow" aria-labelledby="dashboard-flow-title">
        <div className="dashboard-section-heading"><div><h2 id="dashboard-flow-title">Operação agora</h2><p>O que está em andamento e o que precisa ser reposto.</p></div></div>
        <div className="dashboard-flow-list">{flow.map((item) => {
          const Icon = item.icon;
          return <Link href={item.href} key={item.href} className="dashboard-flow-item">
            <span className="dashboard-flow-icon"><Icon size={19} aria-hidden="true" /></span>
            <span className="dashboard-flow-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
            <span className="dashboard-flow-value">{item.value}</span><ArrowRight className="dashboard-flow-arrow" size={17} aria-hidden="true" />
          </Link>;
        })}</div>
      </section> : null}

      <div className="dashboard-lower-grid">
        <section className="dashboard-lower-section" aria-labelledby="dashboard-attention-title">
          <div className="dashboard-section-heading"><div><h2 id="dashboard-attention-title">Precisa de atenção</h2><p>Exceções que podem interromper o trabalho.</p></div></div>
          {attention.length ? <ul className="dashboard-attention-list">{attention.map((item) => <li key={item.href}>
            <Link href={item.href}><span className="dashboard-attention-icon"><TriangleAlert size={18} aria-hidden="true" /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRight size={17} aria-hidden="true" /></Link>
          </li>)}</ul> : <div className="dashboard-calm-state"><CheckCircle2 size={22} aria-hidden="true" /><div><strong>Nada pendente por aqui</strong><p>{dataUnavailable ? "Alguns dados não carregaram. Atualize a página para conferir." : "Produção, materiais e manutenção sem alertas."}</p></div></div>}
        </section>
        <section className="dashboard-lower-section" aria-labelledby="dashboard-activity-title">
          <div className="dashboard-section-heading"><div><h2 id="dashboard-activity-title">Últimas movimentações</h2><p>Pedidos, recebimentos e gastos recentes.</p></div></div>
          {activity.length ? <ul className="dashboard-activity-list">{activity.map((item) => <li key={item.id}>
            <Link href={item.href}><span><strong>{item.title}</strong><small>{item.detail}</small></span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(item.createdAt))}</time></Link>
          </li>)}</ul> : <div className="dashboard-empty-activity"><strong>{activityUnavailable ? "Não foi possível carregar as movimentações" : "Nenhuma movimentação ainda"}</strong><p>{activityUnavailable ? "Atualize a página para tentar novamente." : "Pedidos, recebimentos e gastos aparecerão aqui."}</p></div>}
        </section>
      </div>
      {context.licenseStatus === "suspended" ? <p className="error">A licença está suspensa. O sistema permanece disponível para consulta.</p> : null}
    </main>
  );
}
