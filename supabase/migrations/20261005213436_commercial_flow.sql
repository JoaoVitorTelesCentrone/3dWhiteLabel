-- Commercial documents are written through transactional RPCs only.
alter table public.customers add constraint customers_tenant_id_id_key unique (tenant_id, id);
alter table public.product_variants add constraint product_variants_tenant_id_id_key unique (tenant_id, id);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  customer_id uuid not null,
  title text not null check (length(btrim(title)) between 2 and 160),
  stage text not null default 'lead' check (stage in ('lead','contact','quote_requested','quote_sent','negotiation','won','lost')),
  estimated_value_cents bigint check (estimated_value_cents between 0 and 999999999999),
  notes text check (notes is null or length(notes) <= 4000),
  lost_reason text check (lost_reason is null or length(btrim(lost_reason)) between 2 and 500),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, customer_id) references public.customers(tenant_id, id),
  unique (tenant_id, id),
  check ((stage = 'lost') = (lost_reason is not null))
);
create index opportunities_tenant_stage_idx on public.opportunities (tenant_id, stage, updated_at desc);
create trigger opportunities_set_updated_at before update on public.opportunities
for each row execute function private.set_updated_at();

create table private.document_counters (
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  document_type text not null check (document_type in ('quote','order')),
  last_number bigint not null check (last_number > 0),
  primary key (tenant_id, document_type)
);
revoke all on private.document_counters from public, anon, authenticated;

create or replace function private.next_document_number(p_tenant_id uuid, p_document_type text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_number bigint;
begin
  if p_document_type not in ('quote','order') then
    raise exception 'Invalid document type' using errcode = '22023';
  end if;
  insert into private.document_counters (tenant_id, document_type, last_number)
  values (p_tenant_id, p_document_type, 1)
  on conflict (tenant_id, document_type) do update
    set last_number = private.document_counters.last_number + 1
  returning last_number into v_number;
  return v_number;
end;
$$;
revoke all on function private.next_document_number(uuid,text) from public, anon, authenticated;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  number bigint not null,
  customer_id uuid not null,
  opportunity_id uuid,
  status text not null default 'draft' check (status in ('draft','sent','approved','rejected')),
  pricing_version integer not null default 1 check (pricing_version = 1),
  cost_components jsonb not null check (jsonb_typeof(cost_components) = 'object'),
  risk_bps integer not null check (risk_bps between 0 and 9999),
  fees_bps integer not null check (fees_bps between 0 and 9999),
  margin_bps integer not null check (margin_bps between 0 and 9999),
  total_cost_cents bigint not null check (total_cost_cents >= 0),
  total_price_cents bigint not null check (total_price_cents >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  approved_at timestamptz,
  foreign key (tenant_id, customer_id) references public.customers(tenant_id, id),
  foreign key (tenant_id, opportunity_id) references public.opportunities(tenant_id, id),
  unique (tenant_id, id),
  unique (tenant_id, number),
  check (margin_bps + fees_bps < 10000)
);
create index quotes_tenant_status_idx on public.quotes (tenant_id, status, created_at desc);
create trigger quotes_set_updated_at before update on public.quotes
for each row execute function private.set_updated_at();

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  quote_id uuid not null,
  product_variant_id uuid,
  design_revision_id uuid,
  description text not null check (length(btrim(description)) between 2 and 500),
  quantity integer not null check (quantity between 1 and 100000),
  unit_cost_cents bigint not null check (unit_cost_cents >= 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  total_price_cents bigint not null check (total_price_cents = unit_price_cents * quantity),
  foreign key (tenant_id, quote_id) references public.quotes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, product_variant_id) references public.product_variants(tenant_id, id),
  foreign key (tenant_id, design_revision_id) references public.design_revisions(tenant_id, id)
);
create index quote_items_quote_idx on public.quote_items (tenant_id, quote_id);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  number bigint not null,
  customer_id uuid not null,
  quote_id uuid not null,
  status text not null default 'open' check (status in ('open','in_production','ready','shipped','delivered','canceled')),
  total_price_cents bigint not null check (total_price_cents >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, customer_id) references public.customers(tenant_id, id),
  foreign key (tenant_id, quote_id) references public.quotes(tenant_id, id),
  unique (tenant_id, id),
  unique (tenant_id, number),
  unique (quote_id)
);
create index sales_orders_tenant_status_idx on public.sales_orders (tenant_id, status, created_at desc);
create trigger sales_orders_set_updated_at before update on public.sales_orders
for each row execute function private.set_updated_at();

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null,
  quote_item_id uuid not null unique references public.quote_items(id),
  product_variant_id uuid,
  design_revision_id uuid,
  description text not null,
  quantity integer not null,
  unit_price_cents bigint not null,
  total_price_cents bigint not null,
  foreign key (tenant_id, order_id) references public.sales_orders(tenant_id, id) on delete cascade,
  foreign key (tenant_id, product_variant_id) references public.product_variants(tenant_id, id),
  foreign key (tenant_id, design_revision_id) references public.design_revisions(tenant_id, id)
);
create index sales_order_items_order_idx on public.sales_order_items (tenant_id, order_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_tenant_created_idx on public.audit_events (tenant_id, created_at desc);

alter table public.opportunities enable row level security;
alter table private.document_counters enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.audit_events enable row level security;

create policy opportunities_select_own on public.opportunities for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('crm'))
  and (select private.has_tenant_role(array['owner','admin','sales','viewer']))
);
create policy opportunities_insert_own on public.opportunities for insert to authenticated with check (
  tenant_id = (select private.current_tenant_id()) and created_by = (select auth.uid())
  and (select private.has_tenant_module('crm')) and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin','sales']))
);
create policy opportunities_update_own on public.opportunities for update to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('crm'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin','sales']))
) with check (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('crm'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin','sales']))
);
create policy quotes_select_own on public.quotes for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('quotes'))
  and (select private.has_tenant_role(array['owner','admin','sales','viewer']))
);
create policy quote_items_select_own on public.quote_items for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('quotes'))
  and (select private.has_tenant_role(array['owner','admin','sales','viewer']))
);
create policy sales_orders_select_own on public.sales_orders for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('orders'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','finance','viewer']))
);
create policy sales_order_items_select_own on public.sales_order_items for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('orders'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','finance','viewer']))
);
create policy audit_events_select_own on public.audit_events for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_role(array['owner','admin']))
);

