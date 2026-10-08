# DATABASE.md — Schema PostgreSQL (Supabase)

Convenções:
- Toda tabela de negócio tem `tenant_id uuid not null references tenants(id)` + RLS.
- IDs `uuid default gen_random_uuid()`, timestamps `timestamptz default now()`.
- Índice composto `(tenant_id, ...)` em toda tabela quente.
- Policy padrão em todas as tabelas:

```sql
alter table <tabela> enable row level security;
create policy tenant_isolation on <tabela>
  using (tenant_id = (select private.current_tenant_id()))
  with check (tenant_id = (select private.current_tenant_id()));
```

---

## 1. Plataforma (sem tenant_id — schema `platform`)

```sql
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,                -- jota3d → jota3d.agencia3d.app
  plan text not null default 'start'        -- start | pro | business
    check (plan in ('start','pro','business')),
  license_status text not null default 'active'
    check (license_status in ('active','past_due','suspended')),
  maintenance_status text not null default 'inactive'
    check (maintenance_status in ('active','inactive')),
  trial_ends_at timestamptz,
  created_at timestamptz default now()
);

create table tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  host text not null unique,                -- erp.jota3d.com.br
  kind text not null default 'custom'       -- subdomain | custom
    check (kind in ('subdomain','custom')),
  cf_hostname_id text,                      -- Cloudflare for SaaS
  ssl_status text default 'pending',
  verified_at timestamptz
);

create table tenant_branding (
  tenant_id uuid primary key references tenants(id),
  logo_url text, logo_dark_url text, favicon_url text,
  primary_color text default '#FF5A1F',
  secondary_color text default '#1A1D23',
  accent_color text default '#FFB25A',
  font_heading text default 'Sora',
  font_body text default 'Inter',
  login_background_url text,
  email_from_name text, email_footer text,
  custom_css text,                          -- sanitizado
  powered_by_visible boolean default true
);

create table tenant_modules (
  tenant_id uuid references tenants(id),
  module_key text not null,                 -- crm, quotes, production, ai...
  enabled boolean not null default false,
  enabled_at timestamptz default now(),
  primary key (tenant_id, module_key)
);

create table licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  plan text not null,
  amount_cents int not null,                -- 149700 = R$ 1.497,00
  paid_at timestamptz,
  provider text,                            -- stripe | asaas
  provider_ref text
);
```

## 2. Identidade e acesso

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  tenant_id uuid not null references tenants(id),
  full_name text not null,
  email text not null,
  role text not null default 'viewer'
    check (role in
      ('owner','admin','sales','production','operator','stock','finance','viewer')),
  active boolean default true,
  created_at timestamptz default now(),
  unique (tenant_id, email)
);

create table role_permissions (              -- overrides por tenant
  tenant_id uuid references tenants(id),
  role text not null,
  permission text not null,                  -- quotes.approve, stock.adjust...
  allowed boolean not null default true,
  primary key (tenant_id, role, permission)
);

create table audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  user_id uuid,
  action text not null,                      -- quotes.approve
  entity text not null, entity_id uuid,
  before jsonb, after jsonb,
  created_at timestamptz default now()
);
```

## 3. Comercial (CRM → Orçamento → Pedido)

```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  company_name text, document text,          -- CPF/CNPJ
  email text, phone text, whatsapp text,
  address jsonb,
  segment text, origin text,
  salesperson_id uuid references profiles(id),
  price_table_id uuid,
  commercial_terms text, notes text,
  created_at timestamptz default now()
);
create index on customers (tenant_id, name);

create table customer_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  customer_id uuid not null references customers(id) on delete cascade,
  name text, email text, phone text, role text
);

