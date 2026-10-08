"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModule, requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type RecipeState = { error?: string; success?: string };
export async function createRecipe(_previous: RecipeState, formData: FormData): Promise<RecipeState> {
  const parsed = z.object({
    variantId: z.uuid(), revisionId: z.uuid(), materialId: z.uuid(),
    estimatedG: z.coerce.number().int().min(1).max(100000),
    estimatedMinutes: z.coerce.number().int().min(1).max(1000000),
    unitsPerPlate: z.coerce.number().int().min(1).max(10000),
  }).safeParse({
    variantId: formData.get("variantId"), revisionId: formData.get("revisionId"),
    materialId: formData.get("materialId"), estimatedG: formData.get("estimatedG"),
    estimatedMinutes: formData.get("estimatedMinutes"), unitsPerPlate: formData.get("unitsPerPlate"),
  });
  if (!parsed.success) return { error: "Confira variação, revisão, material e estimativas." };
  await requireModulePermission("catalog", "catalog.edit", { write: true });
  await requireModule("stock");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_production_recipe", {
    p_variant_id: parsed.data.variantId, p_design_revision_id: parsed.data.revisionId,
    p_material_id: parsed.data.materialId, p_estimated_g: parsed.data.estimatedG,
    p_estimated_minutes: parsed.data.estimatedMinutes, p_units_per_plate: parsed.data.unitsPerPlate,
  });
  if (error) return { error: "Não foi possível versionar a receita. Confira se os cadastros continuam ativos." };
  revalidatePath("/catalogo/receitas");
  return { success: "Nova versão da receita ativada." };
}
