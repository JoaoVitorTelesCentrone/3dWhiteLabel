# Projeto Sua Empresa 3D — Documento Consolidado

> **Última atualização:** 28/10/2026  
> **Diretório canônico:** `Agencia 3d/`  
> **Branch:** `main`  
> **Último commit:** `d9d7b04` — *feat: tighten landing hero presentation* (19/10/2026)  
> **Estado:** MVP implementado e validado localmente; lançamento comercial e piloto real ainda são gates operacionais.

Este documento reúne, em um só lugar, a visão do produto, o estado atual da implementação, a arquitetura, o modelo de dados, as regras de negócio, o design system, a monetização, o roadmap e as instruções de operação. As fontes oficiais por área estão listadas na seção [23](#23-índice-da-documentação).

**Legenda de status usada neste documento:**

| Marca | Significado |
|---|---|
| `[Implementado]` | Existe código, rota, migration ou automação no repositório |
| `[Parcial]` | Existe base, mas falta fluxo completo, validação ou operação |
| `[Planejado]` | Está na visão/roadmap e ainda não foi implementado |
| `[Legado]` | Código ou rota mantida por compatibilidade, fora do fluxo principal |

---

## Sumário

1. [Visão em uma página](#1-visão-em-uma-página)
2. [Status atual](#2-status-atual)
3. [Identidade e posicionamento](#3-identidade-e-posicionamento)
4. [Problema, público e proposta de valor](#4-problema-público-e-proposta-de-valor)
5. [Fluxo operacional central](#5-fluxo-operacional-central)
6. [Funcionalidades implementadas](#6-funcionalidades-implementadas)
7. [Mapa de rotas](#7-mapa-de-rotas)
8. [Arquitetura técnica](#8-arquitetura-técnica)
9. [Multi-tenancy, white label e segurança](#9-multi-tenancy-white-label-e-segurança)
10. [Modelo de dados](#10-modelo-de-dados)
11. [Regras de negócio críticas](#11-regras-de-negócio-críticas)
12. [Assistente IA](#12-assistente-ia)
13. [Design system e identidade visual](#13-design-system-e-identidade-visual)
14. [Planos, preços e monetização](#14-planos-preços-e-monetização)
15. [Mercado e concorrência](#15-mercado-e-concorrência)
16. [Roadmap](#16-roadmap)
17. [Estrutura do repositório](#17-estrutura-do-repositório)
18. [Setup, comandos e ambientes](#18-setup-comandos-e-ambientes)
19. [Variáveis de ambiente](#19-variáveis-de-ambiente)
20. [Testes, CI/CD e qualidade](#20-testes-cicd-e-qualidade)
21. [Operação de produção](#21-operação-de-produção)
22. [Limitações conhecidas e próximos passos](#22-limitações-conhecidas-e-próximos-passos)
23. [Índice da documentação](#23-índice-da-documentação)
24. [Materiais comerciais e contato](#24-materiais-comerciais-e-contato)

---

## 1. Visão em uma página

**Sua Empresa 3D** é uma plataforma **white label** de operação para empresas de impressão 3D: um ERP com PCP/MES que cobre do pedido confirmado à peça entregue, passando por produção, materiais, expedição e financeiro.

| Item | Definição |
|---|---|
| **Produto** | ERP + PCP/MES verticalizado para impressão 3D, vendido por licença e operado com a marca do cliente |
| **Promessa** | *"Do pedido à peça entregue."* |
| **Posicionamento** | *"Tenha o sistema da sua empresa de impressão 3D."* — não é "mais um SaaS de R$ 49/mês" |
| **Público (ICP)** | Print farms, bureaus, lojas e pequenos fabricantes com produção recorrente, principalmente no Brasil |
| **Diferencial central** | Um único core multi-tenant; cada cliente vê apenas sua marca, domínio, usuários, módulos e dados |
| **Modelo de receita** | Licença única (Start R$ 1.497) + Care opcional (R$ 99/mês) + serviços e customizações |
| **Stack** | Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + Supabase/PostgreSQL com RLS |
| **Estado** | MVP funcional em ambiente local; piloto real e prontidão de produção ainda pendentes |

**As 10 decisões não negociáveis do projeto:**

1. **Um único core.** Nunca um fork, branch ou pasta por cliente. Customização = configuração, branding, feature flag, módulo, permissão ou integração.
2. **Multi-tenancy desde o primeiro commit.** `tenant_id` em todas as tabelas de negócio + Row Level Security.
3. **White label é o produto.** O cliente compra "o sistema da minha empresa", não "mais um SaaS".
4. **Licença ≠ Hospedagem ≠ Manutenção.** Três linhas de receita separadas.
5. **Modelo 3D ≠ Produto.** Um STL é uma peça; um produto tem SKU, preço, variação e receita de produção.
6. **Pedido ≠ Ordem de Produção ≠ Job.** Pedido #183 (100 chaveiros) → OP #932 → 4 jobs de 25 unidades.
7. **Bobina é indivíduo, não estoque agregado.** Cada bobina tem ID, peso, status e QR Code.
8. **Custo previsto × custo real** e progresso por pedido orientam a operação.
9. **Fiscal fica fora.** NF-e, tributação e contábil são delegados a Bling/Omie via integração.
10. **IA só onde resolve problema real** (margem, compras, produção, manutenção). Sem chatbot genérico.

---

## 2. Status atual

### 2.1 O que está pronto

`[Implementado]` O fluxo principal foi construído e validado localmente em 07/10/2026:

```text
Cliente + produto + quantidade → pedido confirmado
→ OP por item → job com bobina e impressora (opcional)
→ início → conclusão ou falha → peças boas suficientes
→ pronto para envio → expedição → entrega
→ recebimentos e despesas → dashboard e relatórios
```

Também estão implementados:

- autenticação com Supabase Auth, convite, definição de senha e sessão;
- multi-tenancy por host/subdomínio com RLS e contexto de tenant;
- branding white label (nome, cores, logo) aplicado por CSS variables;
- RBAC estático com 8 papéis e permissões no servidor (overrides por tenant ainda planejados);
- licença, plano e módulos por tenant com modo leitura quando suspenso;
- clientes, produtos, variações, pedidos multi-item e CRUD de pedidos abertos;
- produção com OPs, jobs, reserva de bobina, falhas, cancelamento e replanejamento;
- materiais, bobinas individuais, movimentações imutáveis e saldo físico/reservado/disponível;
- estoque de produtos prontos com ajuste manual e ledger de movimentos;
- expedição, entrega, recebimentos parciais, despesas e conciliação financeira;
- dashboard, relatórios por período, exportação CSV e margem prevista;
- Assistente IA em `/assistente` com consultas somente leitura e cotas;
- console interno `/admin` para tenants, planos, licenças, módulos, domínios, leads, funil e auditoria;
- tracking de funil na LP (`lp_view`, `cta_click`, `form_start`, `form_submit`) e pipeline de leads com responsável, etapa, UTM e marcos de demo/proposta;
- domínios customizados via Cloudflare for SaaS (criação e verificação de DNS/SSL);
- health check em `/api/health`, backups, verificação de backup e release check;
- 7 specs E2E Playwright e testes SQL de banco;
- landing page comercial, página de contato e apresentação em HTML/PDF.

### 2.2 Números do repositório

| Métrica | Valor |
|---|---|
| Aplicações Next.js | 1 (`apps/web`) |
| Pacotes compartilhados | 1 (`packages/db`) |
| Migrations SQL | 40 |
| Tabelas | 40 (39 em `public` + 1 em `platform`) |
| View | 1 (`public.tenant_runtime`) |
| Páginas (`page.tsx`) | 31 |
| Rotas de API | 3 (`/api/health`, `/api/assistant`, `/api/marketing-event`) |
| Testes unitários (Vitest) | 7 arquivos |
| Testes E2E (Playwright) | 7 specs |
| Testes SQL | 3 arquivos (`supabase/tests`) |

Os números incluem a migration de funil e a rota `/api/marketing-event`, ainda não commitadas em 28/10/2026.

### 2.3 O que ainda não está pronto

- `[Parcial]` **Piloto real:** o fluxo foi validado localmente, mas ainda não houve operação real de duas semanas sem planilha paralela.
- `[Planejado]` **Realtime:** as telas são revalidadas por Server Actions; não há assinatura Realtime por tenant.
- `[Planejado]` **Portal do cliente:** `apps/portal` não existe.
- `[Planejado]` **Integrações:** marketplaces, OctoPrint/Moonraker, Bling/Omie e WhatsApp não estão implementados.
- `[Planejado]` **Fiscal:** NF-e e tributação ficam fora do escopo.
- `[Planejado]` **QR Code de bobinas, planner, multiunidade, visualizador 3D, QMS/CAPA e SSO.**
- `[Parcial]` **Cobertura E2E:** há specs para os fluxos principais, mas a cobertura real de cada cenário P0 ainda precisa ser confirmada e P1/P2 precisam ser ampliados.
- `[Parcial]` **Operação de produção:** backup/restore, monitoramento e domínio estão preparados, mas o ensaio mensal de restauração e o piloto continuam como gates.

### 2.4 Estado do Git em 28/10/2026

O último commit é de 19/10/2026. A árvore de trabalho tem 24 alterações não commitadas (13 arquivos modificados e 11 novos), incluindo:

- ajustes de landing page, contato, privacidade e estilos;
- `PLANO-LP-COPY-PRODUTO.md` e `ROTEIRO-APRESENTACAO-COMERCIAL.md`;
- `apresentacao-comercial.html`, `.pdf`, imagens e script de exportação;
- atualizações em `IDENTIDADE-VISUAL.md`, `MONETIZACAO.md`, `README.md` e `apps/web/PRODUCT.md`;
- migration `20261028155428_sales_funnel_tracking_and_lead_pipeline.sql`, rota `/api/marketing-event`, `FunnelTracker` e ajustes no console admin para funil e atribuição de leads;
- o próprio `PROJETO.md`.

---

## 3. Identidade e posicionamento

### 3.1 Nome e conceito

**Sua Empresa 3D** é o nome da plataforma. O nome aparece apenas na administração interna, no site de vendas e no rodapé opcional "Powered by". Dentro do app do tenant, **a marca é sempre a do cliente**.

**Tagline:** *Do pedido à peça entregue.*

**Personalidade:** clara, técnica e confiável. A comunicação explica o trabalho da operação sem competir com a marca do cliente nem recorrer a promessas genéricas.

### 3.2 Logo

- Arquivo: `assets/agencia3d-logo.png`.
- Símbolo abstrato em camadas, gradiente laranja-âmbar.
- Versão primária sobre fundo escuro; versão monocromática em branco ou grafite.
- Nunca esticar, rotacionar, aplicar sombras ou usar sobre foto clara sem scrim.
- Área de respiro: altura da primeira camada do símbolo.

### 3.3 Regra de ouro do white label

> O logo e a marca Sua Empresa 3D não aparecem no app do cliente. O design system inteiro é tematizável por CSS custom properties injetadas a partir de `tenant_branding`.

Exceções: console admin interno, site de vendas e rodapé "Powered by" (removível no Business).

### 3.4 Identificadores técnicos legados

Os buckets de Storage ainda usam IDs `forja-*` (`forja-branding`, `forja-products`, `forja-designs`) e o projeto Supabase local mantém `forja-local` para preservar migrations e volumes. Esses nomes não aparecem para os clientes.

---

## 4. Problema, público e proposta de valor

### 4.1 As três dores centrais

| Dor | Como aparece hoje |
|---|---|
| **O pedido fica perdido** | Prazo, quantidade e combinado espalhados em conversas e planilhas |
| **A fila muda toda hora** | Sem uma visão comum, é difícil saber o que produzir e o que já pode sair |
| **O custo aparece tarde** | Material usado, recebimentos e despesas ficam longe do pedido |

### 4.2 ICP

Empresas de impressão 3D, bureaus, lojas e pequenos fabricantes com produção recorrente. O usuário principal é o dono/operador que orça, produz, entrega e cobra peças físicas — muitas vezes em pé, na bancada, com luvas.

### 4.3 Proposta de valor

- **Pedido como fio condutor:** cliente, itens, valor, prazo e endereço no mesmo registro.
- **Produção conectada:** jobs, material reservado e peças boas ligados ao pedido.
- **Pronto para enviar:** a equipe vê quando a quantidade aprovada permite expedir.
- **Resultado conferido:** recebimentos, despesas e margem estimada separados e explicáveis.
- **Marca própria:** o sistema carrega nome, logo e cores da empresa cliente.

### 4.4 Os 9 diferenciais competitivos

1. **White label** — o cliente usa a própria marca.
2. **Licença em vez de SaaS barato** — percepção de ativo, não de aluguel.
3. **Pedido → produção totalmente conectado** — sem retrabalho entre sistemas.
4. **Custo previsto × custo real** — divergência por job.
5. **Lucro por hora de máquina** — KPI que muda decisão de mix de produtos.
6. **Planejamento inteligente** — melhor máquina e planejamento noturno (fase futura).
7. **Manutenção preventiva por horas de uso** — conceito no roadmap.
8. **Rastreabilidade / passaporte da peça** — porta de entrada para clientes B2B industriais.
9. **IA operacional** — margem, compras e produção (fase 3, com implementação inicial já disponível).

---

## 5. Fluxo operacional central

### 5.1 Diagrama do fluxo

```text
Cliente + produto + quantidade
        │
        ▼
Pedido confirmado (open)
        │
        ▼
Ordem de Produção por item (OP)
        │
        ▼
Job com bobina reservada e impressora opcional
        │
        ├──▶ Conclusão: tempo, gramas, peças boas/defeituosas
        └──▶ Falha: motivo, consumo, liberação/replanejamento
        │
        ▼
Peças boas suficientes
        │
        ▼
Pronto para envio (ready)
        │
        ▼
Expedição (shipped) → Entrega (delivered)
        │
        ▼
Recebimentos e despesas
        │
        ▼
Dashboard e relatórios
```

**Orçamento é opcional.** O fluxo começa na venda confirmada. Orçamentos, oportunidades e modelos 3D não são pré-requisitos.

### 5.2 Contrato de estados

| Registro | Estados/etapas | Regra para mudar |
|---|---|---|
| **Pedido** | `open` → `in_production` → `ready` → `shipped` → `delivered` (e `canceled`) | Produção cria OPs; todas as quantidades boas liberam envio; expedição cria registro; entrega fecha o registro |
| **Job** | `queued` → `running` → `completed` ou `failed`/`canceled` | Início exige impressora livre (quando houver) e reserva ativa; conclusão exige tempo, gramas e quantidades; falha registra motivo e consumo; cancelamento libera reserva |
| **OP** | `planned` → `in_progress` → `completed` (e `canceled`) | Etapa **derivada** dos jobs e da quantidade boa. "Atenção" é um estado de UI para falha pendente, não um status do banco. "Concluída" exige peças boas suficientes |

O banco bloqueia saltos de status. O status do pedido só muda por comandos transacionais auditáveis (`release_order_to_production`, `ship_order`, `deliver_order` etc.), não por edição livre de coluna.

### 5.3 Regra de negócio do pedido

- O pedido é criado com **cliente, produto e quantidade**.
- Preço e custo são copiados da variação escolhida e **congelados** no pedido.
- Vender 3 unidades registra 3× o faturamento e 3× o custo da variação.
- Pedidos abertos podem ser editados; o preço/custo é recalculado com os valores atuais do produto.
- Pedido com produção, recebimento ou expedição bloqueia edição e exclusão.
- Exclusão de pedido aberto é auditada.
- Um pedido pode ter **vários itens** (migration `20261013120000_multi_item_sales_orders.sql`).
- Endereço de entrega é um snapshot no pedido.

### 5.4 Regra de negócio da produção

- Enviar pedido à produção cria OPs vinculadas aos itens e muda o pedido para `in_production`.
- O planejamento **não exige impressora**; o job pode ser executado sem máquina cadastrada.
- Produto sem receita pode ser vendido; o planejamento coleta as estimativas que faltarem.
- Cada job reserva gramas de uma bobina.
- A conclusão registra consumo, tempo, peças boas e defeituosas.
- Só a quantidade boa necessária muda o pedido para "Pronto para envio".
- Falha libera ou consome a reserva conforme o uso registrado e permite replanejar.
- A pipeline é uma **projeção** dos jobs e da quantidade boa — não uma coluna editável.
- Arrastar um card abre a ação necessária (planejar, iniciar, concluir, falhar ou cancelar) antes de confirmar a mudança.

### 5.5 Regra de negócio de materiais

- **Bobina é indivíduo:** código, material, cor, peso bruto, tara, custo/kg, fornecedor, lote e localização.
- Peso utilizável = **peso bruto − tara**.
- `current_weight_g >= spool_tare_g` é invariante.
- Movimentos são imutáveis; correção gera ajuste, nunca edição do histórico.
- Materiais exibe **físico, reservado e disponível**.
- Reserva parcial não depende do status global da bobina (`material_reservations`).
- Duas operações concorrentes não podem reservar os mesmos gramas.

### 5.6 Regra de negócio financeira

- **Venda** pela data do pedido.
- **Recebimento** pela data do pagamento.
- **Despesa** pela data de ocorrência.
- **Produção** pela data de conclusão.
- Fuso oficial: **America/Sao_Paulo**.
- Dashboard e relatórios distinguem:
  - valor vendido;
  - valor recebido;
  - saldo a receber;
  - custo previsto;
  - custo real de material;
  - margem prevista.
- Custo de material no relatório usa o **preço congelado no job**.
- Pagamentos parciais reduzem o saldo sem alterar o valor vendido.
- Não chamar margem estimada de "lucro realizado".

---

## 6. Funcionalidades implementadas

| Módulo | Status | O que faz |
|---|---|---|
| **Landing e contato** | `[Implementado]` | Página comercial com narrativa do pedido à entrega, captura de leads e tracking de funil (`lp_view`, `cta_click`, `form_start`, `form_submit`) |
| **Autenticação** | `[Implementado]` | Login, convite, definição de senha, sessão Supabase e logout |
| **Dashboard** | `[Implementado]` | KPIs de pedidos, produção, catálogo e finanças; gráficos de venda/recebimento; atividades recentes |
| **Clientes** | `[Implementado]` | Cadastro de apoio ao pedido: nome, empresa, e-mail, telefone, observações e histórico |
| **Produtos** | `[Implementado]` | Lista com imagem, nome, preço e custo; cadastro com variação padrão; SKU automático; detalhes e variações |
| **Pedidos** | `[Implementado]` | Pedido multi-item, edição/exclusão de pedido aberto, painel lateral, progresso e comandos de produção/expedição/entrega |
| **Produção** | `[Implementado]` | Pipeline derivada, OPs, jobs, reserva de bobina, início, conclusão, falha, cancelamento e replanejamento |
| **Materiais** | `[Implementado]` | Materiais, bobinas individuais, recebimento, ajuste de peso, movimentos e saldo físico/reservado/disponível |
| **Produtos prontos** | `[Implementado]` | Estoque de acabados informado manualmente, com ledger de movimentos |
| **Financeiro** | `[Implementado]` | Recebimentos parciais, despesas, saldo a receber, custo previsto e margem estimada |
| **Relatórios** | `[Implementado]` | Períodos, totais de venda/recebimento/despesa, custo real de material, margem e exportação CSV |
| **Assistente IA** | `[Implementado]` | Perguntas em linguagem natural sobre dados do tenant; consultas somente leitura; cotas |
| **Configurações** | `[Implementado]` | Marca (nome, cores, logo) e usuários (convites, papéis, ativação) |
| **Console admin** | `[Implementado]` | Provisionamento de tenants, plano, licença, módulos, domínios, leads, funil, atribuição e auditoria |
| **Domínios customizados** | `[Implementado]` | Custom hostname na Cloudflare for SaaS, CNAME/TXT, verificação de DNS e SSL |
| **Orçamentos** | `[Legado]` | Rota acessível por URL, fora da navegação; não faz parte do fluxo do MVP |
| **Oportunidades** | `[Legado]` | Rota acessível por URL, fora da navegação; CRM histórico |
| **Modelos 3D e receitas** | `[Desativado]` | Código e schema históricos; `/catalogo/modelos` e `/catalogo/receitas` são bloqueados pelo middleware |
| **Impressoras** | `[Desativado]` | Rota `/impressoras` retorna 404; produção não exige máquina |
| **Manutenção** | `[Desativado]` | Rota `/manutencao` retorna 404; conceito permanece no roadmap |
| **Portal do cliente** | `[Planejado]` | Área do cliente final do tenant, no Business |
| **Integrações** | `[Planejado]` | Marketplaces, OctoPrint/Moonraker, Bling/Omie, WhatsApp |
| **QR Code** | `[Planejado]` | Etiquetas e scanner mobile de bobinas |
| **Planner** | `[Planejado]` | Melhor máquina, planejamento noturno e scheduling |
| **Multiunidade** | `[Planejado]` | Branches e operações em várias unidades |

### 6.1 O que o MVP deliberadamente não faz

- Não mantém estoque de produtos acabados atualizado automaticamente pela produção ou venda; o saldo é informado manualmente.
- Não tem etapa independente de pós-processamento/qualidade; o job registra peças boas e defeituosas.
- Não emite nota fiscal nem calcula tributação.
- Não exige impressora nem receita para vender ou produzir.
- Não usa orçamento como pré-requisito do pedido.
- Não tem chatbot genérico nem IA que altere dados de negócio.

---

## 7. Mapa de rotas

### 7.1 Públicas

| Rota | Função |
|---|---|
| `/` | Landing page comercial |
| `/contato` | Formulário de demonstração e captura de lead |
| `/login` | Login do tenant |
| `/definir-senha` | Definição de senha após convite |
| `/termos` | Termos de uso |
| `/privacidade` | Política de privacidade |
| `/admin/login` | Login do administrador da plataforma |
| `/acesso-negado` | Estado de permissão insuficiente |
| `/licenca-suspensa` | Estado de licença suspensa (modo leitura) |
| `/modulo-indisponivel` | Módulo não habilitado para o tenant |
| `/catalogo-desativado` | Aviso de catálogo histórico desativado |

Rotas de API: `/api/health` (público), `/api/assistant` (autenticado, IA) e `/api/marketing-event` (público, tracking de funil).

### 7.2 App autenticado (navegação atual)

| Grupo | Rota | Rótulo |
|---|---|---|
| Visão geral | `/dashboard` | Visão geral |
| Assistente IA | `/assistente` | Assistente IA |
| Comercial | `/clientes` | Clientes |
| Comercial | `/pedidos` | Pedidos |
| Produção | `/producao` | Produção |
| Catálogo | `/catalogo/produtos` | Produtos |
| Estoque | `/materiais` | Materiais |
| Estoque | `/estoque` | Produtos prontos |
| Gestão | `/financeiro` | Financeiro |
| Gestão | `/relatorios` | Relatórios |
| Configurações | `/configuracoes/marca` | Marca |
| Configurações | `/configuracoes/usuarios` | Usuários |

### 7.3 Console interno

| Rota | Função |
|---|---|
| `/admin` | Tenants, planos, licenças, módulos, domínios, leads, funil e auditoria |

### 7.4 Rotas históricas ou desativadas

| Rota | Estado |
|---|---|
| `/orcamentos` | `[Legado]` acessível por URL, fora da navegação |
| `/oportunidades` | `[Legado]` acessível por URL, fora da navegação |
| `/catalogo/modelos` | `[Desativado]` redirecionado pelo middleware |
| `/catalogo/receitas` | `[Desativado]` redirecionado pelo middleware |
| `/impressoras` | `[Desativado]` retorna 404 |
| `/manutencao` | `[Desativado]` retorna 404 |

---

## 8. Arquitetura técnica

### 8.1 Princípio

O cliente **percebe** uma instância própria; a infraestrutura é **compartilhada**.

```text
Fase 1 (MVP → centenas de clientes)
1 app Next.js + 1 PostgreSQL (RLS) + storage logicamente separado

Fase Enterprise (sob demanda)
1 deploy dedicado + 1 banco dedicado + 1 storage dedicado (mesmo código)
```

O custo marginal de um novo cliente tende a zero: mesma base, mesmas migrations, mesmo roadmap.

### 8.2 Stack implementada

| Camada | Tecnologia |
|---|---|
| App | Next.js 15.5 (App Router, RSC, Server Actions) |
| UI | React 19, Tailwind CSS 4, shadcn/ui estilo `base-nova` com Base UI, Lucide, Watermelon UI pontual |
| Banco | PostgreSQL 17 via Supabase, com RLS |
| Auth | Supabase Auth + RBAC próprio |
| Storage | Supabase Storage (buckets `forja-*`) |
| Domínios | Cloudflare for SaaS (custom hostnames, SSL) |
| IA | OpenAI Responses API, server-side |
| Deploy | Vercel (app) + Supabase (dados) |
| Análise | Recharts, Zod, React Markdown |
| Testes | Vitest, Playwright, testes SQL no Supabase local |

### 8.3 Stack planejada (ainda não implementada)

| Camada | Evolução prevista |
|---|---|
| Storage em escala | Cloudflare R2 |
| Filas/jobs | Supabase Edge Functions + `pg_cron` → Inngest |
| Observabilidade | Sentry + PostHog + logs por `tenant_id` |
| Pagamentos da plataforma | Stripe ou Asaas |
| Apps separados | `apps/admin` e `apps/portal` |
| Pacotes | `core`, `auth`, `ui`, `branding`, `integrations`, `observability`, `config`, `types` |

### 8.4 Fluxo de cada requisição

```text
host → tenant ativo → sessão → usuário ativo → licença/módulo
→ permissão → validação Zod → serviço de domínio → transação/RLS
→ auditoria/outbox → resposta tipada
```

Centralizado em:

- `getTenantContext()` — resolve host, perfil, tenant, plano, licença e módulos;
- `requireSession()` / `getRequestUserId()` — sessão;
- `requirePermission()` — RBAC;
- `requireModule()` / `requireModulePermission()` — feature flags e licença;
- `requirePlatformAdmin()` — console interno.

**Nunca confie** em `tenant_id`, role, preço ou custo enviados pelo navegador.

### 8.5 Resolução de tenant

```text
Requisição: erp.jota3d.com.br/dashboard
        │
        ▼
middleware.ts extrai o host
        │
        ▼
Lookup: host → tenant
  • jota3d.agencia3d.app        (subdomínio da plataforma)
  • erp.jota3d.com.br           (custom domain via Cloudflare for SaaS)
        │
        ▼
TenantContext:
  { tenantId, tenantName, userId, fullName, role, plan,
    licenseStatus, modules[] }
        │
        ▼
Layout aplica tema (CSS vars)
Client Supabase recebe JWT com tenant → RLS filtra tudo
Feature flags escondem módulos fora do plano
```

Fallback: host não resolvido → página de erro branded.

### 8.6 Feature flags e planos

| Plano | Módulos habilitados no código |
|---|---|
| **Start** | `crm`, `quotes`, `orders`, `catalog`, `stock`, `production`, `ai` |
| **Pro** | Start + `quality`, `qr_codes`, `actual_costs`, `planner`, `advanced_reports` |
| **Business** | Pro + `customer_portal`, `api`, `integrations`, `multiunit`, `remove_branding` |

O admin da plataforma pode ligar/desligar módulos avulsos por tenant em `tenant_modules` (upsell). O plano define o default; o override prevalece.

> **Atenção — defaults divergentes:** o app (`apps/web/src/lib/tenant/modules.ts`) e o banco (`private.has_tenant_module`) calculam os módulos padrão de forma diferente. O app inclui `ai` no Start e não inclui `printers`/`maintenance`; o banco inclui `printers` em todos os planos, `maintenance` em Pro/Business e só inclui `ai` no Business. Overrides em `tenant_modules` corrigem caso a caso, mas essa divergência precisa ser unificada antes de vender planos.

**Licença:**

- `active` — operação normal;
- `past_due` — cobrança pendente;
- `suspended` — app em modo leitura, sem apagar dados.

**Care/manutenção** é separado da licença: ficar sem Care não invalida o sistema, apenas interrompe atualizações/suporte/hospedagem gerenciada.

### 8.7 Organização do app

```text
apps/web/
├── src/
│   ├── app/                 # rotas, páginas e Server Actions
│   ├── components/          # UI local, navegação, tabelas, formulários
│   ├── hooks/
│   ├── lib/
│   │   ├── ai/              # schemas, limites e consultas do assistente
│   │   ├── auth/            # sessão, guards, permissões, admin
│   │   ├── cloudflare/      # custom hostnames
│   │   ├── supabase/        # clients browser/server/admin/middleware
│   │   ├── tenant/          # contexto, host e módulos
│   │   ├── pricing.ts
│   │   ├── production-load.ts
│   │   ├── production-progress.ts
│   │   ├── reports.ts
│   │   └── utils.ts
│   └── middleware.ts
├── e2e/                     # Playwright
├── scripts/                 # provisionamento, seed, demo
└── public/
```

---

## 9. Multi-tenancy, white label e segurança

### 9.1 Camadas de isolamento

1. **Row Level Security no PostgreSQL** — toda tabela de negócio tem `tenant_id` e policy baseada em `private.current_tenant_id()`.
2. **Autorização server-side** — toda Server Action valida sessão, tenant, módulo, licença e permissão antes de tocar no banco.
3. **Storage** — paths prefixados por tenant (`tenants/{tenant_id}/...`) e policies de bucket.
4. **Testes de vazamento** — suíte que tenta ler dados do tenant B autenticado como tenant A.

### 9.2 Como o RLS resolve o tenant

No Supabase, o tenant não vem de um `current_setting` arbitrário. A função `private.current_tenant_id()`:

- é `security definer`;
- tem `search_path` fixo;
- consulta o profile ativo do usuário autenticado;
- é usada nas policies de `select`, `insert`, `update` e `delete`.

Os testes SQL cobrem o acesso do tenant A e do tenant B, inclusive a resolução de arquivo por tenant. Usuário inativo, anônimo e service role são barrados por policies/grants, mas ainda não têm casos de teste dedicados.

### 9.3 Papéis padrão (RBAC)

| Papel | Escopo |
|---|---|
| `owner` | Tudo, inclusive licença e exclusão de dados |
| `admin` | Tudo exceto billing/licença |
| `sales` | CRM, orçamentos, pedidos, clientes |
| `production` | OPs, jobs, fila, planejamento, qualidade |
| `operator` | Fila, jobs, status de impressora, registrar falhas |
| `stock` | Materiais, bobinas, movimentações, compras |
| `finance` | Financeiro, margens, relatórios financeiros |
| `viewer` | Somente leitura, sem custos/margens por padrão |

**Permissões sensíveis separadas:**

- `costs.view` — ver custo real ≠ ver financeiro;
- `margins.view` — ver margem;
- `finance.view` / `finance.edit`;
- `quotes.discount` — desconto acima do limite;
- `modules.manage` — feature flags;
- `license.view`;
- `ai.use` — consulta apenas áreas que o próprio perfil pode visualizar.

Overrides por tenant estão previstos em `PERMISSIONS.md` (tabela `role_permissions`), mas **ainda não estão implementados**. Hoje o RBAC é estático por papel no código do servidor.

### 9.4 White label

Tabela `tenant_branding` implementada com: **nome de exibição, logo, cor primária e cor de destaque**. Favicon, fontes, fundo de login, nome de remetente de e-mail, rodapé e CSS customizado existem apenas no schema conceitual e seguem como evolução planejada.

- O layout resolve o branding no servidor e injeta CSS vars no primeiro HTML.
- E-mails transacionais **devem** usar a marca do tenant (requisito, ainda não implementado).
- Favicon por tenant via rota dinâmica é evolução planejada.
- Cores semânticas (sucesso, alerta, erro, informação) **não** são tematizáveis.
- CSS arbitrário permanece desabilitado até existir sanitização rigorosa.

### 9.5 Segurança obrigatória

**Implementado:**

- RLS + RBAC + `tenant_id` em toda tabela de negócio.
- Autorização server-side nas Server Actions e rotas autenticadas; endpoints públicos têm validação de origem e entrada.
- Auditoria em ações sensíveis: ator, tenant, ação, entidade, antes/depois e horário.
- Validação de entrada com Zod nas Server Actions e API routes.
- Secrets apenas em variáveis de ambiente; nunca no bundle do cliente.
- Cotas de IA por usuário, IP e tenant.
- Scripts de backup e verificação, além de backups diários do provedor quando o plano Supabase contratado os oferece (PITR conforme plano).
- Links assinados e convites com expiração.
- `poweredByHeader: false`, cookies seguros via Supabase SSR.

**Requisitos ainda não implementados ou parciais:**

- Rate limiting geral por IP/tenant na borda (Cloudflare) — hoje só a IA tem cotas.
- MFA obrigatório para administradores da plataforma.
- CSP explícita e proteção CSRF adicional.
- Sanitização de `custom_css` (o campo nem existe na implementação atual).
- Política formal de retenção/exclusão e exportação LGPD.
- Consentimento e anonimização para benchmarks.
- Verificação de dependências/imagens no pipeline.
- Runbook de resposta a incidente com dono e severidade.

### 9.6 Auditoria

- `audit_events` — ações do tenant.
- `platform_audit_events` — ações do console interno.
- Ações registradas: criação/edição/exclusão de pedido, liberação para produção, criação/início/conclusão/falha/cancelamento de job, ajuste de bobina, recebimento, despesa, expedição, entrega, mudança de plano/módulo/usuário.
- **Requisito de operação (ainda sem fluxo de impersonation):** o admin da plataforma não deve ter acesso irrestrito aos dados financeiros do tenant; suporte deve exigir motivo, escopo, expiração e registro.

---

## 10. Modelo de dados

> **Fonte executável:** `supabase/migrations/`. O `DATABASE.md` é referência conceitual e contém tabelas/colunas que não existem na implementação (por exemplo, `licenses`). Em caso de divergência, valem as migrations.

### 10.1 Plataforma e tenant

| Tabela | Função |
|---|---|
| `platform.tenants` | Empresa cliente: nome, slug, plano, licença, trial |
| `tenant_domains` | Hosts do tenant, tipo, status, SSL, verificação Cloudflare |
| `tenant_settings` | Timezone, locale, moeda |
| `tenant_modules` | Feature flags por tenant |
| `tenant_branding` | White label: nome de exibição, logo, cor primária e cor de destaque |
| `tenant_runtime` (view) | Nome, slug, plano, licença em tempo de execução |
| `platform_admins` | Contas do console interno |
| `platform_audit_events` | Auditoria da plataforma |
| `sales_leads` | Leads da landing/contato: etapa, responsável, UTMs, demo e proposta |
| `sales_funnel_events` | Eventos anônimos do funil: `lp_view`, `cta_click`, `form_start`, `form_submit` |

### 10.2 Identidade e acesso

| Tabela | Função |
|---|---|
| `profiles` | Usuário do tenant: nome, e-mail, papel, ativo |
| `audit_events` | Trilha de auditoria do tenant |

### 10.3 Comercial

| Tabela | Função |
|---|---|
| `customers` | Cliente: nome, empresa, e-mail, telefone, observações e arquivamento |
| `opportunities` | Oportunidade de CRM (legado) |
| `quotes` | Orçamento com composição de custo (legado) |
| `quote_items` | Itens do orçamento |
| `sales_orders` | Pedido: número, cliente, status, canal, prazo, total, endereço |
| `sales_order_items` | Itens do pedido: produto, variante, quantidade, preço |

### 10.4 Catálogo

| Tabela | Função |
|---|---|
| `products` | Item comercial: nome, categoria, descrição, imagem, ativo |
| `product_variants` | SKU, atributos, preço em centavos, custo em centavos, variação padrão |
| `designs` | Modelo 3D (histórico/desativado na UI) |
| `design_revisions` | Revisões v1..vn |
| `design_files` | Arquivos STL/3MF/STEP/OBJ/GCODE no Storage |
| `production_recipes` | Receita: material, gramas, tempo, unidades por placa (histórico) |

### 10.5 Materiais e estoque

| Tabela | Função |
|---|---|
| `materials` | Catálogo: PLA preto, resina, pó, consumível |
| `material_spools` | Bobina individual: código, status, peso bruto, tara, lote, local |
| `spool_movements` | Movimentos imutáveis: compra, impressão, ajuste, reserva, liberação, descarte |
| `material_reservations` | Reserva parcial por job/bobina |
| `finished_goods_stock` | Saldo manual de produtos prontos por variação |
| `finished_goods_movements` | Ledger imutável de ajustes de acabados |

### 10.6 Produção

| Tabela | Função |
|---|---|
| `production_orders` | OP por item de pedido: quantidade, prioridade, prazo, status |
| `production_jobs` | Job: impressora, bobina, previsto × real, peças boas/defeituosas |
| `production_job_requests` | Chave de idempotência para criação de job |
| `job_failures` | Falha: causa, consumo, custo, operador |
| `printers` | Impressoras (fora do fluxo atual) |
| `maintenance_plans` | Planos preventivos por horas (fora do fluxo atual) |
| `maintenance_logs` | Registros de manutenção (fora do fluxo atual) |

### 10.7 Expedição e financeiro

| Tabela | Função |
|---|---|
| `order_shipments` | Expedição: transportadora, rastreio, custo, envio, entrega |
| `order_payments` | Recebimentos parciais com idempotência |
| `operational_expenses` | Despesas operacionais por categoria e competência |

### 10.8 IA

| Tabela | Função |
|---|---|
| `ai_usage_events` | Consumo de requisições, tokens e custo por usuário/tenant |

### 10.9 RPCs principais

**Pedido e produção**

- `create_sales_order`, `update_sales_order`, `delete_sales_order`
- `release_order_to_production`
- `create_production_job`, `create_production_job_once`
- `start_next_production_job`, `start_production_job`
- `complete_production_job`, `fail_production_job`, `cancel_queued_production_job`
- `ship_order`, `deliver_order`

**Materiais e estoque**

- `receive_spool`, `adjust_spool_weight`, `set_spool_available_quantity`
- `set_finished_goods_quantity`

**Financeiro e relatórios**

- `record_order_payment`, `record_operational_expense`
- `get_operational_report`, `get_dashboard_summary`, `get_finance_summary`
- `list_sales_orders_page`

**Plataforma**

- `provision_tenant_with_owner`
- `platform_update_tenant`, `platform_set_module`
- `platform_assign_tenant_user`, `platform_update_tenant_user`

**IA**

- `claim_ai_request`, `finalize_ai_request`

**Catálogo**

- `create_product_with_default_variant`
- `create_production_recipe`

> **Estruturas apenas conceituais:** `licenses`, `role_permissions`, `job_cost_components`, `custom_css` e `tenant_memberships` aparecem em documentos de arquitetura, mas não existem nas migrations atuais. `DATABASE.md` não deve ser usado como schema executável.

### 10.10 Storage

| Bucket | Conteúdo | Acesso |
|---|---|---|
| `forja-branding` | Logos e imagens de marca do tenant | Leitura pública necessária para login/tema |
| `forja-products` | Imagens de produtos | Privado, URL assinada |
| `forja-designs` | Arquivos 3D | Privado, URL assinada |

Paths seguem `tenants/{tenant_id}/{resource}/{uuid}/{filename}`. O upload é feito pelo client autenticado diretamente no bucket, com limite de tamanho e MIME definidos no bucket e validação no formulário; a leitura usa URL pública para branding e URL assinada para produtos e arquivos 3D. Não há quota de Storage por tenant.

### 10.11 Índices e convenções

- IDs `uuid default gen_random_uuid()`.
- Timestamps `timestamptz default now()`.
- Índice composto `(tenant_id, ...)` em toda tabela quente.
- Números sequenciais por tenant (`unique (tenant_id, number)`).
- Valores monetários em **centavos inteiros** (`*_cents`), nunca ponto flutuante.
- Status padronizados em enums/domínios compartilhados.

---

## 11. Regras de negócio críticas

### 11.1 Preço, custo e margem

```text
base = material + machine_overhead + energy + labor + consumables + depreciation
risk = base × risk_pct
total_cost = base + risk
price = total_cost ÷ (1 - margin_pct - fees_pct)
```

- Rejeitar `margin_pct + fees_pct >= 100%`.
- Margem é o modo canônico; markup é derivado.
- Snapshot imutável ao aprovar orçamento/pedido.
- Alterações posteriores criam revisão, não sobrescrevem o histórico.
- O mesmo snapshot deve produzir o mesmo preço no futuro.
- `machine` representa manutenção e overhead por hora; energia e depreciação são componentes separados.
- Arredondamento e conversão `pt-BR` → centavos acontecem no servidor.

### 11.2 Snapshot da venda

No momento da venda, o item do pedido congela:

- variante;
- preço;
- custo previsto;
- revisão/modelo (quando existir);
- versão da receita;
- material;
- gramas e minutos previstos.

Produto sem receita continua vendável. Ao planejar o job, a interface pede o que faltar.

### 11.3 Idempotência

- Criação de job usa chave por tenant/OP.
- Início, conclusão, falha e cancelamento rejeitam repetição de estado.
- Recebimentos e despesas usam `idempotency_key`.
- Dupla submissão não duplica consumo, horas, auditoria ou peças boas.
- Retentativas de integração seguirão chave de idempotência e backoff.

### 11.4 Pipeline derivada

- Não existe coluna `pipeline_stage` editável.
- A etapa da OP é calculada a partir dos jobs e da quantidade boa.
- "Concluído" não pode existir com peças faltando.
- "Imprimindo" não pode existir sem job iniciado.
- Um movimento recusado mantém o card na origem e explica o motivo.
- A mesma ação está disponível por clique/teclado, não só por drag-and-drop.

### 11.5 Capacidade e concorrência

- Reservas não podem exceder os gramas disponíveis.
- Início de job exige impressora livre e reserva ativa (quando há impressora).
- Conclusão grava tempo, consumo, peças, custo, horas da máquina e movimentos na mesma transação.
- Cancelamento libera reservas.
- Falha libera ou consome a reserva conforme o uso registrado.
- Saldo projetado deve reconciliar com o ledger.

### 11.6 Um usuário, um tenant

No MVP, um usuário pertence a um tenant. Acesso a múltiplos tenants exigiria `tenant_memberships` e troca explícita de contexto, o que ainda não está implementado.

---

## 12. Assistente IA

### 12.1 Como funciona

- Rota: `/assistente`.
- Endpoint: `/api/assistant`.
- Modelo padrão: `gpt-5.4-mini` (`OPENAI_MODEL`).
- Chave `OPENAI_API_KEY` somente no servidor.
- O agente consulta os dados pelo cliente Supabase autenticado, com `tenant_id`, RLS, módulos e permissões do usuário.
- Não recebe chave de serviço.
- **Não executa alterações** no negócio: apenas leitura e resposta.
- Cada resposta factual passa por consultas controladas no servidor.
- Custos, margens e contatos continuam limitados pelas permissões do perfil.

### 12.2 Cotas e proteção

Variáveis:

- `AI_USER_REQUESTS_PER_MINUTE=10`
- `AI_IP_REQUESTS_PER_MINUTE=30`
- `AI_TENANT_REQUESTS_PER_DAY=200`
- `AI_TENANT_TOKENS_PER_DAY=500000`
- `AI_TENANT_BUDGET_USD_PER_DAY=10`
- `OPENAI_INPUT_COST_PER_1M_USD=0.75`
- `OPENAI_OUTPUT_COST_PER_1M_USD=4.5`
- `AI_RATE_LIMIT_SALT`

O RPC `claim_ai_request` reserva cota antes da chamada; `finalize_ai_request` grava tokens e custo reais. Eventos ficam em `ai_usage_events`.

### 12.3 Exemplos de perguntas suportadas

- "Por que minha margem caiu?"
- "Quanto vendi este mês?"
- "Quais pedidos estão atrasados?"
- "Qual material está acabando?"
- "Quanto há em bobinas reservadas?"
- "Quais produtos vendem mais?"

### 12.4 Divergência documental

O código habilita o módulo `ai` nos planos **Start, Pro e Business**. O `PRD.md` e o `MVP-ROADMAP.md` classificam IA como fase 3/Business, e o `MONETIZACAO.md` não a lista explicitamente no Start. **Alinhar oferta comercial e feature flag antes de vender.**

---

## 13. Design system e identidade visual

### 13.1 Direção

Interface de operação industrial: precisa, discreta e rápida de ler. A informação tem prioridade sobre decoração. Densidade compacta (14 px base), tema escuro como padrão e tema claro disponível.

- Tema escuro padrão; claro salvo no cookie `agencia3d-theme`.
- Marca, logo e cores do tenant aparecem dentro do espaço de trabalho.
- Cores de status têm significados fixos.
- Sora para títulos e KPIs; Inter para interface; JetBrains Mono para códigos e medidas.
- Lucide para ícones; nenhum emoji como ícone.
- Movimento de 150–250 ms; respeita `prefers-reduced-motion`.

### 13.2 Paleta escura

| Token | Hex | Uso |
|---|---|---|
| `--brand-primary` | `#FF5A1F` | Laranja filamento — ação principal, marca |
| `--brand-accent` | `#FFB25A` | Âmbar — gradientes, destaques |
| `--bg` | `#0E1013` | Fundo escuro |
| `--bg-surface` | `#1A1D23` | Cards, painéis |
| `--bg-elevated` | `#242832` | Modais, popovers |
| `--bg-inset` | `#101216` | Campos de entrada |
| `--text-primary` | `#F4F5F7` | Texto principal |
| `--text-muted` | `#9BA1AB` | Texto secundário |
| `--line` | `#30343C` | Divisórias |
| `--line-strong` | `#454A54` | Bordas de controle |
| `--success` | `#3DDC84` | Aprovado, máquina livre, OK |
| `--warning` | `#FFC53D` | Atenção, estoque baixo |
| `--danger` | `#FF4D4D` | Falha, ruptura, atraso |
| `--info` | `#4DA3FF` | Informativo, em produção |

### 13.3 Tema claro

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#F4F5F7` | Fundo da aplicação |
| `--bg-surface` | `#FFFFFF` | Cards e painéis |
| `--bg-elevated` | `#EEF0F3` | Popovers e áreas elevadas |
| `--bg-inset` | `#F8F9FA` | Campos de entrada |
| `--text-primary` | `#17191D` | Texto principal |
| `--text-muted` | `#535A64` | Texto secundário |
| `--line` | `#D9DDE3` | Divisórias e bordas |
| `--line-strong` | `#ABB3BF` | Bordas de controle |

No tema claro, os estados semânticos têm variantes próprias (`success #167344`, `warning #946100`, `danger #BD2929`, `info #1764A0`). `--brand-accent-text` adapta o destaque para leitura.

### 13.4 Tipografia e escala

| Uso | Fonte | Fallback |
|---|---|---|
| Títulos / KPIs | **Sora** (700/600) | system-ui |
| Corpo / UI | **Inter** (400/500/600) | system-ui |
| Dados técnicos, SKU, bobina, horas | **JetBrains Mono** | monospace |

Escala: 12 / 14 / 16 / 20 / 24 / 32 / 48. Números de dashboard em Sora Bold com `tabular-nums`.

### 13.5 Tokens

```css
:root {
  --brand-primary: #FF5A1F;     /* sobrescrito por tenant */
  --brand-secondary: #1A1D23;
  --brand-accent: #FFB25A;
  --radius: 10px;
  --font-heading: 'Sora', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

Arquitetura: **primitivo → semântico → componente**. Componentes consomem papéis (`primary`, `surface`, `muted`, `danger`, `focus`), nunca hexadecimais espalhados.

### 13.6 Padrões de UI

- **Kanban** é a linguagem do produto: cards densos, drag-and-drop, badges semânticas.
- **Previsto × Real** é a assinatura visual: valores planejados e realizados juntos, com unidade, contexto e delta.
- **Painel da fábrica:** grid de impressoras estilo torre de controle para TV (planejado).
- **Status:** texto + cor; cor sozinha nunca comunica estado.
- **Formulário:** rótulo visível, ajuda próxima, erro junto da causa, confirmação após salvar.
- **Lista/tabela:** valores alinhados, filtro próximo aos resultados, rolagem dentro do contêiner em telas pequenas.
- **Estado vazio:** explica a próxima ação.
- **Erro:** identifica o que falhou e como recuperar.

### 13.7 Acessibilidade

- Contraste mínimo de 4,5:1 para texto normal.
- Foco visível; teclado percorre e aciona todos os controles.
- Alvos de toque de pelo menos 44 × 44 px em mobile.
- Sem rolagem horizontal da página em 375 px.
- Revisão em 375, 768, 1280 e 1920 px.
- Tema, status e marca legíveis em todas as combinações.

### 13.8 shadcn/Watermelon

- shadcn/ui estilo `base-nova` com Base UI é a base funcional editável.
- Watermelon UI é repertório opcional via registry `@watermelon` em `apps/web/components.json`.
- Cada componente importado deve ser revisado por acessibilidade, dependências, responsividade e custo de renderização.
- Não instalar dashboards inteiros só para herdar aparência.

---

## 14. Planos, preços e monetização

### 14.1 Princípio

Não competir com SaaS de R$ 49/mês. Vender **software como ativo**: "o sistema da sua empresa".

```text
Licença ≠ Hospedagem ≠ Manutenção → 3 decisões, 3 receitas
```

### 14.2 Planos

| | **Start** | **Pro** | **Business** |
|---|---|---|---|
| Licença | **R$ 1.497** (única) | sob proposta | sob proposta |
| Clientes, produtos e pedidos | ● | ● | ● |
| Materiais, bobinas, produção e entrega | ● | ● | ● |
| Financeiro e relatórios essenciais | ● | ● | ● |
| Marca, usuários e permissões | ● | ● | ● |
| Domínio próprio | — | — | ● |
| Funcionalidades futuras/integrações | sob orçamento | sob orçamento | sob orçamento |

**Não fazem parte da licença Start atual:** modelos 3D, receitas, QR Code, planner, portal do cliente, multiunidade e integrações. Só entram em proposta com escopo, prazo e aceite específicos.

### 14.3 Care

**R$ 99/mês** — hospedagem, backup diário, monitoramento, atualizações, suporte, correções e recuperação de dados.

Vendido como **conveniência**, nunca como obrigação. Sem Care, o cliente pode exportar dados e hospedar por conta.

### 14.4 Catálogo de serviços

| Serviço | Faixa |
|---|---|
| Implantação assistida (importação + configuração + marca) | R$ 497–997 |
| Integração simples (WhatsApp, marketplace) | R$ 500–1.500 |
| Integração ERP (Bling, Omie) | R$ 1.500–3.000 |
| Relatório/dashboard customizado | R$ 300–800 |
| Automação específica | R$ 500–2.000 |
| Treinamento da equipe (2h, remoto) | R$ 397 |
| Módulo exclusivo | sob orçamento |

**Regra:** customização vira config/feature flag no core sempre que possível — nunca fork. Se dois clientes pedem a mesma customização, ela vira módulo do produto.

### 14.5 Argumento de venda

```text
Concorrente SaaS: R$ 59/mês × 5 anos = R$ 3.540 (e nunca é seu)
Sua Empresa 3D Start: R$ 1.497 único + R$ 99/mês opcional
```

> "Você não aluga mais uma ferramenta. Você compra o sistema da sua empresa, com a sua marca."

### 14.6 Plano de monetização rápida (0–6 meses)

**Objetivo original:** primeira receita na semana 8 e R$ 30 mil em 6 meses.

| Fase | Ação |
|---|---|
| Semana 1–4 | Landing page + lista de espera; mapear 50 print farms/bureaus; oferta de fundador (Start R$ 997 para os 10 primeiros) |
| Semana 5–8 | 3 pilotos gratuitos com 5+ impressoras, feedback semanal e permissão de case |
| Mês 3–4 | Lançamento do MVP a R$ 1.497; venda direta consultiva com demo de 30 min |
| Mês 5–6 | Push de conversão para Care (meta 60%); planos Pro/Business; primeiras customizações pagas |

**Metas numéricas originais:**

| Marco | Clientes | Licenças | Care (MRR) | Acumulado |
|---|---|---|---|---|
| Mês 2 (pré-venda) | 5 | R$ 4.985 | — | R$ 5 mil |
| Mês 4 | 15 | R$ 21 mil | R$ 990 | R$ 27 mil |
| Mês 6 | 30 | R$ 45 mil | R$ 1.980 | R$ 50 mil |
| Mês 12 | 80–100 | R$ 140–170 mil | R$ 6–8 mil | R$ 200+ mil |

> As metas são referência histórica do plano; não há depoimentos ou resultados de clientes documentados.

### 14.7 Unit economics

- Custo de infraestrutura por tenant: **R$ 8–15/mês** no modelo compartilhado → Care com margem de ~85%.
- CAC alvo: **< R$ 400** (venda direta + conteúdo orgânico) → payback imediato na licença.
- LTV: **R$ 1.497 + 24 meses de Care × 60% de adesão ≈ R$ 2.900**, sem customizações.
- MRR de Care cobre a infraestrutura a partir de ~15 clientes; licenças e serviços são lucro/reinvestimento.

### 14.8 Motores futuros

1. Marketplace de módulos e relatórios premium.
2. Revenda/parceiros (agências e consultorias, comissão de 20–30%).
3. Enterprise: deploy dedicado + SSO + QMS (R$ 2–5 mil/mês).
4. Relatórios de mercado com dados anonimizados e consentidos.

### 14.9 Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Licença única sem recorrência suficiente | Care + customizações + upgrades; meta de 60% de adesão |
| Suporte consumir margem | Onboarding assíncrono, base de conhecimento, Care pago, comunidade |
| Cliente querer "tudo customizado" | Catálogo de serviços com preços fechados; customização vira módulo do core |
| Concorrente copiar white label | Velocidade de nicho: custo previsto × real, planner e passaporte exigem profundidade de domínio |

---

## 15. Mercado e concorrência

### 15.1 Mapa do mercado

| Concorrente | Foco | Forte em | Lacuna explorada |
|---|---|---|---|
| **SimplyPrint** | Gestão de impressoras/farm | Monitoramento, fila, bobinas, secagem | Não é ERP comercial; sem white label |
| **3DPrinterOS** | Cloud de impressão | Farms grandes, educacional/empresarial | Sem CRM/financeiro; não focado em PME brasileira |
| **DigiFabster** | Orçamento automático + checkout | Análise CAD, quoting, workflow comercial | Pouco chão de fábrica |
| **Materialise CO-AM** | MES industrial | Scheduling, qualidade, rastreabilidade | Enterprise/caríssimo |
| **Authentise** | Workflow industrial | Processo ponta a ponta, smart factory | Complexidade enterprise |
| **AMFG** | MES para AM | Automação e planejamento industrial | Inacessível para pequenas empresas |
| **PrintDash** | Gestão de impressão BR | Adaptação ao Brasil, simplicidade | Sem white label, PCP, manutenção, rastreabilidade |
| **3D Print Flow** | Operação BR | Organização e custos | Compete em preço mensal, não em produto próprio |
| **My3D Farm** | Print farm BR | Simplicidade, pequeno negócio | Sem CRM, PCP, domínio customizado, automações |

### 15.2 Conclusão

O mercado resolve **partes**: gestão de impressora, precificação, filamento, orçamento, MES industrial, ERP genérico. Ninguém entrega, para a PME brasileira:

```text
CRM + Orçamento + Pedidos + PCP + Print Farm + Materiais +
Máquinas + Manutenção + Qualidade + Financeiro operacional +
Relatórios + WHITE LABEL com licença própria
```

### 15.3 Posicionamento

**Nunca:** "ERP de impressão 3D" (genérico, comparável por preço).

**Sempre:**

> "Tenha o sistema da sua empresa de impressão 3D."  
> "Pare de organizar sua print farm em planilhas."  
> "CRM, pedidos, produção, filamentos, impressoras e financeiro — em um sistema com a marca da sua empresa."

### 15.4 Defesa competitiva

- Velocidade de profundidade no nicho (previsto × real, planner, passaporte).
- Cada customização paga vira módulo do core.
- Comunidade: clientes viram vendedores (cases + indicação).

---

## 16. Roadmap

### 16.1 Fase 1 — MVP vendável

**Meta original:** 12–16 semanas.

| Semana | Entrega |
|---|---|
| 1–2 | Fundação: monorepo, auth, tenants, RLS, domínio, branding, RBAC, audit log |
| 3–4 | Clientes, produtos/variações, modelos/revisões e upload |
| 5–6 | Pedidos diretos: cliente, produto, quantidade, preço/custo congelados |
| 7–8 | Materiais, bobinas, movimentações e estoque comprometido |
| 9–10 | Produção: OPs, jobs, fila Kanban, previsto × real, falhas |
| 11–12 | Conexão produção ↔ materiais ↔ estoque de prontos |
| 13–14 | Dashboard e relatórios essenciais |
| 15–16 | Console admin, domínios customizados, seed demo, hardening e testes multi-tenant |

**Critério de pronto:** uma print farm real opera duas semanas inteiras só no sistema, sem planilha paralela, e paga a licença.

**MVP inclui:** login, multi-tenant, white label, usuários/permissões, dashboard, clientes, pedidos diretos, produtos, materiais, estoque, OPs, jobs, falhas e relatórios.

**MVP exclui propositalmente:** QR Code, portal do cliente, integrações, IA, planner, multiunidade e fiscal.

> A implementação avançou além do roadmap original em alguns pontos (IA, domínios customizados, multi-item), mas várias exclusões continuam fora.

### 16.2 Fase 2 — Crescimento

Após 5–10 clientes pagantes:

- QR Code de bobinas (scanner mobile);
- previsão de estoque + reposição recomendada;
- estoque de acabados com reserva automática;
- fornecedores + compras + histórico de preços;
- planner inteligente + planejamento noturno;
- portal do cliente (Business);
- integrações Mercado Livre, Shopee, Nuvemshop, WhatsApp;
- OctoPrint + Moonraker (telemetria, progresso, controle);
- notificações, API pública + webhooks;
- multiunidade.

### 16.3 Fase 3 — Expansão

- Visualizador 3D + análise automática de arquivos.
- Orçamentos e negociação para operações que precisem vender antes do pedido.
- Orçamento automático a partir de upload STL.
- Qualidade avançada / QMS / CAPA / passaporte da peça.
- IA operacional (margem, compras, produção, manutenção).
- Scheduling avançado, OEE, telemetria.
- Enterprise: deploy dedicado, SSO, audit log avançado.

### 16.4 Roadmap de receita paralelo

| Marco | Ação comercial |
|---|---|
| Semana 8 (alpha) | 3 print farms piloto gratuitas em troca de feedback semanal |
| Semana 16 (MVP) | Primeiras 5 licenças Start com desconto de fundador (R$ 997) |
| Mês 5 | Preço cheio R$ 1.497 + Care R$ 99/mês |
| Mês 6–8 | Planos Pro/Business + catálogo de customizações |
| Mês 9+ | Integrações pagas + marketplace de templates/módulos |

---

## 17. Estrutura do repositório

### 17.1 Workspace

```text
C:\Projects\whiteLabel3dAgency\
├── Agencia 3d/              # PROJETO CANÔNICO — usar para desenvolvimento
│   ├── apps/web/            # App Next.js (tenant-facing + /admin)
│   ├── packages/db/         # Tipos TypeScript do banco
│   ├── supabase/            # config, migrations, seed, tests
│   ├── scripts/             # provisionamento, backup, benchmark, release
│   ├── assets/              # Logo e imagens
│   ├── design-system/       # Documentação do design system
│   ├── .github/workflows/   # CI e production health
│   └── *.md                 # Documentação do produto
├── forja-legacy/            # Cópia antiga — NÃO USAR
├── forja/supabase/          # Resíduo antigo — NÃO USAR
├── leads-impressao-3d-*.xlsx/csv  # Materiais de prospecção
├── *.png                    # Capturas de tela auxiliares
└── AGENTS.md                # Diretrizes do repositório
```

> **Atenção:** `forja-legacy/` é uma cópia antiga. O desenvolvimento, os testes e o deploy usam exclusivamente `Agencia 3d/`.

### 17.2 Monorepo dentro de `Agencia 3d/`

```text
Agencia 3d/
├── apps/
│   └── web/
│       ├── src/app/            # rotas e Server Actions
│       ├── src/components/     # UI local
│       ├── src/lib/            # domínio, auth, tenant, IA
│       ├── e2e/                # Playwright
│       ├── scripts/            # tenant:create, demo:seed, admin:add
│       ├── public/
│       └── PRODUCT.md
├── packages/
│   └── db/
│       └── src/database.types.ts
├── supabase/
│   ├── migrations/             # 40 migrations
│   ├── tests/                  # testes SQL
│   ├── seed.sql
│   └── config.toml
├── scripts/                    # backup, bench, release, apresentação
├── assets/
├── design-system/agencia3d/MASTER.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── playwright.config.ts
├── PRODUCTION-CONFIG.example
└── .env.example
```

### 17.3 Pacotes planejados (ainda não criados)

`packages/core`, `packages/auth`, `packages/ui`, `packages/branding`, `packages/integrations`, `packages/observability`, `packages/config`, `packages/types`.

O `packages/db` atual exporta apenas tipos (`@agencia3d/db/types`); não há client/repositório compartilhado.

---

## 18. Setup, comandos e ambientes

### 18.1 Pré-requisitos

- **Node.js** ≥ 20.19.0
- **pnpm** ≥ 10.12.0 (o projeto fixa `pnpm@10.12.0`)
- **Docker Desktop** ativo (Supabase local)
- **Supabase CLI** (instalada como devDependency)

### 18.2 Primeira execução

```powershell
cd "C:\Projects\whiteLabel3dAgency\Agencia 3d"
pnpm install
Copy-Item .env.example .env.local   # se ainda não existir
pnpm db:start
pnpm db:reset
pnpm dev
```

O app sobe em `http://127.0.0.1:3000` por padrão. O host do tenant precisa estar registrado em `tenant_domains` e apontar para a porta configurada em `AGENCIA3D_APP_URL` (o exemplo usa `http://demo.localhost:3000`; o seed demo documenta `demo.localhost:3005`).

### 18.3 Criar tenant e owner

```powershell
pnpm tenant:create -- --name "Estúdio Exemplo" --slug exemplo --owner-name "Ana Silva" --owner-email ana@example.com
```

O host padrão será `exemplo.localhost`. Se o provisionamento for interrompido, repita o comando para retomá-lo (idempotente).

### 18.4 Popular demonstração

```powershell
pnpm demo:seed
```

Cria a empresa **Sua Empresa 3D Demo** com clientes, produtos, materiais, pedidos, jobs, recebimentos e despesas de 30 dias. Imprime a senha local ao concluir. Acesso: `http://demo.localhost:3005/login` (ou a porta de `AGENCIA3D_APP_URL`).

### 18.5 Criar administrador da plataforma

```powershell
pnpm platform:admin:add -- --name "Admin Sua Empresa 3D" --email admin@example.com
```

O convite abre no host configurado em `AGENCIA3D_ADMIN_HOST` (`admin.localhost:3000` no exemplo).

### 18.6 Comandos principais

| Comando | Função |
|---|---|
| `pnpm dev` | Sobe o app em modo desenvolvimento via Turborepo |
| `pnpm build` | Build de todas as aplicações/pacotes |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript estrito |
| `pnpm test` | Vitest (unitários e integração) |
| `pnpm test:e2e` | Playwright |
| `pnpm db:start` | Inicia Supabase local |
| `pnpm db:stop` | Para Supabase local |
| `pnpm db:reset` | Recria banco e aplica seed |
| `pnpm db:diff` | Diff de schema |
| `pnpm db:types` | Gera tipos TypeScript do banco |
| `pnpm tenant:create` | Provisiona tenant + owner |
| `pnpm demo:seed` | Popula demonstração de 30 dias |
| `pnpm platform:admin:add` | Cria admin da plataforma |
| `pnpm bench:navigation` | Mede rotas com Playwright |
| `pnpm release:check` | Valida configuração mínima de produção |
| `pnpm backup:database` | Gera dump lógico |
| `pnpm backup:verify` | Valida o backup mais recente |
| `pnpm format` / `format:check` | Prettier |

### 18.7 Ambiente local do Supabase

| Serviço | Porta |
|---|---|
| API | 55421 |
| Banco | 55422 |
| Studio | 55423 |
| Inbucket (e-mail) | 55424 |

Configuração em `supabase/config.toml`:

- `project_id = "forja-local"` (legado);
- PostgreSQL 17;
- `site_url = "http://demo.localhost:3005"`;
- signup desabilitado no Auth principal;
- analytics desabilitado.

### 18.8 Playwright

- `baseURL`: `http://127.0.0.1:3007`;
- `webServer`: `pnpm --filter @agencia3d/web dev:e2e`;
- workers: 1; execução não paralela;
- trace/screenshot/vídeo em falha;
- setup/teardown criam e removem tenant temporário;
- nunca escrever na demo.

### 18.9 Benchmark de navegação

```powershell
$env:AGENCIA3D_BENCH_EMAIL = "conta@exemplo.com"
$env:AGENCIA3D_BENCH_PASSWORD = "senha-da-conta"
pnpm bench:navigation -- --base-url http://127.0.0.1:3000 --runs 3 --output .tmp/performance-dev.json
```

Mede `visibleMs`, `ttfbMs` e `rscMs` em `/dashboard`, `/pedidos`, `/clientes` e `/materiais`. Números de `next dev` incluem compilação e não representam latência de produção.

**Amostra local de 08/10/2026 (97 pedidos):**

| Rota | TTFB | Navegação completa |
|---|---:|---:|
| Dashboard | 217 ms | 629 ms |
| Pedidos | 680 ms | 1.679 ms |
| Clientes | 198 ms | 849 ms |
| Materiais | 214 ms | 773 ms |

---

## 19. Variáveis de ambiente

> Nunca commitar `.env.local` nem valores reais. Use `.env.example` e `PRODUCTION-CONFIG.example` como referência.

| Variável | Finalidade | Exposição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable | Pública |
| `SUPABASE_SECRET_KEY` | Chave secreta para provisionamento/backup | **Servidor** |
| `NEXT_PUBLIC_APP_BASE_DOMAIN` | Domínio base dos subdomínios | Pública |
| `AGENCIA3D_APP_URL` | URL do app do tenant | Servidor |
| `AGENCIA3D_ADMIN_HOST` | Host do console admin | Servidor |
| `NEXT_PUBLIC_DEMO_URL` | URL da demo comercial | Pública |
| `NEXT_PUBLIC_SALES_CONTACT_URL` | URL do CTA comercial | Pública |
| `CLOUDFLARE_API_TOKEN` | Token Cloudflare for SaaS | **Servidor** |
| `CLOUDFLARE_ZONE_ID` | Zona Cloudflare | **Servidor** |
| `CLOUDFLARE_SAAS_CNAME_TARGET` | CNAME de destino dos clientes | **Servidor** |
| `SUPABASE_DB_URL` | Conexão direta para dump | **Servidor** |
| `APP_VERSION` | Versão exibida no health check | Servidor |
| `OPENAI_API_KEY` | Chave da OpenAI | **Servidor** |
| `OPENAI_MODEL` | Modelo (default `gpt-5.4-mini`) | Servidor |
| `AI_RATE_LIMIT_SALT` | Salt do rate limit de IA | **Servidor** |
| `AI_USER_REQUESTS_PER_MINUTE` | Limite por usuário | Servidor |
| `AI_IP_REQUESTS_PER_MINUTE` | Limite por IP | Servidor |
| `AI_TENANT_REQUESTS_PER_DAY` | Limite diário por tenant | Servidor |
| `AI_TENANT_TOKENS_PER_DAY` | Limite de tokens por tenant | Servidor |
| `AI_TENANT_BUDGET_USD_PER_DAY` | Orçamento diário de IA | Servidor |
| `OPENAI_INPUT_COST_PER_1M_USD` | Custo de entrada | Servidor |
| `OPENAI_OUTPUT_COST_PER_1M_USD` | Custo de saída | Servidor |
| `AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN` | Auto-login da demo local | **Apenas dev** |
| `AGENCIA3D_BACKUP_DIR` | Diretório do dump | Servidor |
| `AGENCIA3D_BENCH_EMAIL` / `PASSWORD` | Credenciais do benchmark | Local |
| `PRODUCTION_HEALTH_URL` | URL do health check no GitHub | **Secret do GitHub** |

**Checklist de produção (`pnpm release:check`):** exige Supabase URL/keys, domínio base, app URL, admin host, Cloudflare token/zona/CNAME e rejeita placeholders, `localhost`, `127.0.0.1` e auto-login de demo.

---

## 20. Testes, CI/CD e qualidade

### 20.1 Estratégia

| Camada | Ferramenta | Cobertura |
|---|---|---|
| Unitários | Vitest | Pricing, carga de produção, progresso, relatórios, contexto de tenant, IA |
| Banco | SQL no Supabase local | RLS, isolamento, transições, pedidos, produção |
| E2E | Playwright | Jornadas reais no navegador |
| Componentes | Testing Library (previsto) | Acessibilidade, estados, branding |
| Contrato | Previsto | Repositories, adapters, webhooks |
| Segurança | SQL + E2E (parcial) | Isolamento entre tenants (SQL/E2E), bloqueio de rota por papel (E2E), exportação autenticada (E2E); escalada de role, IDOR e upload ainda sem cobertura dedicada |
| Recuperação | Manual/documentado | Restore de backup |

### 20.2 Testes unitários existentes

- `lib/pricing.test.ts`
- `lib/production-load.test.ts`
- `lib/production-progress.test.ts`
- `lib/reports.test.ts`
- `lib/tenant/context.test.ts`
- `lib/ai/limits.test.ts`
- `lib/ai/schemas.test.ts`

### 20.3 Testes SQL

- `supabase/tests/tenant_isolation.test.sql`
- `supabase/tests/orders-production-flow.sql`
- `supabase/tests/order-crud-smoke.sql`

O plano registra **36 testes de banco** passando após `pnpm db:reset` com `npx supabase test db --local supabase/tests`. A migration de funil/leads ainda não tem teste SQL dedicado.

### 20.4 E2E existentes

- `auth-and-tenant-isolation.spec.ts`
- `catalog-data.spec.ts`
- `finance-dashboard-reports.spec.ts`
- `materials-and-printers.spec.ts`
- `order-production-journey.spec.ts`
- `orders-crud-and-table.spec.ts`
- `workspace-settings.spec.ts`

**Cenários P0 previstos no plano:** login, isolamento de tenant, produto → pedido, CRUD de pedidos, status, produção vinculada, produção parcial/falha, estoque/bobinas, financeiro/painel, papéis.

**Pendente:** confirmar a cobertura real de cada P0, ampliar P1/P2 (cadastros de apoio, tabelas, relatórios, feedback, configuração, acessibilidade, mobile) e manter fixtures independentes.

### 20.5 CI

Workflow `.github/workflows/ci.yml`, rodando em `Agencia 3d/`:

1. checkout;
2. Node 22;
3. `corepack enable`;
4. `pnpm install --frozen-lockfile`;
5. `pnpm lint`;
6. `pnpm typecheck`;
7. `pnpm test`;
8. `pnpm build`;
9. `pnpm db:start`;
10. `pnpm db:reset`;
11. `pnpm exec supabase test db`;
12. configuração das credenciais locais;
13. instalação do Chromium;
14. `pnpm test:e2e`;
15. upload do relatório Playwright e artefatos de falha.

### 20.6 Qualidade de release

Promoção para produção exige:

- migration expand/contract compatível com a versão anterior;
- plano de rollback da aplicação e roll-forward do banco;
- secrets e feature flags revisados;
- changelog e suporte informados;
- smoke test de login, tenant, pedido, job e admin;
- monitoramento de erros, latência, filas e webhooks após deploy.

Nunca fazer rename/drop de coluna usada pela versão atual no mesmo deploy. Primeiro expandir, migrar/backfill, ler o novo campo e só depois remover o antigo.

### 20.7 Definition of Done

Uma tarefa só está concluída quando:

- comportamento e critérios de aceite foram cumpridos;
- tenant, módulo, licença e permissão são validados no servidor;
- migrations, constraints, índices e RLS existem quando aplicável;
- erros são acionáveis em pt-BR e não vazam detalhes internos;
- auditoria e eventos foram adicionados às ações sensíveis;
- loading, vazio, erro, read-only, mobile e acessibilidade foram tratados;
- testes adequados passam e o fluxo foi demonstrado com seed;
- documentação e telemetria foram atualizadas;
- não existe regra por slug/cliente nem cor hard-coded.

---

## 21. Operação de produção

### 21.1 Objetivos do Care

| Item | Valor |
|---|---|
| RPO do banco | até 24 horas no plano padrão |
| RTO inicial | até 8 horas úteis, sujeito ao provedor |
| Monitoramento | `GET /api/health` a cada 5 minutos; alertar após 2 falhas consecutivas |
| Incidentes | registrar início, tenants afetados, mitigação, restauração e encerramento |

PITR pode reduzir o RPO, mas exige plano compatível no Supabase. Os valores comerciais definitivos devem constar no contrato.

### 21.2 Preparação do ambiente

1. Projetos Supabase separados para preview, staging e produção.
2. Variáveis de `PRODUCTION-CONFIG.example` configuradas no provedor; nunca copiar `.env.local`.
3. `pnpm release:check` no ambiente de release.
4. `AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN` ausente em produção.
5. URLs de redirect de cada subdomínio/domínio configuradas no Supabase.
6. Token Cloudflare restrito à zona e à permissão `SSL and Certificates Write`.
7. Secret `PRODUCTION_HEALTH_URL` no GitHub com a URL completa de `/api/health`.
8. Workflow `Production health` roda a cada 5 minutos.

### 21.3 Backup

Projetos pagos do Supabase oferecem backups diários do banco, mas **não** incluem objetos do Storage. Além do backup gerenciado:

1. Agendar `pnpm backup:database` diariamente com `SUPABASE_DB_URL` e `AGENCIA3D_BACKUP_DIR` em volume protegido.
2. Agendar `pnpm backup:verify` após o dump.
3. Copiar o dump para armazenamento externo criptografado com retenção mínima de 30 dias.
4. Copiar separadamente os buckets `forja-branding`, `forja-products` e `forja-designs`, preservando os paths.
5. Nunca manter backups com dados reais no repositório.

### 21.4 Ensaio de restauração

Mensalmente, em um projeto Supabase vazio e isolado:

1. Pausar integrações e notificações do destino.
2. Restaurar o dump lógico.
3. Repor os objetos do Storage e conferir as políticas dos buckets.
4. Configurar chaves e URLs exclusivas do ensaio.
5. Validar login, tenant, pedido, produção, entrega, financeiro e exportação.
6. Registrar duração, perda máxima, falhas e correções; apagar o ambiente conforme a política interna.

Uma restauração de produção exige janela comunicada porque o projeto fica indisponível durante o procedimento.

### 21.5 Domínios próprios

O console `/admin` cria o Custom Hostname na Cloudflare e mostra o CNAME e o TXT necessários. O domínio só passa a `active` quando hostname e certificado SSL estão ativos no provedor. Usar **Verificar DNS e SSL** depois que o cliente publicar os registros.

### 21.6 Liberação de cliente

- Termos, proposta e responsáveis pelo tratamento de dados aceitos.
- Owner recebeu e concluiu o convite.
- Marca e usuários revisados em `/configuracoes`.
- Backup recente verificado e monitor em `/api/health` ativo.
- Roteiro de aceite realizado com dados do tenant.
- Canal e horário de suporte informados.

---

## 22. Limitações conhecidas e próximos passos

### 22.1 Gates antes de produção

| Item | Estado | Ação |
|---|---|---|
| Piloto real de 2 semanas | Pendente | Operar com 3 empresas e corrigir bloqueadores |
| Ensaio de backup/restore | Pendente | Executar e documentar RPO/RTO reais |
| Realtime por tenant | Pendente | Implementar ou assumir revalidação por Server Actions |
| Cobertura E2E P1/P2 | Parcial | Ampliar fixtures e cenários |
| Atribuição/aviso de leads | Parcial | Responsável e fila implementados no admin; faltam notificação e SLA |
| Medição do funil comercial | Parcial | Eventos de LP e contagens no admin implementados; faltam taxas de conversão, análise por canal e atribuição de receita |
| Testemunhos/cases | Pendente | Só publicar com autorização e fonte |

### 22.2 Divergências documentais a corrigir

1. **Navegação descrita no README** — o texto cita "Visão geral, Comercial, Produção, Produtos, Estoque, Gestão e Configurações", mas omite o Assistente IA e chama o grupo Catálogo de "Produtos". A navegação renderizada é: Visão geral, Assistente IA, Comercial, Produção, Catálogo, Estoque, Gestão e Configurações.
2. **Manutenção** — o README diz que planos e registros estão em `/manutencao`; a rota retorna 404.
3. **Impressoras** — o README menciona impressoras; a rota retorna 404 e o módulo `printers` não aparece no app nem na navegação, embora o banco ainda o inclua nos defaults de plano.
4. **Orçamentos "somente leitura"** — o README diz que propostas são apenas histórico; a rota `/orcamentos` ainda permite criar/transicionar por URL.
5. **IA no plano** — o código do app habilita `ai` no Start; o banco só a considera padrão no Business; PRD/MVP-ROADMAP a colocam na fase 3.
6. **Defaults de módulos** — `lib/tenant/modules.ts` e `private.has_tenant_module` divergem para `ai`, `printers` e `maintenance`.
7. **Alertas acionáveis** — o `PLANO-INTEGRACAO` prevê alertas ("Precisa da sua atenção") para pedido parado, falha pendente, máquina ocupada e bobina insuficiente, mas o dashboard atual não possui mecanismo de alertas; há apenas indicadores, fluxo e atividades.
8. **CI e E2E** — o `PLANO-TESTES-E2E-PLAYWRIGHT.md` afirma que o CI não executa E2E; o workflow atual executa.
9. **Metadados** — `layout.tsx` ainda usa a descrição "Do orçamento à peça entregue", enquanto a tagline vigente é "Do pedido à peça entregue".
10. **`DATABASE.md` conceitual** — descreve `licenses`, `role_permissions`, `custom_css`, `job_cost_components` etc. com detalhes que não correspondem exatamente às migrations; a fonte executável é `supabase/migrations/`.

### 22.3 Dívidas técnicas e funcionais

- `packages/db` exporta apenas tipos; não há repositórios/queries compartilhadas.
- `packages/core`, `ui`, `branding`, `auth`, `integrations` e `observability` não existem.
- `apps/admin` e `apps/portal` não existem; o admin está dentro de `apps/web`.
- Sem Realtime, filas, outbox ou integrações.
- Sem motor de alertas acionáveis (ruptura, atraso, falha recorrente, margem).
- Sem estoque automático de acabados; saldo manual.
- Sem quota de Storage por tenant; os buckets têm limite de tamanho e MIME por arquivo.
- Sem etapa independente de qualidade/pós-processamento.
- Sem multiunidade, QR Code, planner, API pública ou SSO.
- Sem emissão fiscal.
- Sem testes de componentes/contrato.
- `forja-legacy/` e `forja/` ainda ocupam espaço no workspace e podem confundir buscas.
- A árvore de trabalho tem alterações não commitadas de LP, apresentação, funil e leads.

### 22.4 Próximos passos recomendados

1. **Fechar a verdade comercial:** alinhar LP, proposta, README e feature flags (IA, impressora, manutenção, orçamento).
2. **Rodar o piloto:** 3 print farms, 2 semanas, sem planilha paralela.
3. **Ensaiar restore:** documentar RPO/RTO e corrigir o runbook.
4. **Ampliar E2E:** P1/P2, dois tenants, papéis e licença suspensa.
5. **Fechar a operação de leads:** SLA de resposta, notificação e cadência de follow-up.
6. **Analisar o funil:** taxas de conversão, origem, custo por canal e atribuição de receita.
7. **Evoluir o core:** extrair `packages/core` para pricing, custos, reservas e planejamento.
8. **Realtime e portal** somente depois de validar o fluxo com clientes pagantes.

---

## 23. Índice da documentação

| Arquivo | Conteúdo | Estado |
|---|---|---|
| `PROJETO.md` | Documento consolidado: visão, status, arquitetura, dados, operação e roadmap (este arquivo) | Atualizado em 28/10/2026 |
| `README.md` | Visão geral, decisões-chave, stack e mapa da documentação | Atual, com trechos defasados |
| `ESTRUTURA.md` | Árvore do monorepo, módulos e convenções | Visão-alvo; implementação parcial |
| `ARQUITETURA.md` | Stack, multi-tenancy, RLS, feature flags, domínios, segurança | Atualizado para o fluxo atual |
| `DATABASE.md` | Schema PostgreSQL conceitual, RLS, enums e índices | Conceitual; prevalecem as migrations |
| `PRD.md` | Requisitos funcionais por módulo | Visão de produto; alguns itens futuros |
| `MVP-ROADMAP.md` | Escopo do MVP, fases 2 e 3, critérios de pronto | Atual, com exclusões já superadas |
| `PERMISSIONS.md` | Papéis, catálogo de permissões e matriz | Atual |
| `IDENTIDADE-VISUAL.md` | Brand book: nome, logo, paleta, tipografia, tokens, tom de voz | Atual |
| `MONETIZACAO.md` | Receita, planos, serviços, unit economics, GTM | Atual |
| `COMPETIDORES.md` | Análise competitiva e posicionamento | Atual |
| `GUIA-DE-IMPLEMENTACAO.md` | Plano consolidado, ordem de execução, aceite e operação | Atual, com jornadas antigas |
| `PLANO-INTEGRACAO-PONTA-A-PONTA.md` | Gaps, contrato de estados e resultado da integração | Registro histórico da execução |
| `PLANO-FRONTEND.md` | Evolução visual, tokens, shadcn/Watermelon e critérios | Executado; validação autenticada pendente |
| `PLANO-TESTES-E2E-PLAYWRIGHT.md` | Cobertura E2E, infraestrutura e matriz de cenários | Plano; parcialmente implementado |
| `PLANO-TELA-PRODUTOS.md` | Plano da tela de Produtos (imagem, preço, custo) | Executado |
| `PLANO-LP-COPY-PRODUTO.md` | Diagnóstico e plano da LP, copy e jornada comercial | Execução visual de 28/10/2026 |
| `ANALISE-SIMPLIFICACAO-UX.md` | Revisão de UX e próximas decisões | Hipóteses a validar |
| `PERFORMANCE.md` | Medição de navegação e amostra local | Atual |
| `OPERACAO-PRODUCAO.md` | Care, backups, restore, domínios e liberação | Atual |
| `ROTEIRO-APRESENTACAO-COMERCIAL.md` | Roteiro de 15–20 min, perguntas e objeções | Atual |
| `apps/web/PRODUCT.md` | Brief do produto para design/UI | Atual |
| `design-system/agencia3d/MASTER.md` | Tokens e padrões implementados | Atual |
| `AGENTS.md` (raiz) | Diretrizes de repositório, estilo e segurança | Atual |

---

## 24. Materiais comerciais e contato

### 24.1 Arquivos

| Arquivo | Uso |
|---|---|
| `apresentacao-comercial.html` | Apresentação navegável (←/→, F para tela cheia, P para PDF) |
| `apresentacao-comercial.pdf` | Versão pronta para envio/impressão |
| `ROTEIRO-APRESENTACAO-COMERCIAL.md` | Fala slide a slide, descoberta e objeções |
| `PLANO-LP-COPY-PRODUTO.md` | Diagnóstico e plano de copy da LP |
| `assets/agencia3d-logo.png` | Símbolo da plataforma |
| `assets/production-status-polished.png` | Captura usada na comunicação |
| `leads-impressao-3d-*.xlsx/csv` (raiz) | Listas de prospecção |

### 24.2 Contato comercial

- **Telefone/WhatsApp:** +55 11 97581-1215
- **E-mail:** joaovtcentrone@gmail.com

### 24.3 Pitch de uma frase

> **Sua Empresa 3D:** o sistema da sua empresa de impressão 3D — do pedido à peça entregue, com a sua marca.

---

*Este documento consolida informações de 28/10/2026. Para decisões que evoluírem, atualize o documento especializado correspondente e este consolidado na mesma alteração.*
