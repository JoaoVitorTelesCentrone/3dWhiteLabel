import { requirePermission } from "@/lib/auth/guards";
import { reportPeriod, reportSchema } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  await requirePermission("reports.export");
  const url = new URL(request.url);
  const { start, end } = reportPeriod({ start: url.searchParams.get("start") ?? undefined, end: url.searchParams.get("end") ?? undefined });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_operational_report", { p_start: start, p_end: end });
  const parsed = reportSchema.safeParse(data);
  if (error || !parsed.success) return new Response("Relatório indisponível.", { status: 400 });
  const report = parsed.data;
  const rows: [string, string | number][] = [
    ["inicio", report.period_start], ["fim", report.period_end],
    ["pedidos", report.orders_count], ["jobs_concluidos", report.jobs_completed],
    ["jobs_falhos", report.jobs_failed], ["pecas_boas", report.good_qty],
    ["pecas_defeituosas", report.bad_qty], ["minutos_impressao", report.print_minutes],
  ];
  if (report.finance) rows.push(
    ["vendas_centavos", report.finance.sales_cents], ["custo_previsto_centavos", report.finance.planned_cost_cents],
    ["margem_prevista_centavos", report.finance.planned_gross_margin_cents],
    ["recebido_centavos", report.finance.received_cents], ["despesas_centavos", report.finance.expenses_cents],
    ["material_real_centavos", report.finance.actual_material_cents],
  );
  const csv = "metrica,valor\r\n" + rows.map(([name, value]) => name + "," + value).join("\r\n") + "\r\n";
  return new Response("\uFEFF" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=agencia3d-relatorio.csv", "Cache-Control": "private, no-store" },
  });
}
