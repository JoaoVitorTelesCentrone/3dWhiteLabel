"use client";

import { Check, ChevronDown } from "lucide-react";
import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { InlineDisclosureMenu } from "@/components/inline-disclosure-menu";
import { showToast } from "@/components/toast-center";
import { startNextProductionPipelineJob } from "./actions";

export type PipelineStage = "queued" | "running" | "completed";
type MoveOrder = (productionOrderId: string, fromStage: PipelineStage, toStage: PipelineStage) => void;

const PipelineMoveContext = createContext<MoveOrder>(() => undefined);
const stageLabels: Record<PipelineStage, string> = {
  queued: "Na fila",
  running: "Imprimindo",
  completed: "Concluído",
};

export function ProductionPipelineBoard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const openTransitionDetails = (productionOrderId: string, stage: PipelineStage) => {
    window.dispatchEvent(new CustomEvent("agencia3d:production-open-order", { detail: { productionOrderId, stage } }));
  };

  useEffect(() => {
    const openOrder = (event: Event) => {
      const { productionOrderId, stage } = (event as CustomEvent<{ productionOrderId: string; stage: PipelineStage }>).detail;
      const params = new URLSearchParams(window.location.search);
      params.set("ordem", productionOrderId);
      params.set("etapa", stage);
      router.push(`/producao?${params}`, { scroll: false });
    };
    window.addEventListener("agencia3d:production-open-order", openOrder);
    return () => window.removeEventListener("agencia3d:production-open-order", openOrder);
  }, [router]);

  const moveOrder: MoveOrder = (productionOrderId, fromStage, toStage) => {
    setError(null);
    if (fromStage === toStage) return;

    if (fromStage === "running" && toStage === "completed") {
      openTransitionDetails(productionOrderId, "completed");
      return;
    }
    if (fromStage !== "queued" || toStage !== "running") {
      setError("Essa mudança não é permitida para este pedido.");
      return;
    }

    startTransition(async () => {
      const result = await startNextProductionPipelineJob(productionOrderId);
      if (result.error) setError(result.error);
      else {
        showToast(result.success ?? "Etapa da produção atualizada.");
        router.refresh();
      }
    });
  };

  return <PipelineMoveContext.Provider value={moveOrder}>
    <div className={isPending ? "production-pipeline-board production-pipeline-board--pending" : "production-pipeline-board"}>
      {error ? <p className="production-pipeline-board-error" role="alert">{error}</p> : null}
      {children}
    </div>
  </PipelineMoveContext.Provider>;
}

export function ProductionStageCard({
  productionOrderId,
  stage,
  canRun,
  canAutoStart,
  children,
}: {
  productionOrderId: string;
  stage: PipelineStage;
  canRun: boolean;
  canAutoStart: boolean;
  children: ReactNode;
}) {
  const moveOrder = useContext(PipelineMoveContext);
  const stages: PipelineStage[] = stage === "queued"
      ? ["queued", ...(canRun ? ["running" as const] : [])]
      : stage === "running"
        ? ["running", ...(canRun ? ["completed" as const] : [])]
        : ["completed"];

  return <div data-pipeline-stage={stage} className="production-stage-card">
    {children}
    <div className="production-stage-control">
      <span>Etapa</span>
      {stages.length > 1 ? <div className="order-status-menu production-stage-menu">
        <InlineDisclosureMenu
          compact
          title="Alterar etapa"
          triggerLabel="Alterar etapa da produção"
          showDelete={false}
          trigger={<><span className={`production-stage-dot production-stage-dot--${stage}`} aria-hidden="true" /><span>{stageLabels[stage]}</span><ChevronDown aria-hidden="true" /></>}
          menuItems={stages.map((option) => ({
            label: stageLabels[option],
            icon: <span className={`production-stage-dot production-stage-dot--${option}`} aria-hidden="true" />,
            endIcon: option === stage ? <Check size={15} aria-hidden="true" /> : undefined,
            className: `order-status-menu-option${option === stage ? " order-status-menu-option--active" : ""}`,
            onClick: () => {
              if (stage === "queued" && option === "running" && !canAutoStart) {
                window.dispatchEvent(new CustomEvent("agencia3d:production-open-order", {
                  detail: { productionOrderId, stage: "queued" },
                }));
                return;
              }
              moveOrder(productionOrderId, stage, option);
            },
          }))}
        />
      </div> : <span className="production-stage-static"><span className={`production-stage-dot production-stage-dot--${stage}`} aria-hidden="true" />{stageLabels[stage]}</span>}
    </div>
  </div>;
}

export function ProductionPipelineColumn({ stage, children }: { stage: PipelineStage; children: ReactNode }) {
  return <div data-pipeline-stage-column={stage} className="production-pipeline-stage-body">{children}</div>;
}
