# Agencia 3D — Plataforma White Label de Gestão para Impressão 3D

> **Do pedido à peça entregue, toda a operação da sua empresa 3D em um sistema com a sua marca.**

Este repositório documenta e implementa a Agencia 3D: uma plataforma white label de operação para empresas de impressão 3D, com ERP e PCP/MES.

Cada empresa cliente roda o mesmo core, mas enxerga exclusivamente a própria marca, domínio, cores, usuários e dados.

---

## Índice da documentação

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Visão geral, decisões-chave e mapa da documentação (este arquivo) |
| `ESTRUTURA.md` | Árvore completa do monorepo, módulos e convenções de código |
| `ARQUITETURA.md` | Stack técnica, multi-tenancy, RLS, feature flags, domínios customizados, segurança |
| `DATABASE.md` | Schema PostgreSQL completo com RLS policies, enums e índices |
| `PRD.md` | Requisitos funcionais por módulo (pedidos, produção, materiais, etc.) |
| `MVP-ROADMAP.md` | Escopo do MVP, fases 2 e 3, critérios de pronto |
| `PERMISSIONS.md` | Papéis (RBAC), matriz de permissões e escopos |
| `IDENTIDADE-VISUAL.md` | Brand book: nome, logo, paleta, tipografia, tokens de design, tom de voz |
| `MONETIZACAO.md` | Modelo de receita, precificação, plano de monetização rápida, unit economics, GTM |
| `COMPETIDORES.md` | Análise competitiva e posicionamento |
| `GUIA-DE-IMPLEMENTACAO.md` | Plano consolidado, ordem de execução, critérios de aceite e operação |
| `PLANO-INTEGRACAO-PONTA-A-PONTA.md` | Gaps atuais e sequência para integrar o fluxo de venda, produção, entrega e financeiro |
| `PLANO-TESTES-E2E-PLAYWRIGHT.md` | Cobertura E2E proposta para os fluxos da aplicação com Playwright e seu MCP |
| `assets/agencia3d-logo.png` | Símbolo da plataforma |

---

## As 10 decisões-chave (não negociáveis)

1. **Um único core.** Nunca um repositório ou fork por cliente. Customização = configuração, branding, feature flags, módulos, permissões, plugins e integrações.
2. **Multi-tenancy desde o primeiro commit.** `tenant_id` em todas as tabelas + Row Level Security. Nunca adicionar depois.
3. **White label é o produto.** O cliente compra "o sistema da minha empresa", não "mais um SaaS".
4. **Licença ≠ Hospedagem ≠ Manutenção.** Três linhas de receita separadas.
5. **Modelo 3D ≠ Produto.** Um STL é uma peça; um produto tem SKU, preço, variação e receita de produção.
6. **Pedido ≠ Ordem de Produção ≠ Job.** Pedido #183 (100 chaveiros) → OP #932 → 4 jobs de 25 unidades em impressoras diferentes.
7. **Bobina é indivíduo, não estoque agregado.** Cada bobina tem ID, peso atual, status e QR Code.
8. **Custo previsto × custo real** e **lucro por hora de máquina** são os KPIs diferenciadores.
9. **Fiscal fica fora.** NF-e, tributação e contábil são delegados a Bling/Omie via integração.
10. **IA só onde resolve problema real** (margem, compras, produção, manutenção). Sem chatbot genérico.

---

## Stack resumida

| Camada | Escolha |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Next.js Server Actions / Route Handlers + tRPC-like contracts |
| Banco | PostgreSQL (Supabase) com Row Level Security |
| Auth | Supabase Auth + RBAC próprio |
| Storage | Supabase Storage (MVP) → Cloudflare R2 (escala) |
| Domínios customizados | Cloudflare for SaaS (SSL automático) |
| Deploy | Vercel (app) + Supabase (dados) |
| Filas/jobs assíncronos | Supabase Edge Functions + pg_cron (MVP) → Inngest (escala) |

