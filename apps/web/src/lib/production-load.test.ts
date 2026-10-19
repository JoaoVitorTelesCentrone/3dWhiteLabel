import { describe, expect, it } from "vitest";
import { firstProductionLoadError } from "./production-load";

describe("firstProductionLoadError", () => {
  it("returns the first failed production query", () => {
    const jobsError = new Error("jobs failed");
    const spoolsError = new Error("spools failed");

    expect(firstProductionLoadError(null, undefined, jobsError, spoolsError)).toBe(jobsError);
  });

  it("returns null when every production query succeeds", () => {
    expect(firstProductionLoadError(null, undefined, null)).toBeNull();
  });
});
