"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type FinishedGoodsState = { error?: string; success?: string };

const quantitySchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(1000000));

async function saveQuantity(variantId: string, quantity: number, reason: string): Promise<FinishedGoodsState> {
  await requireModulePermission("stock", "stock.adjust", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_finished_goods_quantity", {
    p_product_variant_id: variantId, p_quantity: quantity, p_reason: reason,
  });
  if (error) return { error: "Não foi possível atualizar o saldo do produto." };
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
  return { success: "Estoque de produto pronto atualizado." };
}

export async function setFinishedGoodsQuantity(_previous: FinishedGoodsState, formData: FormData): Promise<FinishedGoodsState> {
  const parsed = z.object({ variantId: z.uuid(), quantity: quantitySchema, reason: z.string().trim().min(2).max(500) }).safeParse({
    variantId: formData.get("variantId"), quantity: formData.get("quantity"), reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Selecione o produto, informe uma quantidade válida e o motivo." };
  return saveQuantity(parsed.data.variantId, parsed.data.quantity, parsed.data.reason);
}

export async function setFinishedGoodsInlineQuantity(_previous: FinishedGoodsState, formData: FormData): Promise<FinishedGoodsState> {
  const parsed = z.object({ variantId: z.uuid(), quantity: quantitySchema }).safeParse({
    variantId: formData.get("variantId"), quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: "Informe uma quantidade válida." };
  return saveQuantity(parsed.data.variantId, parsed.data.quantity, "Contagem informada na tabela");
}
