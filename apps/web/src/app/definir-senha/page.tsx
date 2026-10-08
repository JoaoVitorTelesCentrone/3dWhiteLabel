import { redirect } from "next/navigation";
import { PasswordForm } from "./password-form";
import { createClient } from "@/lib/supabase/server";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="auth-shell">
      <section className="panel">
        <p className="eyebrow">CONVITE Agencia 3D</p>
        <h1>Defina sua senha</h1>
        <p>Crie uma senha com pelo menos 12 caracteres para acessar sua conta.</p>
        <PasswordForm />
      </section>
    </main>
  );
}
