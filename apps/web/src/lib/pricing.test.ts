import { describe, expect, it } from "vitest";
import { calculateQuote, parseCents } from "./pricing";

const zero = { material: 0n, machine: 0n, energy: 0n, labor: 0n, consumables: 0n, depreciation: 0n };

describe("pricing version 1", () => {
  it("keeps currency input exact in cents", () => {
    expect(parseCents("12,34")).toBe(1234n);
    expect(parseCents("0.1")).toBe(10n);
    expect(() => parseCents("1.234")).toThrow();
  });
  it("rounds risk and margin upward per unit, then multiplies quantity", () => {
    const result = calculateQuote({ ...zero, material: 101n }, 3, 1000, 0, 2000);
    expect(result.unitCostCents).toBe(112n);
    expect(result.unitPriceCents).toBe(140n);
    expect(result.totalPriceCents).toBe(420n);
  });
  it("rejects a nonpositive denominator", () => {
    expect(() => calculateQuote(zero, 1, 0, 5000, 5000)).toThrow();
  });
});
