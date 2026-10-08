# Guia Definitivo de Implementação da Agencia 3D

Este documento transforma a visão, o PRD, a arquitetura, o schema, as permissões, a identidade e o roadmap em um plano único de execução. Ele cobre o produto completo, mas preserva a ordem comercial: primeiro um MVP vendável, depois crescimento e expansão.

## 1. Resultado esperado

### Regra atual do MVP

O produto já implementado começa na venda confirmada: cliente, produto e quantidade. Orçamento e oportunidade não são pré-requisitos. Estoque de acabados, pós-processamento e qualidade independente ficam para uma fase futura. O contrato vigente de estados, snapshots, reservas, financeiro e testes de aceite está em `PLANO-INTEGRACAO-PONTA-A-PONTA.md`; ele prevalece sobre as jornadas antigas de orçamento deste guia.

A Agencia 3D será um sistema multi-tenant para empresas de impressão 3D, com três interfaces:

- `apps/web`: operação white label do tenant;
- `apps/admin`: console interno da Agencia 3D;
- `apps/portal`: portal do cliente final, liberado no Business.

O fluxo principal deve funcionar sem planilhas paralelas:

```text
Lead → oportunidade → orçamento → pedido → ordem de produção → job
→ consumo de material → qualidade → produto acabado → expedição
→ recebimento → indicadores
```

O primeiro critério de sucesso é uma print farm real operar durante duas semanas apenas na Agencia 3D. O critério do produto completo é o fluxo acima, integrações e rastreabilidade funcionarem com segurança, auditoria e métricas em produção.

## 2. Decisões consolidadas

Estas decisões resolvem divergências entre os documentos e devem orientar código, banco e oferta comercial.

1. **Um core, vários tenants.** Nunca criar fork, branch ou regra por cliente. Variações entram como configuração, permissão, feature flag ou adapter.
2. **Um usuário pertence a um tenant no MVP.** Acesso a múltiplos tenants exige `tenant_memberships` e troca explícita de contexto antes de ser liberado.
3. **Start opera o fluxo básico completo.** Inclui CRM, orçamento, pedido, catálogo, materiais, impressoras, OPs e jobs manuais. Pro libera manutenção, qualidade avançada, QR Code, custos reais, planner e relatórios avançados. Business libera portal, API, integrações, IA, multiunidade e remoção do “Powered by”.
4. **Subdomínio está em todos os planos.** Domínio próprio é Business ou adicional pago. O mecanismo administrativo de domínio será criado no MVP, mas a liberação respeita o plano.
5. **Financeiro do MVP é operacional.** Pedidos, pagamentos simples, despesas e margem; emissão fiscal permanece no Bling/Omie.
6. **Custos não podem ser duplicados.** `machine` representa manutenção e overhead por hora; energia e depreciação são componentes separados.
7. **Margem é o modo canônico de preço.** Markup pode ser exibido, mas é derivado. Valores monetários são calculados com decimal ou centavos inteiros, nunca `number` de ponto flutuante.
8. **Migrations são a fonte do schema.** O SQL de `DATABASE.md` é um modelo inicial, não deve ser copiado integralmente sem os ajustes deste guia.
9. **Tokens são o white label inicial.** CSS arbitrário fica desabilitado até existir sanitização rigorosa. Logo, favicon, fontes e cores cobrem o MVP.
10. **Toda mudança de estado é uma operação de domínio.** A UI não atualiza status diretamente; chama serviços transacionais que validam transição, permissão, tenant e invariantes.

## 3. Arquitetura alvo

Use pnpm workspaces com Turborepo, TypeScript em modo estrito e Next.js App Router. Crie a estrutura definida em `ESTRUTURA.md`, acrescentando:

```text
project-root/
├── apps/{web,admin,portal}
├── packages/
│   ├── core/          # regras puras, sem Next.js ou Supabase
│   ├── db/            # client, queries, migrations e tipos gerados
│   ├── auth/          # sessão, tenant e RBAC
│   ├── ui/            # componentes e tokens
│   ├── branding/      # resolução e aplicação do tema
│   ├── integrations/  # adapters externos
│   ├── observability/ # logs, erros e métricas
│   ├── config/        # ESLint, TypeScript e Tailwind
│   └── types/
├── supabase/{migrations,seed.sql,config.toml}
├── tests/e2e/
└── docs/
```

