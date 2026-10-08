"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { calculateQuote, formatCents, parseCents, type QuoteCosts } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export type QuoteState = { error?: string; success?: string };
const optionalUuid = z.union([z.uuid(), z.literal("")]).transform((value) => value || null);
const money = z.string().trim().regex(/^\d{1,8}(?:[,.]\d{1,2})?$/);
const percent = z.string().trim().regex(/^\d{1,2}(?:[,.]\d{1,2})?$/);
const schema = z.object({
  customerId: z.uuid(), opportunityId: optionalUuid, variantId: optionalUuid, revisionId: optionalUuid,
  description: z.string().trim().min(2).max(500), quantity: z.coerce.number().int().min(1).max(100000),
  material: money, machine: money, energy: money, labor: money, consumables: money, depreciation: money,
  risk: percent, fees: percent, margin: percent,
});
function toBps(value: string): number {
  const [whole, fractional = ""] = value.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
}

export async function createQuote(_previous: QuoteState, formData: FormData): Promise<QuoteState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Confira cliente, item, custos e percentuais." };
  const values = parsed.data;
  const costs: QuoteCosts = {
    material: parseCents(values.material), machine: parseCents(values.machine), energy: parseCents(values.energy),
    labor: parseCents(values.labor), consumables: parseCents(values.consumables), depreciation: parseCents(values.depreciation),
  };
  const risk = toBps(values.risk), fees = toBps(values.fees), margin = toBps(values.margin);
  let total: bigint;
  try { total = calculateQuote(costs, values.quantity, risk, fees, margin).totalPriceCents; }
  catch (error) { return { error: error instanceof Error ? error.message : "Preço inválido." }; }
  await requireModulePermission("quotes", "quotes.create", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_quote", {
    p_customer_id: values.customerId, p_opportunity_id: values.opportunityId,
    p_product_variant_id: values.variantId, p_design_revision_id: values.revisionId,
    p_description: values.description, p_quantity: values.quantity,
    p_material_cents: Number(costs.material), p_machine_cents: Number(costs.machine), p_energy_cents: Number(costs.energy),
    p_labor_cents: Number(costs.labor), p_consumables_cents: Number(costs.consumables), p_depreciation_cents: Number(costs.depreciation),
    p_risk_bps: risk, p_fees_bps: fees, p_margin_bps: margin,
  });
  if (error) return { error: "Não foi possível criar o orçamento. Confira as referências e os limites." };
  revalidatePath("/orcamentos");
  revalidatePath("/oportunidades");
  return { success: "Orçamento criado: " + formatCents(total) + "." };
}

export async function changeQuoteStatus(_previous: QuoteState, formData: FormData): Promise<QuoteState> {
  const parsed = z.object({ id: z.uuid(), transition: z.enum(["sent", "rejected", "approved"]) }).safeParse({
    id: formData.get("id"), transition: formData.get("transition"),
  });
  if (!parsed.success) return { error: "Ação inválida." };
  await requireModulePermission("quotes", "quotes.approve", { write: true });
  const supabase = await createClient();
  const { error } = parsed.data.transition === "approved"
    ? await supabase.rpc("approve_quote", { p_quote_id: parsed.data.id })
    : await supabase.rpc("set_quote_status", { p_quote_id: parsed.data.id, p_next_status: parsed.data.transition });
  if (error) return { error: "Não foi possível mudar o estado do orçamento. Atualize a página e confira o estado atual." };
  revalidatePath("/orcamentos");
  revalidatePath("/oportunidades");
  revalidatePath("/pedidos");
  return { success: parsed.data.transition === "approved" ? "Orçamento aprovado e pedido criado." : "Estado atualizado." };
}
