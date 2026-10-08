"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { parseCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export type MaintenanceState = { error?: string; success?: string };
export async function createMaintenancePlan(_previous: MaintenanceState, formData: FormData): Promise<MaintenanceState> {
  const parsed = z.object({ printerId: z.uuid(), intervalHours: z.coerce.number().int().min(1).max(100000), alertHours: z.coerce.number().int().min(0).max(100000) }).safeParse({
    printerId: formData.get("printerId"), intervalHours: formData.get("intervalHours"), alertHours: formData.get("alertHours"),
  });
  if (!parsed.success || parsed.data.alertHours > parsed.data.intervalHours) return { error: "Informe intervalo e antecedência válidos." };
  const context = await requireModulePermission("printers", "maintenance.manage", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_plans").insert({
    tenant_id: context.tenantId, printer_id: parsed.data.printerId,
    interval_min: parsed.data.intervalHours * 60, alert_before_min: parsed.data.alertHours * 60,
  });
  if (error) return { error: "Não foi possível criar o plano. A impressora já pode ter um plano." };
  revalidatePath("/manutencao");
  return { success: "Plano de manutenção criado." };
}
export async function recordMaintenance(_previous: MaintenanceState, formData: FormData): Promise<MaintenanceState> {
  const parsed = z.object({ planId: z.uuid(), cost: z.string(), notes: z.string().trim().min(2).max(4000) }).safeParse({
    planId: formData.get("planId"), cost: formData.get("cost"), notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Informe custo e descrição do serviço." };
  let cost: bigint;
  try { cost = parseCents(parsed.data.cost); } catch { return { error: "Custo inválido." }; }
  await requireModulePermission("printers", "maintenance.manage", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_printer_maintenance", {
    p_plan_id: parsed.data.planId, p_cost_cents: Number(cost), p_notes: parsed.data.notes,
  });
  if (error) return { error: "Não foi possível registrar. A impressora não pode estar imprimindo." };
  revalidatePath("/manutencao"); revalidatePath("/dashboard");
  return { success: "Serviço registrado e próximo prazo atualizado." };
}