As aplicações podem orquestrar casos de uso, mas regras de preço, custo, estoque, planejamento, manutenção e rastreabilidade ficam em `packages/core`. O pacote `db` não exporta um client irrestrito para componentes; exporta repositórios ou queries orientadas a caso de uso.

### Fluxo obrigatório de cada requisição

```text
host → tenant ativo → sessão → usuário ativo → licença/módulo
→ permissão → validação Zod → serviço de domínio → transação/RLS
→ auditoria/outbox → resposta tipada
```

Centralize isso em `getTenantContext()`, `requireSession()`, `requirePermission()` e `requireModule()`. Nunca confie em `tenant_id`, role, preço ou custo enviados pelo navegador.

## 4. Fundação do repositório

### 4.1 Bootstrap

Na primeira etapa, crie e versione:

- `package.json` com `packageManager`, engines e scripts raiz;
- `pnpm-workspace.yaml` e `turbo.json`;
- configurações compartilhadas de TypeScript, ESLint, Prettier e Tailwind;
- `.env.example`, sem segredos ou IDs reais;
- hooks de commit apenas se forem rápidos e reproduzíveis;
- CI para lint, tipos, testes, migrations e build.

Os scripts raiz devem formar este contrato:

```bash
pnpm dev             # web e serviços locais
pnpm build           # build de todas as aplicações/pacotes
pnpm lint            # análise estática
pnpm typecheck       # TypeScript estrito
pnpm test            # testes unitários e de integração
pnpm test:e2e        # jornadas críticas no navegador
pnpm db:start        # Supabase local
pnpm db:reset        # recria banco e aplica seed
pnpm db:types        # regenera tipos do PostgreSQL
```

Fixe versões no lockfile e atualize por PR dedicado. Não use imports profundos entre pacotes; cada pacote expõe sua API em `exports`.

### 4.2 Ambientes

Mantenha `local`, `preview`, `staging` e `production` isolados, com projetos Supabase, buckets, chaves, domínios e webhooks próprios. Preview nunca acessa dados de produção. Variáveis públicas usam apenas o prefixo exigido pelo framework; service role, chaves de pagamentos e credenciais de integrações permanecem exclusivamente no servidor.

## 5. Banco de dados e segurança por tenant

### 5.1 Ordem das migrations

Crie migrations pequenas, reversíveis quando possível e nesta ordem:

1. extensões, schemas `platform`, `app` e `private`, funções utilitárias;
2. tenants, planos, licenças, Care, domínios, branding e módulos;
3. profiles, papéis, permissões, convites e audit log;
4. clientes e contatos;
5. modelos, revisões, arquivos, produtos, variantes e receitas;
6. oportunidades, orçamentos, itens, pedidos e itens;
7. fornecedores, materiais, bobinas, reservas e movimentos;
8. impressoras e manutenção;
9. OPs, jobs, falhas, custos e qualidade;
10. estoque de acabados, expedição, pagamentos e despesas;
11. multiunidade, integrações, API keys, webhooks e outbox;
12. views de relatório, índices, jobs agendados e seeds.

### 5.2 Ajustes obrigatórios ao schema inicial

Antes de implementar telas, corrija estes pontos de `DATABASE.md`:

- qualifique tabelas de plataforma com schema e adicione FKs de `tenant_id`;
- use `unique (tenant_id, number)` e um contador transacional por tenant para orçamentos, pedidos, OPs e jobs;
- adicione FKs hoje implícitas (`price_table_id`, `supplier_id`, `branch_id`, produtos e revisões);
- crie `material_reservations`; reserva parcial não pode depender do status global da bobina;
- defina peso da bobina como **peso bruto medido** e imponha `current_weight_g >= spool_tare_g`; peso utilizável é bruto menos tara;
- crie ledger para estoque de produto acabado; `stock_qty` e `reserved_qty` podem ser projeções, não a única fonte histórica;
- armazene breakdown previsto e real em `job_cost_components`, com tipo, quantidade, taxa e valor;
- versione receitas de produção e grave snapshots de preço/custo em orçamento, pedido e job;
- separe licença perpétua de assinatura Care; atraso no Care não suspende a licença;
- crie `integration_connections`, `webhook_events`, `idempotency_keys` e `outbox_events`;
- acrescente `created_by`, `updated_at` e soft delete onde histórico ou auditoria exigem;
- padronize status em enums ou domínios compartilhados, evitando texto livre.

