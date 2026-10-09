"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { PasswordField } from "@/components/password-field";
import { signInPlatform } from "./actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInPlatform, {});
  return <form action={action} className="panel">
    <label>E-mail <input name="email" type="email" required autoComplete="username" /></label>
    <PasswordField id="admin-password" name="password" autoComplete="current-password" required maxLength={256} />
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
  </form>;
}
