alter table public.sales_order_items add constraint sales_order_items_tenant_id_id_key unique (tenant_id, id);

create table public.production_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  sales_order_id uuid not null,
  sales_order_item_id uuid not null,
  design_revision_id uuid not null,
  material_id uuid,
  target_qty integer not null check (target_qty between 1 and 100000),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','canceled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, sales_order_id) references public.sales_orders(tenant_id, id),
  foreign key (tenant_id, sales_order_item_id) references public.sales_order_items(tenant_id, id),
  foreign key (tenant_id, design_revision_id) references public.design_revisions(tenant_id, id),
  foreign key (tenant_id, material_id) references public.materials(tenant_id, id),
  unique (tenant_id, id),
  unique (sales_order_item_id)
);
create index production_orders_order_idx on public.production_orders (tenant_id, sales_order_id, status);
create trigger production_orders_set_updated_at before update on public.production_orders
for each row execute function private.set_updated_at();

create table public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  production_order_id uuid not null,
  design_revision_id uuid not null,
  printer_id uuid not null,
  spool_id uuid not null,
  quantity integer not null check (quantity between 1 and 100000),
  estimated_minutes integer not null check (estimated_minutes between 1 and 1000000),
  estimated_g integer not null check (estimated_g between 1 and 100000),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','canceled')),
  actual_minutes integer check (actual_minutes between 1 and 1000000),
  consumed_g integer check (consumed_g between 0 and 100000),
  good_qty integer check (good_qty between 0 and 100000),
  bad_qty integer check (bad_qty between 0 and 100000),
  created_by uuid not null references auth.users(id),
  operator_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  foreign key (tenant_id, production_order_id) references public.production_orders(tenant_id, id),
  foreign key (tenant_id, design_revision_id) references public.design_revisions(tenant_id, id),
  foreign key (tenant_id, printer_id) references public.printers(tenant_id, id),
  foreign key (tenant_id, spool_id) references public.material_spools(tenant_id, id),
  unique (tenant_id, id),
  check (status <> 'completed' or (actual_minutes is not null and consumed_g is not null and good_qty + bad_qty = quantity))
);
create index production_jobs_queue_idx on public.production_jobs (tenant_id, status, created_at);
create index production_jobs_op_idx on public.production_jobs (tenant_id, production_order_id, status);

create table public.material_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  spool_id uuid not null,
  job_id uuid not null unique,
  reserved_g integer not null check (reserved_g between 1 and 100000),
  status text not null default 'active' check (status in ('active','consumed','released')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  foreign key (tenant_id, spool_id) references public.material_spools(tenant_id, id),
  foreign key (tenant_id, job_id) references public.production_jobs(tenant_id, id)
);
create index material_reservations_spool_idx on public.material_reservations (tenant_id, spool_id, status);

create or replace function private.protect_spool_reservations()
returns trigger language plpgsql set search_path = '' as $$
declare v_reserved integer;
begin
  select coalesce(sum(reserved_g),0)::integer into v_reserved
  from public.material_reservations
  where tenant_id = new.tenant_id and spool_id = new.id and status = 'active';
  if new.current_gross_g - new.tare_g < v_reserved then
    raise exception 'Spool weight is below active reservations' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_spool_reservations() from public, anon, authenticated;
create trigger material_spools_protect_reservations before update on public.material_spools
for each row execute function private.protect_spool_reservations();

create table public.job_failures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  job_id uuid not null,
  reason text not null check (length(btrim(reason)) between 2 and 500),
  reported_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, job_id) references public.production_jobs(tenant_id, id)
);
create index job_failures_job_idx on public.job_failures (tenant_id, job_id);

alter table public.spool_movements add column job_id uuid;
alter table public.spool_movements add foreign key (tenant_id, job_id) references public.production_jobs(tenant_id, id);

alter table public.production_orders enable row level security;
alter table public.production_jobs enable row level security;
alter table public.material_reservations enable row level security;
alter table public.job_failures enable row level security;