create type opportunity_stage as enum
  ('lead','contato','orcamento_solicitado','orcamento_enviado',
   'negociacao','ganho','perdido');

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  customer_id uuid references customers(id),
  title text not null,
  stage opportunity_stage not null default 'lead',
  quantity numeric, material text, color text, finish text,
  deadline date, tolerance text, notes text,
  lost_reason text,
  created_at timestamptz default now()
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  number bigint,                             -- sequencial por tenant
  customer_id uuid not null references customers(id),
  opportunity_id uuid references opportunities(id),
  status text not null default 'draft'       -- draft|sent|approved|rejected|expired
    check (status in ('draft','sent','approved','rejected','expired')),
  valid_until date,
  -- composição de custo (ver motor de pricing no packages/core)
  cost_material numeric(12,2), cost_machine numeric(12,2),
  cost_energy numeric(12,2), cost_labor numeric(12,2),
  cost_consumables numeric(12,2), cost_depreciation numeric(12,2),
  risk_pct numeric(5,2), fees_pct numeric(5,2),
  margin_pct numeric(5,2),
  total_cost numeric(12,2), total_price numeric(12,2),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid, design_revision_id uuid,
  description text not null,
  quantity numeric not null,
  unit_price numeric(12,2) not null,
  estimated_weight_g numeric(10,2),
  estimated_time_min int
);

create table sales_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  number bigint,
  customer_id uuid not null references customers(id),
  quote_id uuid references quotes(id),
  status text not null default 'open'
    check (status in ('open','in_production','ready','shipped','delivered','canceled')),
  channel text default 'direct',             -- direct|mercadolivre|shopee|...
  external_ref text,                         -- id no marketplace
  deadline date,
  total numeric(12,2),
  created_at timestamptz default now()
);

create table sales_order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null references sales_orders(id) on delete cascade,
  product_id uuid, variant_id uuid,
  quantity numeric not null, unit_price numeric(12,2) not null
);
```

## 4. Catálogo (Modelo 3D ≠ Produto)

```sql
create table designs (                       -- modelos 3D
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null, description text, category text,
  author text, customer_id uuid references customers(id),
  license text, origin text,
  tags text[], thumbnail_url text,
  created_at timestamptz default now()
);

create table design_revisions (              -- v1, v2, v3...
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  design_id uuid not null references designs(id) on delete cascade,
  version text not null,                     -- 'v8'
  material text, profile text,               -- perfil de impressão
  notes text, created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (design_id, version)
);

create table files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  design_revision_id uuid references design_revisions(id),
  storage_path text not null,                -- tenants/{id}/designs/...
  filename text not null,
  format text,                               -- stl|3mf|step|obj|gcode
  size_bytes bigint,
  -- análise automática (fase 3)
  dims_mm numeric[], volume_cm3 numeric, estimated_weight_g numeric,
  created_at timestamptz default now()
);

create table products (                      -- item comercial
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null, category text, description text,
  image_path text,                            -- caminho em bucket privado forja-products
  active boolean default true,
  created_at timestamptz default now()
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  product_id uuid not null references products(id) on delete cascade,
  sku text not null,
  attributes jsonb,                          -- {tamanho:'G', cor:'preto'}
  price_cents bigint,                         -- migration inicial usa BRL em centavos inteiros
  cost_cents bigint,                          -- NULL para custos históricos sem origem confiável
  is_default boolean not null default false,  -- no máximo uma variação padrão por produto
  stock_qty numeric default 0,               -- estoque de acabados
  reserved_qty numeric default 0,            -- comprometido com pedidos
  unique (tenant_id, sku)
);

create table production_recipes (            -- BOM + ficha técnica + roteiro
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  product_id uuid not null references products(id),
  design_revision_id uuid references design_revisions(id),
  printer_model text,                        -- impressora recomendada
  profile text,                              -- 0.20 Standard
  material text,                             -- PLA
  filament_g numeric(10,2),
  print_time_min int,
  units_per_plate int default 1,
  post_process_min int default 0,
  packaging text,
  instructions text
);
```

O cadastro simples cria o produto com uma variação padrão. A tela de Produtos mostra preço e custo dessa variação; outros modelos continuam disponíveis nos detalhes. As migrations `20261007123042_products_catalog_data.sql` e `20261007125520_products_image_read_policy.sql` adicionam o bucket privado `forja-products`, políticas de Storage por tenant, módulo, papel e licença, e o RPC transacional `create_product_with_default_variant`. Produtos anteriores sem custo mantêm `cost_cents = NULL`.

## 5. Materiais (bobina é indivíduo)

```sql
create type spool_status as enum
  ('sealed','open','in_use','reserved','drying','empty','discarded');

create table materials (                     -- catálogo: PLA preto 3D Fila
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  kind text not null default 'filament'      -- filament|resin|powder|consumable
    check (kind in ('filament','resin','powder','consumable')),
  manufacturer text, material text,          -- PLA, PETG, ABS, resina...
  product_line text, color text, color_hex text, diameter_mm numeric(4,2),
  cost_per_kg numeric(10,2),
  supplier_id uuid,
  created_at timestamptz default now()
);

