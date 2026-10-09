"use client";

import { useCallback, useMemo } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/base-ui/button";
import { TableFilter, TablePagination, useTableControls } from "@/components/table-controls";
import { archiveCustomer } from "./actions";
import { CustomerDetailSheet, type CustomerSale } from "./customer-detail-sheet";
import { CustomerEditForm, type Customer } from "./customer-edit-form";

type CustomerListProps = { customers: Customer[]; sales: CustomerSale[]; canEdit: boolean; canViewSales: boolean; salesError: boolean };

export function CustomerList({ customers, sales, canEdit, canViewSales, salesError }: CustomerListProps) {
  const getSearchText = useCallback((customer: Customer) => [customer.name, customer.company_name, customer.email, customer.phone].filter(Boolean).join(" "), []);
  const table = useTableControls(customers, getSearchText);
  const salesByCustomer = useMemo(() => {
    const grouped = new Map<string, CustomerSale[]>();
    for (const sale of sales) {
      const customerSales = grouped.get(sale.customer_id);
      if (customerSales) customerSales.push(sale);
      else grouped.set(sale.customer_id, [sale]);
    }
    return grouped;
  }, [sales]);

  return <>
    <TableFilter entity="clientes" query={table.query} onQueryChange={table.setQuery} resultCount={table.filteredCount} countText={`${table.filteredCount} cliente${table.filteredCount === 1 ? "" : "s"} cadastrado${table.filteredCount === 1 ? "" : "s"}`} />
    <section className="customer-list" aria-label="Clientes cadastrados">
      <table className="customer-table">
        <thead><tr><th scope="col">Cliente</th><th scope="col">Contato</th><th scope="col">Cliente desde</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
        <tbody>
          {table.visibleRows.map((customer) => <tr key={customer.id}>
            <td data-label="Cliente"><div className="customer-name-cell"><strong>{customer.name}</strong>{customer.company_name ? <small>{customer.company_name}</small> : null}</div></td>
            <td data-label="Contato"><div className="customer-contact-cell">
              {customer.email ? <span>{customer.email}</span> : null}
              {customer.phone ? <span>{customer.phone}</span> : null}
              {!customer.email && !customer.phone ? <span className="customer-contact-missing">Sem contato informado</span> : null}
            </div></td>
            <td data-label="Cliente desde" className="customer-date-cell">{new Date(customer.created_at).toLocaleDateString("pt-BR")}</td>
            <td data-label="Ações"><div className="customer-row-actions">
              <CustomerDetailSheet customer={customer} sales={salesByCustomer.get(customer.id) ?? []} canViewSales={canViewSales} salesError={salesError} />
              {canEdit ? <CustomerEditForm customer={customer} /> : null}
              {canEdit ? <form action={archiveCustomer}>
                <input type="hidden" name="id" value={customer.id} />
                <Button type="submit" variant="ghost" size="sm" className="customer-archive-action" aria-label={`Arquivar ${customer.name}`} title={`Arquivar ${customer.name}`}><Archive size={15} aria-hidden="true" /><span>Arquivar</span></Button>
              </form> : null}
            </div></td>
          </tr>)}
          {!table.filteredCount ? <tr><td colSpan={4} className="table-no-results">Nenhum cliente corresponde ao filtro.</td></tr> : null}
        </tbody>
      </table>
    </section>
    <TablePagination entity="dos clientes" firstResult={table.firstResult} lastResult={table.lastResult} resultCount={table.filteredCount} page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
  </>;
}
