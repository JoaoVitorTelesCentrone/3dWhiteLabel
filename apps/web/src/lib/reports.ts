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

const reportPresets = ["day", "week", "month", "year"] as const;
export type ReportPreset = typeof reportPresets[number];

function localReportDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export function reportPresetRanges(now = new Date()) {
  const current = localReportDate(now);
  const weekday = current.getUTCDay() || 7;
  const weekStart = new Date(current);
  weekStart.setUTCDate(current.getUTCDate() - weekday + 1);
  const monthStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  return [
    { id: "day", label: "Dia", start: formatDate(current), end: formatDate(current) },
    { id: "week", label: "Semana", start: formatDate(weekStart), end: formatDate(current) },
    { id: "month", label: "Mês", start: formatDate(monthStart), end: formatDate(current) },
    { id: "year", label: "Ano", start: formatDate(yearStart), end: formatDate(current) },
  ] as const;
}

export function profitPeriods(now = new Date()) {
  return reportPresetRanges(now).slice(0, 3).map((period) => ({
    ...period,
    id: period.id === "day" ? "today" : period.id,
    label: period.id === "day" ? "Hoje" : period.id === "week" ? "Esta semana" : "Este mês",
  }));
}

export function reportPeriod(searchParams: { start?: string | string[]; end?: string | string[]; period?: string | string[] }, now = new Date()) {
  const date = /^\d{4}-\d{2}-\d{2}$/;
  const requestedPreset = typeof searchParams.period === "string" && reportPresets.includes(searchParams.period as ReportPreset)
    ? searchParams.period as ReportPreset
    : null;
  if (requestedPreset) {
    const preset = reportPresetRanges(now).find((period) => period.id === requestedPreset)!;
    return { start: preset.start, end: preset.end, preset: requestedPreset };
  }
  const start = typeof searchParams.start === "string" && date.test(searchParams.start) ? searchParams.start : null;
  const end = typeof searchParams.end === "string" && date.test(searchParams.end) ? searchParams.end : null;
  if (start && end) return { start, end, preset: null };
  const defaultPreset = reportPresetRanges(now).find((period) => period.id === "month")!;
  return { start: defaultPreset.start, end: defaultPreset.end, preset: "month" as const };
}
