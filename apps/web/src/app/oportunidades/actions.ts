"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type OpportunityState = { error?: string; success?: string };
const stages = ["lead", "contact", "quote_requested", "quote_sent", "negotiation", "won", "lost"] as const;

export async function createOpportunity(_previous: OpportunityState, formData: FormData): Promise<OpportunityState> {
  const parsed = z.object({ customerId: z.uuid(), title: z.string().trim().min(2).max(160), notes: z.string().trim().max(4000) }).safeParse({
    customerId: formData.get("customerId"), title: formData.get("title"), notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Selecione o cliente e informe um título válido." };
  const context = await requireModulePermission("crm", "crm.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").insert({
    tenant_id: context.tenantId, customer_id: parsed.data.customerId, title: parsed.data.title, notes: parsed.data.notes || null,
  });
  if (error) return { error: "Não foi possível cadastrar a oportunidade. Confira o cliente selecionado." };
  revalidatePath("/oportunidades");
  return { success: "Oportunidade cadastrada." };
}

export async function moveOpportunity(_previous: OpportunityState, formData: FormData): Promise<OpportunityState> {
  const parsed = z.object({ id: z.uuid(), stage: z.enum(stages), lostReason: z.string().trim().max(500) }).safeParse({
    id: formData.get("id"), stage: formData.get("stage"), lostReason: formData.get("lostReason"),
  });
  if (!parsed.success || (parsed.data.stage === "lost" && parsed.data.lostReason.length < 2)) {
    return { error: "Informe a etapa e, ao perder a oportunidade, o motivo." };
  }
  const context = await requireModulePermission("crm", "crm.edit", { write: true });
  const supabase = await createClient();
  const { data, error } = await supabase.from("opportunities").update({
    stage: parsed.data.stage, lost_reason: parsed.data.stage === "lost" ? parsed.data.lostReason : null,
  }).eq("id", parsed.data.id).eq("tenant_id", context.tenantId).select("id").maybeSingle();
  if (error || !data) return { error: "Não foi possível mudar a etapa." };
  revalidatePath("/oportunidades");
  return { success: "Etapa atualizada." };
}
