import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "./form";

export default async function RecipesPage() {
  const context = await requireModulePermission("catalog", "catalog.view");
  const supabase = await createClient();
  const [{ data: recipes, error }, { data: variants }, { data: revisions }, { data: designs }, { data: materials }] = await Promise.all([
    supabase.from("production_recipes").select("id,product_variant_id,design_revision_id,material_id,version,estimated_g,estimated_minutes,units_per_plate,active").eq("tenant_id", context.tenantId).order("version", { ascending: false }),
    supabase.from("product_variants").select("id,name,sku,active").eq("tenant_id", context.tenantId),
    supabase.from("design_revisions").select("id,design_id,version").eq("tenant_id", context.tenantId),
    supabase.from("designs").select("id,name,active").eq("tenant_id", context.tenantId),
    supabase.from("materials").select("id,name,active").eq("tenant_id", context.tenantId),
  ]);
  const variantNames = new Map(variants?.map((v) => [v.id, v.sku + " · " + v.name]));
  const designNames = new Map(designs?.map((d) => [d.id, d.name]));
  const revisionNames = new Map(revisions?.map((r) => [r.id, designNames.get(r.design_id) + " · " + r.version]));
  const materialNames = new Map(materials?.map((m) => [m.id, m.name]));
  const canEdit = roleAllows(context.role, "catalog.edit") && context.modules.includes("stock") && context.licenseStatus !== "suspended";
  return <main className="management-page">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Catálogo · {context.tenantName}</p><h1 className="page-title">Receitas de produção</h1><p className="page-desc">Associe variação, revisão 3D e material. Cada nova receita desativa a anterior sem perder o histórico.</p></div><div className="page-actions">{canEdit ? <RecordCreateSheet title="Nova receita" description="Associe variação, revisão e material."><RecipeForm
      variants={variants?.filter((v) => v.active).map((v) => ({ id: v.id, label: v.sku + " · " + v.name })) ?? []}
      revisions={revisions?.filter((r) => designs?.some((d) => d.id === r.design_id && d.active)).map((r) => ({ id: r.id, label: designNames.get(r.design_id) + " · " + r.version })) ?? []}
      materials={materials?.filter((m) => m.active).map((m) => ({ id: m.id, label: m.name })) ?? []}
    /></RecordCreateSheet> : null}</div></header>
    {error ? <p className="error" role="alert">Não foi possível carregar as receitas.</p> : null}
    {recipes?.map((recipe) => <section className="panel catalog-record" key={recipe.id}><header className="panel-head"><h2 className="panel-title">{variantNames.get(recipe.product_variant_id) ?? "Variação"}</h2><span className={`status-chip ${recipe.active ? "status-chip--completed" : "status-chip--canceled"}`}>{recipe.active ? "Ativa" : "Histórica"}</span></header>
      <p className="record-kicker">Versão {recipe.version} · {revisionNames.get(recipe.design_revision_id) ?? "Revisão"} · {materialNames.get(recipe.material_id) ?? "Material"}</p>
      <div className="recipe-measurements"><div><span>Material estimado</span><strong>{recipe.estimated_g} g</strong></div><div><span>Tempo estimado</span><strong>{recipe.estimated_minutes} min</strong></div><div><span>Unidades por placa</span><strong>{recipe.units_per_plate}</strong></div></div>
    </section>)}
    {!recipes?.length && !error ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">—</span><h2 className="empty-state-title">Nenhuma receita de produção</h2><p className="empty-state-hint">Associe um produto, uma revisão e um material para criar a primeira receita.</p></div> : null}
    
  </main>;
}
