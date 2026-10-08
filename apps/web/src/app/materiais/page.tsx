import { RecordCreateSheet } from "@/components/record-create-sheet";
import { requireModulePermission } from "@/lib/auth/guards";
import { roleAllows } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { MaterialForm, SpoolForm } from "./forms";
import { MaterialTable, type MaterialTableRow } from "./material-table";

export default async function MaterialsPage() {
  const context = await requireModulePermission("stock", "stock.view");
  const supabase = await createClient();
  const [{ data: materials, error }, { data: spools, error: spoolError }, { data: reservations, error: reservationError }] = await Promise.all([
    supabase.from("materials").select("id,name,kind,color,active").eq("tenant_id", context.tenantId).order("name"),
    supabase.from("material_spools").select("id,material_id,code,tare_g,current_gross_g,status").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }),
    supabase.from("material_reservations").select("spool_id,reserved_g").eq("tenant_id", context.tenantId).eq("status", "active"),
  ]);
  const canAdjust = roleAllows(context.role, "stock.adjust") && context.licenseStatus !== "suspended";
  const canReceive = roleAllows(context.role, "stock.purchase") && context.licenseStatus !== "suspended";
  const activeMaterials = materials?.filter((material) => material.active) ?? [];
  const materialRows = (materials ?? []).flatMap<MaterialTableRow>((material) => {
    const materialSpools = spools?.filter((spool) => spool.material_id === material.id) ?? [];
    const details = [material.kind, material.color].filter(Boolean).join(" · ");
    return materialSpools.length
      ? materialSpools.map((spool) => ({
        id: spool.id,
        name: material.name,
        details,
        active: material.active,
        spool: { id: spool.id, code: spool.code, tareG: spool.tare_g, currentGrossG: spool.current_gross_g, status: spool.status },
        reservedG: reservations?.filter((reservation) => reservation.spool_id === spool.id).reduce((sum, reservation) => sum + reservation.reserved_g, 0) ?? 0,
      }))
      : [{ id: `${material.id}-empty`, name: material.name, details, active: material.active, spool: null, reservedG: 0 }];
  });

  return <main className="management-page">
    <header className="page-head management-page-head">
      <div className="page-head-main">
        <h1 className="page-title">Materiais</h1>
        <p className="page-desc">Acompanhe o saldo disponível e atualize o peso das bobinas.</p>
      </div>
      <div className="page-actions">
        {roleAllows(context.role, "stock.adjust") && context.licenseStatus !== "suspended" ? <RecordCreateSheet title="Cadastrar material" description="Defina o tipo e o custo do material usado na produção."><MaterialForm /></RecordCreateSheet> : null}
        {canReceive ? <RecordCreateSheet title="Receber bobina" description="Registre uma bobina nova para atualizar o estoque."><SpoolForm materials={activeMaterials.map((material) => ({ id: material.id, name: material.name }))} /></RecordCreateSheet> : null}
      </div>
    </header>

    {error || spoolError || reservationError ? <div className="material-list-error" role="alert"><strong>Não foi possível carregar o estoque.</strong><span>Atualize a página para conferir os materiais e as bobinas.</span></div> : null}

    {!error && !spoolError && !reservationError && materialRows.length ? <MaterialTable rows={materialRows} canAdjust={canAdjust} materialCount={materials?.length ?? 0} spoolCount={spools?.length ?? 0} /> : null}

    {!error && !spoolError && !reservationError && !materialRows.length ? <section className="material-empty-state">
      <span className="material-empty-icon" aria-hidden="true">—</span>
      <h2>Nenhum material cadastrado</h2>
      <p>Cadastre um material e receba a primeira bobina para acompanhar o estoque.</p>
      {roleAllows(context.role, "stock.adjust") && context.licenseStatus !== "suspended" ? <RecordCreateSheet title="Cadastrar material" description="Defina o tipo e o custo do material usado na produção."><MaterialForm /></RecordCreateSheet> : null}
    </section> : null}
  </main>;
}