Detalhes em `ARQUITETURA.md`.

---

## Fundação de desenvolvimento

O monorepo e o primeiro recorte de autenticação e isolamento por tenant estão em `apps/web`, `packages/db` e `supabase/`.
Os comandos locais são:

```bash
pnpm install
pnpm db:start
pnpm db:reset
pnpm dev
```

Copie `.env.example` para `.env.local` antes de iniciar o app. Com Supabase local ativo, crie um tenant e convide seu owner com `pnpm tenant:create -- --name "Estúdio Exemplo" --slug exemplo --owner-name "Ana Silva" --owner-email ana@example.com`. O host padrão será `exemplo.localhost`. Se o provisionamento for interrompido, repita o comando para retomá-lo. Migrations versionadas em `supabase/migrations/` são a fonte do schema. Consulte `GUIA-DE-IMPLEMENTACAO.md` para a sequência completa.

Para popular o Supabase local com uma operação de demonstração de 30 dias, execute `pnpm demo:seed`. O script cria a empresa `Agencia 3D Demo`, 48 clientes, 12 produtos com receitas, 4 materiais, 10 impressoras, 96 pedidos em vários estados, jobs reais de produção, recebimentos e despesas. Ele imprime a senha local gerada ao concluir. A URL de acesso é `http://demo.localhost:3005/login`; se a porta do app for outra, use a porta configurada em `AGENCIA3D_APP_URL`. Executar novamente não duplica o conjunto: gera uma nova senha e informa os dados já existentes.

---

O app `apps/web` já inclui Tailwind CSS v4 e shadcn/ui. A configuração fica em `apps/web/components.json`, os componentes instalados em `apps/web/src/components/` e os tokens de tema em `apps/web/src/app/globals.css`. O registry Watermelon UI está configurado como `@watermelon`; para adicionar outros componentes, execute `pnpm dlx shadcn@latest add @watermelon/<nome>` em `apps/web`. O pacote compartilhado `packages/ui` descrito em `ESTRUTURA.md` continua sendo a organização planejada para a evolução do design system.

A navegação autenticada mostra Visão geral, Pedidos, Operação, Catálogo e Gestão. Clientes fica em Configurações porque é um cadastro de apoio ao pedido. Cada item respeita módulo e permissão; grupos com uma única tela visível viram links diretos. No celular, o menu fecha após escolher uma página.

## Implementação disponível

### Contrato integrado do MVP

O fluxo principal começa na venda confirmada: pedido → OP por item → jobs com reserva de material → conclusão ou falha e replanejamento → quantidade boa suficiente → expedição → entrega. Orçamento é opcional. A pipeline é derivada dos jobs e da quantidade aprovada; status de pedido só muda pelos comandos de produção, expedição e entrega.

O produto pode ser vendido sem receita. A receita versionada e o preço do material ficam congelados no pedido/job; estimativas ausentes são pedidas ao planejar. O MVP não controla estoque de acabados nem uma etapa separada de pós-processamento/qualidade: o operador informa peças boas e defeituosas ao concluir o job.

O dashboard e os relatórios distinguem margem prevista de recebimentos e custos reais de material. Períodos usam America/Sao_Paulo; Materiais separa peso físico, reservado e disponível. Testes executáveis de banco estão em `supabase/tests` e devem passar após `pnpm db:reset` com `npx supabase test db --local supabase/tests`.

O fluxo de venda começa em /pedidos: o usuário escolhe cliente, produto e quantidade. A lista abre os detalhes em um painel lateral, no mesmo padrão de Produtos. Pedidos diretos e abertos podem ser editados; o preço e o custo são recalculados com os valores atuais do produto. O proprietário ou administrador pode excluir um pedido aberto. Produção, recebimento e expedição bloqueiam edição e exclusão para preservar o histórico. O módulo de propostas permanece apenas para leitura do histórico, sem fazer parte do fluxo do MVP.

