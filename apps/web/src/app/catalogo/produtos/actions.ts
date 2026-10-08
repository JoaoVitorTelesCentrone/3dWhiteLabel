"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const textOrNull = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);
const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: textOrNull(80),
  description: textOrNull(4000),
});

const moneySchema = z.string().trim().regex(/^\d{1,10}(?:[,.]\d{1,2})?$/);

function moneyToCents(value: string): number {
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export type ProductFormState = { error?: string; success?: string };

export async function createProductWithImage(formData: FormData): Promise<ProductFormState> {
  const parsed = z.object({
    id: z.uuid(),
    name: z.string().trim().min(2).max(160),
    price: moneySchema,
    cost: moneySchema,
  }).safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    price: formData.get("price"),
    cost: formData.get("cost"),
  });
  if (!parsed.success) return { error: "Confira o nome, o preço, o custo e a imagem." };
  const image = formData.get("image");
  if (!(image instanceof File) || image.size < 1 || image.size > 5 * 1024 * 1024
    || !["image/png", "image/jpeg", "image/webp"].includes(image.type)) {
    return { error: "Escolha uma imagem PNG, JPG ou WebP de até 5 MB." };
  }

  const priceCents = moneyToCents(parsed.data.price);
  const costCents = moneyToCents(parsed.data.cost);
  if (priceCents < 1 || costCents < 0 || priceCents > 999999999999 || costCents > 999999999999) {
    return { error: "Informe valores válidos. O preço precisa ser maior que zero." };
  }

  const context = await requireModulePermission("catalog", "catalog.edit", { write: true });
  const supabase = await createClient();
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const imagePath = `tenants/${context.tenantId}/products/${parsed.data.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("forja-products").upload(imagePath, image, {
    upsert: false,
    contentType: image.type,
    cacheControl: "3600",
  });
  if (uploadError) return { error: "Não foi possível enviar a imagem. Confira seu acesso e tente novamente." };

  const { error } = await supabase.rpc("create_product_with_default_variant", {
    p_product_id: parsed.data.id,
    p_name: parsed.data.name,
    p_price_cents: priceCents,
    p_cost_cents: costCents,
    p_image_path: imagePath,
  });
  if (error) {
    await supabase.storage.from("forja-products").remove([imagePath]);
    return { error: "Não foi possível cadastrar o produto. Confira os dados e tente novamente." };
  }
  revalidatePath("/catalogo/produtos");
  return { success: "Produto cadastrado." };
}

export async function createProduct(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: "Confira o nome, a categoria e a descrição do produto." };

  const context = await requireModulePermission("catalog", "catalog.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({ tenant_id: context.tenantId, ...parsed.data });
  if (error) return { error: "Não foi possível cadastrar o produto. Tente novamente." };
  revalidatePath("/catalogo/produtos");
  return { success: "Produto cadastrado." };
}

export async function updateProduct(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const parsed = productSchema.extend({ id: z.uuid() }).safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: "Confira os dados do produto." };
  const context = await requireModulePermission("catalog", "catalog.edit", { write: true });
  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  const { error } = await supabase.from("products").update(values).eq("id", id).eq("tenant_id", context.tenantId);
  if (error) return { error: "Não foi possível atualizar o produto." };
  revalidatePath("/catalogo/produtos");
  return { success: "Produto atualizado." };
}

const variantSchema = z.object({
  productId: z.uuid(),
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(80),
  price: z.string().trim().regex(/^\d{1,10}(?:[,.]\d{1,2})?$/),
  cost: z.string().trim().regex(/^\d{0,10}(?:[,.]\d{1,2})?$/).optional(),
  attributes: z.string().trim().max(600).optional(),
});
const variantUpdateSchema = variantSchema.omit({ productId: true }).extend({ id: z.uuid() });

function parseAttributes(input: string | undefined): Record<string, string> {
  if (!input) return {};
  const attributes: Record<string, string> = {};
  for (const entry of input.split(",")) {
    const separator = entry.indexOf("=");
    if (separator < 1) throw new Error("Informe atributos no formato cor=preto, tamanho=G.");
    const key = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(key) || !value || value.length > 80 || key in attributes) {
      throw new Error("Há um atributo inválido ou repetido.");
    }
    attributes[key] = value;
  }
  return attributes;
}

export async function createVariant(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const parsed = variantSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    cost: formData.get("cost") ?? "",
    attributes: formData.get("attributes"),
  });
  if (!parsed.success) return { error: "Confira nome, SKU, preço e atributos da variação." };

  let attributes: Record<string, string>;
  try {
    attributes = parseAttributes(parsed.data.attributes);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Atributos inválidos." };
  }

  const priceCents = moneyToCents(parsed.data.price);
  const costCents = parsed.data.cost ? moneyToCents(parsed.data.cost) : null;
  const context = await requireModulePermission("catalog", "catalog.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").insert({
    tenant_id: context.tenantId,
    product_id: parsed.data.productId,
    name: parsed.data.name,
    sku: parsed.data.sku,
    attributes,
    price_cents: priceCents,
    cost_cents: costCents,
  });
  if (error) return { error: "Não foi possível cadastrar a variação. Confira se o SKU já está em uso." };
  revalidatePath("/catalogo/produtos");
  return { success: "Variação cadastrada." };
}

export async function updateVariant(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const parsed = variantUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    cost: formData.get("cost") ?? "",
    attributes: formData.get("attributes"),
  });
  if (!parsed.success) return { error: "Confira os dados da variação." };

  let attributes: Record<string, string>;
  try {
    attributes = parseAttributes(parsed.data.attributes);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Atributos inválidos." };
  }
  const priceCents = moneyToCents(parsed.data.price);
  const costCents = parsed.data.cost ? moneyToCents(parsed.data.cost) : null;
  const context = await requireModulePermission("catalog", "catalog.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").update({
    name: parsed.data.name,
    sku: parsed.data.sku,
    attributes,
    price_cents: priceCents,
    cost_cents: costCents,
  }).eq("id", parsed.data.id).eq("tenant_id", context.tenantId);
  if (error) return { error: "Não foi possível atualizar a variação. Confira se o SKU já está em uso." };
  revalidatePath("/catalogo/produtos");
  return { success: "Variação atualizada." };
}

export async function setProductActive(formData: FormData): Promise<void> {
  const parsed = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) }).safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) return;
  const context = await requireModulePermission("catalog", "catalog.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ active: parsed.data.active === "true" })
    .eq("id", parsed.data.id).eq("tenant_id", context.tenantId);
  if (!error) revalidatePath("/catalogo/produtos");
}

export async function setVariantActive(formData: FormData): Promise<void> {
  const parsed = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) }).safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) return;
  const context = await requireModulePermission("catalog", "catalog.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").update({ active: parsed.data.active === "true" })
    .eq("id", parsed.data.id).eq("tenant_id", context.tenantId);
  if (!error) revalidatePath("/catalogo/produtos");
}
