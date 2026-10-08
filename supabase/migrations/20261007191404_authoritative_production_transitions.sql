-- The production pipeline must be a projection of domain records, never a second status source.
revoke all on function public.move_production_order_pipeline_stage(uuid, text) from public, anon, authenticated;
drop function public.move_production_order_pipeline_stage(uuid, text);
alter table public.production_orders drop column pipeline_stage;

revoke all on function public.set_sales_order_status(uuid, text) from public, anon, authenticated;
drop function public.set_sales_order_status(uuid, text);

create or replace function public.start_next_production_job(p_production_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job_id uuid;
begin
  if v_tenant is null or auth.uid() is null
    or not private.has_tenant_module('production')
    or not private.has_tenant_role(array['owner','admin','production','operator'])
    or not private.tenant_license_allows_writes() then
    raise exception 'Production access denied' using errcode = '42501';
  end if;

  perform 1 from public.production_orders
  where id = p_production_order_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Production order not found' using errcode = 'P0002'; end if;

  select id into v_job_id from public.production_jobs
  where production_order_id = p_production_order_id and tenant_id = v_tenant and status = 'queued'
  order by created_at, id limit 1 for update;
  if v_job_id is null then raise exception 'No queued job to start' using errcode = '22023'; end if;

  perform public.start_production_job(v_job_id);
  return v_job_id;
end;
$$;
revoke all on function public.start_next_production_job(uuid) from public, anon;
grant execute on function public.start_next_production_job(uuid) to authenticated;

create or replace function public.cancel_queued_production_job(p_job_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job public.production_jobs%rowtype;
begin
  if v_tenant is null or auth.uid() is null
    or not private.has_tenant_module('production') or not private.has_tenant_module('stock')
    or not private.has_tenant_role(array['owner','admin','production'])
    or not private.tenant_license_allows_writes() then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 2 and 500 then
    raise exception 'Cancellation reason required' using errcode = '22023';
  end if;

  select * into v_job from public.production_jobs
  where id = p_job_id and tenant_id = v_tenant for update;
  if not found or v_job.status <> 'queued' then
    raise exception 'Only queued jobs can be canceled here' using errcode = '22023';
  end if;

  update public.material_reservations set status = 'released', resolved_at = now()
  where job_id = p_job_id and tenant_id = v_tenant and status = 'active';
  update public.production_jobs set status = 'canceled', completed_at = now()
  where id = p_job_id and tenant_id = v_tenant;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'production.cancel_job', 'job', p_job_id,
    jsonb_build_object('status','queued'), jsonb_build_object('status','canceled','reason',btrim(p_reason),'reservation','released'));
end;
$$;
revoke all on function public.cancel_queued_production_job(uuid, text) from public, anon;
grant execute on function public.cancel_queued_production_job(uuid, text) to authenticated;

-- Keep the order lifecycle coupled to production and shipment records even if another client calls SQL directly.
create or replace function private.guard_sales_order_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = old.status then return new; end if;

  if old.status = 'open' and new.status = 'in_production' then
    if not exists (select 1 from public.production_orders p where p.sales_order_id = new.id and p.tenant_id = new.tenant_id) then
      raise exception 'Production orders are required' using errcode = '23514';
    end if;
  elsif old.status = 'in_production' and new.status = 'ready' then
    if not exists (select 1 from public.production_orders p where p.sales_order_id = new.id and p.tenant_id = new.tenant_id)
      or exists (select 1 from public.production_orders p where p.sales_order_id = new.id and p.tenant_id = new.tenant_id and p.status <> 'completed') then
      raise exception 'All production orders must be completed' using errcode = '23514';
    end if;
  elsif old.status = 'ready' and new.status = 'shipped' then
    if not exists (select 1 from public.order_shipments s where s.order_id = new.id and s.tenant_id = new.tenant_id) then
      raise exception 'Shipment record is required' using errcode = '23514';
    end if;
  elsif old.status = 'shipped' and new.status = 'delivered' then
    if not exists (select 1 from public.order_shipments s where s.order_id = new.id and s.tenant_id = new.tenant_id and s.delivered_at is not null) then
      raise exception 'Delivery confirmation is required' using errcode = '23514';
    end if;
  else
    raise exception 'Invalid sales order status transition' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_sales_order_status_transition() from public, anon, authenticated;
drop trigger if exists sales_orders_guard_status on public.sales_orders;
create trigger sales_orders_guard_status before update of status on public.sales_orders
for each row execute function private.guard_sales_order_status_transition();
