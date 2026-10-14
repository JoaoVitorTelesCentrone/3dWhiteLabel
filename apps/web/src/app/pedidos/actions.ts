"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type ShipmentState = { error?: string; success?: string };

export type CreateOrderState = ShipmentState;
export type DeliveryAddress = {
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: "BR";
};
export type OrderDetails = {
  items: Array<{ id: string; description: string; quantity: number; unitPriceCents: number; imageUrl: string | null }>;
  deliveryAddress: DeliveryAddress | null;
  shipments: Array<{ carrier: string | null; trackingCode: string | null; shippedAt: string; deliveredAt: string | null }>;
};

export async function loadOrderDetails(id: string): Promise<{ data?: OrderDetails; error?: string }> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { error: "Pedido inválido." };
  const context = await requireModulePermission("orders", "orders.view");
  const supabase = await createClient();
  const [order, items, shipments] = await Promise.all([
    supabase.from("sales_orders").select("id,delivery_address").eq("tenant_id", context.tenantId).eq("id", parsed.data).maybeSingle(),
    supabase.from("sales_order_items").select("id,description,quantity,unit_price_cents,product_variant_id").eq("tenant_id", context.tenantId).eq("order_id", parsed.data),
    supabase.from("order_shipments").select("carrier,tracking_code,shipped_at,delivered_at").eq("tenant_id", context.tenantId).eq("order_id", parsed.data).order("shipped_at", { ascending: false }),
  ]);
  if (order.error || items.error || shipments.error || !order.data) return { error: "Não foi possível carregar os detalhes deste pedido." };
  const variantIds = (items.data ?? []).flatMap((item) => item.product_variant_id ? [item.product_variant_id] : []);
  const variants = variantIds.length
    ? await supabase.from("product_variants").select("id,product_id").eq("tenant_id", context.tenantId).in("id", variantIds)
    : { data: [], error: null };
  const productIds = [...new Set((variants.data ?? []).map((variant) => variant.product_id))];
  const products = productIds.length
    ? await supabase.from("products").select("id,image_path").eq("tenant_id", context.tenantId).in("id", productIds)
    : { data: [], error: null };
  if (variants.error || products.error) return { error: "Não foi possível carregar as imagens deste pedido." };
  const imagePaths = (products.data ?? []).flatMap((product) => product.image_path ? [product.image_path] : []);
  const signedImages = imagePaths.length
    ? await supabase.storage.from("forja-products").createSignedUrls(imagePaths, 60 * 60)
    : { data: [], error: null };
  const imageUrlByPath = new Map(imagePaths.map((path, index) => [path, signedImages.data?.[index]?.signedUrl ?? null]));
  const imagePathByProduct = new Map((products.data ?? []).map((product) => [product.id, product.image_path]));
  const productByVariant = new Map((variants.data ?? []).map((variant) => [variant.id, variant.product_id]));
  return { data: {
    items: (items.data ?? []).map((item) => {
      const productId = item.product_variant_id ? productByVariant.get(item.product_variant_id) : null;
      const imagePath = productId ? imagePathByProduct.get(productId) : null;
      return { id: item.id, description: item.description, quantity: item.quantity, unitPriceCents: item.unit_price_cents, imageUrl: imagePath ? imageUrlByPath.get(imagePath) ?? null : null };
    }),
    deliveryAddress: order.data.delivery_address as DeliveryAddress | null,
    shipments: (shipments.data ?? []).map((shipment) => ({ carrier: shipment.carrier, trackingCode: shipment.tracking_code, shippedAt: shipment.shipped_at, deliveredAt: shipment.delivered_at })),
  } };
}
const orderItemValues = z.object({
  variantId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(100000),
});
const createOrderValues = z.object({
  customerId: z.uuid(),
  items: z.array(orderItemValues).min(1).max(50),
  deliveryAddress: z.object({
    postalCode: z.string().trim().regex(/^\d{5}-?\d{3}$/),
    street: z.string().trim().min(2).max(160),
    number: z.string().trim().min(1).max(30),
    complement: z.string().trim().max(120).optional().transform((value) => value || undefined),
    neighborhood: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    country: z.literal("BR"),
  }),
});
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
  const variantIds = formData.getAll("variantId");
  const quantities = formData.getAll("quantity");
  const parsed = createOrderValues.safeParse({
    customerId: formData.get("customerId"),
    items: variantIds.map((variantId, index) => ({ variantId, quantity: quantities[index] })),
    deliveryAddress: {
      postalCode: formData.get("postalCode"),
      street: formData.get("street"),
      number: formData.get("addressNumber"),
      complement: formData.get("complement"),
      neighborhood: formData.get("neighborhood"),
      city: formData.get("city"),
      state: formData.get("state"),
      country: "BR",
    },
  });
  if (!parsed.success || variantIds.length !== quantities.length) {
    return { error: "Confira os produtos, as quantidades e o endereço de entrega." };
  }
  await requireModulePermission("orders", "orders.create", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_sales_order", {
    p_customer_id: parsed.data.customerId,
    p_items: parsed.data.items,
    p_delivery_address: parsed.data.deliveryAddress,
  });
  if (error) return { error: "Não foi possível criar o pedido. Confira se todos os produtos possuem preço e custo." };
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