revoke all on public.opportunities, public.quotes, public.quote_items, public.sales_orders, public.sales_order_items, public.audit_events from public, anon, authenticated;
grant select, insert on public.opportunities to authenticated;
grant update (title, stage, estimated_value_cents, notes, lost_reason) on public.opportunities to authenticated;
grant select (id, tenant_id, number, customer_id, opportunity_id, status, total_price_cents, created_by, created_at, updated_at, sent_at, approved_at) on public.quotes to authenticated;
grant select (id, tenant_id, quote_id, product_variant_id, design_revision_id, description, quantity, unit_price_cents, total_price_cents) on public.quote_items to authenticated;
grant select on public.sales_orders, public.sales_order_items, public.audit_events to authenticated;
grant all on public.opportunities, public.quotes, public.quote_items, public.sales_orders, public.sales_order_items, public.audit_events to service_role;

create or replace function public.create_quote(
  p_customer_id uuid, p_opportunity_id uuid, p_product_variant_id uuid, p_design_revision_id uuid,
  p_description text, p_quantity integer,
  p_material_cents bigint, p_machine_cents bigint, p_energy_cents bigint,
  p_labor_cents bigint, p_consumables_cents bigint, p_depreciation_cents bigint,
  p_risk_bps integer, p_fees_bps integer, p_margin_bps integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_actor uuid := auth.uid();
  v_base bigint;
  v_unit_cost bigint;
  v_unit_price bigint;
  v_quote_id uuid;
begin
  if v_tenant is null or v_actor is null or not private.has_tenant_role(array['owner','admin','sales'])
    or not private.has_tenant_module('quotes') or not private.tenant_license_allows_writes() then
    raise exception 'Quote access denied' using errcode = '42501';
  end if;
  if not exists (select 1 from public.customers c where c.id = p_customer_id and c.tenant_id = v_tenant and c.archived_at is null)
    or (p_opportunity_id is not null and not exists (select 1 from public.opportunities o where o.id = p_opportunity_id and o.customer_id = p_customer_id and o.tenant_id = v_tenant))
    or (p_product_variant_id is not null and not exists (select 1 from public.product_variants v where v.id = p_product_variant_id and v.tenant_id = v_tenant and v.active))
    or (p_design_revision_id is not null and not exists (select 1 from public.design_revisions r join public.designs d on d.id = r.design_id and d.tenant_id = r.tenant_id where r.id = p_design_revision_id and r.tenant_id = v_tenant and d.active)) then
    raise exception 'Invalid quote reference' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_description,''))) not between 2 and 500
    or p_quantity not between 1 and 100000
    or p_risk_bps not between 0 and 9999 or p_fees_bps not between 0 and 9999
    or p_margin_bps not between 0 and 9999 or p_fees_bps + p_margin_bps >= 10000
    or p_material_cents not between 0 and 1000000000 or p_machine_cents not between 0 and 1000000000
    or p_energy_cents not between 0 and 1000000000 or p_labor_cents not between 0 and 1000000000
    or p_consumables_cents not between 0 and 1000000000 or p_depreciation_cents not between 0 and 1000000000 then
    raise exception 'Invalid quote values' using errcode = '22023';
  end if;
  v_base := p_material_cents + p_machine_cents + p_energy_cents + p_labor_cents + p_consumables_cents + p_depreciation_cents;
  v_unit_cost := v_base + ceil(v_base::numeric * p_risk_bps / 10000)::bigint;
  v_unit_price := ceil(v_unit_cost::numeric * 10000 / (10000 - p_margin_bps - p_fees_bps))::bigint;
  if v_unit_price::numeric * p_quantity > 999999999999 then
    raise exception 'Quote total exceeds limit' using errcode = '22023';
  end if;
  insert into public.quotes (
    tenant_id, number, customer_id, opportunity_id, cost_components, risk_bps, fees_bps, margin_bps,
    total_cost_cents, total_price_cents, created_by
  ) values (
    v_tenant, private.next_document_number(v_tenant, 'quote'), p_customer_id, p_opportunity_id,
    jsonb_build_object('material_cents',p_material_cents,'machine_cents',p_machine_cents,'energy_cents',p_energy_cents,
      'labor_cents',p_labor_cents,'consumables_cents',p_consumables_cents,'depreciation_cents',p_depreciation_cents),
    p_risk_bps, p_fees_bps, p_margin_bps, v_unit_cost * p_quantity, v_unit_price * p_quantity, v_actor
  ) returning id into v_quote_id;
  insert into public.quote_items (
    tenant_id, quote_id, product_variant_id, design_revision_id, description, quantity,
    unit_cost_cents, unit_price_cents, total_price_cents
  ) values (
    v_tenant, v_quote_id, p_product_variant_id, p_design_revision_id, btrim(p_description), p_quantity,
    v_unit_cost, v_unit_price, v_unit_price * p_quantity
  );
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, v_actor, 'quotes.create', 'quote', v_quote_id, jsonb_build_object('total_price_cents',v_unit_price*p_quantity));
  return v_quote_id;
