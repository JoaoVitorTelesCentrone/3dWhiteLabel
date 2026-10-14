import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRequestUserId } from "@/lib/auth/session";
import { ArrowRight, Check, Factory, Gauge, PackageCheck, Settings2, Sparkles, UsersRound, WalletCards } from "lucide-react";

export const metadata: Metadata = {
  title: "Sistema de gestão para empresas de impressão 3D | Sua Empresa 3D",
  description: "Organize clientes, pedidos, produção, materiais e resultados da sua empresa de impressão 3D. Inclui uma landing page personalizada para apresentar o negócio.",
};

const included = [
  "Clientes e histórico de atendimentos e pedidos",
  "Orçamentos e pedidos acompanhados por etapa",
  "Produção com jobs, prazos e status de entrega",
  "Materiais, produtos prontos e controle de estoque",
  "Visão de receitas, despesas e margens estimadas",
  "Relatórios para acompanhar a operação",
];

const workflow = [
  { icon: UsersRound, title: "Registre o contato", copy: "Guarde dados do cliente, conversa e histórico do atendimento." },
  { icon: PackageCheck, title: "Converta em pedido", copy: "Acompanhe orçamento, valor, prazo e o que foi combinado." },
  { icon: Factory, title: "Acompanhe a produção", copy: "Veja quais jobs estão na fila, imprimindo ou prontos para entrega." },
  { icon: WalletCards, title: "Leia os resultados", copy: "Consulte receitas, despesas e margens estimadas do período." },
];

const everydayProblems = [
  ["Orçamento perdido na conversa", "Quando cada atendimento fica em um chat diferente, retomar uma proposta vira procura manual."],
  ["Pedido sem atualização", "Cliente pergunta do andamento e a resposta depende de lembrar em que etapa o job está."],
  ["Material e custos sem visão", "Bobinas, produtos prontos, recebimentos e despesas ficam espalhados em anotações e planilhas."],
];

const faqs = [
  ["O sistema fica com a minha marca?", "A instância é configurada com nome, logo e identidade visual do negócio. O alcance exato dessa personalização é definido na implantação."],
  ["Posso retirar módulos que não uso?", "Sim. Os módulos podem ser avaliados conforme o processo da empresa. Confirme na proposta quais ficam ativos na sua instância."],
  ["E se eu precisar de uma funcionalidade nova?", "Solicitações fora do pacote padrão passam por avaliação técnica e comercial. Desenvolvimento adicional não está incluído automaticamente no valor de lançamento."],
  ["Como vejo a demonstração?", "A demonstração exige credenciais. Acesse o login ou solicite um acesso de demonstração para conhecer o sistema."],
  ["O que entra nos R$ 1.000?", "O valor é do pacote padrão de lançamento: instância configurada e landing page personalizada. [CONFIRMAR: escopo final, forma de pagamento e itens de implantação.]"],
  ["Domínio, hospedagem, suporte e atualizações estão incluídos?", "[CONFIRMAR: condições de domínio, hospedagem, manutenção, suporte e atualizações após a entrega.]"],
  ["Meus dados ficam protegidos?", "O sistema possui controle de acesso por login. [CONFIRMAR: política de backup, retenção de dados e responsabilidades de tratamento.]"],
];

