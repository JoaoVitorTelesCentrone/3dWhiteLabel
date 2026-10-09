import { describe, expect, it } from "vitest";
import { profitPeriods, reportPeriod, reportPresetRanges } from "./reports";

describe("profitPeriods", () => {
  it("uses São Paulo calendar dates and starts the week on Monday", () => {
    const periods = profitPeriods(new Date("2026-10-09T15:00:00.000Z"));
    expect(periods).toEqual([
      { id: "today", label: "Hoje", start: "2026-10-09", end: "2026-10-09" },
      { id: "week", label: "Esta semana", start: "2026-10-05", end: "2026-10-09" },
      { id: "month", label: "Este mês", start: "2026-10-01", end: "2026-10-09" },
    ]);
  });
});

describe("reportPeriod", () => {
  const now = new Date("2026-10-09T15:00:00.000Z");

  it("builds day, week, month, and year ranges from São Paulo dates", () => {
    expect(reportPresetRanges(now)).toEqual([
      { id: "day", label: "Dia", start: "2026-10-09", end: "2026-10-09" },
      { id: "week", label: "Semana", start: "2026-10-05", end: "2026-10-09" },
      { id: "month", label: "Mês", start: "2026-10-01", end: "2026-10-09" },
      { id: "year", label: "Ano", start: "2026-01-01", end: "2026-10-09" },
    ]);
  });

  it("uses a quick period when selected and preserves manual dates otherwise", () => {
    expect(reportPeriod({ period: "week" }, now)).toEqual({ start: "2026-10-05", end: "2026-10-09", preset: "week" });
    expect(reportPeriod({ start: "2026-09-10", end: "2026-10-09" }, now)).toEqual({ start: "2026-09-10", end: "2026-10-09", preset: null });
  });
});
