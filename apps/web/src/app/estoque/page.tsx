import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { FinishedGoodsForm } from "./form";
import { FinishedGoodsQuantityForm } from "./quantity-form";

const updatedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function FinishedGoodsPage() {
  const context = await requireModulePermission("stock", "stock.view");
  const supabase = await createClient();
  const [{ data: products, error: productsError }, { data: variants, error: variantsError }, { data: stock, error: stockError }] = await Promise.all([
    supabase.from("products").select("id,name").eq("tenant_id", context.tenantId).eq("active", true).order("name"),
    supabase.from("product_variants").select("id,product_id,name,sku,active").eq("tenant_id", context.tenantId).eq("active", true).order("name"),
    supabase.from("finished_goods_stock").select("product_variant_id,quantity,updated_at").eq("tenant_id", context.tenantId),
  ]);
  const loadError = productsError || variantsError || stockError;
  const productNames = new Map(products?.map((product) => [product.id, product.name]));
  const labels = new Map(variants?.map((variant) => [variant.id, `${productNames.get(variant.product_id) ?? "Produto"} · ${variant.name} (${variant.sku})`]));
  const stockByVariant = new Map(stock?.map((entry) => [entry.product_variant_id, entry]));
  const canAdjust = roleAllows(context.role, "stock.adjust") && context.licenseStatus !== "suspended";
  return <main className="management-page">
    <header className="page-head management-page-head">
      <div className="page-head-main"><h1 className="page-title">Produtos prontos</h1><p className="page-desc">Registre a quantidade de cada produto já finalizado e disponível para venda.</p></div>
      {canAdjust ? <div className="page-actions"><RecordCreateSheet title="Atualizar estoque" description="Informe a quantidade física disponível do produto pronto."><FinishedGoodsForm variants={variants?.map((variant) => ({ id: variant.id, label: labels.get(variant.id) ?? variant.name })) ?? []} /></RecordCreateSheet></div> : null}
    </header>

    {loadError ? <div className="material-list-error" role="alert"><strong>Não foi possível carregar o estoque de produtos.</strong><span>Atualize a página para tentar novamente.</span></div> : null}

    {!loadError ? <section className="material-list finished-goods-list" aria-label="Estoque de produtos prontos"><table className="material-table finished-goods-table"><thead><tr><th scope="col">Produto</th><th scope="col">Disponível</th><th scope="col">Atualizado em</th></tr></thead><tbody>
      {variants?.map((variant) => {
        const entry = stockByVariant.get(variant.id);
        return <tr key={variant.id}>
          <td data-label="Produto"><div className="finished-goods-product"><strong>{productNames.get(variant.product_id) ?? "Produto sem nome"}</strong><small>Variação: {variant.name}</small></div></td>
          <td data-label="Disponível" className="finished-goods-quantity">{canAdjust
            ? <FinishedGoodsQuantityForm variantId={variant.id} productName={productNames.get(variant.product_id) ?? variant.name} quantity={entry?.quantity ?? 0} />
            : <strong>{(entry?.quantity ?? 0).toLocaleString("pt-BR")} un.</strong>}</td>
          <td data-label="Atualizado em" className="finished-goods-updated">{entry?.updated_at
            ? <time dateTime={entry.updated_at}>{updatedAtFormatter.format(new Date(entry.updated_at))}</time>
            : "—"}</td>
        </tr>;
      })}
      {!variants?.length ? <tr><td colSpan={3} className="table-no-results">Cadastre produtos para controlar o estoque pronto.</td></tr> : null}
    </tbody></table></section> : null}
  </main>;
}
