"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { setInitialPassword, type PasswordState } from "./actions";

const initialState: PasswordState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(setInitialPassword, initialState);
  return (
    <form action={action}>
      <label>
        Nova senha
        <input type="password" name="password" autoComplete="new-password" minLength={12} required />
      </label>
      <label>
        Confirme a senha
        <input type="password" name="confirmation" autoComplete="new-password" minLength={12} required />
      </label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Definir senha"}
      </Button>
    </form>
  );
}
