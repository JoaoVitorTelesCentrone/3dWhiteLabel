"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { parseCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export type FinanceState = { error?: string; success?: string };
const methods = ["pix", "cash", "card", "bank_transfer", "other"] as const;
const categories = ["rent", "energy", "maintenance", "payroll", "supplies", "shipping", "other"] as const;

export async function recordPayment(_previous: FinanceState, formData: FormData): Promise<FinanceState> {
  const parsed = z.object({ orderId: z.uuid(), amount: z.string(), method: z.enum(methods), key: z.uuid() }).safeParse({
    orderId: formData.get("orderId"), amount: formData.get("amount"),
    method: formData.get("method"), key: formData.get("key"),
  });
  if (!parsed.success) return { error: "Confira pedido, valor e forma de pagamento." };
  let amount: bigint;
  try { amount = parseCents(parsed.data.amount); } catch { return { error: "Valor inválido." }; }
  if (amount < 1n) return { error: "O pagamento deve ser positivo." };
  await requirePermission("finance.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_order_payment", {
    p_order_id: parsed.data.orderId, p_amount_cents: Number(amount), p_method: parsed.data.method, p_idempotency_key: parsed.data.key,
  });
  if (error) return { error: "Não foi possível registrar. Confira o saldo restante do pedido." };
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { success: "Pagamento registrado." };
}

export async function recordExpense(_previous: FinanceState, formData: FormData): Promise<FinanceState> {
  const parsed = z.object({ category: z.enum(categories), amount: z.string(), description: z.string().trim().min(2).max(500),
    incurredOn: z.iso.date(), key: z.uuid() }).safeParse({
    category: formData.get("category"), amount: formData.get("amount"), description: formData.get("description"),
    incurredOn: formData.get("incurredOn"), key: formData.get("key"),
  });
  if (!parsed.success) return { error: "Confira categoria, valor, descrição e data." };
  let amount: bigint;
  try { amount = parseCents(parsed.data.amount); } catch { return { error: "Valor inválido." }; }
  if (amount < 1n) return { error: "A despesa deve ser positiva." };
  await requirePermission("finance.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_operational_expense", {
    p_category: parsed.data.category, p_amount_cents: Number(amount),
    p_description: parsed.data.description, p_incurred_on: parsed.data.incurredOn, p_idempotency_key: parsed.data.key,
  });
  if (error) return { error: "Não foi possível registrar a despesa." };
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { success: "Despesa registrada." };
}
