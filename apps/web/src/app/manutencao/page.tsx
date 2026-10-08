import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { formatCents } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { MaintenanceLogForm, MaintenancePlanForm } from "./forms";

export default async function MaintenancePage() {
  const context = await requireModulePermission("printers", "maintenance.view");
  const supabase = await createClient();
  const [{ data: printers, error }, { data: plans, error: plansError }, { data: logs }] = await Promise.all([
    supabase.from("printers").select("id,name,status,runtime_min").eq("tenant_id", context.tenantId).order("name"),
    supabase.from("maintenance_plans").select("id,printer_id,interval_min,alert_before_min,last_service_runtime_min,active").eq("tenant_id", context.tenantId),
    supabase.from("maintenance_logs").select("id,printer_id,notes,cost_cents,runtime_at_service_min,performed_at").eq("tenant_id", context.tenantId).order("performed_at", { ascending: false }).limit(100),
  ]);
  const canManage = roleAllows(context.role, "maintenance.manage") && context.licenseStatus !== "suspended";
  const printersById = new Map(printers?.map((p) => [p.id, p]));
  return <main className="management-page">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Fábrica · {context.tenantName}</p><h1 className="page-title">Manutenção</h1><p className="page-desc">Planeje pelo tempo de uso acumulado e registre cada serviço realizado.</p></div><div className="page-actions">{canManage ? <RecordCreateSheet title="Criar plano" description="Configure o intervalo de manutenção de uma impressora."><MaintenancePlanForm printers={printers?.filter((p) => !plans?.some((plan) => plan.printer_id === p.id)).map((p) => ({ id: p.id, name: p.name })) ?? []} /></RecordCreateSheet> : null}</div></header>
    {error || plansError ? <p className="error" role="alert">Não foi possível carregar os planos.</p> : null}
    {plans?.map((plan) => {
      const printer = printersById.get(plan.printer_id);
      const remaining = plan.last_service_runtime_min + plan.interval_min - (printer?.runtime_min ?? 0);
      const state = remaining <= 0 ? "Vencida" : remaining <= plan.alert_before_min ? "Próxima" : "Em dia";
      const style = state === "Vencida" ? "failed" : state === "Próxima" ? "planned" : "completed";
      return <section className="panel maintenance-card" key={plan.id}><header className="panel-head"><h2 className="panel-title">{printer?.name ?? "Impressora indisponível"}</h2><span className={`status-chip status-chip--${style}`}>{state}</span></header>
        <div className="maintenance-summary"><strong>{Math.max(0, Math.ceil(remaining / 60))} h</strong><span>restantes até a manutenção</span><small>Intervalo de {Math.ceil(plan.interval_min / 60)} h</small></div>
        <div className="maintenance-history"><h3>Serviços recentes</h3>
          {logs?.filter((log) => log.printer_id === plan.printer_id).slice(0, 5).map((log) => <div className="data-row" key={log.id}><div><p className="data-row-title">{log.notes}</p><p className="data-row-meta">{new Date(log.performed_at).toLocaleDateString("pt-BR")} · {Math.floor(log.runtime_at_service_min / 60)} h de uso</p></div><strong className="finance-amount">{formatCents(BigInt(log.cost_cents))}</strong></div>)}
          {!logs?.some((log) => log.printer_id === plan.printer_id) ? <p className="empty-inline">Nenhum serviço registrado.</p> : null}
        </div>
        {canManage ? <MaintenanceLogForm planId={plan.id} /> : null}
      </section>;
    })}
    {!plans?.length && !plansError ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhum plano de manutenção</h2><p className="empty-state-hint">Crie um plano para receber alertas conforme o tempo de uso das máquinas.</p></div> : null}
    
  </main>;
}