### 5.3 RLS executável

Não dependa de um `current_setting('app.tenant_id')` sem definir como ele chega a cada conexão. No Supabase do MVP, derive o tenant do usuário autenticado por uma função `security definer` no schema `private`, com `search_path` fixo, que consulta o profile ativo. A policy compara esse tenant ao `tenant_id` da linha.

Para cada tabela de negócio, teste `select`, `insert`, `update` e `delete` com:

- usuário do mesmo tenant;
- usuário de outro tenant;
- usuário inativo;
- usuário anônimo;
- service role apenas em job interno autorizado.

O app admin não recebe acesso irrestrito ao banco do tenant. Ações de suporte exigem motivo, escopo, expiração e registro de impersonation. Toda função `security definer` fixa `search_path`, revoga execução pública e recebe testes próprios.

### 5.4 Storage

Use paths `tenants/{tenant_id}/{resource}/{uuid}/{filename}`. Upload ocorre por URL assinada, com validação de tamanho, extensão, MIME real e quota. Metadados só são persistidos depois do upload confirmado. Download também valida tenant e permissão. Arquivos de modelos não são públicos.

## 6. Identidade, acesso e administração

Implemente primeiro o onboarding transacional:

1. operador Agencia 3D cria tenant e plano;
2. sistema reserva slug e subdomínio;
3. cria branding padrão, módulos e papéis;
4. envia convite ao owner;
5. owner conclui cadastro e entra no tenant correto;
6. falha em qualquer passo permite retomada idempotente.

RBAC usa o catálogo de `PERMISSIONS.md` como base e overrides por tenant. Permissões são verificadas no servidor; esconder botões é apenas experiência de uso. Ações sensíveis registram ator, tenant, ação, entidade, antes/depois, IP/request ID e horário.

O console interno precisa cobrir tenant, plano, licença, Care, módulos, domínios, saúde e auditoria. Contas administrativas da Agencia 3D ficam separadas das roles dos clientes.

## 7. Design system e white label

Implemente `packages/ui` antes das telas de negócio. Use os tokens, fontes e estados de `IDENTIDADE-VISUAL.md`, incluindo tema escuro padrão e tema claro. Cores semânticas de sucesso, alerta, erro e informação não mudam por tenant.

Componentes mínimos:

- shell, navegação, command menu e breadcrumbs;
- Button, Input, Select, Combobox, DatePicker, Dialog e Drawer;
- DataTable com filtros, paginação e exportação autorizada;
- Kanban acessível por mouse e teclado;
- KPI Card, Attention Card e padrão Previsto × Real;
- estados de loading, vazio, erro, read-only e sem permissão;
- uploader de arquivo, timeline de auditoria e status badge.

O tema é resolvido no servidor pelo host e injetado no primeiro HTML para evitar flash. Valide contraste, limites de tamanho e formato de logo. E-mails usam sempre a marca do tenant. O símbolo da Agencia 3D em `assets/agencia3d-logo.png` é reservado ao site, admin e “Powered by”.

## 8. Regras centrais de domínio

### 8.1 Motor de orçamento

Implemente o cálculo como função pura e versionada:

```text
base = material + machine_overhead + energy + labor + consumables + depreciation
risk = base × risk_pct
total_cost = base + risk
price = total_cost ÷ (1 - margin_pct - fees_pct)
```

Rejeite `margin_pct + fees_pct >= 100%`. Armazene entradas, versão da fórmula, componentes e arredondamentos. O vendedor pode editar entradas permitidas, mas desconto além do limite exige `quotes.discount`. Aprovação gera um snapshot imutável; alterações posteriores criam revisão.

