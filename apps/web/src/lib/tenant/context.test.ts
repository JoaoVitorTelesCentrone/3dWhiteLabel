import { describe, expect, it } from "vitest";
import { canUseSelectedTenantFallback, resolveTenantHost } from "./host";

describe("selected tenant fallback", () => {
  it("is limited to local development hosts", () => {
    expect(canUseSelectedTenantFallback(resolveTenantHost("localhost:3005"))).toBe(true);
    expect(canUseSelectedTenantFallback(resolveTenantHost("127.0.0.1:3005"))).toBe(true);
    expect(canUseSelectedTenantFallback(resolveTenantHost("demo.localhost:3005"))).toBe(true);
    expect(canUseSelectedTenantFallback(resolveTenantHost("cliente.example.com"))).toBe(false);
    expect(canUseSelectedTenantFallback(null)).toBe(false);
  });
});
