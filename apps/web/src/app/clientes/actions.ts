"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);
const customerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  companyName: optionalText(160),
  email: z.union([z.email().max(254), z.literal("")]).optional().transform((value) => value?.trim().toLowerCase() || null),
  phone: optionalText(40),
  notes: optionalText(4000),
});

export type CustomerFormState = { error?: string; success?: string };

export async function createCustomer(_previous: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Confira os campos. O nome é obrigatório e os limites de tamanho devem ser respeitados." };

  const context = await requireModulePermission("crm", "crm.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    tenant_id: context.tenantId,
    name: parsed.data.name,
    company_name: parsed.data.companyName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    notes: parsed.data.notes,
  });

  if (error) return { error: "Não foi possível cadastrar o cliente. Revise os dados ou tente novamente." };
  revalidatePath("/clientes");
  return { success: "Cliente cadastrado." };
}

export async function updateCustomer(_previous: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const parsed = customerSchema.extend({ id: z.uuid() }).safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Confira os campos informados." };

  const context = await requireModulePermission("crm", "crm.edit", { write: true });
  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  const { error } = await supabase.from("customers").update({
    name: values.name,
    company_name: values.companyName,
    email: values.email,
    phone: values.phone,
    notes: values.notes,
  }).eq("id", id).eq("tenant_id", context.tenantId).is("archived_at", null);

  if (error) return { error: "Não foi possível atualizar o cliente. Tente novamente." };
  revalidatePath("/clientes");
  return { success: "Alterações salvas." };
}

export async function archiveCustomer(formData: FormData): Promise<void> {
  const parsed = z.uuid().safeParse(formData.get("id"));
  if (!parsed.success) return;

  const context = await requireModulePermission("crm", "crm.edit", { write: true });
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data).eq("tenant_id", context.tenantId).is("archived_at", null);
  if (!error) revalidatePath("/clientes");
}
