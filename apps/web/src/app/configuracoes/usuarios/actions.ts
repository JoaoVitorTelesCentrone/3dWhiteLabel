"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserState = { error?: string; success?: string };
const roles = ["admin", "sales", "production", "operator", "stock", "finance", "viewer"] as const;
const userSchema = z.object({ fullName: z.string().trim().min(1).max(120), email: z.email().max(254).transform((v) => v.toLowerCase()), role: z.enum(roles) });

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((entry) => entry.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Limite de usuários excedido.");
}

export async function inviteTenantUser(_previous: UserState, formData: FormData): Promise<UserState> {
  const parsed = userSchema.safeParse({ fullName: formData.get("fullName"), email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: "Confira nome, e-mail e papel." };
  const context = await requirePermission("users.manage", { write: true });
  const admin = createAdminClient();
  const host = (await headers()).get("host");
  if (!host) return { error: "Domínio do tenant indisponível." };
  const protocol = host.toLowerCase().includes("localhost") ? "http" : "https";
  const redirectTo = protocol + "://" + host + "/auth/callback";
  let user;
  try { user = await findUserByEmail(admin, parsed.data.email); }
  catch { return { error: "Não foi possível consultar as contas existentes." }; }
  if (user) {
    const { data: existing } = await admin.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
    if (existing) return { error: existing.tenant_id === context.tenantId ? "Usuário já cadastrado nesta empresa." : "Este e-mail já pertence a outra empresa." };
  }
  let invited = false;
  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { full_name: parsed.data.fullName }, redirectTo,
    });
    if (error || !data.user) return { error: "Não foi possível enviar o convite." };
    user = data.user;
    invited = true;
  }
  const { error: profileError } = await admin.rpc("platform_assign_tenant_user", {
    p_tenant_id: context.tenantId, p_user_id: user.id, p_full_name: parsed.data.fullName,
    p_email: parsed.data.email, p_role: parsed.data.role, p_actor_id: context.userId,
  });
  if (profileError) return { error: "Conta encontrada, mas não foi possível vinculá-la. Tente novamente." };
  revalidatePath("/configuracoes/usuarios");
  return { success: invited ? "Convite enviado e usuário vinculado." : "Usuário existente vinculado; ele já pode entrar neste domínio." };
}

export async function updateTenantUser(_previous: UserState, formData: FormData): Promise<UserState> {
  const parsed = z.object({ id: z.uuid(), role: z.enum(roles), active: z.enum(["true", "false"]) }).safeParse({
    id: formData.get("id"), role: formData.get("role"), active: formData.get("active"),
  });
  if (!parsed.success) return { error: "Confira papel e estado do usuário." };
  const context = await requirePermission("users.manage", { write: true });
  const admin = createAdminClient();
  const { data: current, error: readError } = await admin.from("profiles")
    .select("id,role,active").eq("id", parsed.data.id).eq("tenant_id", context.tenantId).maybeSingle();
  if (readError || !current || current.role === "owner") return { error: "Usuário indisponível para alteração." };
  if (context.userId === current.id) return { error: "Altere sua própria conta por outro administrador." };
  const active = parsed.data.active === "true";
  const { error } = await admin.rpc("platform_update_tenant_user", {
    p_tenant_id: context.tenantId, p_user_id: current.id,
    p_role: parsed.data.role, p_active: active, p_actor_id: context.userId,
  });
  if (error) return { error: "Não foi possível atualizar o usuário." };
  revalidatePath("/configuracoes/usuarios");
  return { success: "Usuário atualizado." };
}
