-- Freeze the production recipe and material price alongside each sale/job.
alter table public.sales_order_items
  add column recipe_version integer,
  add column material_id uuid,
  add column estimated_g integer,
  add column estimated_minutes integer,
  add column units_per_plate integer,
  add constraint sales_order_items_material_fk foreign key (tenant_id, material_id) references public.materials(tenant_id, id),
  add constraint sales_order_items_recipe_snapshot_check check (
    (estimated_g is null or estimated_g > 0) and
    (estimated_minutes is null or estimated_minutes > 0) and
    (units_per_plate is null or units_per_plate > 0)
  );

create or replace function private.snapshot_sales_item_recipe()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.product_variant_id is null then return new; end if;
  select r.version, r.material_id, r.estimated_g, r.estimated_minutes, r.units_per_plate
  into new.recipe_version, new.material_id, new.estimated_g, new.estimated_minutes, new.units_per_plate
  from public.production_recipes r
  where r.tenant_id = new.tenant_id and r.product_variant_id = new.product_variant_id
    and r.design_revision_id is not distinct from new.design_revision_id
  order by r.active desc, r.version desc
  limit 1;
  return new;
end;
$$;
revoke all on function private.snapshot_sales_item_recipe() from public, anon, authenticated;
drop trigger if exists sales_order_items_snapshot_recipe on public.sales_order_items;
create trigger sales_order_items_snapshot_recipe before insert or update of product_variant_id, design_revision_id
on public.sales_order_items for each row execute function private.snapshot_sales_item_recipe();

update public.sales_order_items i set
  recipe_version = r.version, material_id = r.material_id,
  estimated_g = r.estimated_g, estimated_minutes = r.estimated_minutes,
  units_per_plate = r.units_per_plate
from public.production_recipes r
where r.tenant_id = i.tenant_id and r.product_variant_id = i.product_variant_id
  and r.design_revision_id is not distinct from i.design_revision_id
  and r.active;

-- Production orders always consume the recipe snapshot taken when the sale was made.
create or replace function private.production_order_material_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select i.design_revision_id, i.material_id
  into new.design_revision_id, new.material_id
  from public.sales_order_items i
  where i.id = new.sales_order_item_id and i.tenant_id = new.tenant_id;
  return new;
end;
$$;
update public.production_orders p set material_id = i.material_id
from public.sales_order_items i
where i.id = p.sales_order_item_id and i.tenant_id = p.tenant_id;

-- A catalog product can be sold without a production recipe. Technical details are
-- collected by the job planner when the team decides to manufacture it.
alter table public.production_orders alter column design_revision_id drop not null;
alter table public.production_jobs alter column design_revision_id drop not null;
create or replace function public.release_order_to_production(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_order public.sales_orders%rowtype;
begin
  if v_tenant is null or not private.has_tenant_module('production') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','production']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  select * into v_order from public.sales_orders where id = p_order_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  if v_order.status in ('in_production','ready') then return; end if;
  if v_order.status <> 'open' or not exists (
    select 1 from public.sales_order_items i where i.order_id = p_order_id and i.tenant_id = v_tenant
  ) then raise exception 'Order is not available for production' using errcode = '22023'; end if;
  insert into public.production_orders (tenant_id, sales_order_id, sales_order_item_id, design_revision_id, material_id, target_qty, created_by)
  select v_tenant, p_order_id, i.id, i.design_revision_id, i.material_id, i.quantity, auth.uid()
  from public.sales_order_items i where i.order_id = p_order_id and i.tenant_id = v_tenant;
  update public.sales_orders set status = 'in_production' where id = p_order_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'orders.release', 'order', p_order_id,
    jsonb_build_object('status','open'), jsonb_build_object('status','in_production'));
end;
$$;
revoke all on function public.release_order_to_production(uuid) from public, anon;
grant execute on function public.release_order_to_production(uuid) to authenticated;

alter table public.production_jobs add column material_cost_per_kg_cents bigint;
update public.production_jobs j set material_cost_per_kg_cents = m.cost_per_kg_cents
from public.material_spools s join public.materials m on m.id = s.material_id and m.tenant_id = s.tenant_id
where s.id = j.spool_id and s.tenant_id = j.tenant_id;

create or replace function private.snapshot_job_material_cost()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select m.cost_per_kg_cents into new.material_cost_per_kg_cents
  from public.material_spools s join public.materials m on m.id = s.material_id and m.tenant_id = s.tenant_id
  where s.id = new.spool_id and s.tenant_id = new.tenant_id;
  if new.material_cost_per_kg_cents is null then raise exception 'Material price snapshot is required' using errcode = '23514'; end if;
  update public.production_orders p set material_id = s.material_id
  from public.material_spools s
  where p.id = new.production_order_id and p.tenant_id = new.tenant_id
    and s.id = new.spool_id and s.tenant_id = new.tenant_id and p.material_id is null;
  if exists (select 1 from public.production_orders p join public.material_spools s on s.id = new.spool_id and s.tenant_id = new.tenant_id
    where p.id = new.production_order_id and p.tenant_id = new.tenant_id and p.material_id <> s.material_id) then
    raise exception 'All jobs in a production order must use its material' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.snapshot_job_material_cost() from public, anon, authenticated;
create trigger production_jobs_snapshot_material_cost before insert on public.production_jobs
for each row execute function private.snapshot_job_material_cost();

