import { createHash } from "node:crypto";

export const AI_MAX_OUTPUT_TOKENS = 1_400;
export const AI_MAX_ROUNDS = 5;

function positiveInt(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function nonNegativeNumber(name: string, fallback: number) {
  const value = Number.parseFloat(process.env[name] ?? "");
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function getAiLimits() {
  return {
    userMinuteRequests: positiveInt("AI_USER_REQUESTS_PER_MINUTE", 10),
    ipMinuteRequests: positiveInt("AI_IP_REQUESTS_PER_MINUTE", 30),
    tenantDailyRequests: positiveInt("AI_TENANT_REQUESTS_PER_DAY", 200),
    tenantDailyTokens: positiveInt("AI_TENANT_TOKENS_PER_DAY", 500_000),
    tenantDailyBudgetMicrousd: Math.round(nonNegativeNumber("AI_TENANT_BUDGET_USD_PER_DAY", 10) * 1_000_000),
    inputCostPerMillionUsd: nonNegativeNumber("OPENAI_INPUT_COST_PER_1M_USD", 0.75),
    outputCostPerMillionUsd: nonNegativeNumber("OPENAI_OUTPUT_COST_PER_1M_USD", 4.5),
  };
}

export function estimateReservedTokens(messages: Array<{ content: string }>, instructionText: string) {
  const estimatedInputTokens = Math.ceil((JSON.stringify(messages).length + instructionText.length) / 4);
  return estimatedInputTokens + AI_MAX_OUTPUT_TOKENS * AI_MAX_ROUNDS;
}

export function estimateCostMicrousd(inputTokens: number, outputTokens: number, inputCostPerMillionUsd: number, outputCostPerMillionUsd: number) {
  return Math.max(0, Math.ceil(inputTokens * inputCostPerMillionUsd + outputTokens * outputCostPerMillionUsd));
}

export function hashClientIp(ip: string, salt: string) {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