create table spools (                        -- bobina individual
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  code text not null,                        -- FIL-01382 (QR Code)
  material_id uuid not null references materials(id),
  status spool_status not null default 'sealed',
  initial_weight_g numeric(10,2) not null,
  current_weight_g numeric(10,2) not null,
  spool_tare_g numeric(10,2),                -- peso do carretel
  price numeric(12,2), lot text,
  supplier_id uuid,
  purchased_at date, location text,
  unique (tenant_id, code)
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  spool_id uuid references spools(id),
  material_id uuid references materials(id),
  kind text not null                         -- purchase|print|adjust|reserve|release|discard
    check (kind in ('purchase','print','adjust','reserve','release','discard')),
  quantity_g numeric(10,2) not null,         -- sinal: + entrada / - saída
  ref_type text, ref_id uuid,                -- print_job, purchase...
  note text, created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index on stock_movements (tenant_id, spool_id, created_at desc);

create table consumables (                   -- IPA, cola, lixa, FEP, bicos, caixas...
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null, unit text,             -- un, ml, kg
  stock_qty numeric default 0, min_qty numeric default 0,
  unit_cost numeric(12,2)
);
```

## 6. Impressoras e manutenção

```sql
create type printer_status as enum
  ('available','printing','paused','maintenance','offline','error','reserved');

create table printers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,                        -- A1 #04
  model text, manufacturer text, serial text,
  branch_id uuid, location text,
  purchased_at date, purchase_value numeric(12,2), warranty_until date,
  total_hours numeric(10,1) default 0,
  build_volume_mm numeric[],
  technology text,                           -- fdm|sla|sls
  nozzle_mm numeric(3,2), avg_power_w int,
  compatible_materials text[],
  status printer_status not null default 'available',
  integration text,                          -- manual|octoprint|moonraker
  integration_config jsonb,                  -- url, api key (criptografada)
  created_at timestamptz default now()
);

create table maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  printer_id uuid not null references printers(id) on delete cascade,
  name text not null,                        -- Lubrificação
  interval_hours numeric(10,1) not null,     -- a cada 300h
  last_done_at_hours numeric(10,1) default 0,
  block_long_jobs boolean default false
);

create table maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  printer_id uuid not null references printers(id),
  performed_at timestamptz default now(),
  problem text, part_replaced text,
  cost numeric(12,2), technician text,
  hours_at_service numeric(10,1),
  photos text[], notes text
);
```

## 7. Produção (Pedido ≠ OP ≠ Job)

O esquema executável em `supabase/migrations/` prevalece sobre o SQL conceitual desta seção. O MVP não baixa estoque de acabados. O item de pedido congela revisão, versão da receita, material e estimativas presentes na venda; se não houver receita, o planejamento registra os dados de execução. A pipeline é uma projeção: OP concluída exige quantidade boa suficiente; jobs ativos mantêm quantidade comprometida; falha/cancelamento libera reserva e permite replanejar.

Na implementação atual, `sales_orders.status` passa de `open` para `in_production` na mesma transação que cria as `production_orders` vinculadas aos itens. `production_orders.design_revision_id` e `production_jobs.design_revision_id` são opcionais; uma receita/modelo 3D não é pré-requisito para produzir. As peças boas de jobs concluídos alimentam o progresso nas telas de Pedidos e Produção. Quando todas as OPs do pedido terminam, o status do pedido passa a `ready`. O esquema executável está em `supabase/migrations/`; o SQL abaixo é a referência conceitual de evolução.

```sql
create table production_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  number bigint,
  sales_order_item_id uuid references sales_order_items(id),
  product_id uuid not null references products(id),
  quantity numeric not null,
  priority int default 3,                    -- 1 urgente ... 5 baixa
  deadline date,
  status text not null default 'waiting'
    check (status in ('waiting','prep','ready','printing','post_process',
                      'quality','done','canceled')),
  instructions text, assignee_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table print_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  number bigint,
  production_order_id uuid not null references production_orders(id),
  design_revision_id uuid references design_revisions(id),
  printer_id uuid references printers(id),
  spool_id uuid references spools(id),
  quantity numeric not null,
  -- previsto × real (diferencial do produto)
  planned_material_g numeric(10,2), actual_material_g numeric(10,2),
  planned_time_min int, actual_time_min int,
  planned_cost numeric(12,2), actual_cost numeric(12,2),
  started_at timestamptz, finished_at timestamptz,
  result_ok int default 0, result_defect int default 0,
  status text not null default 'queued'
    check (status in ('queued','printing','paused','done','failed','canceled')),
  created_at timestamptz default now()
);
create index on print_jobs (tenant_id, status, printer_id);

