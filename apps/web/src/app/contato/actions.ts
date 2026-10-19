"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type ContactState = { error?: string; success?: string };

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().max(2000).optional(),
  website: z.string().max(0),
  consent: z.literal("on"),
});

export async function captureSalesLead(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"), company: formData.get("company"), email: formData.get("email"),
    phone: formData.get("phone") || undefined, message: formData.get("message") || undefined,
    website: formData.get("website") || "", consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: "Revise os campos obrigatórios e aceite o uso dos dados para retorno do contato." };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent } = await admin.from("sales_leads").select("id")
    .eq("email", parsed.data.email).gte("created_at", since).limit(1).maybeSingle();
  if (recent) return { success: "Solicitação recebida. Entraremos em contato pelos dados informados." };
  const { error } = await admin.from("sales_leads").insert({
    name: parsed.data.name, company: parsed.data.company, email: parsed.data.email,
    phone: parsed.data.phone || null, message: parsed.data.message || null,
  });
  if (error) return { error: "Não foi possível registrar a solicitação agora. Tente novamente em alguns minutos." };
  return { success: "Solicitação recebida. Entraremos em contato pelos dados informados." };
}
