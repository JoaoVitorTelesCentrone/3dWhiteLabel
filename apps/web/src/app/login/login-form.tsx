"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    <form action={action} className="panel">
      <label>
        E-mail
        <input name="email" type="email" autoComplete="username" required maxLength={254} />
      </label>
      <label>
        Senha
        <input name="password" type="password" autoComplete="current-password" required maxLength={256} />
      </label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