-- Repeated form submissions with the same key return the first job instead of creating another.
create table public.production_job_requests (
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  request_key uuid not null,
  production_order_id uuid not null,
  job_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, request_key),
  unique (tenant_id, job_id),
  foreign key (tenant_id, production_order_id) references public.production_orders(tenant_id, id) on delete cascade,
  foreign key (tenant_id, job_id) references public.production_jobs(tenant_id, id) on delete cascade
);
revoke all on public.production_job_requests from public, anon, authenticated;
grant all on public.production_job_requests to service_role;

create or replace function public.create_production_job_once(
  p_request_key uuid, p_production_order_id uuid, p_printer_id uuid, p_spool_id uuid,
  p_quantity integer, p_estimated_minutes integer, p_estimated_g integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job_id uuid;
  v_existing public.production_job_requests%rowtype;
begin
  if v_tenant is null or auth.uid() is null
    or not private.has_tenant_module('production')
    or not private.has_tenant_role(array['owner','admin','production'])
    or not private.tenant_license_allows_writes() then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  if p_request_key is null then raise exception 'Request key required' using errcode = '22023'; end if;
  perform 1 from public.production_orders where id = p_production_order_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Production order not found' using errcode = 'P0002'; end if;
  select * into v_existing from public.production_job_requests
    where tenant_id = v_tenant and request_key = p_request_key;
  if found then
    if v_existing.production_order_id <> p_production_order_id then raise exception 'Request key reused' using errcode = '22023'; end if;
    return v_existing.job_id;
  end if;
  v_job_id := public.create_production_job(p_production_order_id,p_printer_id,p_spool_id,p_quantity,p_estimated_minutes,p_estimated_g);
  insert into public.production_job_requests(tenant_id,request_key,production_order_id,job_id)
  values(v_tenant,p_request_key,p_production_order_id,v_job_id);
  return v_job_id;
end;
$$;
revoke all on function public.create_production_job_once(uuid,uuid,uuid,uuid,integer,integer,integer) from public, anon;
grant execute on function public.create_production_job_once(uuid,uuid,uuid,uuid,integer,integer,integer) to authenticated;
revoke all on function public.create_production_job(uuid,uuid,uuid,integer,integer,integer) from authenticated;

create or replace function public.get_operational_report(p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_finance_allowed boolean;
  v_order_count bigint;
  v_job_count bigint;
  v_good_qty bigint;
  v_bad_qty bigint;
  v_failures bigint;
  v_print_minutes bigint;
  v_sales_cents bigint;
  v_planned_cost_cents bigint;
  v_received_cents bigint;
  v_expenses_cents bigint;
  v_material_cents bigint;
begin
  if v_tenant is null or not private.has_tenant_role(array['owner','admin','finance','viewer'])
    or p_start is null or p_end is null or p_end < p_start or p_end - p_start > 366 then
    raise exception 'Report access denied or invalid date range' using errcode = '42501';
  end if;
  v_finance_allowed := private.has_tenant_role(array['owner','admin','finance']);
  select count(*)::bigint, coalesce(sum(total_price_cents),0)::bigint,
    coalesce(sum(total_cost_cents),0)::bigint into v_order_count, v_sales_cents, v_planned_cost_cents
  from public.sales_orders
  where tenant_id = v_tenant and status <> 'canceled'
    and created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and created_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
  select count(*)::bigint, coalesce(sum(good_qty),0)::bigint, coalesce(sum(bad_qty),0)::bigint,
    coalesce(sum(actual_minutes),0)::bigint
  into v_job_count, v_good_qty, v_bad_qty, v_print_minutes
  from public.production_jobs where tenant_id = v_tenant and status = 'completed'
    and completed_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and completed_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
  select count(*)::bigint into v_failures from public.job_failures
  where tenant_id = v_tenant and created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and created_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
  if v_finance_allowed then
    select coalesce(sum(amount_cents),0)::bigint into v_received_cents from public.order_payments
    where tenant_id = v_tenant and received_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
      and received_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
    select coalesce(sum(amount_cents),0)::bigint into v_expenses_cents from public.operational_expenses
    where tenant_id = v_tenant and incurred_on between p_start and p_end;
    select coalesce(sum(ceil(coalesce(j.material_cost_per_kg_cents,m.cost_per_kg_cents)::numeric * j.consumed_g / 1000)),0)::bigint into v_material_cents
    from public.production_jobs j
    join public.material_spools s on s.id = j.spool_id and s.tenant_id = j.tenant_id
    join public.materials m on m.id = s.material_id and m.tenant_id = s.tenant_id
    where j.tenant_id = v_tenant and j.status in ('completed','failed') and j.consumed_g is not null
      and j.completed_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
      and j.completed_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
  end if;
  return jsonb_build_object('period_start',p_start,'period_end',p_end,'orders_count',v_order_count,
    'jobs_completed',v_job_count,'jobs_failed',v_failures,'good_qty',v_good_qty,'bad_qty',v_bad_qty,
    'print_minutes',v_print_minutes,'finance',case when v_finance_allowed then jsonb_build_object(
      'sales_cents',v_sales_cents,'planned_cost_cents',v_planned_cost_cents,
      'planned_gross_margin_cents',v_sales_cents-v_planned_cost_cents,'received_cents',v_received_cents,
      'expenses_cents',v_expenses_cents,'actual_material_cents',v_material_cents) else null end);
end;
$$;
revoke all on function public.get_operational_report(date,date) from public, anon;
grant execute on function public.get_operational_report(date,date) to authenticated;
