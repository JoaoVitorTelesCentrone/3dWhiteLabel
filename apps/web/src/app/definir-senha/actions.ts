"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

const passwordSchema = z.object({
  password: z.string().min(12).max(256),
  confirmation: z.string().min(12).max(256),
}).refine((values) => values.password === values.confirmation, {
  path: ["confirmation"],
});

export type PasswordState = { error?: string };

export async function setInitialPassword(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { error: "Use uma senha com 12 caracteres ou mais e confirme os dois campos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "O convite expirou. Solicite um novo convite ao suporte." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Não foi possível salvar a senha. Tente novamente." };
  const host = (await headers()).get("host")?.toLowerCase();
  if (host && host === process.env.AGENCIA3D_ADMIN_HOST?.toLowerCase()) {
    const { data: admin } = await supabase.from("platform_admins").select("id").eq("id", user.id).maybeSingle();
    if (admin) redirect("/admin");
  }
  redirect("/dashboard");
}
