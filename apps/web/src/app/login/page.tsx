import { LoginForm } from "./login-form";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const host = (await headers()).get("host")?.toLowerCase();
  const isLocalDemoHost = ["demo.localhost:3005", "localhost:3005", "127.0.0.1:3005"].includes(host ?? "");

  if (process.env.NODE_ENV === "development" && process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN === "true" && isLocalDemoHost) {
    redirect("/dev-login");
  }

  return (
    <main className="auth-shell">
      <span className="eyebrow">Acesso seguro</span>
      <h1>Entre na sua operação.</h1>
      <p>Contas são criadas por convite do administrador da empresa.</p>
      <LoginForm />
    </main>
  );
}
