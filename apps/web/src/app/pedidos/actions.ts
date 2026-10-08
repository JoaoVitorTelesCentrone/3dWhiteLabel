"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type ShipmentState = { error?: string; success?: string };

export type CreateOrderState = ShipmentState;
const orderValues = z.object({
  customerId: z.uuid(),
  variantId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(100000),
});
const orderStatuses = z.enum(["open", "in_production", "ready", "shipped", "delivered"]);

function revalidateOrderViews() {
  for (const path of ["/dashboard", "/pedidos", "/financeiro", "/relatorios"]) revalidatePath(path);
}

export async function createOrder(_previous: CreateOrderState, formData: FormData): Promise<CreateOrderState> {
  const parsed = orderValues.safeParse({ customerId: formData.get("customerId"), variantId: formData.get("variantId"), quantity: formData.get("quantity") });
  if (!parsed.success) return { error: "Selecione o cliente, o produto e uma quantidade válida." };
  await requireModulePermission("orders", "orders.create", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_sales_order", {
    p_customer_id: parsed.data.customerId,
    p_product_variant_id: parsed.data.variantId,
    p_quantity: parsed.data.quantity,
  });
  if (error) return { error: "Não foi possível criar o pedido. Confira se o produto possui preço e custo." };
  revalidateOrderViews();
  return { success: "Pedido cadastrado." };
}

export async function updateOrder(_previous: CreateOrderState, formData: FormData): Promise<CreateOrderState> {
  const parsed = orderValues.extend({ id: z.uuid() }).safeParse({
    id: formData.get("id"),
    customerId: formData.get("customerId"),
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: "Confira o cliente, o produto e a quantidade." };
  await requireModulePermission("orders", "orders.create", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_sales_order", {
    p_order_id: parsed.data.id,
    p_customer_id: parsed.data.customerId,
    p_product_variant_id: parsed.data.variantId,
    p_quantity: parsed.data.quantity,
  });
  if (error) return { error: "Não foi possível salvar. Confira os dados e se o pedido ainda está aberto, sem produção ou recebimento." };
  revalidateOrderViews();
  return { success: "Pedido atualizado." };
}

export async function deleteOrder(_previous: CreateOrderState, formData: FormData): Promise<CreateOrderState> {
  const parsed = z.uuid().safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Pedido inválido." };
  await requireModulePermission("orders", "orders.cancel", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_sales_order", { p_order_id: parsed.data });
  if (error) return { error: "Não foi possível excluir. O pedido precisa estar aberto, sem produção ou recebimento." };
  revalidateOrderViews();
  return { success: "Pedido excluído." };
}

export async function changeOrderStatus(_previous: CreateOrderState, formData: FormData): Promise<CreateOrderState> {
  const parsed = z.object({ id: z.uuid(), status: orderStatuses }).safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { error: "Selecione um status válido." };
  const supabase = await createClient();
  let error: { message: string } | null = null;
  if (parsed.data.status === "in_production") {
    await requireModulePermission("production", "production.plan", { write: true });
    ({ error } = await supabase.rpc("release_order_to_production", { p_order_id: parsed.data.id }));
  } else if (parsed.data.status === "shipped") {
    await requireModulePermission("orders", "orders.create", { write: true });
    ({ error } = await supabase.rpc("ship_order", { p_order_id: parsed.data.id, p_carrier: null, p_tracking_code: null }));
  } else if (parsed.data.status === "delivered") {
    await requireModulePermission("orders", "orders.create", { write: true });
    ({ error } = await supabase.rpc("deliver_order", { p_order_id: parsed.data.id }));
  } else {
    return { error: "Esse status nao pode ser definido manualmente." };
  }
  if (error) return { error: "Não foi possível atualizar o status do pedido." };
  revalidateOrderViews();
  revalidatePath("/producao");
  return { success: "Status atualizado." };
}
export async function shipOrder(_previous: ShipmentState, formData: FormData): Promise<ShipmentState> {
  const parsed = z.object({ id: z.uuid(), carrier: z.string().trim().max(120), trackingCode: z.string().trim().max(160) }).safeParse({
    id: formData.get("id"), carrier: formData.get("carrier"), trackingCode: formData.get("trackingCode"),
  });
  if (!parsed.success) return { error: "Confira os dados da expedição." };
  await requireModulePermission("orders", "orders.create", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("ship_order", {
    p_order_id: parsed.data.id, p_carrier: parsed.data.carrier || null, p_tracking_code: parsed.data.trackingCode || null,
  });
  if (error) return { error: "Não foi possível expedir. O pedido precisa estar pronto." };
  revalidateOrderViews();
  return { success: "Pedido expedido." };
}
export async function deliverOrder(_previous: ShipmentState, formData: FormData): Promise<ShipmentState> {
  const parsed = z.uuid().safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Pedido inválido." };
  await requireModulePermission("orders", "orders.create", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("deliver_order", { p_order_id: parsed.data });
  if (error) return { error: "Não foi possível confirmar a entrega." };
  revalidateOrderViews();
  return { success: "Entrega confirmada." };
}
