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
  }).nullable(),
});

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
