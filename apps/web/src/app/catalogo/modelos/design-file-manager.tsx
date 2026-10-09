"use client";

import { Button } from "@/components/base-ui/button";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const bucket = "forja-designs";
const maxBytes = 100 * 1024 * 1024;
const accepted = new Set(["stl", "3mf", "step", "stp", "obj", "gcode"]);
const supabase = createBrowserSupabaseClient();

type DesignFile = { id: string; storage_path: string; filename: string; format: string; size_bytes: number };

export function DesignFileManager({ tenantId, designId, revisionId, files, canEdit }: { tenantId: string; designId: string; revisionId: string; files: DesignFile[]; canEdit: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(formData: FormData) {
    setMessage(""); setPending(true);
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) { setMessage("Selecione um arquivo válido."); setPending(false); return; }
    const format = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!accepted.has(format)) { setMessage("Use STL, 3MF, STEP, STP, OBJ ou GCODE."); setPending(false); return; }
    if (file.size > maxBytes) { setMessage("O arquivo ultrapassa o limite de 100 MB."); setPending(false); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setMessage("Sua sessão expirou. Entre novamente."); setPending(false); return; }
    const path = `tenants/${tenantId}/designs/${designId}/${revisionId}/${crypto.randomUUID()}.${format}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
    if (uploadError) { setMessage("Não foi possível enviar o arquivo. Confira seu acesso e tente novamente."); setPending(false); return; }
    const { error: metadataError } = await supabase.from("design_files").insert({ tenant_id: tenantId, design_id: designId, revision_id: revisionId, storage_path: path, filename: file.name, format, mime_type: file.type || "application/octet-stream", size_bytes: file.size });
    if (metadataError) {
      await supabase.storage.from(bucket).remove([path]);
      setMessage("O arquivo foi enviado, mas não foi possível registrar seus dados. Tente novamente.");
    } else { window.location.reload(); }
    setPending(false);
  }

  async function download(path: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data) { setMessage("Não foi possível gerar o link privado do arquivo."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return <div>
    {files.length ? <ul>{files.map((file) => <li key={file.id}>{file.filename} · {file.format.toUpperCase()} · {(file.size_bytes / 1024 / 1024).toFixed(1)} MB <Button type="button" onClick={() => void download(file.storage_path)}>Baixar</Button></li>)}</ul> : <p>Nenhum arquivo nesta revisão.</p>}
    {canEdit ? <form action={upload}><label>Arquivo 3D (máximo 100 MB) <input name="file" type="file" accept=".stl,.3mf,.step,.stp,.obj,.gcode" required /></label><Button disabled={pending}>{pending ? "Enviando…" : "Enviar arquivo"}</Button></form> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
