"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformHost } from "@/lib/auth/platform";
import { createClient } from "@/lib/supabase/server";

export type AdminLoginState = { error?: string };
export async function signInPlatform(_previous: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  await requirePlatformHost();
  const parsed = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) }).safeParse({
    email: formData.get("email"), password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Informe e-mail e senha válidos." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Credenciais inválidas." };
  const { data: admin } = await supabase.from("platform_admins").select("id").eq("id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "Conta sem acesso à administração Agencia 3D." };
  }
  redirect("/admin");
}
