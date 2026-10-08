# PERMISSIONS.md — Papéis e permissões (RBAC)

## Papéis padrão

| Papel | Escopo | Uso típico |
|---|---|---|
| `owner` | Tudo, inclusive licença e exclusão de dados | Dono da empresa cliente |
| `admin` | Tudo exceto billing/licença | Sócio, gerente geral |
| `sales` | CRM, orçamentos, pedidos, clientes | Vendedor |
| `production` | OPs, jobs, fila, planejamento, qualidade | PCP / líder de produção |
| `operator` | Fila, jobs, status de impressora, registrar falhas | Operador de chão de fábrica |
| `stock` | Materiais, bobinas, movimentações, compras | Almoxarifado |
| `finance` | Financeiro, margens, relatórios financeiros | Financeiro |
| `viewer` | Somente leitura (sem custos/margens por padrão) | Contador, investidor |

## Catálogo de permissões

```text
# Comercial
crm.view / crm.edit
quotes.view / quotes.create / quotes.approve / quotes.discount
orders.view / orders.create / orders.cancel

# Catálogo
catalog.view / catalog.edit
designs.view / designs.edit / designs.delete

# Produção
production.view / production.plan / production.start / production.cancel
printers.view / printers.edit / printers.control
maintenance.view / maintenance.manage
quality.view / quality.inspect

# Materiais
stock.view / stock.adjust / stock.purchase / stock.discard
suppliers.view / suppliers.edit

# Financeiro
finance.view / finance.edit
costs.view              ← separado: ver custo real ≠ ver financeiro
margins.view

# Relatórios
reports.view / reports.export

# Administração
users.manage
settings.manage
branding.manage
modules.manage          ← feature flags (admin Agencia 3D + owner)
license.view
```

## Matriz padrão (● = permitido)

| Permissão | owner | admin | sales | production | operator | stock | finance | viewer |
|---|---|---|---|---|---|---|---|---|
| quotes.approve | ● | ● | ● | | | | | |
| quotes.discount | ● | ● | ○¹ | | | | | |
| production.start | ● | ● | | ● | ● | | | |
| production.plan | ● | ● | | ● | | | | |
| printers.control | ● | ● | | ● | ● | | | |
| stock.adjust | ● | ● | | | ●² | ● | | |
| finance.view | ● | ● | | | | | ● | |
| costs.view | ● | ● | ○¹ | ● | | | ● | |
| margins.view | ● | ● | | | | | ● | |
| users.manage | ● | ● | | | | | | |
| settings.manage | ● | ● | | | | | | |
| branding.manage | ● | ● | | | | | | |

¹ Configurável por tenant (tabela `role_permissions`).
² Operador pode apenas baixar material de job (consumo), não ajuste livre.

## Regras técnicas

1. Toda Server Action começa com `requirePermission('x.y')` — server-side, nunca só na UI.
2. UI esconde o que não é permitido, mas a segurança real está no servidor + RLS.
3. Overrides por tenant em `role_permissions` (ex.: permitir desconto para vendedor sênior).
4. Toda ação sensível (aprovar orçamento, ajuste de estoque, cancelar OP, editar financeiro) grava `audit_log` com antes/depois.
5. O admin interno da Agencia 3D (app `admin`) usa roles próprios da plataforma, separados dos roles de tenant — suporte nunca vê dados financeiros do tenant sem autorização registrada.
