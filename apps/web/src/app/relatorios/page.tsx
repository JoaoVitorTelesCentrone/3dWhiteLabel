import { Button } from "@/components/base-ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { formatCents } from "@/lib/pricing";
import { profitPeriods, reportPeriod, reportSchema } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { roleAllows } from "@/lib/auth/permissions";
import { ReportExportActions } from "./report-export-actions";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const context = await requirePermission("reports.view");
  const { start, end } = reportPeriod(await searchParams);
  const formatDate = (value: string) => new Date(value + "T12:00:00").toLocaleDateString("pt-BR");
  const supabase = await createClient();
  const periods = profitPeriods();
  const results = await Promise.all([
    supabase.rpc("get_operational_report", { p_start: start, p_end: end }),
    ...periods.map((period) => supabase.rpc("get_operational_report", { p_start: period.start, p_end: period.end })),
  ]);
  const [{ data, error }, ...profitResults] = results;
  const parsed = reportSchema.safeParse(data);
  const report = parsed.success ? parsed.data : null;
  const profits = periods.map((period, index) => {
    const parsedProfit = reportSchema.safeParse(profitResults[index].data);
    return { ...period, value: parsedProfit.success ? parsedProfit.data.finance?.net_profit_cents ?? null : null };
  });
  return <main className="management-page management-page--sections"><header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Gestão · {context.tenantName}</p><h1 className="page-title">Relatórios</h1><p className="page-desc">Resumo do período com pedidos, produção e, para quem tem acesso financeiro, valores previstos e recebidos.</p></div></header>
    <form method="get" className="panel report-period-form"><h2>Período do relatório</h2><label>Início <input type="date" name="start" defaultValue={start} required /></label>
      <label>Fim <input type="date" name="end" defaultValue={end} required /></label><Button type="submit">Aplicar período</Button></form>
    {error || !report ? <p className="error" role="alert">Não foi possível gerar o relatório. Use um intervalo de até 366 dias.</p> : <>
      <section className="panel"><header className="panel-head"><h2 className="panel-title">Operação</h2><span className="report-range">{formatDate(start)} a {formatDate(end)}</span></header>
        <dl className="report-grid">
          <div><dt>Pedidos criados</dt><dd>{report.orders_count}</dd></div>
          <div><dt>Jobs concluídos</dt><dd>{report.jobs_completed}</dd></div>
          <div><dt>Jobs com falha</dt><dd>{report.jobs_failed}</dd></div>
          <div><dt>Peças boas</dt><dd>{report.good_qty}</dd></div>
          <div><dt>Peças defeituosas</dt><dd>{report.bad_qty}</dd></div>
          <div><dt>Tempo de impressão</dt><dd>{Math.floor(report.print_minutes / 60)} h {report.print_minutes % 60} min</dd></div>
        </dl>
      </section>
      {report.finance ? <section className="panel"><header className="panel-head"><div><h2 className="panel-title">Saldo líquido</h2><p className="panel-description">Recebimentos menos despesas operacionais e material consumido.</p></div></header>
        <dl className="report-grid report-grid-finance">
          {profits.map((profit) => <div key={profit.id}><dt>{profit.label}</dt><dd>{profit.value === null ? "—" : formatCents(BigInt(profit.value))}</dd><small>{formatDate(profit.start)}{profit.end !== profit.start ? ` a ${formatDate(profit.end)}` : ""}</small></div>)}
        </dl>
      </section> : null}
      {report.finance ? <section className="panel"><header className="panel-head"><h2 className="panel-title">Financeiro</h2></header>
        <dl className="report-grid report-grid-finance">
          <div><dt>Vendas aprovadas</dt><dd>{formatCents(BigInt(report.finance.sales_cents))}</dd></div>
          <div><dt>Custo previsto dos pedidos</dt><dd>{formatCents(BigInt(report.finance.planned_cost_cents))}</dd></div>
          <div><dt>Margem bruta prevista</dt><dd>{formatCents(BigInt(report.finance.planned_gross_margin_cents))}</dd></div>
          <div><dt>Recebimentos</dt><dd>{formatCents(BigInt(report.finance.received_cents))}</dd></div>
          <div><dt>Despesas</dt><dd>{formatCents(BigInt(report.finance.expenses_cents))}</dd></div>
          <div><dt>Material consumido</dt><dd>{formatCents(BigInt(report.finance.actual_material_cents))}</dd></div>
          <div><dt>Saldo líquido do período</dt><dd>{formatCents(BigInt(report.finance.net_profit_cents))}</dd></div>
        </dl>
      </section> : null}
      {roleAllows(context.role, "reports.export") ? <ReportExportActions
        csvHref={`/relatorios/exportar?start=${start}&end=${end}`}
        fileName={`Agencia3D-Relatorio-${start}-a-${end}`}
      /> : null}
    </>}
  </main>;
}
