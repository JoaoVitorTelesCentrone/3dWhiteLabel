import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ProductCreateSheet } from "./product-create-sheet";
import { type ProductRecord } from "./product-detail-sheet";
import { ProductTable } from "./product-table";
import { Package } from "lucide-react";

export default async function ProductsPage() {
  const context = await requireModulePermission("catalog", "catalog.view");
  const supabase = await createClient();
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, category, description, active, image_path")
    .eq("tenant_id", context.tenantId)
    .order("name");

  const productIds = products?.map((product) => product.id) ?? [];
  const { data: variants, error: variantsError } = productIds.length
    ? await supabase.from("product_variants")
      .select("id, product_id, name, sku, attributes, price_cents, cost_cents, active, is_default")
      .eq("tenant_id", context.tenantId)
      .in("product_id", productIds)
      .order("created_at")
    : { data: [], error: null };

  const imagePaths = (products ?? []).flatMap((product) => product.image_path ? [product.image_path] : []);
  const { data: signedImages } = imagePaths.length
    ? await supabase.storage.from("forja-products").createSignedUrls(imagePaths, 60 * 60)
    : { data: [] };
  const signedImageMap = new Map(imagePaths.map((path, index) => [path, signedImages?.[index]?.signedUrl ?? null]));
  const canViewCosts = roleAllows(context.role, "costs.view");
  const productRecords: ProductRecord[] = (products ?? []).map((product) => {
    const productVariants = (variants ?? []).filter((variant) => variant.product_id === product.id);
    const primary = productVariants.find((variant) => variant.is_default) ?? null;
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      active: product.active,
      imagePath: product.image_path,
      imageUrl: product.image_path ? signedImageMap.get(product.image_path) ?? null : null,
      priceCents: primary?.price_cents ?? null,
      costCents: canViewCosts ? primary?.cost_cents ?? null : null,
      variants: productVariants.map((variant) => ({
        ...variant,
        cost_cents: canViewCosts ? variant.cost_cents : null,
        attributes: variant.attributes as Record<string, string>,
      })),
    };
  });
  const loadError = productsError || variantsError;
  const canEdit = roleAllows(context.role, "catalog.edit") && context.licenseStatus !== "suspended";

  return (
    <main>
      <header className="page-head product-page-head">
        <div className="page-head-main">
          <h1 className="page-title">Produtos</h1>
          <p className="page-desc">Produtos cadastrados na sua operação, com preço e custo de referência.</p>
        </div>
        {canEdit ? <ProductCreateSheet /> : null}
      </header>

      {loadError ? <div className="product-list-error" role="alert"><strong>Não foi possível carregar o catálogo.</strong><span>Tente atualizar a página. Seus dados continuam protegidos.</span></div> : null}
      {!loadError && productRecords.length ? <ProductTable products={productRecords} canEdit={canEdit} canViewCosts={canViewCosts} /> : null}

      {!loadError && productRecords.length === 0 ? (
        <section className="product-empty-state">
          <span className="product-empty-icon"><Package aria-hidden="true" /></span>
          <h2>Nenhum produto cadastrado</h2>
          <p>Adicione o primeiro produto para organizar os preços e acompanhar seus custos.</p>
          {canEdit ? <ProductCreateSheet /> : null}
        </section>
      ) : null}
    </main>
  );
}
