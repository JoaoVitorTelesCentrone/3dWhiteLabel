import { describe, expect, it } from "vitest";
import { profitPeriods } from "./reports";

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
