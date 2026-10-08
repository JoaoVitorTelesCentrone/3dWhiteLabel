"use client";

import { useActionState } from "react";
import { signInPlatform } from "./actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInPlatform, {});
  return <form action={action} className="panel">
    <label>E-mail <input name="email" type="email" required autoComplete="username" /></label>
    <label>Senha <input name="password" type="password" required autoComplete="current-password" /></label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    <button disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
  </form>;
}
