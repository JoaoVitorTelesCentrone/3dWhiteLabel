import { requirePermission } from "@/lib/auth/guards";
import { reportPeriod, reportSchema } from "@/lib/reports";
import { formatCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

const numberFormat = new Intl.NumberFormat("pt-BR");
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  await requirePermission("reports.export");
  const url = new URL(request.url);
  const { start, end } = reportPeriod({ start: url.searchParams.get("start") ?? undefined, end: url.searchParams.get("end") ?? undefined });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_operational_report", { p_start: start, p_end: end });
  const parsed = reportSchema.safeParse(data);
  if (error || !parsed.success) return new Response("Relatório indisponível.", { status: 400 });
  const report = parsed.data;
  const rows: [string, string, string | number][] = [
    ["Período", "Início", formatDate(report.period_start)],
    ["Período", "Fim", formatDate(report.period_end)],
    ["Operação", "Pedidos criados", numberFormat.format(report.orders_count)],
    ["Operação", "Jobs concluídos", numberFormat.format(report.jobs_completed)],
    ["Operação", "Jobs com falha", numberFormat.format(report.jobs_failed)],
    ["Operação", "Peças boas", numberFormat.format(report.good_qty)],
    ["Operação", "Peças defeituosas", numberFormat.format(report.bad_qty)],
    ["Operação", "Tempo de impressão", `${Math.floor(report.print_minutes / 60)} h ${report.print_minutes % 60} min`],
  ];
  if (report.finance) rows.push(
    ["Financeiro", "Vendas aprovadas", formatCents(BigInt(report.finance.sales_cents))],
    ["Financeiro", "Custo previsto dos pedidos", formatCents(BigInt(report.finance.planned_cost_cents))],
    ["Financeiro", "Margem bruta prevista", formatCents(BigInt(report.finance.planned_gross_margin_cents))],
    ["Financeiro", "Recebimentos", formatCents(BigInt(report.finance.received_cents))],
    ["Financeiro", "Despesas", formatCents(BigInt(report.finance.expenses_cents))],
    ["Financeiro", "Material consumido", formatCents(BigInt(report.finance.actual_material_cents))],
    ["Financeiro", "Saldo líquido do período", formatCents(BigInt(report.finance.net_profit_cents))],
  );
  const csv = [
    ["Seção", "Indicador", "Valor"],
    ...rows,
  ].map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
  return new Response("\uFEFF" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=agencia3d-relatorio-${start}-a-${end}.csv`, "Cache-Control": "private, no-store" },
  });
}
