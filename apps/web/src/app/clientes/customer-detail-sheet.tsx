"use client";

import Link from "next/link";
import { ArrowUpRight, Eye } from "lucide-react";
import { Button } from "@/components/base-ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatCents } from "@/lib/pricing";
import type { Customer } from "./customer-edit-form";

export type CustomerSale = {
  id: string;
  customer_id: string;
  number: number;
  status: string;
  total_price_cents: number;
  created_at: string;
};

type CustomerDetailSheetProps = {
  customer: Customer;
  sales: CustomerSale[];
  canViewSales: boolean;
  salesError: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });
const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_production: "Em produção",
  ready: "Pronto para envio",
  shipped: "Enviado",
  delivered: "Entregue",
};

export function CustomerDetailSheet({ customer, sales, canViewSales, salesError }: CustomerDetailSheetProps) {
  const orderTotal = sales.reduce((total, sale) => total + BigInt(sale.total_price_cents), 0n);

  return <Sheet>
    <SheetTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Ver detalhes de ${customer.name}`} title={`Ver detalhes de ${customer.name}`} />}>
      <Eye aria-hidden="true" />
    </SheetTrigger>
    <SheetContent className="record-create-sheet customer-detail-sheet gap-0 p-0" aria-label={`Detalhes de ${customer.name}`}>
      <SheetHeader className="border-b px-6 py-5 pr-14">
        <SheetTitle className="text-xl">{customer.name}</SheetTitle>
        <SheetDescription>Informações do cliente{canViewSales ? " e vendas vinculadas" : ""}.</SheetDescription>
      </SheetHeader>
      <div className="customer-detail-body">
        <section className="customer-detail-section" aria-labelledby={`customer-info-${customer.id}`}>
          <h3 id={`customer-info-${customer.id}`}>Informações do cliente</h3>
          <dl className="customer-detail-fields">
            <div><dt>Nome</dt><dd>{customer.name}</dd></div>
            <div><dt>Empresa</dt><dd>{customer.company_name || "Não informada"}</dd></div>
            <div><dt>E-mail</dt><dd>{customer.email || "Não informado"}</dd></div>
            <div><dt>Telefone</dt><dd>{customer.phone || "Não informado"}</dd></div>
            <div><dt>Cliente desde</dt><dd>{dateFormatter.format(new Date(customer.created_at))}</dd></div>
            <div className="customer-detail-notes"><dt>Observações</dt><dd>{customer.notes?.trim() || "Nenhuma observação registrada."}</dd></div>
          </dl>
        </section>

        {canViewSales ? <section className="customer-detail-section" aria-labelledby={`customer-sales-${customer.id}`}>
          <h3 id={`customer-sales-${customer.id}`}>Vendas</h3>
          {salesError ? <p className="customer-detail-message" role="alert">Não foi possível carregar as vendas deste cliente. Atualize a página para tentar novamente.</p> : <>
            <dl className="customer-sales-summary">
              <div><dt>Pedidos</dt><dd>{sales.length}</dd></div>
              <div><dt>Valor dos pedidos</dt><dd>{formatCents(orderTotal)}</dd></div>
            </dl>
            {sales.length ? <ul className="customer-sales-list">{sales.map((sale) => <li key={sale.id}>
              <Link href={`/pedidos?pedido=${sale.id}`} className="customer-sale-link">
                <span className="customer-sale-main"><strong>Pedido #{sale.number}</strong><small>{dateFormatter.format(new Date(sale.created_at))} · {statusLabels[sale.status] ?? sale.status}</small></span>
                <span className="customer-sale-value">{formatCents(BigInt(sale.total_price_cents))}</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </li>)}</ul> : <p className="customer-detail-message">Nenhuma venda registrada para este cliente.</p>}
          </>}
        </section> : null}
      </div>
    </SheetContent>
  </Sheet>;
}