create policy production_orders_select_own on public.production_orders for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('production'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','sales','viewer']))
);
create policy production_jobs_select_own on public.production_jobs for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('production'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','sales','viewer']))
);
create policy material_reservations_select_own on public.material_reservations for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('stock'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','stock','viewer']))
);
create policy job_failures_select_own on public.job_failures for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('production'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','sales','viewer']))
);
revoke all on public.production_orders, public.production_jobs, public.material_reservations, public.job_failures from public, anon, authenticated;
grant select on public.production_orders, public.production_jobs, public.material_reservations, public.job_failures to authenticated;
grant all on public.production_orders, public.production_jobs, public.material_reservations, public.job_failures to service_role;

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
  ) or exists (
    select 1 from public.sales_order_items i
    where i.order_id = p_order_id and i.tenant_id = v_tenant and i.design_revision_id is null
  ) then raise exception 'Order items need design revisions' using errcode = '22023'; end if;
  insert into public.production_orders (tenant_id, sales_order_id, sales_order_item_id, design_revision_id, target_qty, created_by)
  select v_tenant, p_order_id, i.id, i.design_revision_id, i.quantity, auth.uid()
  from public.sales_order_items i where i.order_id = p_order_id and i.tenant_id = v_tenant;
  update public.sales_orders set status = 'in_production' where id = p_order_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'orders.release', 'order', p_order_id,
    jsonb_build_object('status','open'), jsonb_build_object('status','in_production'));
end;
$$;
revoke all on function public.release_order_to_production(uuid) from public, anon;
grant execute on function public.release_order_to_production(uuid) to authenticated;

