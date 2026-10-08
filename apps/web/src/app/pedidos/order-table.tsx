"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";
import { formatProductionProgress } from "@/lib/production-progress";
import { InlineDisclosureMenu } from "@/components/inline-disclosure-menu";
import { showToast } from "@/components/toast-center";
import { TABLE_PAGE_SIZE, TableFilter, TablePagination, useTableControls } from "@/components/table-controls";
import { changeOrderStatus, type CreateOrderState } from "./actions";
import { OrderDeleteSheet, OrderDetailSheet, OrderEditSheet, type OrderRecord } from "./order-detail-sheet";

type Option = { id: string; label: string };
const initialState: CreateOrderState = {};
function orderSearchText(order: OrderRecord) {
  return `${order.number} ${order.customerName} ${order.statusLabel} ${order.items.map((item) => item.description).join(" ")}`;
}
const statusOptions = [
  ["open", "Aberto"], ["in_production", "Em produção"], ["ready", "Pronto para envio"], ["shipped", "Enviado"], ["delivered", "Entregue"],
] as const;

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

export function OrderTable({ orders, customers, variants, canViewCosts, canChangeStatus, canRelease, selectedOrderId }: {
  orders: OrderRecord[];
  customers: Option[];
  variants: Option[];
  canViewCosts: boolean;
  canChangeStatus: boolean;
  canRelease: boolean;
  selectedOrderId?: string;
}) {
  const selectedIndex = orders.findIndex((order) => order.id === selectedOrderId);
  const selectedPage = selectedIndex < 0 ? 1 : Math.floor(selectedIndex / TABLE_PAGE_SIZE) + 1;
  const table = useTableControls(orders, orderSearchText, selectedPage);
  const { setPage, setQuery } = table;
  useEffect(() => {
    if (!selectedOrderId || selectedIndex < 0) return;
    setQuery("");
    setPage(selectedPage);
  }, [selectedOrderId, selectedIndex, selectedPage, setPage, setQuery]);
  return <>
  <TableFilter entity="pedidos" query={table.query} onQueryChange={table.setQuery} resultCount={table.filteredCount} />
  <div className="order-table-shell">
  <table className="order-table">
    <thead><tr><th scope="col">Pedido</th><th scope="col">Cliente e itens</th><th scope="col">Status</th><th scope="col">Faturamento</th>{canViewCosts ? <th scope="col">Lucro estimado</th> : null}<th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
    <tbody>{table.visibleRows.map((order) => <OrderDetailSheet key={order.id} order={order} initialOpen={order.id === selectedOrderId} trigger={
      <tr className="order-table-row-trigger" tabIndex={0} aria-label={`Abrir pedido #${order.number}`} onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); }
      }}>
        <td data-label="Pedido"><strong>Pedido #{order.number}</strong></td>
        <td data-label="Cliente"><strong>{order.customerName}</strong><small>{order.items.map((item) => `${item.quantity} × ${item.description}`).join(", ")}</small></td>
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
    } />)}{table.filteredCount === 0 ? <tr><td colSpan={canViewCosts ? 6 : 5} className="table-no-results">Nenhum pedido corresponde ao filtro.</td></tr> : null}</tbody>
  </table>
  </div>
  <TablePagination entity="dos pedidos" firstResult={table.firstResult} lastResult={table.lastResult} resultCount={table.filteredCount} page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
  </>;
}
