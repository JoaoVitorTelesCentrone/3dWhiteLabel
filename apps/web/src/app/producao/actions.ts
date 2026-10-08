"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type ProductionState = { error?: string; success?: string };
const positive = z.coerce.number().int().min(1).max(100000);

function pipelineStartError(message: string) {
  const reason = message.toLowerCase();
  if (reason.includes("no idle printer")) return "Todas as impressoras estão em uso. Conclua uma impressão antes de iniciar outro job.";
  if (reason.includes("material reservation") || reason.includes("spool")) return "Não há uma bobina com material suficiente para iniciar este pedido.";
  if (reason.includes("recipe snapshot")) return "A receita deste produto está incompleta. Atualize material, tempo e consumo estimado.";
  if (reason.includes("no queued job")) return "Este pedido não possui um job disponível para iniciar.";
  return "Não foi possível iniciar este job. Abra os detalhes para conferir a impressora e o material reservado.";
}

export async function startNextProductionPipelineJob(productionOrderId: string): Promise<ProductionState> {
  const parsed = z.uuid().safeParse(productionOrderId);
  if (!parsed.success) return { error: "Ordem de produção inválida." };
  await requireModulePermission("production", "production.start", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_next_production_job", { p_production_order_id: parsed.data });
  if (error) return { error: pipelineStartError(error.message) };
  revalidatePath("/producao"); revalidatePath("/pedidos"); revalidatePath("/dashboard"); revalidatePath("/impressoras");
  return { success: "Impressão iniciada." };
}

export async function cancelQueuedJob(_previous: ProductionState, formData: FormData): Promise<ProductionState> {
  const parsed = z.object({ jobId: z.uuid(), reason: z.string().trim().min(2).max(500) }).safeParse({ jobId: formData.get("jobId"), reason: formData.get("reason") });
  if (!parsed.success) return { error: "Informe o motivo do cancelamento." };
  await requireModulePermission("production", "production.cancel", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_queued_production_job", { p_job_id: parsed.data.jobId, p_reason: parsed.data.reason });
  if (error) return { error: "Não foi possível cancelar este job." };
  revalidatePath("/producao"); revalidatePath("/pedidos"); revalidatePath("/materiais"); revalidatePath("/dashboard");
  return { success: "Job cancelado e material liberado." };
}

export async function releaseOrder(_previous: ProductionState, formData: FormData): Promise<ProductionState> {
  const parsed = z.uuid().safeParse(formData.get("orderId"));
  if (!parsed.success) return { error: "Pedido inválido." };
  await requireModulePermission("production", "production.plan", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_order_to_production", { p_order_id: parsed.data });
  if (error) return { error: "Não foi possível enviar o pedido à produção. Confira se ele ainda está aberto." };
  revalidatePath("/pedidos"); revalidatePath("/producao"); revalidatePath("/dashboard");
  return { success: "Pedido liberado para produção." };
}

export async function createJob(_previous: ProductionState, formData: FormData): Promise<ProductionState> {
  const parsed = z.object({
    requestId: z.uuid(), productionOrderId: z.uuid(), printerId: z.uuid(), spoolId: z.uuid(),
    quantity: positive, estimatedMinutes: positive, estimatedG: positive,
  }).safeParse({
    requestId: formData.get("requestId"), productionOrderId: formData.get("productionOrderId"), printerId: formData.get("printerId"),
    spoolId: formData.get("spoolId"), quantity: formData.get("quantity"),
    estimatedMinutes: formData.get("estimatedMinutes"), estimatedG: formData.get("estimatedG"),
  });
  if (!parsed.success) return { error: "Confira impressora, bobina, quantidade, tempo e material estimados." };
  await requireModulePermission("production", "production.plan", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_production_job_once", {
    p_request_key: parsed.data.requestId,
    p_production_order_id: parsed.data.productionOrderId, p_printer_id: parsed.data.printerId,
    p_spool_id: parsed.data.spoolId, p_quantity: parsed.data.quantity,
    p_estimated_minutes: parsed.data.estimatedMinutes, p_estimated_g: parsed.data.estimatedG,
  });
  if (error) return { error: "Não foi possível criar o job. Confira o saldo disponível da bobina e a quantidade restante da OP." };
  revalidatePath("/producao"); revalidatePath("/pedidos"); revalidatePath("/materiais"); revalidatePath("/dashboard");
  return { success: "Job criado com reserva de material." };
}

export async function startJob(_previous: ProductionState, formData: FormData): Promise<ProductionState> {
  const parsed = z.uuid().safeParse(formData.get("jobId"));
  if (!parsed.success) return { error: "Job inválido." };
  await requireModulePermission("production", "production.start", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_production_job", { p_job_id: parsed.data });
  if (error) return { error: "Não foi possível iniciar. Confira a impressora e a bobina." };
  revalidatePath("/producao"); revalidatePath("/pedidos"); revalidatePath("/dashboard"); revalidatePath("/impressoras");
  return { success: "Impressão iniciada." };
}

export async function completeJob(_previous: ProductionState, formData: FormData): Promise<ProductionState> {
  const parsed = z.object({
    jobId: z.uuid(), actualMinutes: z.coerce.number().int().min(1).max(1000000),
    consumedG: z.coerce.number().int().min(0).max(100000),
    goodQty: z.coerce.number().int().min(0).max(100000), badQty: z.coerce.number().int().min(0).max(100000),
  }).safeParse({
    jobId: formData.get("jobId"), actualMinutes: formData.get("actualMinutes"),
    consumedG: formData.get("consumedG"), goodQty: formData.get("goodQty"), badQty: formData.get("badQty"),
  });
  if (!parsed.success) return { error: "Confira tempo, consumo e quantidades." };
  await requireModulePermission("production", "production.start", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_production_job", {
    p_job_id: parsed.data.jobId, p_actual_minutes: parsed.data.actualMinutes,
    p_consumed_g: parsed.data.consumedG, p_good_qty: parsed.data.goodQty, p_bad_qty: parsed.data.badQty,
  });
  if (error) return { error: "Não foi possível concluir. A soma de peças boas e defeituosas deve bater com a quantidade do job; o consumo não pode superar a reserva." };
  revalidatePath("/producao"); revalidatePath("/pedidos"); revalidatePath("/dashboard"); revalidatePath("/materiais"); revalidatePath("/impressoras"); revalidatePath("/relatorios");
  return { success: "Job concluído. Saldos, máquina e pedido atualizados." };
}

export async function failJob(_previous: ProductionState, formData: FormData): Promise<ProductionState> {
  const parsed = z.object({ jobId: z.uuid(), reason: z.string().trim().min(2).max(500),
    actualMinutes: z.coerce.number().int().min(0).max(1000000), consumedG: z.coerce.number().int().min(0).max(100000) }).safeParse({
    jobId: formData.get("jobId"), reason: formData.get("reason"),
    actualMinutes: formData.get("actualMinutes"), consumedG: formData.get("consumedG"),
  });
  if (!parsed.success) return { error: "Informe motivo, tempo e consumo da falha." };
  await requireModulePermission("production", "production.start", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("fail_production_job", {
    p_job_id: parsed.data.jobId, p_reason: parsed.data.reason,
    p_actual_minutes: parsed.data.actualMinutes, p_consumed_g: parsed.data.consumedG,
  });
  if (error) return { error: "Não foi possível registrar a falha." };
  revalidatePath("/producao"); revalidatePath("/pedidos"); revalidatePath("/dashboard"); revalidatePath("/impressoras"); revalidatePath("/materiais"); revalidatePath("/relatorios");
  return { success: "Falha registrada com tempo e consumo." };
}
