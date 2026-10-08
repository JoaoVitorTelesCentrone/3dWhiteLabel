"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";

export const TABLE_PAGE_SIZE = 10;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function useTableControls<T>(rows: T[], getSearchText: (row: T) => string, initialPage = 1) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(initialPage);
  const filteredRows = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return normalizedQuery
      ? rows.filter((row) => normalize(getSearchText(row)).includes(normalizedQuery))
      : rows;
  }, [rows, getSearchText, query]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = filteredRows.length ? (currentPage - 1) * TABLE_PAGE_SIZE : 0;
  const changeQuery = useCallback((value: string) => { setQuery(value); setPage(1); }, []);
  const changePage = useCallback((value: number) => { setPage(Math.max(1, Math.min(value, pageCount))); }, [pageCount]);

  return {
    query,
    setQuery: changeQuery,
    filteredRows,
    visibleRows: filteredRows.slice(firstIndex, firstIndex + TABLE_PAGE_SIZE),
    filteredCount: filteredRows.length,
    page: currentPage,
    pageCount,
    firstResult: filteredRows.length ? firstIndex + 1 : 0,
    lastResult: Math.min(firstIndex + TABLE_PAGE_SIZE, filteredRows.length),
    setPage: changePage,
  };
}

export function TableFilter({ entity, query, onQueryChange, resultCount }: {
  entity: string;
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
}) {
  const inputId = useId();
  return <div className="table-filter-toolbar">
    <label className="sr-only" htmlFor={inputId}>Filtrar {entity}</label>
    <div className="table-filter-input">
      <Input id={inputId} type="search" className={query ? "pr-16" : "pr-10"} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={`Filtrar ${entity}…`} />
      {query ? <Button type="button" variant="ghost" size="icon-sm" aria-label="Limpar filtro" onClick={() => onQueryChange("")}><X aria-hidden="true" /></Button> : null}
      <Search size={16} aria-hidden="true" />
    </div>
    <span className="table-filter-count" aria-live="polite">{resultCount} {resultCount === 1 ? "resultado" : "resultados"}</span>
  </div>;
}

export function TablePagination({ entity, firstResult, lastResult, resultCount, page, pageCount, onPageChange }: {
  entity: string;
  firstResult: number;
  lastResult: number;
  resultCount: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount < 2) return null;
  return <nav className="table-pagination" aria-label={`Paginação de ${entity}`}>
    <span className="table-pagination-range">{firstResult}–{lastResult} de {resultCount}</span>
    <div className="table-pagination-controls">
      <span>Página {page} de {pageCount}</span>
      <Button type="button" variant="outline" size="icon-sm" aria-label="Página anterior" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft aria-hidden="true" /></Button>
      <Button type="button" variant="outline" size="icon-sm" aria-label="Próxima página" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}><ChevronRight aria-hidden="true" /></Button>
    </div>
  </nav>;
}
