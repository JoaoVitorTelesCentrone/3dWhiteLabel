export type QuoteCostKey = "material" | "machine" | "energy" | "labor" | "consumables" | "depreciation";
export type QuoteCosts = Record<QuoteCostKey, bigint>;

export function parseCents(value: string): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Valor monetário inválido.");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function formatCents(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return sign + "R$ " + (absolute / 100n).toLocaleString("pt-BR") + "," + (absolute % 100n).toString().padStart(2, "0");
}

function ceilDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function calculateQuote(costs: QuoteCosts, quantity: number, riskBps: number, feesBps: number, marginBps: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000 ||
    ![riskBps, feesBps, marginBps].every((v) => Number.isInteger(v) && v >= 0 && v <= 9999) ||
    feesBps + marginBps >= 10000 || Object.values(costs).some((v) => v < 0n || v > 1000000000n)) {
    throw new Error("Entradas de orçamento inválidas.");
  }
  const base = Object.values(costs).reduce((sum, value) => sum + value, 0n);
  const unitCostCents = base + ceilDivide(base * BigInt(riskBps), 10000n);
  const unitPriceCents = ceilDivide(unitCostCents * 10000n, BigInt(10000 - feesBps - marginBps));
  if (unitPriceCents * BigInt(quantity) > 999999999999n) throw new Error("Total do orçamento excede o limite.");
  return {
    unitCostCents,
    unitPriceCents,
    totalCostCents: unitCostCents * BigInt(quantity),
    totalPriceCents: unitPriceCents * BigInt(quantity),
  };
}