Materiais, bobinas individuais e impressoras têm cadastro em /materiais e /impressoras. Recebimentos e ajustes de bobina gravam movimentos imutáveis com peso bruto, tara, ator e motivo.

Pedidos abertos podem ser enviados à produção mesmo sem receita. A liberação cria ordens vinculadas aos itens. Cada job reserva material; sua conclusão registra consumo e peças boas/defeituosas. Só a quantidade boa necessária muda o pedido para “Pronto para envio”. Pedidos e Produção mostram o mesmo progresso e têm links entre si.

Planos e registros de manutenção por horas de uso estão em /manutencao. O prazo é recalculado após cada serviço.

Pedidos prontos podem ser expedidos e marcados como entregues; recebimentos parciais e despesas operacionais são registrados em /financeiro com trilha de auditoria.

O painel da operação destaca a próxima ação, mostra vendas, custo previsto e margem estimada pela data local do pedido, recebimentos pela data do pagamento e despesas pela data de ocorrência. Materiais separa peso físico, reservado e disponível. Os dados continuam filtrados por tenant, módulo e permissão. /relatorios agrega os mesmos fatos por período em America/Sao_Paulo; custo de material usa o preço congelado no job.

A marca do tenant pode ser configurada em /configuracoes/marca. Nome, cores e logo aparecem também na tela de login do subdomínio.

Owners e administradores gerenciam convites, papéis e acessos em /configuracoes/usuarios. A chave de serviço fica exclusivamente no servidor e cada alteração é registrada em auditoria.

O console interno em /admin exige uma conta de plataforma e o host AGENCIA3D_ADMIN_HOST. Ele provisiona tenants, gerencia plano, licença e módulos, e registra domínios próprios como pendentes de verificação.

Após aplicar as migrations, crie o primeiro administrador com pnpm platform:admin:add -- --name "Admin Agencia 3D" --email admin@example.com. O convite abre no host configurado em AGENCIA3D_ADMIN_HOST.

Receitas versionadas em /catalogo/receitas ligam variações, revisões 3D e materiais. Pedidos diretos usam o preço e custo da variação escolhida; a receita continua sendo usada quando o pedido é liberado para produção.

A base inclui provisionamento de tenant e owner, contexto de plano/licença/módulos, CRM em `/clientes`, produtos e variantes em `/catalogo/produtos`, e biblioteca de modelos com revisões e arquivos 3D privados em `/catalogo/modelos`. Os formatos aceitos são STL, 3MF, STEP, STP, OBJ e GCODE, limitados a 100 MB por arquivo. Leitura e gravação usam RLS; gravações respeitam papel, módulo e suspensão da licença. A aplicação das migrations e validação entre tenants requerem Docker Desktop ativo.

`pnpm db:types` gera `packages/db/src/database.generated.types.ts` para comparação com os tipos provisórios em `database.types.ts`; a migração para tipos gerados depende da primeira aplicação validada do schema.

## Fluxo central do produto

```text
Cliente + produto + quantidade → Pedido confirmado → OP por item
→ Job com bobina e impressora → conclusão ou falha/replanejamento
→ peças boas suficientes → Pronto para envio → expedição → entrega
→ recebimentos e despesas → dashboard e relatório
```

O MVP não mantém estoque de produtos acabados nem uma etapa independente de pós-processamento/qualidade. O operador registra unidades boas e defeituosas ao concluir o job; peças faltantes podem voltar ao planejamento. Orçamento é opcional e não é pré-requisito do pedido.

## Estratégia comercial em 1 parágrafo

Licença única de R$ 1.497–4.997 (percepção de "meu próprio software") + plano Care de R$ 99/mês (hospedagem, backup, suporte) + customizações e integrações sob orçamento. 100 clientes ≈ R$ 150 mil de licenças + ~R$ 10 mil/mês de recorrência. Detalhes e plano de monetização rápida em `MONETIZACAO.md`.
