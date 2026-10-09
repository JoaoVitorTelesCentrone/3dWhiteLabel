"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { createTenant, requestCustomDomain, setTenantModule, updateTenant, type PlatformState } from "./actions";

const initial: PlatformState = {};
const modules = ["crm","quotes","orders","catalog","stock","production","quality","qr_codes","actual_costs","planner","advanced_reports","customer_portal","api","integrations","ai","multiunit","remove_branding"];
function Feedback({ state }: { state: PlatformState }) {
  return <>{state.error ? <p className="error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}</>;
}
export function CreateTenantForm() {
  const [state, action, pending] = useActionState(createTenant, initial);
  return <form action={action} className="panel"><h2>Novo tenant</h2>
    <label>Empresa <input name="name" required minLength={2} maxLength={120} /></label>
    <label>Slug do subdomínio <input name="slug" required pattern="[a-z0-9]+([a-z0-9-]*[a-z0-9])?" /></label>
    <label>Nome do owner <input name="ownerName" required maxLength={120} /></label>
    <label>E-mail do owner <input name="ownerEmail" type="email" required /></label>
    <label>Plano <select name="plan"><option value="start">Start</option><option value="pro">Pro</option><option value="business">Business</option></select></label>
    <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar tenant e convidar owner"}</Button><Feedback state={state} />
  </form>;
}
export function TenantSettingsForm({ id, plan, license }: { id: string; plan: string; license: string }) {
  const [state, action, pending] = useActionState(updateTenant, initial);
  return <form action={action}><input name="id" type="hidden" value={id} />
    <label>Plano <select name="plan" defaultValue={plan}><option value="start">Start</option><option value="pro">Pro</option><option value="business">Business</option></select></label>
    <label>Licença <select name="license" defaultValue={license}><option value="active">Ativa</option><option value="past_due">Em atraso</option><option value="suspended">Suspensa</option></select></label>
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Atualizar plano e licença"}</Button><Feedback state={state} />
  </form>;
}
export function TenantModuleForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(setTenantModule, initial);
  return <form action={action}><input name="id" type="hidden" value={id} />
    <label>Módulo <select name="moduleKey">{modules.map((module) => <option key={module}>{module}</option>)}</select></label>
    <label>Override <select name="enabled"><option value="true">Habilitar</option><option value="false">Desabilitar</option></select></label>
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Aplicar módulo"}</Button><Feedback state={state} />
  </form>;
}
export function CustomDomainForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(requestCustomDomain, initial);
  return <form action={action}><input name="id" type="hidden" value={id} />
    <label>Domínio próprio <input name="host" placeholder="erp.empresa.com.br" required maxLength={253} /></label>
    <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Registrar domínio pendente"}</Button><Feedback state={state} />
  </form>;
}
