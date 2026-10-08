import { requirePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { BrandingForm, LogoUploader } from "./forms";

export default async function BrandingPage() {
  const context = await requirePermission("branding.manage");
  const supabase = await createClient();
  const { data: brand, error } = await supabase.from("tenant_branding")
    .select("display_name,primary_color,accent_color,logo_path").eq("tenant_id", context.tenantId).maybeSingle();
  return <main className="management-page management-page--sections"><header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Configurações · {context.tenantName}</p><h1 className="page-title">Marca</h1><p className="page-desc">Defina o nome, as cores e o logo que aparecem no sistema da sua empresa.</p></div></header>
    {error || !brand ? <p className="error" role="alert">Não foi possível carregar a marca.</p> : <>
      {context.licenseStatus !== "suspended" ? <BrandingForm brand={brand} /> : <p>A licença está suspensa; a marca permanece disponível para consulta.</p>}
      {context.licenseStatus !== "suspended" ? <LogoUploader tenantId={context.tenantId} currentPath={brand.logo_path} /> : null}
    </>}
  </main>;
}
