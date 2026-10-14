"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base-ui/button";
import { PasswordField } from "@/components/password-field";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    router.replace("/dashboard");
    router.refresh();
  }, [router, state.success]);

  return (
    <form action={action} className="panel">
      <label>
        E-mail
        <input name="email" type="email" autoComplete="username" required maxLength={254} />
      </label>
      <PasswordField id="tenant-password" name="password" autoComplete="current-password" required maxLength={256} />
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