Critérios: casos fixos de cálculo, arredondamento, quantidade, perda, risco, taxa e margem devem ter testes unitários. O mesmo snapshot deve produzir o mesmo preço no futuro.

### 8.2 Pedido e produção

Ao aprovar um orçamento, uma transação cria pedido e itens sem duplicar em reenvio. Ao liberar o pedido:

1. cria OPs por item com snapshot de receita feito na venda;
2. pede ao operador os dados técnicos que faltarem;
3. divide a quantidade ainda necessária em jobs;
4. reserva material na bobina ao planejar e ocupa a máquina ao iniciar;
5. permite cancelar job na fila, liberar reserva e replanejar falhas.

Um job só inicia se impressora, bobina, revisão e operador forem válidos. Início muda a impressora para `printing`; conclusão grava tempo, quantidade boa/defeituosa, consumo, custo, horas da máquina e movimentos de estoque na mesma transação. Cancelamento libera reservas. Retentativas usam chave de idempotência.

### 8.3 Estoque

Movimentos são imutáveis. Correção gera ajuste, nunca edição do histórico. A projeção de saldo precisa reconciliar com o ledger. Impedir saldo útil negativo, consumo superior à reserva sem permissão e uso de bobina vazia/descartada. Toda movimentação registra origem (`job`, `purchase`, `adjustment`) e ator.

### 8.4 Qualidade e rastreabilidade

No fluxo básico, o job registra aprovado, rejeitado ou retrabalho. Na fase avançada, checklist é versionado, medições usam unidade e tolerância, não conformidade abre CAPA, e o passaporte liga produto, revisão, pedido, OP, job, máquina, bobina/lote, operador e resultado.

### 8.5 Manutenção

Horas concluídas alimentam o contador da impressora. O sistema calcula próxima manutenção por plano, alerta antes do limite e bloqueia apenas quando a regra do tenant autoriza. Concluir manutenção grava horas, peças, custo, técnico, fotos e próxima ocorrência.

## 9. Sequência de implementação

Cada etapa termina com demonstração funcional, migrations, autorização, auditoria e testes do fluxo. Não abra várias etapas incompletas ao mesmo tempo.

### Etapa 0 — Contratos e protótipo navegável (semana 1)

- fechar matriz de planos, estados e fórmulas;
- definir ADRs para RLS, autenticação, números sequenciais, storage e custos;
- criar wireframes dos três fluxos críticos;
- preparar backlog por jornada, não por tabela.

**Aceite:** decisões consolidadas, navegação validada com pelo menos uma print farm e nenhuma contradição aberta que afete schema.

### Etapa 1 — Fundação multi-tenant (semanas 2–3)

- monorepo, CI, ambientes e Supabase local;
- tenant por host, auth, convite, RBAC e audit log;
- módulos, licença, modo leitura e branding;
- shell web e console admin mínimo;
- seed com tenants A/B e testes de vazamento.

**Aceite:** usuários A e B nunca acessam dados cruzados por API, UI, realtime ou storage; tenant suspenso entra em leitura; tema aparece no primeiro render.

### Etapa 2 — Cadastros e catálogo (semanas 4–5)

- clientes/contatos;
- modelos, revisões e upload;
- produtos, variantes e receita versionada;
- impressoras, materiais e bobinas;
- importação CSV com prévia, validação e relatório de erro.

**Aceite vigente:** tenant cadastra cliente e produto para vender; receita é opcional. Ao planejar, identifica o que falta para produzir e mantém a revisão/material do pedido rastreáveis.

### Etapa 3 — Comercial (semanas 6–7)

- cadastro direto de pedido com cliente, produto, quantidade, preço e custo congelados;
- CRUD de pedidos abertos e comandos auditáveis para produção, expedição e entrega;
- orçamento e conversão idempotente como fluxo opcional;
- página do cliente com histórico e “Repetir pedido”.

**Aceite vigente:** pedido direto recalcula valor ao editar ainda aberto; estado não pode saltar sem produção ou envio; reenvio não duplica job/reserva. Orçamento continua opcional e coberto por seus próprios testes.

### Etapa 4 — Materiais e reservas (semanas 8–9)

