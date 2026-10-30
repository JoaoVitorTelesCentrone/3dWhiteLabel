"use server";

import { z } from "zod";
import { headers } from "next/headers";
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
  utmSource: z.string().max(300).optional().transform(cleanCampaign),
  utmMedium: z.string().max(300).optional().transform(cleanCampaign),
  utmCampaign: z.string().max(300).optional().transform(cleanCampaign),
});

function cleanCampaign(value: string | undefined) {
  return value?.trim().replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 100) || undefined;
}

export async function captureSalesLead(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"), company: formData.get("company"), email: formData.get("email"),
    phone: formData.get("phone") || undefined, message: formData.get("message") || undefined,
    utmSource: formData.get("utm_source") || undefined, utmMedium: formData.get("utm_medium") || undefined,
    utmCampaign: formData.get("utm_campaign") || undefined,
    website: formData.get("website") || "", consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: "Revise os campos obrigatórios e aceite o uso dos dados para retorno do contato." };
  const referer = (await headers()).get("referer");
  let campaign: { source: string | null; medium: string | null; name: string | null } = { source: null, medium: null, name: null };
  try {
    const query = new URL(referer ?? "").searchParams;
    const clean = (value: string | null) => value?.trim().replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 100) || null;
    campaign = {
      source: clean(parsed.data.utmSource ?? query.get("utm_source")),
      medium: clean(parsed.data.utmMedium ?? query.get("utm_medium")),
      name: clean(parsed.data.utmCampaign ?? query.get("utm_campaign")),
    };
  } catch { /* Direct visits have no campaign parameters. */ }
  const admin = createAdminClient();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent } = await admin.from("sales_leads").select("id")
    .eq("email", parsed.data.email).gte("created_at", since).limit(1).maybeSingle();
  if (recent) return { success: "Solicitação recebida. Entraremos em contato pelos dados informados." };
  const { error } = await admin.from("sales_leads").insert({
    name: parsed.data.name, company: parsed.data.company, email: parsed.data.email,
    phone: parsed.data.phone || null, message: parsed.data.message || null,
    source: campaign.source ?? "website", utm_source: campaign.source,
    utm_medium: campaign.medium, utm_campaign: campaign.name,
  });
  if (error) return { error: "Não foi possível registrar a solicitação agora. Tente novamente em alguns minutos." };
  return { success: "Solicitação recebida. Entraremos em contato pelos dados informados." };
}
