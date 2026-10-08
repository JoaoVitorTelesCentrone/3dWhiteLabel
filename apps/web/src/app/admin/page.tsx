import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateTenantForm, CustomDomainForm, TenantModuleForm, TenantSettingsForm } from "./forms";

export default async function PlatformAdminPage() {
  const actor = await requirePlatformAdmin();
  const admin = createAdminClient();
  const [{ data: tenants, error }, { data: domains }, { data: overrides }, { data: events }] = await Promise.all([
    admin.from("tenant_runtime").select("id,name,slug,plan,license_status").order("name"),
    admin.from("tenant_domains").select("tenant_id,host,kind,status").order("host"),
    admin.from("tenant_modules").select("tenant_id,module_key,enabled").order("module_key"),
    admin.from("platform_audit_events").select("id,action,tenant_id,created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  return <main className="management-page management-page--sections">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Administração Agencia 3D · {actor.full_name}</p><h1 className="page-title">Tenants</h1><p className="page-desc">Provisione empresas e gerencie plano, licença, módulos e domínios registrados.</p></div><div className="page-actions"><RecordCreateSheet title="Novo tenant" description="Provisione uma nova empresa na plataforma."><CreateTenantForm /></RecordCreateSheet></div></header>
    {error ? <p className="error" role="alert">Não foi possível carregar os tenants.</p> : null}
    {tenants?.map((tenant) => <section className="panel" key={tenant.id}><h2>{tenant.name}</h2>
      <p>{tenant.slug} · {tenant.plan} · licença {tenant.license_status}</p>
      <p>Domínios: {domains?.filter((domain) => domain.tenant_id === tenant.id).map((domain) => domain.host + " (" + domain.status + ")").join(", ") || "nenhum"}</p>
      <p>Overrides: {overrides?.filter((override) => override.tenant_id === tenant.id).map((override) => override.module_key + "=" + override.enabled).join(", ") || "nenhum"}</p>
      <TenantSettingsForm id={tenant.id} plan={tenant.plan} license={tenant.license_status} />
      <TenantModuleForm id={tenant.id} />
      {tenant.plan === "business" ? <CustomDomainForm id={tenant.id} /> : null}
    </section>)}
    {!tenants?.length && !error ? <p>Nenhum tenant provisionado.</p> : null}
    
    <section className="panel"><h2>Auditoria recente</h2>
      {events?.map((event) => <p key={event.id}>{new Date(event.created_at).toLocaleString("pt-BR")} · {event.action} · {event.tenant_id?.slice(0, 8) ?? "plataforma"}</p>)}
    </section>
  </main>;
}
