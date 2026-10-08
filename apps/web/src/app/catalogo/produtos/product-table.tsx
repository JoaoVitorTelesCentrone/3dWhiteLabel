"use client";

import Image from "next/image";
import { ProductDetailSheet, type ProductRecord } from "./product-detail-sheet";
import { TableFilter, TablePagination, useTableControls } from "@/components/table-controls";

function productSearchText(product: ProductRecord) {
  return [product.name, product.category, product.description, ...product.variants.flatMap((variant) => [variant.name, variant.sku])].filter(Boolean).join(" ");
}

export function ProductTable({ products, canEdit, canViewCosts }: { products: ProductRecord[]; canEdit: boolean; canViewCosts: boolean }) {
  const table = useTableControls(products, productSearchText);
  return <>
    <TableFilter entity="produtos" query={table.query} onQueryChange={table.setQuery} resultCount={table.filteredCount} />
    <section className="product-list" aria-label="Produtos cadastrados">
      <div className="product-list-summary"><span>{products.length} {products.length === 1 ? "produto" : "produtos"}</span><span>Valores da variação padrão</span></div>
      <table className="product-table">
        <thead><tr><th scope="col">Imagem</th><th scope="col">Produto</th><th scope="col">Preço</th><th scope="col">Custo</th></tr></thead>
        <tbody>{table.visibleRows.map((product) => (
          <tr key={product.id}>
            <td data-label="Imagem">{product.imageUrl ? <Image className="product-row-image" src={product.imageUrl} alt="" width={48} height={48} unoptimized /> : <span className="product-row-image product-image-placeholder"><span aria-hidden="true">—</span></span>}</td>
            <td data-label="Produto"><div className="product-name-cell"><ProductDetailSheet product={product} canEdit={canEdit} canViewCosts={canViewCosts} />{!product.active ? <span className="product-inactive-label">Inativo</span> : null}</div></td>
            <td data-label="Preço" className="product-value">{product.priceCents == null ? <span className="product-value-missing">Não informado</span> : currency.format(product.priceCents / 100)}</td>
            <td data-label="Custo" className="product-value">{!canViewCosts ? <span className="product-value-missing">Acesso restrito</span> : product.costCents == null ? <span className="product-value-missing">Não informado</span> : currency.format(product.costCents / 100)}</td>
          </tr>
        ))}{table.filteredCount === 0 ? <tr><td colSpan={4} className="table-no-results">Nenhum produto corresponde ao filtro.</td></tr> : null}</tbody>
      </table>
    </section>
    <TablePagination entity="dos produtos" firstResult={table.firstResult} lastResult={table.lastResult} resultCount={table.filteredCount} page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
  </>;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
