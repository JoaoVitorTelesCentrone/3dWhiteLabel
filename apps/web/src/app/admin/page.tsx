import { RecordCreateSheet } from "@/components/record-create-sheet";
import { Button } from "@/components/base-ui/button";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateTenantForm, CustomDomainForm, TenantModuleForm, TenantSettingsForm } from "./forms";
import { syncCustomDomain, updateSalesLead } from "./actions";

export default async function PlatformAdminPage() {
  const actor = await requirePlatformAdmin();
  const admin = createAdminClient();
  const [{ data: tenants, error }, { data: domains }, { data: overrides }, { data: events }, { data: leads }] = await Promise.all([
    admin.from("tenant_runtime").select("id,name,slug,plan,license_status").order("name"),
    admin.from("tenant_domains").select("id,tenant_id,host,kind,status,ssl_status,verification_record,last_error,checked_at").order("host"),
    admin.from("tenant_modules").select("tenant_id,module_key,enabled").order("module_key"),
    admin.from("platform_audit_events").select("id,action,tenant_id,created_at").order("created_at", { ascending: false }).limit(20),
    admin.from("sales_leads").select("id,name,company,email,phone,message,status,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const cnameTarget = process.env.CLOUDFLARE_SAAS_CNAME_TARGET;
  return <main className="management-page management-page--sections">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Administração Sua Empresa 3D · {actor.full_name}</p><h1 className="page-title">Tenants</h1><p className="page-desc">Provisione empresas e gerencie plano, licença, módulos e domínios registrados.</p></div><div className="page-actions"><RecordCreateSheet title="Novo tenant" description="Provisione uma nova empresa na plataforma."><CreateTenantForm /></RecordCreateSheet></div></header>
    {error ? <p className="error" role="alert">Não foi possível carregar os tenants.</p> : null}
    {tenants?.map((tenant) => <section className="panel" key={tenant.id}><h2>{tenant.name}</h2>
      <p>{tenant.slug} · {tenant.plan} · licença {tenant.license_status}</p>
      <div className="domain-list"><strong>Domínios</strong>
        {domains?.filter((domain) => domain.tenant_id === tenant.id).map((domain) => {
          const verification = domain.verification_record as { name?: string; type?: string; value?: string } | null;
          return <div className="domain-record" key={domain.id}>
            <p><strong>{domain.host}</strong> · domínio {domain.status} · SSL {domain.ssl_status ?? "não consultado"}</p>
            {domain.kind === "custom" && cnameTarget ? <dl><div><dt>CNAME</dt><dd>{cnameTarget}</dd></div></dl> : null}
            {verification?.name && verification.value ? <dl><div><dt>{verification.type ?? "TXT"}</dt><dd>{verification.name}</dd></div><div><dt>Valor</dt><dd>{verification.value}</dd></div></dl> : null}
            {domain.last_error ? <p className="error" role="alert">{domain.last_error}</p> : null}
            {domain.kind === "custom" ? <form action={syncCustomDomain}><input type="hidden" name="id" value={domain.id} /><Button type="submit">Verificar DNS e SSL</Button></form> : null}
          </div>;
        })}
        {!domains?.some((domain) => domain.tenant_id === tenant.id) ? <p>Nenhum domínio registrado.</p> : null}
      </div>
      <p>Overrides: {overrides?.filter((override) => override.tenant_id === tenant.id).map((override) => override.module_key + "=" + override.enabled).join(", ") || "nenhum"}</p>
      <TenantSettingsForm id={tenant.id} plan={tenant.plan} license={tenant.license_status} />
      <TenantModuleForm id={tenant.id} />
      {tenant.plan === "business" ? <CustomDomainForm id={tenant.id} /> : null}
    </section>)}
    {!tenants?.length && !error ? <p>Nenhum tenant provisionado.</p> : null}

    <section className="panel"><h2>Solicitações de demonstração</h2>
      <div className="lead-list">{leads?.map((lead) => <article className="lead-record" key={lead.id}>
        <header><div><strong>{lead.name}</strong><span>{lead.company}</span></div><time dateTime={lead.created_at}>{new Date(lead.created_at).toLocaleString("pt-BR")}</time></header>
        <p><a href={`mailto:${lead.email}`}>{lead.email}</a>{lead.phone ? <> · <a href={`tel:${lead.phone}`}>{lead.phone}</a></> : null}</p>
        {lead.message ? <p>{lead.message}</p> : null}
        <form action={updateSalesLead}><input name="id" type="hidden" value={lead.id} /><label>Status <select name="status" defaultValue={lead.status}><option value="new">Nova</option><option value="contacted">Contato iniciado</option><option value="qualified">Qualificada</option><option value="closed">Encerrada</option></select></label><Button type="submit">Salvar status</Button></form>
      </article>)}</div>
      {!leads?.length ? <p>Nenhuma solicitação recebida.</p> : null}
    </section>
    
    <section className="panel"><h2>Auditoria recente</h2>
      {events?.map((event) => <p key={event.id}>{new Date(event.created_at).toLocaleString("pt-BR")} · {event.action} · {event.tenant_id?.slice(0, 8) ?? "plataforma"}</p>)}
    </section>
  </main>;
}
