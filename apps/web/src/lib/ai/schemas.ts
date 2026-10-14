import { z } from "zod";

export const businessAreas = [
  "overview",
  "orders",
  "customers",
  "production",
  "inventory",
  "finance",
  "catalog",
  "quotes",
] as const;

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000),
});

export const assistantRequestSchema = z.object({
  messages: z.array(assistantMessageSchema).min(1).max(16),
}).refine((value) => value.messages.at(-1)?.role === "user", {
  message: "A última mensagem deve ser do usuário.",
});

export const businessQuerySchema = z.object({
  area: z.enum(businessAreas),
  query: z.string().max(120).nullable(),
  days: z.number().int().min(1).max(3_650),
  limit: z.number().int().min(1).max(25),
  includeContact: z.boolean(),
});

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