- ledger, ajustes, reserva/liberação e saldo disponível;
- recebimento de bobina e consumíveis;
- estoque comprometido;
- reconciliação e trilha de auditoria.

**Aceite:** saldo = movimentos reconciliados; duas operações concorrentes não reservam os mesmos gramas; cancelamento devolve disponibilidade.

### Etapa 5 — Produção e qualidade básica (semanas 10–12)

- geração de OPs, divisão em jobs e fila Kanban;
- execução manual, falhas e previsto × real;
- painel de fábrica com Realtime por tenant;
- registro de quantidade boa/defeituosa no job. Inspeção independente e estoque de acabados ficam fora do MVP.

**Aceite:** um pedido percorre produção até entrega, com custos e materiais rastreáveis; conexão Realtime de outro tenant não recebe eventos.

### Etapa 6 — Manutenção, financeiro e gestão (semanas 13–14)

- planos e logs de manutenção;
- pagamentos, despesas, expedição e margens;
- dashboard e alertas acionáveis;
- relatórios essenciais e exportação com permissão.

**Aceite:** dashboard explica a origem de cada KPI; lucro por hora usa custo real; alerta conduz diretamente à ação corretiva.

### Etapa 7 — Hardening e piloto (semanas 15–16)

- domínio próprio, backups, restore ensaiado e observabilidade;
- acessibilidade, responsividade, desempenho e segurança;
- tenant demo, onboarding e documentação de suporte;
- piloto com três empresas e correções de bloqueadores.

**Aceite:** operação real por duas semanas sem planilha paralela, p95 das rotas principais abaixo de 300 ms sob carga definida e recuperação testada.

### Etapa 8 — Crescimento (após 5–10 clientes pagantes)

Implemente QR Code mobile, previsão de ruptura, compras/fornecedores, planner, portal, notificações, API/webhooks, multiunidade e adapters de marketplace/impressora. Cada integração segue `connect`, `sync`, `health`, `disconnect` e `webhook`, com segredo criptografado, idempotência, retry com backoff, dead-letter e observabilidade.

**Aceite:** falha externa não corrompe estado interno; sincronização pode ser repetida; o tenant vê saúde e último sync.

### Etapa 9 — Expansão

Implemente análise/visualização 3D, orçamento por upload, QMS/CAPA, passaporte, scheduling/OEE, IA operacional e modo Enterprise dedicado. Modelos de IA recebem apenas dados autorizados do tenant, retornam evidência e sugestão, e não executam compra, mudança de job ou ação financeira sem confirmação e auditoria.

**Aceite:** respostas de IA citam os registros usados, respeitam permissões e passam por avaliação de precisão; deploy dedicado usa o mesmo código e migrations.

## 10. Rotas e jornadas de aceite

Construa cada módulo como uma fatia completa: página, serviço, autorização, banco, evento, auditoria e teste.

| Jornada | Resultado obrigatório |
|---|---|
| Criar tenant | subdomínio, owner, tema, módulos e seed transacionais |
| Aprovar orçamento | snapshot bloqueado e pedido único |
| Liberar pedido | reserva acabado/material e cria saldo de produção |
| Executar job | atualiza impressora, bobina, OP, custo e horas atomicamente |
| Registrar falha | relaciona causas e entra no custo real |
| Aprovar qualidade | libera acabado/expedição e preserva rastreabilidade |
| Receber compra | cria itens/movimentos sem saldo duplicado |
| Suspender licença | preserva dados e permite apenas leitura/exportação autorizada |
| Trocar plano | aplica módulos de forma auditável sem apagar dados |

## 11. Estratégia de testes

Use Vitest para domínio e integração, Testing Library para componentes e Playwright para jornadas. Testes de banco rodam contra Supabase local real, com migrations limpas.

Camadas mínimas:

- **unitários:** pricing, reservas, custos, transições, manutenção e permissões;
- **contrato:** repositories, adapters, webhooks e payloads públicos;
- **integração:** transações, constraints, RLS, triggers, outbox e concorrência;
- **componentes:** acessibilidade, estados e branding;
- **E2E:** onboarding, orçamento→pedido, pedido→job→entrega e admin;
- **segurança:** isolamento entre tenants, escalada de role, IDOR, upload e exports;
- **recuperação:** restore de backup e replay de eventos idempotentes.