create table failures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  print_job_id uuid references print_jobs(id),
  cause text not null                        -- warping|spaghetti|layer_shift|clog|
    check (cause in ('warping','spaghetti','layer_shift','clog','adhesion',
                     'material','bad_file','human_error','power','machine','other')),
  printer_id uuid, spool_id uuid, lot text,
  design_revision_id uuid, product_id uuid,
  operator_id uuid, profile text,
  cost numeric(12,2), notes text,
  created_at timestamptz default now()
);

create table quality_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  print_job_id uuid references print_jobs(id),
  production_order_id uuid references production_orders(id),
  result text not null check (result in ('approved','rejected','rework')),
  checklist jsonb,                           -- {dimensoes:true, acabamento:false...}
  inspector_id uuid references profiles(id),
  created_at timestamptz default now()
);
```

## 8. Compras e fornecedores

```sql
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null, document text, contact jsonb,
  avg_lead_time_days int, min_order numeric, freight_notes text
);

create table supplier_price_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  supplier_id uuid references suppliers(id),
  material_id uuid references materials(id),
  price numeric(12,2) not null,
  quoted_at date default current_date
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  supplier_id uuid references suppliers(id),
  status text default 'ordered'
    check (status in ('ordered','received','canceled')),
  expected_at date, received_at date,
  total numeric(12,2),
  created_at timestamptz default now()
);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purchase_id uuid references purchases(id) on delete cascade,
  material_id uuid, consumable_id uuid,
  description text, quantity numeric, unit_price numeric(12,2)
);
```

## 9. Financeiro operacional e expedição

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  sales_order_id uuid references sales_orders(id),
  amount numeric(12,2) not null,
  method text,                               -- pix|card|boleto|credit
  fees_pct numeric(5,2),                     -- taxas de gateway/cartão/marketplace
  paid_at timestamptz
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  category text not null,                    -- energia, aluguel, frete, software...
  description text, amount numeric(12,2) not null,
  due_at date, paid_at date,
  printer_id uuid,                           -- manutenção de máquina
  created_at timestamptz default now()
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  sales_order_id uuid references sales_orders(id),
  carrier text, tracking_code text,
  cost numeric(12,2),
  shipped_at timestamptz, delivered_at timestamptz
);
```

## 10. Multiunidade (Business)

```sql
create table branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null, address jsonb
);
-- printers.branch_id, spools.location e production_orders podem referenciar branches
```

## 11. Views materializadas (dashboard)

```sql
-- KPIs do dashboard: atualizar a cada 5 min (pg_cron)
create materialized view mv_dashboard as
select tenant_id,
  sum(case when o.created_at >= date_trunc('month', now())
      then o.total end) as revenue_month,
  count(*) filter (where o.status in ('open','in_production')) as open_orders,
  count(*) filter (where o.deadline < current_date
                   and o.status not in ('delivered','canceled')) as late_orders
from sales_orders o group by tenant_id;

-- Estoque comprometido por material
create materialized view mv_material_stock as
select m.tenant_id, m.id as material_id,
  coalesce(sum(s.current_weight_g - s.spool_tare_g),0) as total_g,
  coalesce(sum(case when s.status = 'reserved'
      then s.current_weight_g - s.spool_tare_g end),0) as reserved_g
from materials m left join spools s on s.material_id = m.id
  and s.status not in ('empty','discarded')
group by m.tenant_id, m.id;
```

## 12. Seeds mínimos

- Tenant demo `demo.agencia3d.app` com dados de exemplo (dragão articulado, 4 impressoras, 12 bobinas) — usado em vendas e onboarding.
- Catálogo de causas de falha, roles e permissões padrão (ver PERMISSIONS.md).
- Módulos default por plano (Start/Pro/Business).
