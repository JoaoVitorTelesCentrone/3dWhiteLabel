import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Factory, Gauge, PackageCheck, Sparkles, UsersRound, WalletCards } from "lucide-react";

export const metadata: Metadata = {
  title: "CRM para impressão 3D por R$ 1.000 | Agencia 3D",
  description: "Organize clientes, pedidos, produção, estoque e financeiro. Contrate o CRM por R$ 1.000 e ganhe uma landing page para vender mais.",
};

const included = [
  "Cadastro de clientes e histórico comercial",
  "Pedidos conectados à produção",
  "Controle de materiais e produtos prontos",
  "Financeiro com lucro real por período",
  "Relatórios para tomar decisão",
];

const workflow = [
  { icon: UsersRound, title: "Cliente entrou", copy: "Contato e pedido ficam registrados." },
  { icon: PackageCheck, title: "Venda aprovada", copy: "O pedido segue sem retrabalho." },
  { icon: Factory, title: "Produção rodando", copy: "Jobs, tempo e consumo no controle." },
  { icon: WalletCards, title: "Lucro visível", copy: "Você sabe quanto realmente sobrou." },
];

export default async function HomePage() {
  const host = (await headers()).get("host")?.toLowerCase();
  if (process.env.NODE_ENV === "development" && process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN === "true" && host === "demo.localhost:3005") {
    redirect("/dev-login");
  }

  return (
    <main className="offer-page">
      <section className="offer-hero" aria-labelledby="offer-title">
        <div className="offer-hero-copy">
          <p className="offer-kicker"><span /> Feito para quem vende impressão 3D</p>
          <h1 id="offer-title">Seu CRM organiza a operação. Sua landing page traz o próximo cliente.</h1>
          <p className="offer-lead">Pare de controlar orçamento no WhatsApp, produção na memória e lucro no chute. Tenha a operação inteira em um só lugar e uma página profissional para apresentar seu negócio.</p>
          <div className="offer-actions">
            <a className="offer-primary-action" href="#oferta">Quero essa oferta <ArrowRight aria-hidden="true" /></a>
            <Link className="offer-secondary-action" href="/login">Já sou cliente</Link>
          </div>
          <div className="offer-assurance" aria-label="Condições da oferta">
            <span><Check aria-hidden="true" /> Pagamento único</span>
            <span><Check aria-hidden="true" /> Implantação guiada</span>
            <span><Check aria-hidden="true" /> Landing page inclusa</span>
          </div>
        </div>

        <div className="offer-hero-stage" aria-label="Visão do CRM Agencia 3D">
          <div className="offer-price-orbit" aria-hidden="true"><span>R$</span><strong>1.000</strong><small>CRM completo</small></div>
          <div className="offer-product-window">
            <div className="offer-window-bar"><i /><i /><i /><span>painel.agencia3d</span></div>
            <div className="offer-window-body">
              <aside className="offer-window-nav">
                <b>A3</b><span className="is-active" /><span /><span /><span /><span />
              </aside>
              <div className="offer-window-content">
                <div className="offer-window-title"><span>Visão geral</span><i /></div>
                <div className="offer-metric-row">
                  <div><small>Vendas no mês</small><strong>R$ 18.420</strong><em>+18%</em></div>
                  <div><small>Em produção</small><strong>12 jobs</strong><em>agora</em></div>
                </div>
                <div className="offer-pipeline">
                  <div><span>Fila</span><b /><b /></div>
                  <div><span>Imprimindo</span><b /><b className="is-hot" /></div>
                  <div><span>Concluído</span><b /><b /><b /></div>
                </div>
                <div className="offer-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
              </div>
            </div>
          </div>
          <div className="offer-gift-ticket"><Sparkles aria-hidden="true" /><span>Brinde liberado</span><strong>Landing page profissional</strong></div>
        </div>
      </section>

      <section className="offer-price-strip" aria-label="Resumo da oferta">
        <div><span>Você investe</span><strong>R$ 1.000</strong><small>no CRM</small></div>
        <span className="offer-plus" aria-hidden="true">+</span>
        <div><span>Você recebe</span><strong>Landing page</strong><small>de brinde</small></div>
      </section>

      <section className="offer-section offer-transformation" aria-labelledby="transformation-title">
        <div className="offer-section-heading">
          <p>Uma operação que cresce sem virar bagunça</p>
          <h2 id="transformation-title">Tudo conversa. Do primeiro orçamento ao dinheiro no caixa.</h2>
        </div>
        <div className="offer-workflow">
          {workflow.map(({ icon: Icon, title, copy }, index) => <article key={title}>
            <div className="offer-workflow-index">{String(index + 1).padStart(2, "0")}</div>
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>)}
        </div>
      </section>

      <section className="offer-section offer-inside" aria-labelledby="inside-title">
        <div className="offer-inside-copy">
          <p>O que entra no CRM</p>
          <h2 id="inside-title">O essencial para vender, produzir e saber se deu lucro.</h2>
          <p className="offer-inside-lead">Menos planilhas soltas. Menos informação perdida. Mais clareza para você e para quem trabalha com você.</p>
          <ul>{included.map((item) => <li key={item}><Check aria-hidden="true" /> {item}</li>)}</ul>
        </div>
        <div className="offer-inside-visual" aria-label="Indicadores disponíveis no CRM">
          <div className="offer-profit-card">
            <Gauge aria-hidden="true" />
            <span>Lucro líquido do mês</span>
            <strong>R$ 7.860</strong>
            <small>Receita menos despesas e material consumido</small>
          </div>
          <div className="offer-production-line"><span>Pedidos</span><i /><span>Produção</span><i /><span>Entrega</span></div>
          <div className="offer-stock-signal"><span>Estoque inteligente</span><strong>Bobinas e produtos sob controle</strong></div>
        </div>
      </section>

      <section className="offer-section offer-gift" aria-labelledby="gift-title">
        <div className="offer-browser-mockup" aria-hidden="true">
          <div className="offer-browser-top"><i /><i /><i /><span>suaempresa.com.br</span></div>
          <div className="offer-browser-page">
            <div className="offer-browser-copy"><span>Impressão 3D sob medida</span><b>Da sua ideia<br />para o mundo real.</b><i /></div>
            <div className="offer-browser-object"><span /><span /><span /><span /></div>
          </div>
        </div>
        <div className="offer-gift-copy">
          <p>O brinde que ajuda a pagar o investimento</p>
          <h2 id="gift-title">Uma landing page profissional para transformar visita em orçamento.</h2>
          <p>Você recebe uma página rápida, responsiva e preparada para apresentar seus serviços, diferenciais e direcionar o cliente para o contato.</p>
          <div className="offer-gift-details"><span>Design personalizado</span><span>Versão para celular</span><span>Texto de venda</span><span>Botão de contato</span></div>
        </div>
      </section>

      <section className="offer-section offer-final" id="oferta" aria-labelledby="final-title">
        <div className="offer-final-copy">
          <p>Oferta de lançamento</p>
          <h2 id="final-title">Leve o CRM completo e ganhe sua landing page.</h2>
          <p>Uma estrutura para organizar o que você já vende e uma vitrine para conquistar o que vem depois.</p>
        </div>
        <div className="offer-checkout">
          <div className="offer-checkout-line"><span>CRM Agencia 3D</span><strong>R$ 1.000</strong></div>
          <div className="offer-checkout-line is-gift"><span>Landing page profissional</span><strong>GRÁTIS</strong></div>
          <div className="offer-checkout-total"><span>Investimento total</span><strong>R$ 1.000</strong><small>pagamento único</small></div>
          <Link href="/login">Ver o CRM funcionando <ArrowRight aria-hidden="true" /></Link>
          <p>Sem mensalidade escondida nesta oferta.</p>
        </div>
      </section>
    </main>
  );
}
