"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type PrinterState = { error?: string; success?: string };
export async function createPrinter(_previous: PrinterState, formData: FormData): Promise<PrinterState> {
  const parsed = z.object({ name: z.string().trim().min(2).max(120), model: z.string().trim().max(120) }).safeParse({
    name: formData.get("name"), model: formData.get("model"),
  });
  if (!parsed.success) return { error: "Informe o nome e confira o modelo." };
  const context = await requireModulePermission("printers", "printers.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("printers").insert({ tenant_id: context.tenantId, name: parsed.data.name, model: parsed.data.model || null });
  if (error) return { error: "Não foi possível cadastrar a impressora. Confira se o nome já existe." };
  revalidatePath("/impressoras");
  return { success: "Impressora cadastrada." };
}
export async function setPrinterActive(_previous: PrinterState, formData: FormData): Promise<PrinterState> {
  const parsed = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) }).safeParse({
    id: formData.get("id"), active: formData.get("active"),
  });
  if (!parsed.success) return { error: "Ação inválida." };
  const context = await requireModulePermission("printers", "printers.edit", { write: true });
  const supabase = await createClient();
  const { data, error } = await supabase.from("printers").update({ active: parsed.data.active === "true" })
    .eq("id", parsed.data.id).eq("tenant_id", context.tenantId).eq("status", "idle").select("id").maybeSingle();
  if (error || !data) return { error: "A impressora precisa estar ociosa para mudar seu cadastro." };
  revalidatePath("/impressoras");
  return { success: "Impressora atualizada." };
}
