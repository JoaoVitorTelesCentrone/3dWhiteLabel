"use client";

import { useActionState } from "react";
import { updateCustomer, type CustomerFormState } from "./actions";

type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

const initialState: CustomerFormState = {};

export function CustomerEditForm({ customer }: { customer: Customer }) {
  const [state, action, pending] = useActionState(updateCustomer, initialState);
  return (
    <details>
      <summary>Editar</summary>
      <form action={action}>
        <input type="hidden" name="id" value={customer.id} />
        <label>Nome <input name="name" defaultValue={customer.name} required minLength={2} maxLength={160} /></label>
        <label>Empresa <input name="companyName" defaultValue={customer.company_name ?? ""} maxLength={160} /></label>
        <label>E-mail <input type="email" name="email" defaultValue={customer.email ?? ""} maxLength={254} /></label>
        <label>Telefone <input type="tel" name="phone" defaultValue={customer.phone ?? ""} maxLength={40} /></label>
        <label>Observações <textarea name="notes" defaultValue={customer.notes ?? ""} maxLength={4000} rows={3} /></label>
        {state.error ? <p className="error" role="alert">{state.error}</p> : null}
        {state.success ? <p role="status">{state.success}</p> : null}
        <button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar alterações"}</button>
      </form>
    </details>
  );
}