export default async function HomePage() {
  if (await getRequestUserId()) redirect("/dashboard");

  const host = (await headers()).get("host")?.toLowerCase();
  if (process.env.NODE_ENV === "development" && process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN === "true" && host === "demo.localhost:3005") {
    redirect("/dev-login");
  }

  return (
    <main className="offer-page">
      <section className="offer-hero" aria-labelledby="offer-title">
        <div className="offer-hero-copy">
          <p className="offer-kicker"><span /> Gestão feita para quem trabalha com impressão 3D sob encomenda</p>
          <h1 id="offer-title">Mais controle nos pedidos. Mais clareza para tocar sua empresa de impressão 3D.</h1>
          <p className="offer-lead">Uma instância do sistema configurada com a sua marca para acompanhar clientes, orçamentos, jobs, materiais e resultados. Você também recebe uma landing page profissional para apresentar o negócio e facilitar novos contatos.</p>
          <div className="offer-actions">
            <a className="offer-primary-action" href="#oferta">Ver a proposta <ArrowRight aria-hidden="true" /></a>
            <Link className="offer-secondary-action" href="/login">Acessar demonstração</Link>
          </div>
          <div className="offer-assurance" aria-label="Condições da oferta">
            <span><Check aria-hidden="true" /> Pagamento único</span>
            <span><Check aria-hidden="true" /> Instância com a sua marca</span>
            <span><Check aria-hidden="true" /> Landing page inclusa</span>
          </div>
        </div>

        <div className="offer-hero-stage" aria-label="Visão do CRM Sua Empresa 3D">
          <div className="offer-price-orbit" aria-hidden="true"><span>R$</span><strong>1.000</strong><small>pacote padrão</small></div>
          <div className="offer-product-window">
            <div className="offer-window-bar"><i /><i /><i /><span>painel.suaempresa3d</span></div>
            <div className="offer-window-body">
              <aside className="offer-window-nav">
                <b>A3</b><span className="is-active" /><span /><span /><span /><span />
              </aside>
              <div className="offer-window-content">
                <div className="offer-window-title"><span>Visão geral <small>Dados ilustrativos</small></span><i /></div>
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
          <div className="offer-gift-ticket"><Sparkles aria-hidden="true" /><span>Inclusa no pacote</span><strong>Landing page profissional</strong></div>
        </div>
      </section>

      <section className="offer-price-strip" aria-label="Resumo da oferta">
        <div className="offer-price-product">
          <div><span>Sistema de gestão personalizado</span><small>Para a rotina da sua operação de impressão 3D</small></div>
          <strong>R$ 1.000</strong>
          <small className="offer-price-condition">pagamento único</small>
        </div>
        <span className="offer-plus" aria-hidden="true">+</span>
        <div className="offer-price-bonus">
          <span><Sparkles aria-hidden="true" /> Bônus incluso</span>
          <strong>Landing page profissional</strong>
          <small>para apresentar seu negócio e facilitar contatos</small>
        </div>
      </section>

      <section className="offer-section offer-problems" aria-labelledby="problems-title">
        <div className="offer-section-heading">
          <p>Quando a operação depende de memória e conversa solta</p>
          <h2 id="problems-title">O dia a dia não precisa ficar mais difícil conforme os pedidos aumentam.</h2>
        </div>
        <div className="offer-problem-list">
          {everydayProblems.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className="offer-section offer-transformation" aria-labelledby="transformation-title">
        <div className="offer-section-heading">
          <p>Do primeiro contato à entrega</p>
          <h2 id="transformation-title">Cada etapa registrada para você saber o que está acontecendo na operação.</h2>
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
          <p>O que o sistema ajuda a resolver</p>
          <h2 id="inside-title">Informação de venda, produção e gestão no lugar certo.</h2>
          <p className="offer-inside-lead">Acompanhe a rotina sem depender de planilhas soltas, histórico perdido no WhatsApp ou atualizações de memória.</p>
          <ul>{included.map((item) => <li key={item}><Check aria-hidden="true" /> {item}</li>)}</ul>
        </div>
        <div className="offer-inside-visual" aria-label="Indicadores disponíveis no CRM">
          <div className="offer-profit-card">
            <Gauge aria-hidden="true" />
            <span>Margem estimada do mês</span>
            <strong>Exemplo</strong>
            <small>Dados ilustrativos de receitas, despesas e custos registrados</small>
          </div>
          <div className="offer-production-line"><span>Pedidos</span><i /><span>Produção</span><i /><span>Entrega</span></div>
          <div className="offer-stock-signal"><span>Materiais e estoque</span><strong>Bobinas e produtos acompanhados</strong></div>
        </div>
      </section>

      <section className="offer-section offer-white-label" aria-labelledby="white-label-title">
        <div className="offer-white-label-icon"><Settings2 aria-hidden="true" /></div>
        <div>
          <p>Não é um sistema genérico com o seu logo colado</p>
          <h2 id="white-label-title">Sua própria instância, configurada para a sua marca e sua rotina.</h2>
        </div>
        <div className="offer-white-label-copy">
          <p>O sistema é entregue com o nome, a logo e a identidade visual do seu negócio. Os módulos podem ser avaliados conforme sua operação, para você não carregar telas que não fazem sentido no dia a dia.</p>
          <p>Ajustes que fogem do pacote padrão são analisados antes da implantação e recebem orçamento separado quando houver desenvolvimento adicional.</p>
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
          <p>Landing page inclusa</p>
          <h2 id="gift-title">Uma página profissional para apresentar sua empresa e facilitar novos contatos.</h2>
          <p>Mostre seus serviços, diferenciais e formas de contato em uma página adaptada para celular. Ela ajuda o cliente a entender o seu trabalho antes de pedir um orçamento; não substitui divulgação nem promete vendas.</p>
          <div className="offer-gift-details"><span>Identidade visual da marca</span><span>Versão para celular</span><span>Texto comercial da empresa</span><span>Direcionamento para contato</span></div>
        </div>
      </section>

      <section className="offer-section offer-final" id="oferta" aria-labelledby="final-title">
        <div className="offer-final-copy">
          <p>Pacote padrão de lançamento</p>
          <h2 id="final-title">Organize a operação e apresente melhor a sua empresa.</h2>
          <p>Você recebe uma instância configurada para o negócio e uma landing page personalizada. Ajustes especiais e funcionalidades novas são avaliados e orçados à parte.</p>
        </div>
        <div className="offer-checkout">
          <div className="offer-checkout-line"><span>Instância padrão configurada</span><strong>R$ 1.000</strong></div>
          <div className="offer-checkout-line is-gift"><span>Landing page personalizada</span><strong>INCLUSA</strong></div>
          <div className="offer-checkout-total"><span>Investimento total</span><strong>R$ 1.000</strong><small>pagamento único</small></div>
          <Link href="/login">Acessar demonstração <ArrowRight aria-hidden="true" /></Link>
          <p>A demonstração exige credenciais. [CONFIRMAR: condições de hospedagem, suporte, manutenção e prazo de implantação.]</p>
        </div>
      </section>

      <section className="offer-section offer-faq" aria-labelledby="faq-title">
        <div className="offer-section-heading">
          <p>Antes de decidir</p>
          <h2 id="faq-title">Perguntas que costumam aparecer antes da implantação.</h2>
        </div>
        <div className="offer-faq-list">
          {faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className="offer-closing" aria-labelledby="closing-title">
        <div><h2 id="closing-title">Quer conhecer o sistema antes de implantar?</h2><p>Acesse a demonstração com suas credenciais ou solicite um acesso para avaliar se o pacote faz sentido para a sua operação.</p></div>
        <Link href="/login">Acessar demonstração <ArrowRight aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
