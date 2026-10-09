"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { parseCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export type StockState = { error?: string; success?: string };
const materialKinds = ["PLA", "PETG", "ABS", "ASA", "TPU", "resin", "other"] as const;

export async function createMaterial(_previous: StockState, formData: FormData): Promise<StockState> {
  const parsed = z.object({ name: z.string().trim().min(2).max(120), kind: z.enum(materialKinds), color: z.string().trim().max(80), cost: z.string().trim() }).safeParse({
    name: formData.get("name"), kind: formData.get("kind"), color: formData.get("color"), cost: formData.get("cost"),
  });
  if (!parsed.success) return { error: "Confira nome, tipo, cor e custo." };
  let cost: bigint;
  try { cost = parseCents(parsed.data.cost); }
  catch { return { error: "Informe o custo por kg em reais." }; }
  if (cost > 999999999n) return { error: "Custo por kg excede o limite." };
  const context = await requireModulePermission("stock", "stock.adjust", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("materials").insert({
    tenant_id: context.tenantId, name: parsed.data.name, kind: parsed.data.kind, color: parsed.data.color || null, cost_per_kg_cents: Number(cost),
  });
  if (error) return { error: "Não foi possível cadastrar o material." };
  revalidatePath("/materiais");
  return { success: "Material cadastrado." };
}

export async function receiveSpool(_previous: StockState, formData: FormData): Promise<StockState> {
  const parsed = z.object({ materialId: z.uuid(), code: z.string().trim().min(1).max(80), gross: z.coerce.number().int().min(1).max(100000), tare: z.coerce.number().int().min(0).max(100000) }).safeParse({
    materialId: formData.get("materialId"), code: formData.get("code"), gross: formData.get("gross"), tare: formData.get("tare"),
  });
  if (!parsed.success || parsed.data.gross <= parsed.data.tare) return { error: "Informe código, peso bruto e tara válidos." };
  await requireModulePermission("stock", "stock.purchase", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_spool", {
    p_material_id: parsed.data.materialId, p_code: parsed.data.code, p_gross_g: parsed.data.gross, p_tare_g: parsed.data.tare,
  });
  if (error) return { error: "Não foi possível receber a bobina. Confira se o código já está em uso." };
  revalidatePath("/materiais");
  return { success: "Bobina recebida e movimentação registrada." };
}

export async function adjustSpool(_previous: StockState, formData: FormData): Promise<StockState> {
  const parsed = z.object({ id: z.uuid(), gross: z.coerce.number().int().min(0).max(100000), reason: z.string().trim().min(2).max(500) }).safeParse({
    id: formData.get("id"), gross: formData.get("gross"), reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Informe novo peso bruto e motivo do ajuste." };
  await requireModulePermission("stock", "stock.adjust", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_spool_weight", {
    p_spool_id: parsed.data.id, p_new_gross_g: parsed.data.gross, p_reason: parsed.data.reason,
  });
  if (error) return { error: "Não foi possível ajustar a bobina. O peso deve ser maior ou igual à tara." };
  revalidatePath("/materiais");
  return { success: "Peso atualizado e ajuste registrado." };
}

export async function setSpoolAvailable(_previous: StockState, formData: FormData): Promise<StockState> {
  const parsed = z.object({
    id: z.uuid(),
    available: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(100000)),
  }).safeParse({ id: formData.get("id"), available: formData.get("available") });
  if (!parsed.success) return { error: "Informe uma quantidade válida em gramas." };

  await requireModulePermission("stock", "stock.adjust", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_spool_available_quantity", {
    p_spool_id: parsed.data.id,
    p_available_g: parsed.data.available,
  });
  if (error) return { error: "Não foi possível atualizar o saldo. Confira a bobina e tente novamente." };
  revalidatePath("/materiais");
  revalidatePath("/producao");
  return { success: "Saldo disponível atualizado." };
}
