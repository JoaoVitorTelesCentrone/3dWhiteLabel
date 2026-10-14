import { describe, expect, it } from "vitest";
import { assistantRequestSchema, businessQuerySchema } from "./schemas";

describe("assistant request validation", () => {
  it("accepts a conversation ending with a user question", () => {
    const result = assistantRequestSchema.safeParse({
      messages: [
        { role: "assistant", content: "Como posso ajudar?" },
        { role: "user", content: "Quais pedidos estão atrasados?" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects conversations that do not end with the user", () => {
    const result = assistantRequestSchema.safeParse({
      messages: [{ role: "assistant", content: "Resposta" }],
    });
    expect(result.success).toBe(false);
  });

  it("limits business query ranges and unknown areas", () => {
    const result = businessQuerySchema.safeParse({
      area: "database",
      query: null,
      days: 0,
      limit: 100,
      includeContact: false,
    });
    expect(result.success).toBe(false);
  });
});
