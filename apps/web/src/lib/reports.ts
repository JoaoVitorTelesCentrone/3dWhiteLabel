import { z } from "zod";

export const reportSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  orders_count: z.number(),
  jobs_completed: z.number(),
  jobs_failed: z.number(),
  good_qty: z.number(),
  bad_qty: z.number(),
  print_minutes: z.number(),
  finance: z.object({
    sales_cents: z.number(),
    planned_cost_cents: z.number(),
    planned_gross_margin_cents: z.number(),
    received_cents: z.number(),
    expenses_cents: z.number(),
    actual_material_cents: z.number(),
    net_profit_cents: z.number(),
  }).nullable(),
});

export function profitPeriods(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  const current = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const format = (date: Date) => date.toISOString().slice(0, 10);
  const weekday = current.getUTCDay() || 7;
  const weekStart = new Date(current);
  weekStart.setUTCDate(current.getUTCDate() - weekday + 1);
  const monthStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
  return [
    { id: "today", label: "Hoje", start: format(current), end: format(current) },
    { id: "week", label: "Esta semana", start: format(weekStart), end: format(current) },
    { id: "month", label: "Este mês", start: format(monthStart), end: format(current) },
  ] as const;
}

export function reportPeriod(searchParams: { start?: string | string[]; end?: string | string[] }) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 29);
  const defaultStart = startDate.toISOString().slice(0, 10);
  const defaultEnd = today.toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/;
  const start = typeof searchParams.start === "string" && date.test(searchParams.start) ? searchParams.start : defaultStart;
  const end = typeof searchParams.end === "string" && date.test(searchParams.end) ? searchParams.end : defaultEnd;
  return { start, end };
}
