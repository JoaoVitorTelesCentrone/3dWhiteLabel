import Image from "next/image";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FunnelTracker } from "@/components/funnel-tracker";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowRight, Check, Layers3 } from "lucide-react";
import { getRequestUserId } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Gestão para empresas de impressão 3D | Sua Empresa 3D",
  description: "Organize pedidos, produção, materiais, entregas e custos previstos da sua empresa de impressão 3D em um só lugar.",
};

const flow = [
  ["Pedido aprovado", "Cliente, produto, quantidade e valor ficam no mesmo registro."],
  ["Produção em andamento", "Jobs e material reservado ficam ligados à ordem de produção."],
  ["Falha registrada. Reposição planejada.", "Informe peças boas e defeituosas. Planeje novamente a quantidade que falta."],
  ["Entrega e recebimento", "Registre a expedição, a entrega e os recebimentos do pedido."],
];

const included = [
  "Clientes e histórico de pedidos",
  "Fila e andamento da produção",
  "Materiais reservados e consumidos",
  "Expedição e entrega",
  "Recebimentos e despesas",
  "Relatórios com margem estimada",
];

const faqs = [
  ["O que vou ver na demonstração?", "Um pedido fictício percorrendo o fluxo de produção até a entrega. A conversa é guiada e usa dados de exemplo; não precisa criar uma conta."],
  ["O que o sistema acompanha hoje?", "Pedidos, clientes, produção, materiais, expedição, entregas, recebimentos, despesas e relatórios com margem estimada."],
  ["Como vocês registram falhas e reposições?", "Ao concluir um job, a equipe informa quantas peças ficaram boas e defeituosas. Se faltar quantidade, pode planejar outro job para completar o pedido."],
  ["A margem mostrada é o lucro final?", "Não. O sistema mostra margem estimada e registra recebimentos, despesas e custos de material separadamente."],
  ["Como funciona preço e implantação?", "Depois de entender a operação, apresentamos escopo e valores separados para licença, implantação, hospedagem e suporte. Importação, treinamento adicional, domínio próprio e integrações precisam de escopo próprio."],
];

