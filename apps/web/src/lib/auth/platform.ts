import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveRequestHost } from "@/lib/tenant/context";

export async function requirePlatformHost() {
  const host = resolveRequestHost(await headers())?.toLowerCase();
  const expected = process.env.AGENCIA3D_ADMIN_HOST?.toLowerCase();
  const normalizeHost = (value: string | undefined) => value?.replace(/:\d+$/, "");
  if (!host || !expected || normalizeHost(host) !== normalizeHost(expected)) redirect("/acesso-negado");
}

export async function requirePlatformAdmin() {
  await requirePlatformHost();
  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/admin/login");
  const { data: admin, error: adminError } = await supabase.from("platform_admins")
    .select("id,full_name,active").eq("id", userId).maybeSingle();
  if (adminError || !admin?.active) redirect("/acesso-negado");
  return admin;
}
