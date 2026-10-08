# ESTRUTURA.md — Monorepo e organização de código

Monorepo único (Turborepo + pnpm workspaces). **Um core, N tenants.** Proibido criar forks, branches ou pastas por cliente.

---

## Árvore completa

```text
project-root/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
│
├── apps/
│   ├── web/                          # App principal (tenant-facing)
│   │   ├── next.config.ts
│   │   ├── middleware.ts             # Resolve tenant por domínio/subdomínio
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx        # Injeta tema white label (CSS vars do tenant)
│   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── convite/
│   │   │   │   ├── (app)/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── pedidos/                # cliente, produto, quantidade e resultado
│   │   │   │   │   ├── clientes/               # cadastro de apoio ao pedido
│   │   │   │   │   ├── producao/
│   │   │   │   │   │   ├── planejamento/
│   │   │   │   │   │   ├── fila/              # Kanban Aguardando→Concluído
│   │   │   │   │   │   ├── ordens/
│   │   │   │   │   │   ├── jobs/
│   │   │   │   │   │   ├── impressoras/
│   │   │   │   │   │   ├── manutencao/
│   │   │   │   │   │   └── qualidade/
│   │   │   │   │   ├── catalogo/
│   │   │   │   │   │   ├── produtos/
│   │   │   │   │   │   ├── modelos-3d/
│   │   │   │   │   │   ├── arquivos/
│   │   │   │   │   │   └── estoque-produtos/
│   │   │   │   │   ├── materiais/
│   │   │   │   │   │   ├── filamentos/        # Bobinas individuais
│   │   │   │   │   │   ├── resinas/
│   │   │   │   │   │   ├── insumos/
│   │   │   │   │   │   ├── movimentacoes/
│   │   │   │   │   │   ├── compras/
│   │   │   │   │   │   └── fornecedores/
│   │   │   │   │   ├── financeiro/
│   │   │   │   │   │   ├── receitas/
│   │   │   │   │   │   ├── despesas/
│   │   │   │   │   │   ├── custos/
│   │   │   │   │   │   └── margens/
│   │   │   │   │   ├── relatorios/
│   │   │   │   │   ├── integracoes/
│   │   │   │   │   └── configuracoes/
│   │   │   │   │       ├── empresa/
│   │   │   │   │       ├── marca/             # White label: logo, cores, favicon
│   │   │   │   │       ├── unidades/
│   │   │   │   │       ├── usuarios/
│   │   │   │   │       ├── permissoes/
│   │   │   │   │       ├── modulos/           # Feature flags
│   │   │   │   │       └── licenca/
│   │   │   │   └── api/
│   │   │   │       ├── webhooks/
│   │   │   │       ├── v1/                    # API pública (plano Business)
│   │   │   │       └── cron/                  # previsão de estoque, manutenção
│   │   │   ├── components/             # Componentes específicos do app
│   │   │   ├── lib/
│   │   │   │   ├── tenant.ts           # getTenant() — contexto da requisição
│   │   │   │   ├── permissions.ts      # requirePermission('quotes.approve')
│   │   │   │   ├── features.ts         # isModuleEnabled('marketplaces')
│   │   │   │   └── supabase/
│   │   │   └── styles/
│   │   └── public/
│   │
│   ├── portal/                       # Portal do cliente final do tenant
│   │   └── src/app/                  # pedidos, orçamentos, arquivos, status
│   │
│   └── admin/                        # Console INTERNO da Agencia 3D (não white label)
│       └── src/app/                  # tenants, licenças, planos, feature flags,
│                                     # domínios, saúde da plataforma, billing
│
├── packages/
│   ├── core/                         # Lógica de domínio pura (sem framework)
│   │   └── src/
│   │       ├── pricing/              # Motor de orçamento (material, máquina,
│   │       │                         # energia, MO, consumíveis, depreciação,
│   │       │                         # risco, taxas, margem)
│   │       ├── planning/             # Planner: melhor máquina, planejamento noturno
│   │       ├── costing/              # Custo previsto × real, lucro/hora de máquina
│   │       ├── inventory/            # Estoque comprometido, previsão de ruptura
│   │       ├── traceability/         # Passaporte da peça
│   │       └── maintenance/          # Planos preventivos por horas de uso
│   │
│   ├── db/
│   │   ├── migrations/               # SQL versionado (ver DATABASE.md)
│   │   ├── seed/
│   │   └── src/                      # Client tipado (Supabase + RLS)
│   │
│   ├── ui/                           # Design system Agencia 3D (shadcn/ui extendido)
│   │   └── src/                      # Componentes tematizáveis via CSS vars
│   │                                 # (a marca do tenant entra aqui)
│   ├── branding/                     # Resolver de tema: logo, cores, favicon,
│   │                                 # tipografia, CSS custom do tenant
│   ├── integrations/                 # Adapters isolados (um por parceiro)
│   │   ├── octoprint/
│   │   ├── moonraker/                # Klipper
│   │   ├── mercadolivre/
│   │   ├── shopee/
│   │   ├── nuvemshop/
│   │   ├── shopify/
│   │   ├── bling/
│   │   ├── omie/
│   │   └── whatsapp/
│   │
│   ├── config/                       # eslint, tsconfig, tailwind preset
│   └── types/                        # Tipos compartilhados (domain models)
│
└── docs/                             # Esta documentação
```

---

## Módulos de produto (feature flags)

Cada módulo é ligado/desligado por tenant — é assim que se vende upgrade de plano:

```text
core, auth, tenant, branding        → sempre ON (não são vendáveis)
customers, orders, catalog, designs,
inventory, materials                → Plano Start
printers, production, maintenance,
quality, reports                    → Plano Pro
portal, api, integrations,
marketplaces, ai, multi_branch      → Plano Business
```

## Convenções

- **Nunca** `if (tenant.slug === 'empresa_x')`. Comportamento variável = config no banco.
- Todo componente de UI consome tema via CSS custom properties (`--brand-primary`, `--brand-secondary`...), nunca cor fixa.
- Toda query passa pelo client em `packages/db` com `tenant_id` injetado + RLS como rede de segurança.
- Adapters de integração em `packages/integrations` com interface comum (`connect`, `sync`, `health`) — adicionar parceiro = novo adapter, zero if no core.
- Rotas e textos de UI em pt-BR; código, tabelas e APIs em inglês.
