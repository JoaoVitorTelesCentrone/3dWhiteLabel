import Link from "next/link";
import { Eye } from "lucide-react";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { formatProductionProgress, summarizeProduction } from "@/lib/production-progress";
import { createClient } from "@/lib/supabase/server";
import { CancelQueuedJobForm, CompleteJobForm, FailJobForm, StartJobForm } from "./forms";
import { ProductionDetailSheet } from "./production-detail-sheet";
import { ProductionPipelineBoard, ProductionPipelineColumn, ProductionStageCard, type PipelineStage } from "./production-pipeline-dnd";

const jobStatusLabels: Record<string, string> = {
  queued: "Na fila",
  running: "Imprimindo",
  completed: "Concluído",
  failed: "Falhou",
  canceled: "Cancelado",
};

const orderStatusLabels: Record<string, string> = {
  planned: "Planejada",
  in_progress: "Em produção",
  completed: "Concluída",
  canceled: "Cancelada",
};

const pipelineStages = [
  { id: "queued", label: "Na fila", hint: "Pedidos aguardando início" },
  { id: "running", label: "Imprimindo", hint: "Em execução agora" },
  { id: "completed", label: "Concluído", hint: "Pedidos finalizados" },
] as const;

function getPipelineStage(orderStatus: string, jobStatuses: string[], completedQty: number, targetQty: number): PipelineStage {
  if (orderStatus === "completed" || completedQty >= targetQty) return "completed";
  if (jobStatuses.includes("running")) return "running";
  return "queued";
}

