"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformState = { error?: string; success?: string };
const plans = ["start", "pro", "business"] as const;
const licenses = ["active", "past_due", "suspended"] as const;
const moduleKeys = [
  "crm","quotes","orders","catalog","stock","printers","production","maintenance","quality",
  "qr_codes","actual_costs","planner","advanced_reports","customer_portal","api","integrations",
  "ai","multiunit","remove_branding",
] as const;

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

export async function createTenant(_previous: PlatformState, formData: FormData): Promise<PlatformState> {
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/),
    ownerName: z.string().trim().min(1).max(120),
    ownerEmail: z.email().max(254).transform((value) => value.toLowerCase()),
    plan: z.enum(plans),
  }).safeParse({
    name: formData.get("name"), slug: formData.get("slug"), ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"), plan: formData.get("plan"),
  });
  if (!parsed.success) return { error: "Confira empresa, slug, owner e plano." };
  const actor = await requirePlatformAdmin();
  const admin = createAdminClient();
  const baseDomain = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;
  const appUrl = process.env.AGENCIA3D_APP_URL;
  if (!baseDomain || !appUrl) return { error: "Domínio base ou URL do app não configurados." };
  const host = parsed.data.slug + "." + baseDomain;
  const callback = new URL("/auth/callback", appUrl);
  callback.hostname = host;
  let owner;
  try { owner = await findUserByEmail(admin, parsed.data.ownerEmail); }
  catch { return { error: "Não foi possível consultar o owner." }; }
  if (owner) {
    const { data: profile } = await admin.from("profiles").select("tenant_id").eq("id", owner.id).maybeSingle();
    if (profile) return { error: "Owner já vinculado a outra empresa." };
  }
  if (!owner) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.ownerEmail, {
      data: { full_name: parsed.data.ownerName }, redirectTo: callback.toString(),
    });
    if (error || !data.user) return { error: "Não foi possível convidar o owner." };
    owner = data.user;
  }
  const { data: tenantId, error } = await admin.rpc("provision_tenant_with_owner", {
    p_name: parsed.data.name, p_slug: parsed.data.slug, p_host: host,
    p_owner_id: owner.id, p_owner_name: parsed.data.ownerName, p_owner_email: parsed.data.ownerEmail,
  });
  if (error || !tenantId) return { error: "Convite criado, mas o tenant não foi ativado. Repita o cadastro para retomar." };
  if (parsed.data.plan !== "start") {
    const { error: planError } = await admin.rpc("platform_update_tenant", {
      p_tenant_id: tenantId, p_plan: parsed.data.plan, p_license_status: "active", p_actor_id: actor.id,
    });
    if (planError) return { error: "Tenant criado, mas o plano não foi aplicado. Ajuste-o na lista." };
  }
  await admin.from("platform_audit_events").insert({
    actor_id: actor.id, tenant_id: tenantId, action: "tenant.create",
    after_state: { name: parsed.data.name, slug: parsed.data.slug, owner_email: parsed.data.ownerEmail },
  });
  revalidatePath("/admin");
  return { success: "Tenant ativado em " + callback.origin + "." };
}

export async function updateTenant(_previous: PlatformState, formData: FormData): Promise<PlatformState> {
  const parsed = z.object({ id: z.uuid(), plan: z.enum(plans), license: z.enum(licenses) }).safeParse({
    id: formData.get("id"), plan: formData.get("plan"), license: formData.get("license"),
  });
  if (!parsed.success) return { error: "Plano ou licença inválidos." };
  const actor = await requirePlatformAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc("platform_update_tenant", {
    p_tenant_id: parsed.data.id, p_plan: parsed.data.plan,
    p_license_status: parsed.data.license, p_actor_id: actor.id,
  });
  if (error) return { error: "Não foi possível atualizar o tenant." };
  revalidatePath("/admin");
  return { success: "Tenant atualizado." };
}

export async function setTenantModule(_previous: PlatformState, formData: FormData): Promise<PlatformState> {
  const parsed = z.object({ id: z.uuid(), moduleKey: z.enum(moduleKeys), enabled: z.enum(["true", "false"]) }).safeParse({
    id: formData.get("id"), moduleKey: formData.get("moduleKey"), enabled: formData.get("enabled"),
  });
  if (!parsed.success) return { error: "Módulo inválido." };
  const actor = await requirePlatformAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc("platform_set_module", {
    p_tenant_id: parsed.data.id, p_module_key: parsed.data.moduleKey,
    p_enabled: parsed.data.enabled === "true", p_actor_id: actor.id,
  });
  if (error) return { error: "Não foi possível alterar o módulo." };
  revalidatePath("/admin");
  return { success: "Módulo atualizado." };
}

export async function requestCustomDomain(_previous: PlatformState, formData: FormData): Promise<PlatformState> {
  const parsed = z.object({ id: z.uuid(), host: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)+$/).max(253) }).safeParse({
    id: formData.get("id"), host: formData.get("host"),
  });
  if (!parsed.success) return { error: "Informe um domínio válido." };
  const actor = await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenant_runtime").select("id,plan").eq("id", parsed.data.id).maybeSingle();
  if (!tenant || tenant.plan !== "business") return { error: "Domínio próprio exige plano Business." };
  const { error } = await admin.from("tenant_domains").insert({
    tenant_id: parsed.data.id, host: parsed.data.host, kind: "custom", status: "pending",
  });
  if (error) return { error: "Não foi possível registrar o domínio. Confira se já está em uso." };
  await admin.from("platform_audit_events").insert({
    actor_id: actor.id, tenant_id: parsed.data.id, action: "tenant.domain.request",
    after_state: { host: parsed.data.host, status: "pending" },
  });
  revalidatePath("/admin");
  return { success: "Domínio registrado como pendente de verificação." };
}