Não persiga percentual global vazio. Exija 100% dos caminhos críticos e invariantes de domínio, com cobertura de branches no `packages/core`. Todo bug de produção ganha teste de regressão.

## 12. CI/CD e qualidade de release

Em cada PR, execute lint, tipos, unitários, integração/RLS, build e migrations em banco limpo. E2E crítico roda antes de merge ou deploy. Preview usa dados sintéticos.

Promoção para produção exige:

- migration expand/contract compatível com a versão anterior;
- plano de rollback da aplicação e roll-forward do banco;
- secrets e feature flags revisados;
- changelog e suporte informados;
- smoke test de login, tenant, orçamento, job e admin;
- monitoramento de erros, latência, filas e webhooks após deploy.

Nunca faça rename/drop de coluna usado pela versão atual no mesmo deploy. Primeiro expanda, migre/backfill, passe a ler o novo campo e só depois remova o antigo.

## 13. Observabilidade e operação

Todos os logs estruturados incluem `request_id`, `tenant_id`, `user_id`, rota e duração, sem dados pessoais ou segredos. Sentry captura exceções; PostHog mede adoção com consentimento; métricas cobrem latência, erro, banco, storage, realtime, outbox, cron e integrações.

Configure alertas para vazamento suspeito, erro de RLS, fila parada, webhook repetido, backup falho, domínio/SSL inválido, quota e p95. Backups diários e PITR só contam como prontos depois de um restore documentado. Defina RPO e RTO antes do primeiro cliente pagante.

## 14. Segurança e LGPD

- menor privilégio em banco, storage, CI e provedores;
- MFA obrigatório para administradores Agencia 3D;
- rate limit por IP, usuário e tenant;
- criptografia de credenciais de integração e rotação de chaves;
- CSP, cookies seguros, proteção CSRF e validação de redirect;
- expiração de links assinados e convites;
- exportação, correção, retenção e exclusão de dados pessoais documentadas;
- consentimento explícito antes de qualquer benchmark anonimizado;
- dependências e imagens verificadas no pipeline;
- resposta a incidente com dono, severidade, comunicação e pós-mortem.

## 15. Definition of Done

Uma tarefa só está concluída quando:

- comportamento e critérios de aceite foram cumpridos;
- tenant, módulo, licença e permissão são validados no servidor;
- migrations, constraints, índices e RLS existem quando aplicável;
- erros são acionáveis em pt-BR e não vazam detalhes internos;
- auditoria e eventos foram adicionados às ações sensíveis;
- loading, vazio, erro, read-only, mobile e acessibilidade foram tratados;
- testes adequados passam e o fluxo foi demonstrado com seed;
- documentação e telemetria foram atualizadas;
- não existe regra por slug/cliente nem cor de tenant hard-coded.

## 16. Backlog inicial executável

Comece nesta ordem:

1. registrar ADRs das dez decisões consolidadas;
2. criar monorepo, scripts e CI;
3. subir Supabase local e escrever migrations 000–003;
4. implementar contexto de tenant, auth, RLS e testes A/B;
5. criar design system e aplicação do branding no servidor;
6. entregar onboarding e console admin mínimo;
7. implementar cadastros na ordem das dependências;
8. entregar verticalmente orçamento→pedido;
9. entregar pedido→reserva→OP→job;
10. completar qualidade→acabado→expedição→financeiro;
11. adicionar dashboard, relatórios e alertas;
12. endurecer, pilotar, medir e só então abrir a fase de crescimento.

## 17. Fontes e manutenção deste guia

Este plano consolida `README.md`, `PRD.md`, `ARQUITETURA.md`, `DATABASE.md`, `ESTRUTURA.md`, `PERMISSIONS.md`, `MVP-ROADMAP.md`, `IDENTIDADE-VISUAL.md`, `MONETIZACAO.md`, `COMPETIDORES.md` e o logo oficial. Ao alterar uma decisão, atualize este guia e o documento especializado correspondente na mesma PR. Registre decisões arquiteturais duradouras em ADRs; código e migrations implementados passam a ser a fonte operacional de verdade.