export default async function ProductionPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const context = await requireModulePermission("production", "production.view");
  const selectedOrderId = (await searchParams).pedido;
  const supabase = await createClient();
  const [{ data: orders, error }, { data: jobs, error: jobsError }, { data: salesOrders }, { data: orderItems }, { data: printers }, { data: spools }] = await Promise.all([
    supabase.from("production_orders").select("id,sales_order_id,sales_order_item_id,target_qty,status").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }),
    supabase.from("production_jobs").select("id,production_order_id,printer_id,spool_id,quantity,estimated_minutes,estimated_g,actual_minutes,consumed_g,good_qty,bad_qty,status").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }),
    supabase.from("sales_orders").select("id,number").eq("tenant_id", context.tenantId),
    supabase.from("sales_order_items").select("id,order_id,description,quantity").eq("tenant_id", context.tenantId),
    supabase.from("printers").select("id,name").eq("tenant_id", context.tenantId),
    supabase.from("material_spools").select("id,code").eq("tenant_id", context.tenantId),
  ]);
  const canRun = roleAllows(context.role, "production.start") && context.licenseStatus !== "suspended";
  const canCancel = roleAllows(context.role, "production.cancel") && context.licenseStatus !== "suspended";
  const canViewOrders = context.modules.includes("orders") && roleAllows(context.role, "orders.view");
  const orderNumbers = new Map(salesOrders?.map((order) => [order.id, order.number]));
  const visibleOrders = selectedOrderId ? orders?.filter((order) => order.sales_order_id === selectedOrderId) : orders;
  const printerNames = new Map(printers?.map((p) => [p.id, p.name]));
  const spoolNames = new Map(spools?.map((s) => [s.id, s.code]));
  const pipelineOrders = (visibleOrders ?? []).map((op) => {
    const opJobs = jobs?.filter((job) => job.production_order_id === op.id) ?? [];
    const progress = summarizeProduction([op], opJobs);
    return { op, opJobs, progress, stage: getPipelineStage(op.status, opJobs.map((job) => job.status), progress.completedQty, progress.targetQty) };
  });
  return <main className="management-page"><header className="page-head management-page-head"><div className="page-head-main"><h1 className="page-title">Produção</h1><p className="page-desc">Pedidos enviados à produção, peças concluídas e trabalhos em andamento.</p></div>{selectedOrderId ? <Link className="btn btn-secondary" href="/producao">Ver toda a produção</Link> : null}</header>
    {error || jobsError ? <p className="error" role="alert">Não foi possível carregar a produção.</p> : null}
    {pipelineOrders.length ? <ProductionPipelineBoard><div className="production-pipeline" aria-label="Pipeline de produção">{pipelineStages.map((stage) => {
      const stageOrders = pipelineOrders.filter((item) => item.stage === stage.id);
      return <section className="production-pipeline-stage" key={stage.id} aria-label={stage.label}>
        <header className="production-pipeline-stage-head"><div><h2>{stage.label}</h2><p>{stage.hint}</p></div><span>{stageOrders.length}</span></header>
        <ProductionPipelineColumn stage={stage.id}>{stageOrders.map(({ op, opJobs, progress, stage: cardStage }) => {
      const number = orderNumbers.get(op.sales_order_id);
      const description = orderItems?.filter((item) => item.order_id === op.sales_order_id).map((item) => `${item.quantity} × ${item.description}`).join(", ");
      return <ProductionStageCard key={op.id} productionOrderId={op.id} stage={cardStage} canRun={canRun}><article className="production-pipeline-card">
        <header className="production-order-head"><div><h2>{number ? `Pedido #${number}` : `Pedido ${op.sales_order_id.slice(0, 8)}`}</h2>{description ? <p className="production-order-product">{description}</p> : null}</div><span className={`status-chip status-chip--${op.status}`}>{orderStatusLabels[op.status] ?? op.status}</span></header>
        <div className="production-progress-copy"><span>{formatProductionProgress(progress.completedQty, progress.targetQty)}</span><span>{progress.percent}%</span></div>
        <div className="production-progress" aria-hidden="true"><span style={{ "--progress": progress.percent / 100 } as React.CSSProperties} /></div>
      </article>
        <ProductionDetailSheet productionOrderId={op.id} title={number ? `Pedido #${number}` : `Pedido ${op.sales_order_id.slice(0, 8)}`} description={description ?? "Detalhes da ordem de produção"} detailTrigger={<button type="button" className="production-detail-trigger" aria-label={`Ver detalhes do pedido #${number ?? op.sales_order_id.slice(0, 8)}`} title="Ver detalhes" data-production-detail-trigger><Eye aria-hidden="true" /></button>}>
        <section className="production-detail-section">
        <div className="production-progress-copy"><span>{canViewOrders && number ? <Link href={`/pedidos?pedido=${op.sales_order_id}`}>Ver pedido #{number}</Link> : `OP ${op.id.slice(0, 8)}`}</span><span>{formatProductionProgress(progress.completedQty, progress.targetQty)}</span></div>
        <div className="production-progress" role="progressbar" aria-label={`Progresso do pedido ${number ?? op.sales_order_id.slice(0, 8)}`} aria-valuemin={0} aria-valuemax={op.target_qty} aria-valuenow={progress.completedQty}>
          <span style={{ "--progress": progress.percent / 100 } as React.CSSProperties} />
        </div>
        <p className="production-remaining">{progress.remainingToComplete > 0 ? `Faltam ${progress.remainingToComplete} peças para concluir.` : "Todas as peças foram concluídas."}</p>
        {opJobs.map((job) => <article className="production-job" key={job.id}>
          <header className="production-job-head"><h3>Job {job.id.slice(0, 8)}</h3><span className={`status-chip status-chip--${job.status}`}>{jobStatusLabels[job.status] ?? job.status}</span></header>
          <p className="production-job-meta">{job.quantity} peças <span aria-hidden="true">/</span> {printerNames.get(job.printer_id) ?? "Impressora"} <span aria-hidden="true">/</span> Bobina {spoolNames.get(job.spool_id) ?? "indisponível"}</p>
          <div className="comparison-grid" role="group" aria-label="Tempo e material previsto em comparação com o realizado">
            <div><span>Tempo previsto</span><strong>{job.estimated_minutes} min</strong></div>
            <div><span>Material previsto</span><strong>{job.estimated_g} g</strong></div>
            {job.status === "completed" ? <>
              <div className="comparison-actual"><span>Tempo real</span><strong>{job.actual_minutes} min</strong></div>
              <div className="comparison-actual"><span>Material real</span><strong>{job.consumed_g} g</strong></div>
              <div><span>Peças boas</span><strong>{job.good_qty}</strong></div>
              <div><span>Peças defeituosas</span><strong>{job.bad_qty}</strong></div>
            </> : null}
          </div>
          {canRun && job.status === "queued" ? <StartJobForm jobId={job.id} /> : null}
          {canCancel && job.status === "queued" ? <CancelQueuedJobForm jobId={job.id} /> : null}
          {canRun && job.status === "running" ? <CompleteJobForm jobId={job.id} quantity={job.quantity} estimatedMinutes={job.estimated_minutes} estimatedG={job.estimated_g} /> : null}
          {canRun && ["queued","running"].includes(job.status) ? <FailJobForm jobId={job.id} running={job.status === "running"} estimatedMinutes={job.estimated_minutes} estimatedG={job.estimated_g} /> : null}
        </article>)}
        </section>
      </ProductionDetailSheet></ProductionStageCard>;
      })}{!stageOrders.length ? <p className="production-pipeline-empty">Nenhum pedido nesta etapa.</p> : null}</ProductionPipelineColumn>
      </section>;
    })}</div></ProductionPipelineBoard> : null}
      {!pipelineOrders.length && !error ? <div className="empty-state"><h2 className="empty-state-title">Nenhum pedido na produção</h2><p className="empty-state-hint">Abra um pedido e selecione “Enviar para produção”.</p></div> : null}
  </main>;
}
