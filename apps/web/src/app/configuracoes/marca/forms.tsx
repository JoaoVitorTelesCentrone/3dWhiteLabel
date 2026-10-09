"use client";

import { Button } from "@/components/base-ui/button";

import { useActionState, useState } from "react";
import type { CSSProperties } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { updateBranding, type BrandingState } from "./actions";

const initial: BrandingState = {};
const supabase = createBrowserSupabaseClient();
export function BrandingForm({ brand }: { brand: { display_name: string; primary_color: string; accent_color: string } }) {
  const [state, action, pending] = useActionState(updateBranding, initial);
  const [primaryColor, setPrimaryColor] = useState(brand.primary_color);
  const [accentColor, setAccentColor] = useState(brand.accent_color);
  const previewStyle = { "--brand-primary": primaryColor, "--brand-accent": accentColor } as CSSProperties;
  return <form action={action} className="panel brand-form"><h2>Identidade da empresa</h2>
    <label>Nome exibido <input name="displayName" defaultValue={brand.display_name} required minLength={2} maxLength={120} /></label>
    <label>Cor principal <input name="primaryColor" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
    <label>Cor de destaque <input name="accentColor" type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} /></label>
    <div className="brand-preview" style={previewStyle} aria-label="Prévia das cores da marca">
      <div><span>Prévia do espaço de trabalho</span><strong>{brand.display_name}</strong></div>
      <div className="brand-preview-actions"><span className="brand-preview-primary">Ação principal</span><span className="brand-preview-accent">Destaque e foco</span></div>
    </div>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button disabled={pending}>{pending ? "Salvando…" : "Salvar marca"}</Button>
  </form>;
}
export function LogoUploader({ tenantId, currentPath }: { tenantId: string; currentPath: string | null }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function upload(formData: FormData) {
    setMessage(""); setPending(true);
    const file = formData.get("logo");
    if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024) {
      setMessage("Selecione uma imagem de até 2 MB."); setPending(false); return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mimeByExt: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
    if (!mimeByExt[ext] || file.type !== mimeByExt[ext]) {
      setMessage("Use PNG, JPG ou WebP."); setPending(false); return;
    }
    const path = "tenants/" + tenantId + "/branding/" + crypto.randomUUID() + "." + ext;
    const { error: uploadError } = await supabase.storage.from("forja-branding").upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) { setMessage("Não foi possível enviar o logo."); setPending(false); return; }
    const { data, error } = await supabase.from("tenant_branding").update({ logo_path: path }).eq("tenant_id", tenantId).select("tenant_id").maybeSingle();
    if (error || !data) {
      await supabase.storage.from("forja-branding").remove([path]);
      setMessage("Não foi possível associar o logo à empresa."); setPending(false); return;
    }
    if (currentPath) await supabase.storage.from("forja-branding").remove([currentPath]);
    window.location.reload();
  }
  return <form action={upload} className="panel"><h2>Logo</h2>
    <label>Imagem (PNG, JPG ou WebP, até 2 MB) <input name="logo" type="file" accept=".png,.jpg,.jpeg,.webp" required /></label>
    <Button disabled={pending}>{pending ? "Enviando…" : "Atualizar logo"}</Button>
    {message ? <p role="status">{message}</p> : null}
  </form>;
}
