"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type BrandingState = { error?: string; success?: string };
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
function contrast(a: string, b: string): number {
  function luminance(value: string) {
    const channels = [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
export async function updateBranding(_previous: BrandingState, formData: FormData): Promise<BrandingState> {
  const parsed = z.object({ displayName: z.string().trim().min(2).max(120), primaryColor: hex, accentColor: hex }).safeParse({
    displayName: formData.get("displayName"), primaryColor: formData.get("primaryColor"), accentColor: formData.get("accentColor"),
  });
  if (!parsed.success) return { error: "Confira nome e cores da marca." };
  if (contrast(parsed.data.primaryColor, "#140b07") < 4.5 || contrast(parsed.data.accentColor, "#0e1013") < 4.5) {
    return { error: "Escolha cores com contraste suficiente para botões e textos." };
  }
  const context = await requirePermission("branding.manage", { write: true });
  const supabase = await createClient();
  const { data, error } = await supabase.from("tenant_branding").update({
    display_name: parsed.data.displayName, primary_color: parsed.data.primaryColor, accent_color: parsed.data.accentColor,
  }).eq("tenant_id", context.tenantId).select("tenant_id").maybeSingle();
  if (error || !data) return { error: "Não foi possível salvar a marca." };
  revalidatePath("/", "layout");
  return { success: "Marca atualizada." };
}
