# ARQUITETURA.md — Arquitetura técnica e multi-tenancy

## 1. Princípio norteador

O cliente **percebe** uma instância própria ("meu sistema, minha marca, meu domínio"), mas a infraestrutura é **compartilhada**:

```text
Fase 1 (MVP → centenas de clientes)
1 app Next.js  +  1 PostgreSQL (RLS)  +  storage logicamente separado

Fase Enterprise (clientes grandes, sob demanda)
1 deploy dedicado + 1 banco dedicado + 1 storage dedicado (mesmo código)
```

O custo marginal de um novo cliente tende a zero: mesma base, mesmas migrations, mesmo roadmap.

## 2. Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| App | Next.js 15 (App Router, RSC, Server Actions) | Um time, uma linguagem, SSR + rotas de API no mesmo deploy |
| UI | Tailwind + shadcn/ui (pacote `ui` próprio) | Tema por CSS vars = white label nativo |
| Banco | PostgreSQL via Supabase | RLS madura, Auth integrado, Storage, Realtime para painel da fábrica |
| Auth | Supabase Auth (e-mail/senha, magic link, convite) + RBAC próprio | Rápido no MVP; SSO fica para fase 3 |
| Storage | Supabase Storage → Cloudflare R2 | Arquivos STL/3MF/STEP grandes saem mais baratos no R2 |
| Domínios | Cloudflare for SaaS (custom hostnames) | SSL automático para `erp.cliente.com.br` |
| Cache/edge | Cloudflare | Assets e tema do tenant servidos na borda |
| Jobs assíncronos | pg_cron + Edge Functions → Inngest | Previsão de estoque, alertas de manutenção, e-mails |
| Observabilidade | Sentry + PostHog + logs por tenant_id | Auditoria e suporte |
| Pagamentos (da Agencia 3D) | Stripe ou Asaas | Cobrar licença + assinatura Care |

## 3. Resolução de tenant (cada requisição)

```text
Requisição: erp.jota3d.com.br/dashboard
        │
        ▼
middleware.ts extrai o host
        │
        ▼
Lookup (cache em memória/edge): host → tenant
  • jota3d.agencia3d.app            (subdomínio da plataforma)
  • erp.jota3d.com.br           (custom domain via Cloudflare for SaaS)
        │
        ▼
Injeta TenantContext:
  { id, name, slug, plan, modules[], branding{logo, cores, favicon}, licenseStatus }
        │
        ▼
• Layout aplica tema (CSS vars)
• Client Supabase recebe JWT com app.tenant_id → RLS filtra tudo
• Feature flags escondem módulos fora do plano
```

Fallback: se o host não resolve tenant → página de erro branded da Agencia 3D.

## 4. Isolamento de dados

**Camadas de defesa (as duas primeiras são obrigatórias, juntas):**

1. **Row Level Security no Postgres** — toda tabela com `tenant_id` tem policy `tenant_id = current_setting('app.tenant_id')::uuid`. Mesmo com bug na aplicação, o banco nega acesso cruzado.
2. **Server-side authorization** — Server Actions sempre validam sessão, tenant e permissão (`requirePermission`) antes de tocar no banco.
3. **Storage** — paths prefixados por tenant: `tenants/{tenant_id}/designs/...`, com policies de bucket.
4. **Testes automatizados de vazamento** — suíte que tenta ler dados do tenant B autenticado como tenant A; roda no CI em toda PR.

**Enterprise:** mesmo código, variáveis apontando para banco/deploy dedicado. Sem branch especial.

## 5. Feature flags e licenças

```text
tenants ─┬─ plan (start|pro|business)
         ├─ license_status (active|past_due|suspended)
         ├─ maintenance_status (active|inactive)   ← plano Care
         └─ modules → tabela tenant_modules (module_key, enabled, enabled_at)
```

Regras:
- Plano define o **default** de módulos; admin da Agencia 3D pode ligar módulos avulsos (upsell).
- `license_status = suspended` → app entra em modo leitura com aviso; **nunca** apaga dados.
- Manutenção (Care) inativa ≠ licença inválida: o sistema continua funcionando, apenas sem atualizações/suporte/hospedagem gerenciada.

## 6. White label (branding)

Tabela `tenant_branding`: logo, logo_dark, favicon, primary_color, secondary_color, accent, font_heading, font_body, login_background, email_from_name, email_footer, custom_css (sanitizado).

- O pacote `branding` converte isso em CSS custom properties servidas no `<head>` (sem flash de tema errado).
- E-mails transacionais usam nome/logo do tenant — o cliente final nunca vê "Agencia 3D".
- Favicon por tenant via rota dinâmica.
- O único lugar onde a marca Agencia 3D aparece para o tenant: console admin interno e rodapé opcional "Powered by Agencia 3D" (removível no Business).

## 7. Domínios customizados

1. Tenant informa `erp.suaempresa.com.br` no painel.
2. Agencia 3D cria custom hostname na Cloudflare for SaaS (SSL automático).
3. Tenant aponta CNAME → validação → ativo.
4. Alternativa sem custo de DNS: `slug.agencia3d.app` (wildcard já coberto).

## 8. Integrações (arquitetura de adapters)

```text
interface IntegrationAdapter {
  connect(credentials): Promise<void>
  sync(since): Promise<SyncResult>
  health(): Promise<Status>
  webhook?(payload): Promise<void>
}
```

- **Impressoras:** começar manual (operador marca status). Fase 2: OctoPrint (REST) e Moonraker/Klipper (WebSocket) — telemetria, progresso, iniciar/pausar/cancelar.
- **Marketplaces:** pedido entra → verifica estoque → reserva → gera necessidade de produção → reserva material → cria job.
- **ERP fiscal (Bling/Omie):** exportar pedido/nota, importar status financeiro. NF-e e tributação **ficam lá**.
- **WhatsApp:** notificações de orçamento/pedido via API oficial (customização paga).

## 9. Realtime

Realtime por tenant permanece uma evolução futura. Hoje, Server Actions revalidam Pedidos, Produção, Materiais, Impressoras, Dashboard e Relatórios após comandos que alteram esses dados; a pipeline é derivada das OPs/jobs, sem coluna de etapa editável.

Os comandos de pedido e job são transacionais no PostgreSQL, verificam papel, tenant e licença, e registram auditoria. Concluir a produção muda o pedido para pronto somente quando todas as OPs atingem a quantidade boa; expedir cria `order_shipments`, entregar fecha esse registro. O schema executável e o contrato detalhado estão em `DATABASE.md` e `PLANO-INTEGRACAO-PONTA-A-PONTA.md`.

## 10. Segurança obrigatória

- RLS + RBAC + `tenant_id` (ver PERMISSIONS.md)
- Rate limiting por IP e por tenant (Cloudflare)
- Auditoria: tabela `audit_log` (quem, o quê, quando, antes/depois) em ações sensíveis
- Backups diários + PITR (Supabase) — restauração por tenant
- Validação de entrada com zod em toda Server Action e API route
- Secrets em variáveis de ambiente; nunca no bundle do cliente
- Sanitização de `custom_css` do tenant (whitelist de propriedades)

## 11. Performance e custo

- Tema do tenant cacheado na edge (lookup de host em <1ms via KV/Cache API).
- Arquivos 3D com upload direto ao storage (URLs assinadas) — não passam pelo servidor.
- Índices compostos começando por `tenant_id` em toda tabela quente (ver DATABASE.md).
- Meta: p95 < 300ms nas rotas do app; dashboard com consultas materializadas (views) para KPIs.
