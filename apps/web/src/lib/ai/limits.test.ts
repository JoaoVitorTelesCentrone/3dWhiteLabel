import { describe, expect, it } from "vitest";
import { estimateCostMicrousd, estimateReservedTokens, hashClientIp } from "./limits";

describe("AI usage limits", () => {
  it("reserves input plus the maximum output budget", () => {
    const reserved = estimateReservedTokens([{ content: "a".repeat(400) }], "b".repeat(400));
    expect(reserved).toBeGreaterThan(2_800);
  });

  it("calculates cost in microdollars", () => {
    expect(estimateCostMicrousd(100, 200, 0.75, 4.5)).toBe(975);
  });

  it("hashes the same client identity consistently without storing the IP", () => {
    expect(hashClientIp("203.0.113.4", "secret")).toBe(hashClientIp("203.0.113.4", "secret"));
    expect(hashClientIp("203.0.113.4", "secret")).not.toBe(hashClientIp("203.0.113.5", "secret"));
    expect(hashClientIp("203.0.113.4", "secret")).toHaveLength(64);
  });
});
