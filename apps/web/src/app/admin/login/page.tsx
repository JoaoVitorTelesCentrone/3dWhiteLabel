import { requirePlatformHost } from "@/lib/auth/platform";
import { AdminLoginForm } from "./form";

export default async function AdminLoginPage() {
  await requirePlatformHost();
  return <main className="auth-shell"><span className="eyebrow">Administração Agencia 3D</span><h1>Acesso interno</h1><AdminLoginForm /></main>;
}
