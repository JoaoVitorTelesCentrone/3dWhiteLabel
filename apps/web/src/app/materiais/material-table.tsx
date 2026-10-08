"use client";

import { TableFilter, TablePagination, useTableControls } from "@/components/table-controls";
import { SpoolAdjustSheet } from "./forms";

export type MaterialTableRow = {
  id: string;
  name: string;
  details: string;
  active: boolean;
  spool: { id: string; code: string; tareG: number; currentGrossG: number; status: string } | null;
  reservedG: number;
};

const spoolStatusLabels: Record<string, string> = { active: "Em uso", empty: "Vazia", discarded: "Descartada" };
const spoolStatusStyles: Record<string, string> = { active: "completed", empty: "planned", discarded: "canceled" };

function materialSearchText(row: MaterialTableRow) {
  return [row.name, row.details, row.spool?.code, row.spool?.status, row.active ? "ativo" : "inativo"].filter(Boolean).join(" ");
}

export function MaterialTable({ rows, canAdjust, materialCount, spoolCount }: { rows: MaterialTableRow[]; canAdjust: boolean; materialCount: number; spoolCount: number }) {
  const table = useTableControls(rows, materialSearchText);
  return <>
    <TableFilter entity="materiais e bobinas" query={table.query} onQueryChange={table.setQuery} resultCount={table.filteredCount} />
    <section className="material-list" aria-label="Materiais e bobinas cadastrados">
      <div className="material-list-summary"><span>{materialCount} {materialCount === 1 ? "material" : "materiais"}</span><span>{spoolCount} {spoolCount === 1 ? "bobina cadastrada" : "bobinas cadastradas"}</span></div>
      <table className="material-table">
        <thead><tr><th scope="col">Material</th><th scope="col">Bobina</th><th scope="col">Disponível</th><th scope="col">Físico</th><th scope="col">Reservado</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
        <tbody>{table.visibleRows.map((row) => {
          const physical = row.spool ? row.spool.currentGrossG - row.spool.tareG : 0;
          const available = physical - row.reservedG;
          const statusLabel = !row.active ? "Material inativo" : row.spool ? spoolStatusLabels[row.spool.status] ?? row.spool.status : "Sem bobina";
          const statusStyle = !row.active ? "canceled" : row.spool ? spoolStatusStyles[row.spool.status] ?? "planned" : "planned";
          return <tr key={row.id}>
            <td data-label="Material"><div className="material-name-cell"><strong>{row.name}</strong><small>{row.details || "Sem detalhes adicionais"}</small></div></td>
            <td data-label="Bobina" className="material-code">{row.spool ? row.spool.code : <span className="material-value-muted">Nenhuma bobina</span>}</td>
            <td data-label="Disponível" className="material-weight material-weight--available">{row.spool ? `${available.toLocaleString("pt-BR")} g` : "—"}</td>
            <td data-label="Físico" className="material-weight">{row.spool ? `${physical.toLocaleString("pt-BR")} g` : "—"}</td>
            <td data-label="Reservado" className="material-weight">{row.spool ? `${row.reservedG.toLocaleString("pt-BR")} g` : "—"}</td>
            <td data-label="Status"><span className={`status-chip status-chip--${statusStyle}`}>{statusLabel}</span></td>
            <td data-label="Ações" className="material-row-actions">{row.spool && canAdjust && row.spool.status !== "discarded" ? <SpoolAdjustSheet id={row.spool.id} code={row.spool.code} currentGross={row.spool.currentGrossG} /> : null}</td>
          </tr>;
        })}{table.filteredCount === 0 ? <tr><td colSpan={7} className="table-no-results">Nenhum material ou bobina corresponde ao filtro.</td></tr> : null}</tbody>
      </table>
    </section>
    <TablePagination entity="dos materiais" firstResult={table.firstResult} lastResult={table.lastResult} resultCount={table.filteredCount} page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
  </>;
}
