"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatCents } from "@/lib/pricing";
import { formatProductionProgress } from "@/lib/production-progress";
import { ReleaseOrderForm } from "@/app/producao/forms";
import { DeliverOrderForm, ShipOrderForm } from "./shipment-forms";
import { deleteOrder, updateOrder, type CreateOrderState } from "./actions";

type Option = { id: string; label: string };
export type OrderRecord = {
  id: string;
  number: number;
  customerId: string;
  customerName: string;
  status: string;
  statusLabel: string;
  statusStyle: string;
  totalPriceCents: number;
  totalCostCents: number;
  createdAt: string;
  items: Array<{ id: string; description: string; quantity: number; unitPriceCents: number; variantId: string | null; hasRevision: boolean }>;
  shipments: Array<{ carrier: string | null; trackingCode: string | null; shippedAt: string; deliveredAt: string | null }>;
  canEdit: boolean;
  canDelete: boolean;
  canRelease: boolean;
  canShip: boolean;
  canViewCosts: boolean;
  production: ReturnType<typeof import("@/lib/production-progress").summarizeProduction> | null;
};

const initialState: CreateOrderState = {};

export function OrderEditForm({ order, customers, variants }: { order: OrderRecord; customers: Option[]; variants: Option[] }) {
  const [state, action, pending] = useActionState(updateOrder, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  const item = order.items[0];
  return <form action={action} className="order-edit-form">
    <input type="hidden" name="id" value={order.id} />
    <label>Cliente<select name="customerId" required defaultValue={order.customerId}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.label}</option>)}</select></label>
    <label>Produto<select name="variantId" required defaultValue={item.variantId ?? ""}><option value="" disabled>Selecione</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select></label>
    <label>Quantidade<input name="quantity" type="number" min="1" max="100000" required defaultValue={item.quantity} /></label>
    <p className="form-hint">Ao salvar, preço e custo são recalculados com os valores atuais do produto.</p>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar pedido"}</Button>
  </form>;
}

