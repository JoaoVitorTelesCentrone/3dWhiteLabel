import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, Check, CircleDollarSign, Factory, Layers3, PackageCheck, UsersRound } from "lucide-react";
import { getRequestUserId } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Gestão para empresas de impressão 3D | Sua Empresa 3D",
  description: "Organize pedidos, produção, materiais, clientes e resultados da sua operação de impressão 3D em um só lugar.",
};

const pains = [
  { icon: UsersRound, title: "Pedidos espalhados", copy: "O combinado fica entre conversas, anotações e planilhas difíceis de acompanhar." },
  { icon: Factory, title: "Produção sem visão", copy: "Descobrir o que está na fila, imprimindo ou atrasado toma tempo todos os dias." },
  { icon: CircleDollarSign, title: "Margem no escuro", copy: "Material, despesas e recebimentos não se encontram na hora de medir o resultado." },
];

const workflow = [
  ["Pedido confirmado", "Registre cliente, itens, valor, prazo e endereço no mesmo fluxo."],
  ["Produção acompanhada", "Mova cada job pela fila e veja o que precisa de atenção."],
  ["Resultado visível", "Acompanhe estoque, receitas, despesas e margem estimada."],
];

const included = [
  "Clientes e histórico de pedidos", "Pedidos e entregas", "Fila e status de produção",
  "Materiais e produtos prontos", "Financeiro e margens estimadas", "Relatórios essenciais",
];

const faqs = [
  ["O sistema fica com a minha marca?", "Sim. Configuramos nome, logo e cores da sua empresa na implantação."],
  ["Preciso usar todos os módulos?", "Não. Avaliamos sua rotina e ativamos os módulos que fazem sentido para a operação."],
  ["Como funciona a demonstração?", "Você recebe acesso a um ambiente com dados fictícios para conhecer o fluxo sem expor informações da sua empresa."],
  ["O que está incluído no valor?", "A licença Start inclui a configuração inicial, sua marca e os módulos essenciais de gestão. Funcionalidades sob medida são avaliadas separadamente."],
];

