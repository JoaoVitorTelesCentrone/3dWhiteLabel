import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main>
      <span className="eyebrow">Acesso restrito</span>
      <h1>Você não tem permissão para esta ação.</h1>
      <p>Peça ao administrador da empresa para revisar seu papel de acesso.</p>
      <Link href="/dashboard" className="btn btn-secondary state-action">Voltar à visão geral</Link>
    </main>
  );
}
