"use client";

import { useActionState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { createCustomer, type CustomerFormState } from "./actions";

const initialState: CustomerFormState = {};

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomer, initialState);
  return (
    <form action={action} className="panel">
      <h2>Novo cliente</h2>
      <label>
        Nome <input name="name" required minLength={2} maxLength={160} />
      </label>
      <label>
        Empresa <input name="companyName" maxLength={160} />
      </label>
      <label>
        E-mail <input type="email" name="email" maxLength={254} />
      </label>
      <label>
        Telefone <input type="tel" name="phone" maxLength={40} />
      </label>
      <label>
        Observações <textarea name="notes" maxLength={4000} rows={4} />
      </label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Cadastrar cliente"}</Button>
    </form>
  );
}