end;
$$;
revoke all on function public.create_quote(uuid,uuid,uuid,uuid,text,integer,bigint,bigint,bigint,bigint,bigint,bigint,integer,integer,integer) from public, anon;
grant execute on function public.create_quote(uuid,uuid,uuid,uuid,text,integer,bigint,bigint,bigint,bigint,bigint,bigint,integer,integer,integer) to authenticated;

create or replace function public.set_quote_status(p_quote_id uuid, p_next_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_quote public.quotes%rowtype;
begin
  if v_tenant is null or not private.has_tenant_role(array['owner','admin','sales'])
    or not private.has_tenant_module('quotes') or not private.tenant_license_allows_writes() then
    raise exception 'Quote access denied' using errcode = '42501';
  end if;
  select * into v_quote from public.quotes where id = p_quote_id and tenant_id = v_tenant for update;
  if not found or (v_quote.status = 'draft' and p_next_status <> 'sent')
    or (v_quote.status = 'sent' and p_next_status <> 'rejected')
    or v_quote.status not in ('draft','sent') then
    raise exception 'Invalid quote transition' using errcode = '22023';
  end if;
  update public.quotes set status = p_next_status, sent_at = case when p_next_status = 'sent' then now() else sent_at end
  where id = p_quote_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'quotes.' || p_next_status, 'quote', p_quote_id,
    jsonb_build_object('status',v_quote.status), jsonb_build_object('status',p_next_status));
end;
$$;
revoke all on function public.set_quote_status(uuid,text) from public, anon;
grant execute on function public.set_quote_status(uuid,text) to authenticated;

create or replace function public.approve_quote(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_quote public.quotes%rowtype; v_order_id uuid;
begin
  if v_tenant is null or not private.has_tenant_role(array['owner','admin','sales'])
    or not private.has_tenant_module('quotes') or not private.has_tenant_module('orders')
    or not private.tenant_license_allows_writes() then
    raise exception 'Approval access denied' using errcode = '42501';
  end if;
  select * into v_quote from public.quotes where id = p_quote_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Quote not found' using errcode = '22023'; end if;
  if v_quote.status = 'approved' then
    select id into v_order_id from public.sales_orders where quote_id = p_quote_id and tenant_id = v_tenant;
    if v_order_id is null then raise exception 'Approved quote has no order' using errcode = '23514'; end if;
    return v_order_id;
  end if;
  if v_quote.status <> 'sent' then raise exception 'Only sent quotes can be approved' using errcode = '22023'; end if;
  insert into public.sales_orders (tenant_id, number, customer_id, quote_id, total_price_cents, created_by)
  values (v_tenant, private.next_document_number(v_tenant, 'order'), v_quote.customer_id, p_quote_id, v_quote.total_price_cents, auth.uid())
  returning id into v_order_id;
  insert into public.sales_order_items (tenant_id, order_id, quote_item_id, product_variant_id, design_revision_id, description, quantity, unit_price_cents, total_price_cents)
  select v_tenant, v_order_id, qi.id, qi.product_variant_id, qi.design_revision_id, qi.description, qi.quantity, qi.unit_price_cents, qi.total_price_cents
  from public.quote_items qi where qi.quote_id = p_quote_id and qi.tenant_id = v_tenant;
  update public.quotes set status = 'approved', approved_at = now() where id = p_quote_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'quotes.approve', 'quote', p_quote_id, jsonb_build_object('status','sent'),
    jsonb_build_object('status','approved','order_id',v_order_id));
  return v_order_id;
end;
$$;
revoke all on function public.approve_quote(uuid) from public, anon;
grant execute on function public.approve_quote(uuid) to authenticated;
