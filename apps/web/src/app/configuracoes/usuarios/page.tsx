import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requirePermission } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { InviteUserForm, UserAccessForm } from "./forms";

const roleLabels: Record<string, string> = { owner: "Proprietário", admin: "Administrador", sales: "Comercial", production: "Produção", operator: "Operação", stock: "Estoque", finance: "Financeiro", viewer: "Consulta" };

export default async function TenantUsersPage() {
  const context = await requirePermission("users.manage");
  const admin = createAdminClient();
  const { data: users, error } = await admin.from("profiles").select("id,full_name,email,role,active,created_at")
    .eq("tenant_id", context.tenantId).order("created_at");
  const canEdit = context.licenseStatus !== "suspended";
  return <main className="management-page">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Configurações · {context.tenantName}</p><h1 className="page-title">Usuários</h1><p className="page-desc">Convide a equipe, atribua papéis e desative acessos quando necessário.</p></div><div className="page-actions">{canEdit ? <RecordCreateSheet title="Convidar usuário" description="Envie um convite e defina o papel de acesso."><InviteUserForm /></RecordCreateSheet> : null}</div></header>
    {error ? <p className="error" role="alert">Não foi possível carregar os usuários.</p> : null}
    {users?.map((user) => <section className="panel user-record" key={user.id}><header className="panel-head"><div><h2 className="panel-title">{user.full_name}</h2><p className="record-kicker">{user.email}</p></div><span className={`status-chip ${user.active ? "status-chip--completed" : "status-chip--canceled"}`}>{user.active ? "Ativo" : "Desativado"}</span></header>
      <p className="user-role">{roleLabels[user.role] ?? user.role}</p>
      {canEdit && user.role !== "owner" && user.id !== context.userId ? <UserAccessForm user={user} /> : null}
    </section>)}
    {!users?.length && !error ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhum usuário além de você</h2><p className="empty-state-hint">Convide pessoas da equipe e conceda apenas o acesso que precisam.</p></div> : null}
    
  </main>;
}