create or replace function public.create_production_job(
  p_production_order_id uuid, p_printer_id uuid, p_spool_id uuid,
  p_quantity integer, p_estimated_minutes integer, p_estimated_g integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_op public.production_orders%rowtype;
  v_spool public.material_spools%rowtype;
  v_committed integer;
  v_reserved integer;
  v_job_id uuid;
begin
  if v_tenant is null or not private.has_tenant_module('production') or not private.has_tenant_module('stock')
    or not private.tenant_license_allows_writes() or not private.has_tenant_role(array['owner','admin','production']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  if p_quantity not between 1 and 100000 or p_estimated_minutes not between 1 and 1000000
    or p_estimated_g not between 1 and 100000 then raise exception 'Invalid job inputs' using errcode = '22023'; end if;
  select * into v_op from public.production_orders where id = p_production_order_id and tenant_id = v_tenant for update;
  if not found or v_op.status not in ('planned','in_progress') then
    raise exception 'Production order unavailable' using errcode = '22023';
  end if;
  if not exists (select 1 from public.printers p where p.id = p_printer_id and p.tenant_id = v_tenant and p.active and p.status <> 'disabled') then
    raise exception 'Printer unavailable' using errcode = '22023';
  end if;
  select * into v_spool from public.material_spools where id = p_spool_id and tenant_id = v_tenant for update;
  if not found or v_spool.status <> 'active' then raise exception 'Spool unavailable' using errcode = '22023'; end if;
  if v_op.material_id is not null and v_spool.material_id <> v_op.material_id then
    raise exception 'Spool material differs from recipe snapshot' using errcode = '22023';
  end if;
  select coalesce(sum(case when status = 'completed' then good_qty else quantity end),0)::integer into v_committed
  from public.production_jobs where production_order_id = p_production_order_id and tenant_id = v_tenant
    and status in ('queued','running','completed');
  if v_committed + p_quantity > v_op.target_qty then raise exception 'Job exceeds remaining quantity' using errcode = '22023'; end if;
  select coalesce(sum(reserved_g),0)::integer into v_reserved
  from public.material_reservations where spool_id = p_spool_id and tenant_id = v_tenant and status = 'active';
  if v_spool.current_gross_g - v_spool.tare_g - v_reserved < p_estimated_g then
    raise exception 'Insufficient available material' using errcode = '22023';
  end if;
  insert into public.production_jobs (
    tenant_id, production_order_id, design_revision_id, printer_id, spool_id, quantity,
    estimated_minutes, estimated_g, created_by
  ) values (
    v_tenant, p_production_order_id, v_op.design_revision_id, p_printer_id, p_spool_id,
    p_quantity, p_estimated_minutes, p_estimated_g, auth.uid()
  ) returning id into v_job_id;
  insert into public.material_reservations (tenant_id, spool_id, job_id, reserved_g)
  values (v_tenant, p_spool_id, v_job_id, p_estimated_g);
  update public.production_orders set status = 'in_progress' where id = p_production_order_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'production.create_job', 'job', v_job_id,
    jsonb_build_object('quantity',p_quantity,'reserved_g',p_estimated_g));
  return v_job_id;
end;
$$;
revoke all on function public.create_production_job(uuid,uuid,uuid,integer,integer,integer) from public, anon;
grant execute on function public.create_production_job(uuid,uuid,uuid,integer,integer,integer) to authenticated;

create or replace function public.start_production_job(p_job_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_job public.production_jobs%rowtype; v_printer public.printers%rowtype;
begin
  if v_tenant is null or not private.has_tenant_module('production') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','production','operator']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  select * into v_job from public.production_jobs where id = p_job_id and tenant_id = v_tenant for update;
  if not found or v_job.status <> 'queued' then raise exception 'Job is not queued' using errcode = '22023'; end if;
  select * into v_printer from public.printers where id = v_job.printer_id and tenant_id = v_tenant for update;
  if not found or not v_printer.active or v_printer.status <> 'idle' then raise exception 'Printer is unavailable' using errcode = '22023'; end if;
  if not exists (select 1 from public.material_reservations r where r.job_id = p_job_id and r.tenant_id = v_tenant and r.status = 'active')
    or not exists (select 1 from public.material_spools s where s.id = v_job.spool_id and s.tenant_id = v_tenant and s.status = 'active') then
    raise exception 'Material reservation is unavailable' using errcode = '22023';
  end if;
  update public.printers set status = 'printing' where id = v_printer.id;
  update public.production_jobs set status = 'running', operator_id = auth.uid(), started_at = now() where id = p_job_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'production.start_job', 'job', p_job_id, jsonb_build_object('status','running'));
end;
$$;
revoke all on function public.start_production_job(uuid) from public, anon;
grant execute on function public.start_production_job(uuid) to authenticated;

create or replace function public.complete_production_job(
  p_job_id uuid, p_actual_minutes integer, p_consumed_g integer, p_good_qty integer, p_bad_qty integer
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job public.production_jobs%rowtype;
  v_spool public.material_spools%rowtype;
  v_reserved integer;
  v_target integer;
  v_good integer;
  v_order_id uuid;
begin
  if v_tenant is null or not private.has_tenant_module('production') or not private.has_tenant_module('stock')
    or not private.tenant_license_allows_writes() or not private.has_tenant_role(array['owner','admin','production','operator']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  select * into v_job from public.production_jobs where id = p_job_id and tenant_id = v_tenant for update;
  if not found or v_job.status <> 'running' or p_actual_minutes not between 1 and 1000000
    or p_consumed_g not between 0 and 100000 or p_good_qty not between 0 and v_job.quantity
    or p_bad_qty not between 0 and v_job.quantity or p_good_qty + p_bad_qty <> v_job.quantity then
    raise exception 'Invalid job completion' using errcode = '22023';
  end if;
  perform 1 from public.printers p where p.id = v_job.printer_id and p.tenant_id = v_tenant and p.status = 'printing' for update;
  if not found then raise exception 'Printer is not printing' using errcode = '22023'; end if;
  select target_qty, sales_order_id into v_target, v_order_id
  from public.production_orders where id = v_job.production_order_id and tenant_id = v_tenant for update;
  select * into v_spool from public.material_spools where id = v_job.spool_id and tenant_id = v_tenant for update;
  select reserved_g into v_reserved from public.material_reservations
  where job_id = p_job_id and tenant_id = v_tenant and status = 'active' for update;
  if v_reserved is null or p_consumed_g > v_reserved or p_consumed_g > v_spool.current_gross_g - v_spool.tare_g then
    raise exception 'Consumption exceeds reservation' using errcode = '22023';
  end if;
  update public.material_reservations set status = 'consumed', resolved_at = now() where job_id = p_job_id;
  update public.material_spools set current_gross_g = current_gross_g - p_consumed_g,
    status = case when current_gross_g - p_consumed_g = tare_g then 'empty' else 'active' end
  where id = v_spool.id;
  insert into public.spool_movements (tenant_id, spool_id, job_id, kind, delta_g, gross_after_g, reason, actor_id)
  values (v_tenant, v_spool.id, p_job_id, 'consume', -p_consumed_g,
    v_spool.current_gross_g - p_consumed_g, 'Consumo do job', auth.uid());
  update public.printers set status = 'idle', runtime_min = runtime_min + p_actual_minutes where id = v_job.printer_id;
  update public.production_jobs set status = 'completed', actual_minutes = p_actual_minutes,
    consumed_g = p_consumed_g, good_qty = p_good_qty, bad_qty = p_bad_qty, completed_at = now()
  where id = p_job_id;
  select coalesce(sum(good_qty),0)::integer into v_good from public.production_jobs
  where production_order_id = v_job.production_order_id and tenant_id = v_tenant and status = 'completed';
  if v_good >= v_target then
    update public.production_orders set status = 'completed' where id = v_job.production_order_id;
  end if;
  if not exists (select 1 from public.production_orders o where o.sales_order_id = v_order_id and o.tenant_id = v_tenant and o.status <> 'completed') then
    update public.sales_orders set status = 'ready' where id = v_order_id;
  end if;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'production.complete_job', 'job', p_job_id,
    jsonb_build_object('good_qty',p_good_qty,'bad_qty',p_bad_qty,'consumed_g',p_consumed_g,'actual_minutes',p_actual_minutes));
end;
$$;
revoke all on function public.complete_production_job(uuid,integer,integer,integer,integer) from public, anon;
grant execute on function public.complete_production_job(uuid,integer,integer,integer,integer) to authenticated;

create or replace function public.fail_production_job(
  p_job_id uuid, p_reason text, p_actual_minutes integer, p_consumed_g integer
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job public.production_jobs%rowtype;
  v_spool public.material_spools%rowtype;
  v_reserved integer;
begin
  if v_tenant is null or not private.has_tenant_module('production') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','production','operator']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 2 and 500 then raise exception 'Failure reason required' using errcode = '22023'; end if;
  select * into v_job from public.production_jobs where id = p_job_id and tenant_id = v_tenant for update;
  if not found or v_job.status not in ('queued','running') then raise exception 'Job cannot fail' using errcode = '22023'; end if;
  if v_job.status = 'running' then
    if p_actual_minutes not between 1 and 1000000 or p_consumed_g not between 0 and v_job.estimated_g then
      raise exception 'Invalid failure usage' using errcode = '22023';
    end if;
    perform 1 from public.printers where id = v_job.printer_id and tenant_id = v_tenant for update;
    select * into v_spool from public.material_spools where id = v_job.spool_id and tenant_id = v_tenant for update;
    select reserved_g into v_reserved from public.material_reservations
    where job_id = p_job_id and tenant_id = v_tenant and status = 'active' for update;
    if v_reserved is null or p_consumed_g > v_reserved or p_consumed_g > v_spool.current_gross_g - v_spool.tare_g then
      raise exception 'Consumption exceeds reservation' using errcode = '22023';
    end if;
    update public.material_reservations set status = 'consumed', resolved_at = now() where job_id = p_job_id;
    update public.material_spools set current_gross_g = current_gross_g - p_consumed_g,
      status = case when current_gross_g - p_consumed_g = tare_g then 'empty' else 'active' end
    where id = v_spool.id;
    insert into public.spool_movements (tenant_id, spool_id, job_id, kind, delta_g, gross_after_g, reason, actor_id)
    values (v_tenant, v_spool.id, p_job_id, 'consume', -p_consumed_g,
      v_spool.current_gross_g - p_consumed_g, 'Consumo em falha de job', auth.uid());
    update public.printers set status = 'idle', runtime_min = runtime_min + p_actual_minutes where id = v_job.printer_id;
  elsif p_actual_minutes <> 0 or p_consumed_g <> 0 then
    raise exception 'Queued job has no usage' using errcode = '22023';
  else
    update public.material_reservations set status = 'released', resolved_at = now() where job_id = p_job_id and status = 'active';
  end if;
  update public.production_jobs set status = 'failed', completed_at = now(),
    actual_minutes = nullif(p_actual_minutes,0), consumed_g = p_consumed_g where id = p_job_id;
  insert into public.job_failures (tenant_id, job_id, reason, reported_by) values (v_tenant, p_job_id, btrim(p_reason), auth.uid());
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'production.fail_job', 'job', p_job_id,
    jsonb_build_object('reason',btrim(p_reason),'actual_minutes',p_actual_minutes,'consumed_g',p_consumed_g));
end;
$$;
revoke all on function public.fail_production_job(uuid,text,integer,integer) from public, anon;
grant execute on function public.fail_production_job(uuid,text,integer,integer) to authenticated;
