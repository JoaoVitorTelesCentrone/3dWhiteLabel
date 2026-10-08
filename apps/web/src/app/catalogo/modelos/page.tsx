import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DesignForm, RevisionForm } from "./design-forms";
import { DesignFileManager } from "./design-file-manager";

export default async function DesignsPage() {
  const context = await requireModulePermission("catalog", "designs.view");
  const supabase = await createClient();
  const [{ data: designs, error: designsError }, { data: revisions, error: revisionsError }, { data: files, error: filesError }] = await Promise.all([
    supabase.from("designs").select("id,name,category,description,active").eq("tenant_id", context.tenantId).order("name"),
    supabase.from("design_revisions").select("id,design_id,version,notes,created_at").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }),
    supabase.from("design_files").select("id,design_id,revision_id,storage_path,filename,format,size_bytes").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }),
  ]);
  const canEdit = roleAllows(context.role, "designs.edit") && context.licenseStatus !== "suspended";
  const error = designsError || revisionsError || filesError;
  return <main className="management-page">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Catálogo · {context.tenantName}</p><h1 className="page-title">Modelos 3D</h1><p className="page-desc">Organize arquivos técnicos por modelo e revisão. Os arquivos ficam em armazenamento privado da empresa.</p></div><div className="page-actions">{canEdit ? <RecordCreateSheet title="Cadastrar modelo" description="Organize um modelo 3D e suas revisões."><DesignForm /></RecordCreateSheet> : null}</div></header>
    {error ? <p className="error" role="alert">Não foi possível carregar os modelos.</p> : null}
    {designs?.map((design) => <section className="panel catalog-record" key={design.id}>
      <header className="panel-head"><h2 className="panel-title">{design.name}</h2><span className={`status-chip ${design.active ? "status-chip--completed" : "status-chip--canceled"}`}>{design.active ? "Ativo" : "Inativo"}</span></header>
      <p className="record-kicker">{design.category || "Modelo 3D"}</p>
      {design.description ? <p>{design.description}</p> : null}
      {revisions?.filter((revision) => revision.design_id === design.id).map((revision) => <article className="revision-record" key={revision.id}>
        <h3>Revisão {revision.version}</h3>{revision.notes ? <p>{revision.notes}</p> : null}
        <DesignFileManager tenantId={context.tenantId} designId={design.id} revisionId={revision.id} canEdit={canEdit} files={files?.filter((file) => file.revision_id === revision.id) ?? []} />
      </article>)}
      {canEdit ? <RevisionForm designId={design.id} /> : null}
    </section>)}
    {!designs?.length && !error ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhum modelo 3D cadastrado</h2><p className="empty-state-hint">Adicione um modelo para organizar arquivos técnicos e revisões.</p></div> : null}
    
  </main>;
}
