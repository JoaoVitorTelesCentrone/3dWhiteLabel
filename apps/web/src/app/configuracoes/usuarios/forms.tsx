"use client";

import { useActionState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { inviteTenantUser, updateTenantUser, type UserState } from "./actions";

const initial: UserState = {};
const roles = [
  ["admin", "Administrador"], ["sales", "Comercial"], ["production", "Produção"],
  ["operator", "Operação"], ["stock", "Estoque"], ["finance", "Financeiro"], ["viewer", "Consulta"],
] as const;
export function InviteUserForm() {
  const [state, action, pending] = useActionState(inviteTenantUser, initial);
  return <form action={action} className="panel"><h2>Convidar usuário</h2>
    <label>Nome <input name="fullName" required maxLength={120} /></label>
    <label>E-mail <input name="email" type="email" required maxLength={254} /></label>
    <label>Papel <select name="role">{roles.map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar convite"}</Button>
  </form>;
}
export function UserAccessForm({ user }: { user: { id: string; role: string; active: boolean } }) {
  const [state, action, pending] = useActionState(updateTenantUser, initial);
  return <form action={action}><input name="id" type="hidden" value={user.id} />
    <label>Papel <select name="role" defaultValue={user.role}>{roles.map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
    <label>Acesso <select name="active" defaultValue={String(user.active)}><option value="true">Ativo</option><option value="false">Desativado</option></select></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    <button disabled={pending}>{pending ? "Salvando…" : "Atualizar acesso"}</button>
  </form>;
}
