"use client";

import { FileDown, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/base-ui/button";

export function ReportExportActions({ csvHref, fileName }: { csvHref: string; fileName: string }) {
  const exportPdf = () => {
    const previousTitle = document.title;
    document.title = fileName;
    window.addEventListener("afterprint", () => { document.title = previousTitle; }, { once: true });
    window.print();
  };

  return <div className="report-actions">
    <Button type="button" variant="outline" onClick={exportPdf}><FileDown aria-hidden="true" />Exportar PDF</Button>
    <Button render={<Link href={csvHref} />} nativeButton={false} variant="secondary"><FileSpreadsheet aria-hidden="true" />Exportar CSV</Button>
  </div>;
}
