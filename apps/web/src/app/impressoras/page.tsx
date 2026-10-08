import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PrinterActiveForm, PrinterForm } from "./forms";

const printerStatusLabels: Record<string, string> = { idle: "Livre", printing: "Imprimindo", maintenance: "Em manutenção", disabled: "Desativada" };
const printerStatusStyles: Record<string, string> = { idle: "completed", printing: "in_progress", maintenance: "planned", disabled: "canceled" };

export default async function PrintersPage() {
  const context = await requireModulePermission("printers", "printers.view");
  const supabase = await createClient();
  const { data: printers, error } = await supabase.from("printers")
    .select("id,name,model,status,active,runtime_min").eq("tenant_id", context.tenantId).order("name");
  const canEdit = roleAllows(context.role, "printers.edit") && context.licenseStatus !== "suspended";
  return <main className="management-page">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Fábrica · {context.tenantName}</p><h1 className="page-title">Impressoras</h1><p className="page-desc">Cadastre as máquinas para planejar e executar jobs de impressão.</p></div><div className="page-actions">{canEdit ? <RecordCreateSheet title="Cadastrar impressora" description="Adicione uma máquina à operação."><PrinterForm /></RecordCreateSheet> : null}</div></header>
    {error ? <p className="error" role="alert">Não foi possível carregar as impressoras.</p> : null}
    {printers?.map((printer) => <section className="panel printer-card" key={printer.id}><header className="panel-head"><h2 className="panel-title">{printer.name}</h2><span className={`status-chip status-chip--${printerStatusStyles[printer.status] ?? "planned"}`}>{printerStatusLabels[printer.status] ?? printer.status}</span></header>
      <p>{printer.model || "Modelo não informado"} <span aria-hidden="true">·</span> {printer.active ? "Ativa" : "Inativa"}</p>
      <div className="printer-runtime"><span>Tempo acumulado</span><strong>{Math.floor(printer.runtime_min / 60)} h</strong></div>
      {canEdit && printer.status === "idle" ? <PrinterActiveForm id={printer.id} active={printer.active} /> : null}
    </section>)}
    {!printers?.length && !error ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhuma impressora cadastrada</h2><p className="empty-state-hint">Cadastre uma máquina para começar a planejar jobs de impressão.</p></div> : null}
    
  </main>;
}
