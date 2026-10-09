"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { formatProductionProgress } from "@/lib/production-progress";
import { InlineDisclosureMenu } from "@/components/inline-disclosure-menu";
import { showToast } from "@/components/toast-center";
import { TABLE_PAGE_SIZE, TableFilter, TablePagination } from "@/components/table-controls";
import { changeOrderStatus, type CreateOrderState } from "./actions";
import { OrderDeleteSheet, OrderDetailSheet, OrderEditSheet, type OrderRecord } from "./order-detail-sheet";

type Option = { id: string; label: string };
const initialState: CreateOrderState = {};
const statusOptions = [
  ["open", "Aberto"], ["in_production", "Em produção"], ["ready", "Pronto para envio"], ["shipped", "Enviado"], ["delivered", "Entregue"],
] as const;

function buildOrdersUrl(targetPage: number, targetSearch: string, targetStatus: string) {
  const params = new URLSearchParams();
  if (targetPage > 1) params.set("pagina", String(targetPage));
  if (targetSearch.trim()) params.set("busca", targetSearch.trim());
  if (targetStatus) params.set("status", targetStatus);
  const suffix = params.toString();
  return `/pedidos${suffix ? `?${suffix}` : ""}`;
}

function OrderStatusMenu({ order, disabled, canRelease }: { order: OrderRecord; disabled: boolean; canRelease: boolean }) {
  const [state, action, pending] = useActionState(changeOrderStatus, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) { showToast(state.success); router.refresh(); } }, [state.success, router]);
  const updateStatus = (status: string) => {
    if (disabled || pending || status === order.status) return;
    const data = new FormData();
    data.set("id", order.id); data.set("status", status);
    action(data);
  };
  const nextStatus = order.status === "open" ? "in_production"
    : order.status === "ready" ? "shipped"
      : order.status === "shipped" ? "delivered" : null;
  const canAdvance = !disabled && nextStatus !== null && (nextStatus !== "in_production" || canRelease);
  const visibleStatuses = canAdvance ? [order.status, nextStatus] : [];
  const orderedStatusOptions = statusOptions.filter(([value]) => visibleStatuses.includes(value));

  return <div className="order-status-menu" onClick={(event) => event.stopPropagation()}>
    {orderedStatusOptions.length ? <InlineDisclosureMenu compact title="Alterar status" triggerLabel={`Alterar status do pedido #${order.number}`} showDelete={false} trigger={<><span className={`order-status-trigger-dot order-status-trigger-dot--${order.statusStyle}`} aria-hidden="true" /><span>{order.statusLabel}</span><ChevronDown aria-hidden="true" /></>} menuItems={orderedStatusOptions.map(([value, label]) => ({
      label,
      icon: <span className={`order-status-menu-dot order-status-menu-dot--${value}`} aria-hidden="true" />,
      endIcon: value === order.status ? <Check size={15} aria-hidden="true" /> : undefined,
      className: `order-status-menu-option${value === order.status ? " order-status-menu-option--active" : ""}`,
      onClick: () => updateStatus(value),
    }))} /> : <span className={`status-chip status-chip--${order.status}`}>{order.statusLabel}</span>}
    {state.error ? <span className="order-status-error" role="alert">Não foi possível atualizar</span> : null}
  </div>;
}

export function OrderTable({ orders, customers, variants, canViewCosts, canChangeStatus, canRelease, selectedOrderId, page, totalCount, search, status }: {
  orders: OrderRecord[];
  customers: Option[];
  variants: Option[];
  canViewCosts: boolean;
  canChangeStatus: boolean;
  canRelease: boolean;
  selectedOrderId?: string;
  page: number;
  totalCount: number;
  search: string;
  status: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(search);
  const pageCount = Math.max(1, Math.ceil(totalCount / TABLE_PAGE_SIZE));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim() !== search) router.replace(buildOrdersUrl(1, query, status), { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, search, status, router]);
  useEffect(() => { setQuery(search); }, [search]);
  return <>
  <div className="order-filter-row">
    <TableFilter entity="pedidos" query={query} onQueryChange={setQuery} resultCount={totalCount} />
    <label className="order-status-filter">Status
      <select value={status} onChange={(event) => router.replace(buildOrdersUrl(1, query, event.target.value), { scroll: false })}>
        <option value="">Todos</option>
        {[...statusOptions, ["canceled", "Cancelado"] as const].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  </div>
  <div className="order-table-shell">
  <table className="order-table">
    <thead><tr><th scope="col">Pedido</th><th scope="col">Cliente e itens</th><th scope="col">Status</th><th scope="col">Faturamento</th>{canViewCosts ? <th scope="col">Lucro estimado</th> : null}<th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
    <tbody>{orders.map((order) => <OrderDetailSheet key={order.id} order={order} initialOpen={order.id === selectedOrderId} trigger={
      <tr className="order-table-row-trigger" tabIndex={0} aria-label={`Abrir pedido #${order.number}`} onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); }
      }}>
        <td data-label="Pedido"><strong>Pedido #{order.number}</strong></td>
        <td data-label="Cliente"><strong>{order.customerName}</strong><small>{order.itemSummary}</small></td>
        <td data-label="Status"><OrderStatusMenu order={order} disabled={!canChangeStatus} canRelease={canRelease} />{order.production ? <small className="order-production-summary">{formatProductionProgress(order.production.completedQty, order.production.targetQty)}</small> : null}</td>
        <td data-label="Faturamento" className="order-money">{formatCents(BigInt(order.totalPriceCents))}</td>
        {canViewCosts ? <td data-label="Lucro" className="order-money">{formatCents(BigInt(order.totalPriceCents) - BigInt(order.totalCostCents))}</td> : null}
        <td data-label="Ações" className="order-inline-actions" onClick={(event) => {
          if (!(event.target as HTMLElement).closest("[data-open-order-details]")) event.stopPropagation();
        }}>
          <Button type="button" variant="ghost" size="icon-sm" className="order-inline-action" aria-label={`Ver detalhes do pedido #${order.number}`} title="Ver detalhes" data-open-order-details>
            <Eye aria-hidden="true" />
          </Button>
          <OrderEditSheet order={order} customers={customers} variants={variants} disabled={!order.canEdit} />
          <OrderDeleteSheet order={order} disabled={!order.canDelete} />
        </td>
      </tr>
    } />)}{totalCount === 0 ? <tr><td colSpan={canViewCosts ? 6 : 5} className="table-no-results">Nenhum pedido corresponde ao filtro.</td></tr> : null}</tbody>
  </table>
  </div>
  <TablePagination entity="dos pedidos" firstResult={totalCount ? (page - 1) * TABLE_PAGE_SIZE + 1 : 0} lastResult={Math.min(page * TABLE_PAGE_SIZE, totalCount)} resultCount={totalCount} page={page} pageCount={pageCount} onPageChange={(targetPage) => router.push(buildOrdersUrl(targetPage, search, status), { scroll: false })} />
  </>;
}