export default async function HomePage() {
  if (await getRequestUserId()) redirect("/dashboard");

  const host = (await headers()).get("host")?.toLowerCase();
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || "/login";
  const salesContactUrl = process.env.NEXT_PUBLIC_SALES_CONTACT_URL || "/contato";

  if (process.env.NODE_ENV === "development" && process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN === "true" && host === "demo.localhost:3005") {
    redirect("/dev-login");
  }

  return (
    <main className="offer-page landing-page">
      <nav className="landing-nav" aria-label="Navegação principal">
        <Link href="/" className="landing-brand" aria-label="Sua Empresa 3D — início">
          <span aria-hidden="true"><Layers3 /></span><strong>Sua Empresa 3D</strong>
        </Link>
        <div><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#investimento">Investimento</a></div>
        <a className="landing-nav-cta" href={salesContactUrl}>Solicitar demonstração</a>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-kicker"><span /> Gestão feita para impressão 3D</p>
          <h1 id="landing-title">Sua operação inteira, sem caça ao pedido no WhatsApp.</h1>
          <p className="landing-lead">Clientes, pedidos, produção, materiais e resultados em um sistema configurado com a marca da sua empresa.</p>
          <div className="landing-actions">
            <a className="landing-primary" href={salesContactUrl}>Quero ver o sistema <ArrowRight aria-hidden="true" /></a>
            <a className="landing-secondary" href={demoUrl}>Acessar demonstração</a>
          </div>
          <ul className="landing-assurance" aria-label="Condições da oferta">
            <li><Check /> Pagamento único</li><li><Check /> Sua marca no sistema</li><li><Check /> Implantação assistida</li>
          </ul>
        </div>

        <div className="landing-product" aria-label="Prévia do painel de gestão">
          <div className="landing-product-bar"><i /><i /><i /><span>painel.suaempresa3d</span></div>
          <div className="landing-product-shell">
            <aside aria-hidden="true"><span className="landing-mini-brand"><Layers3 /></span><i className="active" /><i /><i /><i /></aside>
            <div className="landing-dashboard">
              <header><div><small>Visão geral</small><strong>Bom dia, Ana</strong></div><span>Outubro</span></header>
              <div className="landing-stats">
                <article><small>Pedidos ativos</small><strong>24</strong><span>6 para esta semana</span></article>
                <article><small>Em produção</small><strong>12</strong><span>3 impressoras livres</span></article>
              </div>
              <div className="landing-pipeline">
                <header><strong>Produção</strong><small>12 jobs ativos</small></header>
                <div>
                  <article><span>Fila</span><b>Suporte articulado</b><b>Protótipo A-12</b></article>
                  <article><span>Imprimindo</span><b className="hot">Lote de conectores</b><b>Engrenagem técnica</b></article>
                  <article><span>Prontos</span><b>Miniaturas — lote 8</b><b>Gabinete personalizado</b></article>
                </div>
              </div>
            </div>
          </div>
          <div className="landing-float-card"><PackageCheck /><span>Pedido #184</span><strong>Pronto para entrega</strong></div>
        </div>
      </section>

      <section className="landing-problems" aria-labelledby="problems-title">
        <div className="landing-section-heading"><p>Menos improviso</p><h2 id="problems-title">A empresa cresce. A desorganização não precisa crescer junto.</h2></div>
        <div className="landing-card-grid">{pains.map(({ icon: Icon, title, copy }) => <article key={title}><Icon /><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="landing-workflow" id="como-funciona" aria-labelledby="workflow-title">
        <div className="landing-section-heading"><p>Um fluxo claro</p><h2 id="workflow-title">Do pedido confirmado à peça entregue.</h2></div>
        <div className="landing-steps">{workflow.map(([title, copy], index) => <article key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
      </section>

      <section className="landing-features" id="recursos" aria-labelledby="features-title">
        <div className="landing-features-copy">
          <p className="landing-kicker"><span /> Feito para a sua rotina</p>
          <h2 id="features-title">A informação certa aparece onde o trabalho acontece.</h2>
          <p>Você deixa de reconstruir a operação toda vez que precisa responder um cliente, planejar a fila ou conferir o caixa.</p>
          <ul>{included.map((item) => <li key={item}><Check /> {item}</li>)}</ul>
        </div>
        <div className="landing-feature-visual">
          <div className="landing-visual-head"><Boxes /><span>Resumo da operação</span><small>Atualizado agora</small></div>
          <div className="landing-visual-number"><small>Pedidos no mês</small><strong>86</strong><span>+14% no período</span></div>
          <div className="landing-visual-rows"><div><span>Taxa de conclusão</span><strong>92%</strong></div><div><span>Entregas no prazo</span><strong>89%</strong></div><div><span>Materiais com estoque baixo</span><strong>3</strong></div></div>
          <p>Dados ilustrativos do ambiente de demonstração.</p>
        </div>
      </section>

      <section className="landing-offer" id="investimento" aria-labelledby="offer-title">
        <div><p>Licença Start</p><h2 id="offer-title">Comece com a operação organizada e a sua marca aplicada.</h2><p>Implantação assistida, configuração inicial e módulos essenciais para colocar o sistema em uso.</p></div>
        <div className="landing-price-card">
          <span>Pagamento único</span><strong><small>R$</small> 1.497</strong>
          <ul><li><Check /> Configuração da empresa</li><li><Check /> Nome, logo e cores</li><li><Check /> Acesso do proprietário</li><li><Check /> Orientação inicial</li></ul>
          <a href={salesContactUrl}>Solicitar demonstração <ArrowRight /></a><small>Care opcional por R$ 99/mês.</small>
        </div>
      </section>

      <section className="landing-faq" aria-labelledby="faq-title">
        <div className="landing-section-heading"><p>Antes de começar</p><h2 id="faq-title">Perguntas frequentes.</h2></div>
        <div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="landing-closing" aria-labelledby="closing-title">
        <div><Layers3 aria-hidden="true" /><h2 id="closing-title">Veja como sua operação pode funcionar em um só lugar.</h2><p>Conte um pouco sobre a empresa e receba acesso ao ambiente de demonstração.</p></div>
        <a href={salesContactUrl}>Quero conhecer <ArrowRight /></a>
      </section>

      <footer className="landing-footer"><span>Sua Empresa 3D</span><div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos de uso</Link></div></footer>
    </main>
  );
}
