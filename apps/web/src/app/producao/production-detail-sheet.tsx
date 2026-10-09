"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function ProductionDetailSheet({
  title,
  description,
  dropHintStage,
  children,
}: {
  title: string;
  description: string;
  dropHintStage?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const dropHint = dropHintStage === "queued"
    ? "Informe material, quantidade e estimativas para criar o job. Depois, inicie a produção."
    : dropHintStage === "completed"
      ? "Conclua os jobs e informe tempo, consumo e peças aprovadas."
      : dropHintStage === "running"
        ? "Cancele o job na fila para voltar ao planejamento."
        : null;
  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("ordem");
    params.delete("etapa");
    router.replace(`/producao${params.size ? `?${params}` : ""}`, { scroll: false });
  };
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="order-detail-sheet-panel gap-0 overflow-y-auto p-0" aria-label={title}>
      <SheetHeader className="border-b px-6 py-5 pr-14"><SheetTitle className="text-xl">{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader>
      <div className="order-detail-body production-detail-body">{dropHint ? <p className="production-pipeline-drop-hint" role="status">{dropHint}</p> : null}{children}</div>
    </SheetContent>
  </Sheet>;
}