export function OrderDeleteForm({ order }: { order: OrderRecord }) {
  const [state, action, pending] = useActionState(deleteOrder, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  return <form action={action} className="order-delete-form">
    <input type="hidden" name="id" value={order.id} />
    <p>Esta ação exclui o pedido #{order.number} e seus itens. O registro da ação permanece na auditoria.</p>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" variant="destructive" disabled={pending}><Trash2 aria-hidden="true" />{pending ? "Excluindo…" : "Confirmar exclusão"}</Button>
  </form>;
}

export function OrderEditSheet({ order, customers, variants, disabled }: { order: OrderRecord; customers: Option[]; variants: Option[]; disabled: boolean }) {
  return <Sheet>
    <SheetTrigger render={<Button variant="ghost" size="icon-sm" className="order-inline-action" aria-label={`Editar pedido #${order.number}`} title={disabled ? "Este pedido não pode mais ser editado" : "Editar pedido"} disabled={disabled} onClick={(event) => event.stopPropagation()} />}><Pencil aria-hidden="true" /></SheetTrigger>
    <SheetContent className="order-detail-sheet-panel gap-0 overflow-y-auto p-0" aria-label={`Editar pedido #${order.number}`}><SheetHeader className="border-b px-6 py-5 pr-14"><SheetTitle className="text-xl">Editar pedido #{order.number}</SheetTitle><SheetDescription>Altere cliente, produto ou quantidade.</SheetDescription></SheetHeader><div className="order-detail-body"><OrderEditForm order={order} customers={customers} variants={variants} /></div></SheetContent>
  </Sheet>;
}

export function OrderDeleteSheet({ order, disabled }: { order: OrderRecord; disabled: boolean }) {
  return <Sheet>
    <SheetTrigger render={<Button variant="ghost" size="icon-sm" className="order-inline-action order-inline-action--danger" aria-label={`Excluir pedido #${order.number}`} title={disabled ? "Este pedido não pode mais ser excluído" : "Excluir pedido"} disabled={disabled} onClick={(event) => event.stopPropagation()} />}><Trash2 aria-hidden="true" /></SheetTrigger>
    <SheetContent className="order-detail-sheet-panel gap-0 overflow-y-auto p-0" aria-label={`Excluir pedido #${order.number}`}><SheetHeader className="border-b px-6 py-5 pr-14"><SheetTitle className="text-xl">Excluir pedido #{order.number}</SheetTitle><SheetDescription>Confirme a exclusão deste pedido.</SheetDescription></SheetHeader><div className="order-detail-body"><OrderDeleteForm order={order} /></div></SheetContent>
  </Sheet>;
}

export function OrderDetailSheet({ order, trigger, initialOpen = false }: { order: OrderRecord; trigger: ReactElement; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={trigger} nativeButton={false} />
    <SheetContent className="order-detail-sheet-panel gap-0 overflow-y-auto p-0" aria-label={`Pedido #${order.number}`}>
      <SheetHeader className="border-b px-6 py-5 pr-14">
        <SheetTitle className="text-xl">Pedido #{order.number}</SheetTitle>
        <SheetDescription>{order.customerName} · {order.statusLabel} · {new Date(order.createdAt).toLocaleDateString("pt-BR")}</SheetDescription>
      </SheetHeader>
      <div className="order-detail-body">
        <section aria-label="Itens do pedido">
          <h3>Itens</h3>
          {order.items.map((item) => <div className="record-line" key={item.id}><span>{item.quantity} × {item.description}</span><small>{formatCents(BigInt(item.unitPriceCents))} por unidade</small></div>)}
        </section>
        <div className="order-detail-totals">
          <div><span>Faturamento</span><strong>{formatCents(BigInt(order.totalPriceCents))}</strong></div>
          {order.canViewCosts ? <><div><span>Custo</span><strong>{formatCents(BigInt(order.totalCostCents))}</strong></div><div><span>Lucro estimado</span><strong>{formatCents(BigInt(order.totalPriceCents) - BigInt(order.totalCostCents))}</strong></div></> : null}
        </div>
        <section className="order-detail-action order-status-action" aria-label="Status do pedido">
          <h3>Status do pedido</h3>
          <p>Atual: <strong>{order.statusLabel}</strong></p>
          {order.canRelease ? <><p>Envie o pedido para produção para criar a ordem de produção vinculada.</p><ReleaseOrderForm orderId={order.id} /></> : null}
          {order.status === "in_production" ? <p>A produção atualiza este status automaticamente quando todas as peças forem concluídas.</p> : null}
          {order.canShip && order.status === "ready" ? <><p>Registre o envio para alterar o status para expedido.</p><ShipOrderForm id={order.id} /></> : null}
          {order.canShip && order.status === "shipped" ? <><p>Confirme a entrega para finalizar este pedido.</p><DeliverOrderForm id={order.id} /></> : null}
          {order.status === "delivered" ? <p>Pedido entregue e concluído.</p> : null}
        </section>
        {order.production ? <section className="order-detail-action"><h3>Produção do pedido</h3><p>{formatProductionProgress(order.production.completedQty, order.production.targetQty)}.</p><div className="production-progress" role="progressbar" aria-label={`Progresso do pedido #${order.number}`} aria-valuemin={0} aria-valuemax={order.production.targetQty} aria-valuenow={order.production.completedQty}><span style={{ "--progress": order.production.percent / 100 } as React.CSSProperties} /></div><Link className="order-production-link" href={`/producao?pedido=${order.id}`}>Ver na produção</Link></section> : null}
        {order.shipments.map((shipment) => <p className="record-shipment" key={shipment.shippedAt}>Enviado em {new Date(shipment.shippedAt).toLocaleDateString("pt-BR")}{shipment.carrier ? ` · ${shipment.carrier}` : ""}{shipment.trackingCode ? ` · rastreio ${shipment.trackingCode}` : ""}{shipment.deliveredAt ? " · entregue" : ""}</p>)}
        {!order.canEdit && order.status !== "open" ? <p className="order-history-note">Este pedido já avançou na operação. Seus valores ficam preservados no histórico.</p> : null}
      </div>
    </SheetContent>
  </Sheet>;
}
