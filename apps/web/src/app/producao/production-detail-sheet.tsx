"use client";

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function ProductionDetailSheet({
  title,
  description,
  productionOrderId,
  detailTrigger,
  children,
}: {
  title: string;
  description: string;
  productionOrderId: string;
  detailTrigger: ReactElement;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dropHint, setDropHint] = useState<string | null>(null);
  useEffect(() => {
    const openFromPipeline = (event: Event) => {
      const detail = (event as CustomEvent<{ productionOrderId: string; stage: string }>).detail;
      if (detail.productionOrderId !== productionOrderId) return;
      setDropHint(detail.stage === "queued"
        ? "Configure e crie um job para colocar este pedido na fila."
        : detail.stage === "completed"
          ? "Conclua os jobs e informe tempo, consumo e peças aprovadas."
          : "Cancele o job na fila para voltar ao planejamento.");
      setOpen(true);
    };
    window.addEventListener("agencia3d:production-open-order", openFromPipeline);
    return () => window.removeEventListener("agencia3d:production-open-order", openFromPipeline);
  }, [productionOrderId]);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={detailTrigger} />
    <SheetContent className="order-detail-sheet-panel gap-0 overflow-y-auto p-0" aria-label={title}>
      <SheetHeader className="border-b px-6 py-5 pr-14"><SheetTitle className="text-xl">{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader>
      <div className="order-detail-body production-detail-body">{dropHint ? <p className="production-pipeline-drop-hint" role="status">{dropHint}</p> : null}{children}</div>
    </SheetContent>
  </Sheet>;
}