export default async function HomePage() {
  if (await getRequestUserId()) redirect("/dashboard");

  const salesContactUrl = "/contato";

  return (
    <main className="offer-page landing-page" id="inicio">
      <FunnelTracker />
      <nav className="landing-nav" aria-label="Navegação principal">
        <Link href="/" className="landing-brand" aria-label="Sua Empresa 3D — início">
          <span aria-hidden="true"><Layers3 /></span><strong>Sua Empresa 3D</strong>
        </Link>
        <div>
          <a href="#fluxo">Como funciona</a>
          <a href="#recursos">O que acompanha</a>
          <a href="#investimento">Próximo passo</a>
        </div>
        <a className="landing-nav-cta" href={salesContactUrl}>Demonstração <ArrowRight aria-hidden="true" /></a>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <h1 id="landing-title">Peça falhou? Replaneje.</h1>
          <p className="landing-lead">Gestão para impressão 3D: registre peças boas e defeituosas, planeje reposições e acompanhe pedidos até a entrega.</p>
          <div className="landing-actions">
            <a className="landing-primary" href={salesContactUrl}>Pedir demonstração <ArrowRight aria-hidden="true" /></a>
            <a className="landing-secondary" href="#fluxo">Ver o fluxo de um pedido <ArrowDown aria-hidden="true" /></a>
          </div>
          <ul className="landing-assurance" aria-label="Informações sobre o produto">
            <li><Check /> Sua marca no sistema</li>
            <li><Check /> Começa no pedido aprovado</li>
            <li><Check /> Dados da demo são fictícios</li>
          </ul>
        </div>

        <figure className="landing-proof">
          <div className="landing-proof-topline">
            <span><i /> Tela do produto</span>
            <span>Ambiente de demonstração</span>
          </div>
          <div className="landing-proof-image">
            <Image
              src="/assets/production-status-polished.png"
              alt="Tela do produto com pedidos separados por etapa de produção. Empresa, pessoas e pedidos são dados fictícios."
              width={1600}
              height={1000}
              priority
              sizes="(max-width: 1024px) 94vw, 54vw"
            />
          </div>
          <figcaption><strong>A fila de produção, em um só lugar.</strong><span>Ambiente de demonstração com dados fictícios.</span></figcaption>
        </figure>
      </section>

      <section className="landing-flow" id="fluxo" aria-labelledby="flow-title">
        <div className="landing-flow-heading">
          <h2 id="flow-title">Falha? Planeje a reposição.</h2>
          <p>Registre o resultado do job e planeje a quantidade que falta. Quando houver peças boas suficientes, o pedido pode seguir para expedição.</p>
        </div>
        <div className="landing-flow-track">
          <svg className="landing-flow-filament landing-flow-filament-desktop" viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden="true">
            <path className="landing-flow-filament-base" pathLength="1" d="M4 10 H996" />
            <path className="landing-flow-filament-draw" pathLength="1" d="M4 10 H996" />
          </svg>
          <svg className="landing-flow-filament landing-flow-filament-mobile" viewBox="0 0 20 1000" preserveAspectRatio="none" aria-hidden="true">
            <path className="landing-flow-filament-base" pathLength="1" d="M10 4 V996" />
            <path className="landing-flow-filament-draw" pathLength="1" d="M10 4 V996" />
          </svg>
          {flow.map(([title, copy], index) => (
            <article key={title} style={{ "--flow-index": index } as CSSProperties}>
              <span className="landing-flow-node"><i /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="landing-flow-footnote"><span /> O fluxo principal começa no pedido aprovado. Orçamento é opcional.</div>
      </section>

      <section className="landing-control" id="recursos" aria-labelledby="control-title">
        <div className="landing-control-aside">
          <svg className="landing-control-layer-art" viewBox="0 0 220 220" aria-hidden="true">
            <path className="landing-layer-outline" d="M110 30 172 63 110 96 48 63Z M48 63V143L110 178 172 143V63" />
            <path className="landing-layer-seams" d="m48 83 62 33 62-33M48 103l62 33 62-33M48 123l62 33 62-33" />
            <path className="landing-layer-highlight" pathLength="1" d="M110 30 172 63 110 96 48 63Z" />
          </svg>
        </div>
        <div className="landing-control-copy">
          <h2 id="control-title">Cada peça aprovada conta.</h2>
          <p>Ao concluir um job, a equipe informa o resultado. Se a quantidade boa ainda não atende ao pedido, pode planejar outra rodada de produção. O sistema registra material e mantém o progresso ligado ao pedido.</p>
          <ul>{included.map((item) => <li key={item}><span aria-hidden="true" /><span>{item}</span><Check aria-hidden="true" /></li>)}</ul>
          <p className="landing-control-note">Margens são estimativas. Recebimentos e despesas aparecem como registros separados.</p>
        </div>
      </section>

      <section className="landing-brand-proof" aria-labelledby="brand-proof-title">
        <div><h2 id="brand-proof-title">Sua marca.</h2><p>Configure nome, cores e logo da empresa. Os exemplos abaixo são fictícios. Domínio próprio recebe escopo separado.</p></div>
        <div className="landing-brand-pair" aria-label="Exemplos fictícios de personalização da marca">
          <article className="landing-brand-sample landing-brand-sample--orange"><span className="landing-brand-mark">OC</span><div><strong>Oficina Camada</strong><small>Pedidos · Produção · Entregas</small></div><i>Fila de produção</i></article>
          <article className="landing-brand-sample landing-brand-sample--blue"><span className="landing-brand-mark">FL</span><div><strong>Forma Lab</strong><small>Pedidos · Produção · Entregas</small></div><i>Fila de produção</i></article>
        </div>
      </section>

      <section className="landing-demo-steps" aria-labelledby="demo-steps-title">
        <div><h2 id="demo-steps-title">Traga um pedido.</h2><p>Conte como a sua operação funciona. Percorremos um exemplo fictício e mostramos o que o sistema cobre hoje.</p></div>
        <ol><li><span><strong>Descreva um pedido</strong><small>Sem compartilhar dados pessoais de clientes.</small></span></li><li><span><strong>Siga as etapas</strong><small>Produção, falha, reposição e entrega em dados fictícios.</small></span></li><li><span><strong>Avalie o encaixe</strong><small>Se fizer sentido, você recebe uma proposta com escopo e valores separados.</small></span></li></ol>
      </section>

      <section className="landing-offer" id="investimento" aria-labelledby="offer-title">
        <div className="landing-offer-copy">
          <h2 id="offer-title">Veja o fluxo antes de decidir.</h2>
          <p>A demonstração mostra o que o produto faz hoje. Se houver encaixe, a proposta separa licença, implantação, hospedagem e suporte.</p>
          <div className="landing-scope-note"><p>Importação de dados, treinamento adicional, domínio próprio e integrações precisam de definição e valor separados.</p></div>
        </div>
        <div className="landing-price-card">
          <strong className="landing-price-promise">Veja o produto antes de decidir.</strong>
          <ul>
            <li><Check /> Pedido e ordem de produção</li>
            <li><Check /> Jobs, falha e reposição</li>
            <li><Check /> Expedição e recebimento</li>
            <li><Check /> Dados fictícios, sem criar uma conta</li>
          </ul>
          <a href={salesContactUrl}>Pedir demonstração <ArrowRight aria-hidden="true" /></a>
          <div className="landing-care"><p>Receba uma proposta com escopo, implantação, licença, hospedagem e suporte descritos separadamente.</p></div>
        </div>
      </section>

      <section className="landing-faq" aria-labelledby="faq-title">
        <h2 className="landing-faq-heading" id="faq-title">Perguntas comuns</h2>
        <div className="landing-faq-list">
          {faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className="landing-closing" aria-labelledby="closing-title">
        <div className="landing-closing-copy"><h2 id="closing-title">Depois da aprovação, o que vem?</h2><p>Peça uma demonstração guiada com dados fictícios. Você avalia o fluxo antes de decidir se vale avançar.</p></div>
        <a href={salesContactUrl}>Pedir demonstração <ArrowRight aria-hidden="true" /></a>
      </section>

      <footer className="landing-footer"><Link href="/" className="landing-footer-brand"><Layers3 aria-hidden="true" /> Sua Empresa 3D</Link><div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos de uso</Link></div><span>Gestão feita para a rotina da impressão 3D.</span></footer>
    </main>
  );
}
