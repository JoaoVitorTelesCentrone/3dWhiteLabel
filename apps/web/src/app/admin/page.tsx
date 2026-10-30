import { RecordCreateSheet } from "@/components/record-create-sheet";
import { Button } from "@/components/base-ui/button";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateTenantForm, CustomDomainForm, TenantModuleForm, TenantSettingsForm } from "./forms";
import { syncCustomDomain, updateSalesLead } from "./actions";

export default async function PlatformAdminPage() {
  const actor = await requirePlatformAdmin();
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: tenants, error }, { data: domains }, { data: overrides }, { data: events }, { data: leads }, { data: admins }, { count: lpViews }, { count: ctaClicks }, { count: formStarts }, { count: formSubmits }, { count: recentLeads }, { count: demosCount }, { count: proposalsCount }] = await Promise.all([
    admin.from("tenant_runtime").select("id,name,slug,plan,license_status").order("name").limit(500),
    admin.from("tenant_domains").select("id,tenant_id,host,kind,status,ssl_status,verification_record,last_error,checked_at").order("host").limit(1000),
    admin.from("tenant_modules").select("tenant_id,module_key,enabled").order("module_key").limit(5000),
    admin.from("platform_audit_events").select("id,action,tenant_id,created_at").order("created_at", { ascending: false }).limit(20),
    admin.from("sales_leads").select("id,name,company,email,phone,message,status,assigned_to,utm_source,utm_medium,utm_campaign,created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("platform_admins").select("id,full_name").eq("active", true).order("full_name"),
    admin.from("sales_funnel_events").select("id", { count: "exact", head: true }).eq("event_name", "lp_view").gte("created_at", thirtyDaysAgo),
    admin.from("sales_funnel_events").select("id", { count: "exact", head: true }).eq("event_name", "cta_click").gte("created_at", thirtyDaysAgo),
    admin.from("sales_funnel_events").select("id", { count: "exact", head: true }).eq("event_name", "form_start").gte("created_at", thirtyDaysAgo),
    admin.from("sales_funnel_events").select("id", { count: "exact", head: true }).eq("event_name", "form_submit").gte("created_at", thirtyDaysAgo),
    admin.from("sales_leads").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    admin.from("sales_leads").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo).not("demo_scheduled_at", "is", null),
    admin.from("sales_leads").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo).not("proposal_sent_at", "is", null),
  ]);
  const newLeads = leads?.filter((lead) => lead.status === "new").length ?? 0;
  const unassignedLeads = leads?.filter((lead) => !lead.assigned_to && lead.status !== "closed").length ?? 0;
  const leadToDemoRate = recentLeads ? Math.round(((demosCount ?? 0) / recentLeads) * 100) : 0;
  const demoToProposalRate = demosCount ? Math.round(((proposalsCount ?? 0) / demosCount) * 100) : 0;
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
      <p><strong>{newLeads}</strong> novas · <strong>{unassignedLeads}</strong> sem responsável entre as 100 mais recentes. A fila abaixo é o aviso operacional para a equipe.</p>
      <div className="lead-list">{leads?.map((lead) => <article className="lead-record" key={lead.id}>
        <header><div><strong>{lead.name}</strong><span>{lead.company}</span></div><time dateTime={lead.created_at}>{new Date(lead.created_at).toLocaleString("pt-BR")}</time></header>
        <p><a href={`mailto:${lead.email}`}>{lead.email}</a>{lead.phone ? <> · <a href={`tel:${lead.phone}`}>{lead.phone}</a></> : null}</p>
        {lead.phone ? <p><a target="_blank" rel="noreferrer" href={`https://wa.me/${lead.phone.replace(/\D/g, "").replace(/^0+/, "").replace(/^(?!55)(\d{10,11})$/, "55$1")}?text=${encodeURIComponent(`Oi, ${lead.name}! Vi seu pedido de demonstração para a ${lead.company}. Quero entender como vocês organizam os pedidos e mostrar um caminho simples para acompanhar produção e entregas. Podemos marcar uma demo?`)}`}>Abrir WhatsApp com mensagem pronta</a></p> : null}
        {lead.message ? <p>{lead.message}</p> : null}
        {lead.utm_source || lead.utm_medium || lead.utm_campaign ? <p>Origem: {[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" · ")}</p> : null}
        <form action={updateSalesLead}><input name="id" type="hidden" value={lead.id} /><label>Etapa <select name="status" defaultValue={lead.status}><option value="new">Nova</option><option value="contacted">Contato iniciado</option><option value="qualified">Qualificada</option><option value="demo_scheduled">Demo marcada</option><option value="demo_completed">Demo realizada</option><option value="proposal_sent">Proposta enviada</option><option value="closed">Encerrada</option></select></label><label>Responsável <select name="assignedTo" defaultValue={lead.assigned_to ?? ""}><option value="">Sem responsável</option>{admins?.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select></label><Button type="submit">Salvar</Button></form>
      </article>)}</div>
      {!leads?.length ? <p>Nenhuma solicitação recebida.</p> : null}
    </section>

    <section className="panel"><h2>Funil dos últimos 30 dias</h2>
      <div className="admin-funnel-metrics"><p><strong>{lpViews ?? 0}</strong><span>visualizações da LP</span></p><p><strong>{ctaClicks ?? 0}</strong><span>cliques na demonstração</span></p><p><strong>{formStarts ?? 0}</strong><span>inícios do formulário</span></p><p><strong>{formSubmits ?? 0}</strong><span>envios do formulário</span></p><p><strong>{demosCount ?? 0}</strong><span>demos marcadas entre leads recentes</span></p><p><strong>{proposalsCount ?? 0}</strong><span>propostas entre leads recentes</span></p><p><strong>{leadToDemoRate}%</strong><span>lead → demo (coorte de 30 dias)</span></p><p><strong>{demoToProposalRate}%</strong><span>demo → proposta (coorte de 30 dias)</span></p></div>
      <p>Eventos do site e leads criados consideram os últimos 30 dias. Os percentuais comparam leads dessa coorte que já avançaram no pipeline. A equipe registra as etapas na fila de solicitações.</p>
    </section>
    
    <section className="panel"><h2>Auditoria recente</h2>
      {events?.map((event) => <p key={event.id}>{new Date(event.created_at).toLocaleString("pt-BR")} · {event.action} · {event.tenant_id?.slice(0, 8) ?? "plataforma"}</p>)}
    </section>
  </main>;
}
