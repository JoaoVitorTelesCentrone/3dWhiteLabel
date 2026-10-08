"use client";

import { useActionState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { createRecipe } from "./actions";

type Option = { id: string; label: string };
export function RecipeForm({ variants, revisions, materials }: { variants: Option[]; revisions: Option[]; materials: Option[] }) {
  const [state, action, pending] = useActionState(createRecipe, {});
  return <form action={action} className="panel"><h2>Nova versão de receita</h2>
    <label>Variação <select name="variantId" required defaultValue=""><option value="" disabled>Selecione</option>{variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
    <label>Revisão 3D <select name="revisionId" required defaultValue=""><option value="" disabled>Selecione</option>{revisions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
    <label>Material <select name="materialId" required defaultValue=""><option value="" disabled>Selecione</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
    <label>Material estimado por placa (g) <input name="estimatedG" type="number" min={1} max={100000} required /></label>
    <label>Tempo estimado por placa (min) <input name="estimatedMinutes" type="number" min={1} max={1000000} required /></label>
    <label>Unidades por placa <input name="unitsPerPlate" type="number" min={1} max={10000} defaultValue={1} required /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending || !variants.length || !revisions.length || !materials.length}>{pending ? "Salvando…" : "Ativar nova receita"}</Button>
  </form>;
}
