import { describe, expect, it } from "vitest";
import { summarizeProduction } from "./production-progress";

describe("summarizeProduction", () => {
  it("counts completed good pieces and keeps queued work separate", () => {
    const progress = summarizeProduction([{ id: "op-1", target_qty: 5 }], [
      { production_order_id: "op-1", status: "completed", quantity: 2, good_qty: 2 },
      { production_order_id: "op-1", status: "queued", quantity: 2, good_qty: null },
      { production_order_id: "op-1", status: "failed", quantity: 1, good_qty: null },
    ]);
    expect(progress).toEqual({
      targetQty: 5,
      completedQty: 2,
      committedQty: 4,
      remainingToPlan: 1,
      remainingToComplete: 3,
      percent: 40,
    });
  });
});
