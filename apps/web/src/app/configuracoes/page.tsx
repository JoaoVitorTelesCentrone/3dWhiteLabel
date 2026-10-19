import Link from "next/link";
import { Palette, UsersRound } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";

export default async function SettingsPage() {
  const context = await requirePermission("settings.manage");
  return <main className="management-page management-page--sections">
    <header className="page-head management-page-head"><div className="page-head-main"><p className="page-context">Configurações · {context.tenantName}</p><h1 className="page-title">Configurações da empresa</h1><p className="page-desc">Atualize a identidade exibida no sistema e controle quem pode acessar cada área.</p></div></header>
    <nav className="settings-directory" aria-label="Configurações da empresa">
      <Link href="/configuracoes/marca"><Palette aria-hidden="true" /><span><strong>Marca</strong><small>Nome, cores e logo do espaço de trabalho.</small></span></Link>
      <Link href="/configuracoes/usuarios"><UsersRound aria-hidden="true" /><span><strong>Usuários</strong><small>Convites, papéis e acessos da equipe.</small></span></Link>
    </nav>
  </main>;
}
