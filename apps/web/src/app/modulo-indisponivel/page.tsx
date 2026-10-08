import Link from "next/link";

export default function ModuleUnavailablePage() {
  return (
    <main>
      <span className="eyebrow">Módulo indisponível</span>
      <h1>Este recurso não está ativo no seu plano.</h1>
      <p>Fale com o responsável pela conta para conferir o plano ou solicitar a ativação do módulo.</p>
      <Link href="/dashboard" className="btn btn-secondary state-action">Ir para a visão geral</Link>
    </main>
  );
}
