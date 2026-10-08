import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const host = (await headers()).get("host")?.toLowerCase();
  if (process.env.NODE_ENV === "development" && process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN === "true" && host === "demo.localhost:3005") {
    redirect("/dev-login");
  }

  return (
    <main className="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <span className="eyebrow">Gestão para impressão 3D</span>
          <h1 id="landing-title">Do orçamento à peça entregue.</h1>
          <p>Organize vendas, produção e materiais no mesmo fluxo. Da primeira conversa com o cliente ao envio da peça.</p>
          <div className="landing-actions">
            <Link href="/login">Entrar na plataforma</Link>
          </div>
        </div>
        <div className="landing-diagram" role="group" aria-label="Fluxo de trabalho da operação">
          <div className="landing-step"><span>Orçamento</span><span>Etapa 1 · comercial</span></div>
          <div className="landing-step"><span>Pedido e produção</span><span>Etapa 2 · fábrica</span></div>
          <div className="landing-step"><span>Peça entregue</span><span>Etapa 3 · expedição</span></div>
        </div>
      </section>
      <section className="landing-proof" aria-label="Áreas da plataforma">
        <section><h2>Comercial</h2><p>Clientes, oportunidades, orçamentos e pedidos conectados.</p></section>
        <section><h2>Produção</h2><p>Jobs, impressoras e manutenção em um só lugar.</p></section>
        <section><h2>Materiais e financeiro</h2><p>Acompanhe bobinas, recebimentos e despesas operacionais.</p></section>
      </section>
    </main>
  );
}
