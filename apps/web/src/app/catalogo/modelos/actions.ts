"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type DesignFormState = { error?: string; success?: string };

export async function createDesign(_previous: DesignFormState, formData: FormData): Promise<DesignFormState> {
  const parsed = z.object({ name: z.string().trim().min(2).max(160), category: z.string().trim().max(80).optional(), description: z.string().trim().max(4000).optional() }).safeParse({
    name: formData.get("name"), category: formData.get("category"), description: formData.get("description"),
  });
  if (!parsed.success) return { error: "Confira os dados do modelo." };
  const context = await requireModulePermission("catalog", "designs.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("designs").insert({ tenant_id: context.tenantId, name: parsed.data.name, category: parsed.data.category || null, description: parsed.data.description || null });
  if (error) return { error: "Não foi possível cadastrar o modelo." };
  revalidatePath("/catalogo/modelos");
  return { success: "Modelo cadastrado." };
}

export async function createRevision(_previous: DesignFormState, formData: FormData): Promise<DesignFormState> {
  const parsed = z.object({ designId: z.uuid(), version: z.string().trim().min(1).max(40), notes: z.string().trim().max(4000).optional() }).safeParse({
    designId: formData.get("designId"), version: formData.get("version"), notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Confira a versão e as observações." };
  const context = await requireModulePermission("catalog", "designs.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("design_revisions").insert({ tenant_id: context.tenantId, design_id: parsed.data.designId, version: parsed.data.version, notes: parsed.data.notes || null });
  if (error) return { error: "Não foi possível criar a revisão. Confira se essa versão já existe." };
  revalidatePath("/catalogo/modelos");
  return { success: "Revisão criada." };
}
