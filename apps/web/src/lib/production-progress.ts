type ProductionOrder = { id: string; target_qty: number };
type ProductionJob = { production_order_id: string; status: string; quantity: number; good_qty: number | null };

export function formatProductionProgress(completedQty: number, targetQty: number) {
  const unit = targetQty === 1 ? "peça" : "peças";
  if (completedQty <= 0) return `${targetQty} ${unit} para produzir`;
  if (completedQty >= targetQty) return "Produção concluída";
  return `${completedQty} de ${targetQty} ${unit} prontas`;
}

export function summarizeProduction(orders: ProductionOrder[], jobs: ProductionJob[]) {
  const orderIds = new Set(orders.map((order) => order.id));
  const targetQty = orders.reduce((sum, order) => sum + order.target_qty, 0);
  const relatedJobs = jobs.filter((job) => orderIds.has(job.production_order_id));
  const completedQty = relatedJobs.filter((job) => job.status === "completed")
    .reduce((sum, job) => sum + (job.good_qty ?? 0), 0);
  const committedQty = relatedJobs.filter((job) => ["queued", "running", "completed"].includes(job.status))
    .reduce((sum, job) => sum + (job.status === "completed" ? (job.good_qty ?? 0) : job.quantity), 0);
  return {
    targetQty,
    completedQty,
    committedQty,
    remainingToPlan: Math.max(0, targetQty - committedQty),
    remainingToComplete: Math.max(0, targetQty - completedQty),
    percent: targetQty ? Math.min(100, Math.round(completedQty / targetQty * 100)) : 0,
  };
}
