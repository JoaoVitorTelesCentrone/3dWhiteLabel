import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { getRequestUserId } from "@/lib/auth/session";

export default async function NotFoundPage() {
  const isLoggedIn = Boolean(await getRequestUserId());

  return (
    <main className="not-found-page">
      <div className="not-found-content">
        <span className="not-found-icon" aria-hidden="true"><SearchX size={30} strokeWidth={1.7} /></span>
        <p className="not-found-code">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p className="not-found-description">O endereço pode ter mudado ou esta página não está disponível.</p>
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="btn btn-primary not-found-link"><ArrowLeft size={17} aria-hidden="true" />{isLoggedIn ? "Voltar ao dashboard" : "Voltar ao início"}</Link>
      </div>
    </main>
  );
}
