"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRight, Package, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/watermelon-ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProductEditForm } from "./product-edit-form";
import { VariantEditForm } from "./variant-edit-form";
import { VariantForm } from "./variant-form";
import { setProductActive, setVariantActive } from "./actions";

export type ProductRecord = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  active: boolean;
  imagePath: string | null;
  imageUrl: string | null;
  priceCents: number | null;
  costCents: number | null;
  variants: Array<{ id: string; name: string; sku: string; attributes: Record<string, string>; price_cents: number; cost_cents: number | null; active: boolean; is_default: boolean }>;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProductDetailSheet({ product, canEdit, canViewCosts }: { product: ProductRecord; canEdit: boolean; canViewCosts: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" className="product-row-open" aria-label={`Ver detalhes de ${product.name}`} />}>
        <span className="product-row-name">{product.name}</span><ChevronRight aria-hidden="true" />
      </SheetTrigger>
      <SheetContent className="product-detail-sheet-panel gap-0 overflow-y-auto p-0" aria-label={`Detalhes de ${product.name}`}>
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <div className="flex items-center gap-2"><SheetTitle className="text-xl">{product.name}</SheetTitle><Badge variant={product.active ? "secondary" : "outline"}>{product.active ? "Ativo" : "Inativo"}</Badge></div>
          <SheetDescription>Preços, dados do cadastro e variações disponíveis para este produto.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 px-6 py-5">
          <div className="product-detail-summary">
            {product.imageUrl ? <Image src={product.imageUrl} alt={`Imagem de ${product.name}`} width={80} height={80} unoptimized /> : <span className="product-image-placeholder"><Package aria-hidden="true" /></span>}
            <div><span>Preço de venda</span><strong>{product.priceCents == null ? "Não informado" : currency.format(product.priceCents / 100)}</strong></div>
            <div><span>Custo</span><strong>{!canViewCosts ? "Acesso restrito" : product.costCents == null ? "Não informado" : currency.format(product.costCents / 100)}</strong></div>
          </div>

          {canEdit ? <details className="product-detail-section"><summary><Pencil aria-hidden="true" />Editar dados do produto</summary><ProductEditForm product={product} /></details> : null}
          <section className="product-detail-section">
            <header className="product-detail-heading"><div><h3>Variações</h3><p>SKU e valores usados nos orçamentos.</p></div><Badge variant="outline">{product.variants.length}</Badge></header>
            {product.variants.length ? <div className="product-variant-list">{product.variants.map((variant) => (
              <article className="product-variant-item" key={variant.id}>
                <header><div><strong>{variant.name}{variant.is_default ? <span className="product-default-label">Padrão</span> : null}</strong><span>SKU {variant.sku}</span></div><strong>{currency.format(variant.price_cents / 100)}</strong></header>
                <p>{!canViewCosts ? "Custo com acesso restrito" : variant.cost_cents == null ? "Custo não informado" : `Custo ${currency.format(variant.cost_cents / 100)}`}{Object.keys(variant.attributes).length ? ` · ${Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(" · ")}` : ""}</p>
                {canEdit ? <><VariantEditForm variant={variant} /><form action={setVariantActive} className="product-inline-action"><input type="hidden" name="id" value={variant.id} /><input type="hidden" name="active" value={String(!variant.active)} /><Button type="submit" variant="ghost" size="sm">{variant.active ? "Desativar variação" : "Reativar variação"}</Button></form></> : null}
              </article>
            ))}</div> : <p className="product-detail-note">Nenhuma variação cadastrada.</p>}
            {canEdit && product.active ? <details className="product-add-variant"><summary className={buttonVariants({ size: "sm", className: "product-add-variant-trigger" })}><Plus aria-hidden="true" />Adicionar variação</summary><VariantForm productId={product.id} /></details> : null}
          </section>
        </div>
        {canEdit ? <SheetFooter className="sticky bottom-0 border-t bg-popover px-6 py-4"><form action={setProductActive}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="active" value={String(!product.active)} /><Button type="submit" variant={product.active ? "outline" : "default"}>{product.active ? "Desativar produto" : "Reativar produto"}</Button></form></SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
