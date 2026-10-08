import Link from "next/link";

export default function SuspendedLicensePage() {
  return (
    <main>
      <span className="eyebrow">Licença suspensa</span>
      <h1>O sistema está em modo de consulta.</h1>
      <p>Os dados continuam disponíveis para leitura. Contate o responsável pela licença para liberar alterações.</p>
      <Link href="/dashboard" className="btn btn-secondary state-action">Continuar em modo de consulta</Link>
    </main>
  );
}
