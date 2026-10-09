-- Production is tracked by order, material and job. Printer assignment is legacy and optional.
alter table public.production_jobs alter column printer_id drop not null;

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
  if v_tenant is null or auth.uid() is null or not private.has_tenant_module('production')
    or not private.has_tenant_module('stock') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','production','operator']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  if p_quantity not between 1 and 100000 or p_estimated_minutes not between 1 and 1000000
    or p_estimated_g not between 1 and 100000 then
    raise exception 'Invalid job inputs' using errcode = '22023';
  end if;
  select * into v_op from public.production_orders
  where id = p_production_order_id and tenant_id = v_tenant for update;
  if not found or v_op.status not in ('planned','in_progress') then
    raise exception 'Production order unavailable' using errcode = '22023';
  end if;
  select * into v_spool from public.material_spools
  where id = p_spool_id and tenant_id = v_tenant for update;
  if not found or v_spool.status <> 'active' then
    raise exception 'Spool unavailable' using errcode = '22023';
  end if;
  if v_op.material_id is not null and v_spool.material_id <> v_op.material_id then
    raise exception 'Spool material differs from order snapshot' using errcode = '22023';
  end if;
  select coalesce(sum(case when status = 'completed' then good_qty else quantity end),0)::integer
  into v_committed from public.production_jobs
  where production_order_id = p_production_order_id and tenant_id = v_tenant
    and status in ('queued','running','completed');
  if v_committed + p_quantity > v_op.target_qty then
    raise exception 'Job exceeds remaining quantity' using errcode = '22023';
  end if;
  select coalesce(sum(reserved_g),0)::integer into v_reserved
  from public.material_reservations
  where spool_id = p_spool_id and tenant_id = v_tenant and status = 'active';
  if v_spool.current_gross_g - v_spool.tare_g - v_reserved < p_estimated_g then
    raise exception 'Insufficient available material' using errcode = '22023';
  end if;
  insert into public.production_jobs (
    tenant_id, production_order_id, design_revision_id, spool_id, quantity,
    estimated_minutes, estimated_g, created_by
  ) values (
    v_tenant, p_production_order_id, v_op.design_revision_id, p_spool_id,
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
revoke all on function public.create_production_job(uuid,uuid,uuid,integer,integer,integer) from public, anon, authenticated;

create or replace function public.start_production_job(p_job_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job public.production_jobs%rowtype;
begin
  if v_tenant is null or auth.uid() is null or not private.has_tenant_module('production')
    or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','production','operator']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  select * into v_job from public.production_jobs
  where id = p_job_id and tenant_id = v_tenant for update;
  if not found or v_job.status <> 'queued' then
    raise exception 'Job is not queued' using errcode = '22023';
  end if;
  if not exists (select 1 from public.material_reservations r
      where r.job_id = p_job_id and r.tenant_id = v_tenant and r.status = 'active')
    or not exists (select 1 from public.material_spools s
      where s.id = v_job.spool_id and s.tenant_id = v_tenant and s.status = 'active') then
    raise exception 'Material reservation is unavailable' using errcode = '22023';
  end if;
  update public.production_jobs set status = 'running', operator_id = auth.uid(), started_at = now()
  where id = p_job_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'production.start_job', 'job', p_job_id,
    jsonb_build_object('status','running'));
end;
$$;
revoke all on function public.start_production_job(uuid) from public, anon;
grant execute on function public.start_production_job(uuid) to authenticated;

create or replace function public.complete_production_job(
  p_job_id uuid, p_actual_minutes integer, p_consumed_g integer,
  p_good_qty integer, p_bad_qty integer
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
  if v_tenant is null or auth.uid() is null or not private.has_tenant_module('production')
    or not private.has_tenant_module('stock') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','production','operator']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  select * into v_job from public.production_jobs
  where id = p_job_id and tenant_id = v_tenant for update;
  if not found or v_job.status <> 'running' or p_actual_minutes not between 1 and 1000000
    or p_consumed_g not between 0 and 100000 or p_good_qty not between 0 and v_job.quantity
    or p_bad_qty not between 0 and v_job.quantity or p_good_qty + p_bad_qty <> v_job.quantity then
    raise exception 'Invalid job completion' using errcode = '22023';
  end if;
  select target_qty, sales_order_id into v_target, v_order_id
  from public.production_orders where id = v_job.production_order_id and tenant_id = v_tenant for update;
  select * into v_spool from public.material_spools
  where id = v_job.spool_id and tenant_id = v_tenant for update;
  select reserved_g into v_reserved from public.material_reservations
  where job_id = p_job_id and tenant_id = v_tenant and status = 'active' for update;
  if v_reserved is null or v_spool.id is null or p_consumed_g > v_reserved
    or p_consumed_g > v_spool.current_gross_g - v_spool.tare_g then
    raise exception 'Consumption exceeds reservation' using errcode = '22023';
  end if;
  update public.material_reservations set status = 'consumed', resolved_at = now()
  where job_id = p_job_id and tenant_id = v_tenant and status = 'active';
  update public.material_spools set current_gross_g = current_gross_g - p_consumed_g,
    status = case when current_gross_g - p_consumed_g = tare_g then 'empty' else 'active' end
  where id = v_spool.id and tenant_id = v_tenant;
  insert into public.spool_movements
    (tenant_id, spool_id, job_id, kind, delta_g, gross_after_g, reason, actor_id)
  values (v_tenant, v_spool.id, p_job_id, 'consume', -p_consumed_g,
    v_spool.current_gross_g - p_consumed_g, 'Consumo do job', auth.uid());
  update public.production_jobs set status = 'completed', actual_minutes = p_actual_minutes,
    consumed_g = p_consumed_g, good_qty = p_good_qty, bad_qty = p_bad_qty, completed_at = now()
  where id = p_job_id and tenant_id = v_tenant;
  select coalesce(sum(good_qty),0)::integer into v_good from public.production_jobs
  where production_order_id = v_job.production_order_id and tenant_id = v_tenant and status = 'completed';
  if v_good >= v_target then
    update public.production_orders set status = 'completed'
    where id = v_job.production_order_id and tenant_id = v_tenant;
  end if;
  if not exists (select 1 from public.production_orders o
    where o.sales_order_id = v_order_id and o.tenant_id = v_tenant and o.status <> 'completed') then
    update public.sales_orders set status = 'ready' where id = v_order_id and tenant_id = v_tenant;
  end if;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'production.complete_job', 'job', p_job_id,
    jsonb_build_object('good_qty',p_good_qty,'bad_qty',p_bad_qty,
      'consumed_g',p_consumed_g,'actual_minutes',p_actual_minutes));
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
  if v_tenant is null or auth.uid() is null or not private.has_tenant_module('production')
    or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','production','operator']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 2 and 500 then
    raise exception 'Failure reason required' using errcode = '22023';
  end if;
  select * into v_job from public.production_jobs
  where id = p_job_id and tenant_id = v_tenant for update;
  if not found or v_job.status not in ('queued','running') then
    raise exception 'Job cannot fail' using errcode = '22023';
  end if;
  if v_job.status = 'running' then
    if p_actual_minutes not between 1 and 1000000 or p_consumed_g not between 0 and v_job.estimated_g then
      raise exception 'Invalid failure usage' using errcode = '22023';
    end if;
    select * into v_spool from public.material_spools
    where id = v_job.spool_id and tenant_id = v_tenant for update;
    select reserved_g into v_reserved from public.material_reservations
    where job_id = p_job_id and tenant_id = v_tenant and status = 'active' for update;
    if v_reserved is null or v_spool.id is null or p_consumed_g > v_reserved
      or p_consumed_g > v_spool.current_gross_g - v_spool.tare_g then
      raise exception 'Consumption exceeds reservation' using errcode = '22023';
    end if;
    update public.material_reservations set status = 'consumed', resolved_at = now()
    where job_id = p_job_id and tenant_id = v_tenant and status = 'active';
    update public.material_spools set current_gross_g = current_gross_g - p_consumed_g,
      status = case when current_gross_g - p_consumed_g = tare_g then 'empty' else 'active' end
    where id = v_spool.id and tenant_id = v_tenant;
    insert into public.spool_movements
      (tenant_id, spool_id, job_id, kind, delta_g, gross_after_g, reason, actor_id)
    values (v_tenant, v_spool.id, p_job_id, 'consume', -p_consumed_g,
      v_spool.current_gross_g - p_consumed_g, 'Consumo em falha de job', auth.uid());
  elsif p_actual_minutes <> 0 or p_consumed_g <> 0 then
    raise exception 'Queued job has no usage' using errcode = '22023';
  else
    update public.material_reservations set status = 'released', resolved_at = now()
    where job_id = p_job_id and tenant_id = v_tenant and status = 'active';
  end if;
  update public.production_jobs set status = 'failed', completed_at = now(),
    actual_minutes = nullif(p_actual_minutes,0), consumed_g = p_consumed_g
  where id = p_job_id and tenant_id = v_tenant;
  insert into public.job_failures (tenant_id, job_id, reason, reported_by)
  values (v_tenant, p_job_id, btrim(p_reason), auth.uid());
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'production.fail_job', 'job', p_job_id,
    jsonb_build_object('reason',btrim(p_reason),'actual_minutes',p_actual_minutes,'consumed_g',p_consumed_g));
end;
$$;
revoke all on function public.fail_production_job(uuid,text,integer,integer) from public, anon;
grant execute on function public.fail_production_job(uuid,text,integer,integer) to authenticated;

create or replace function public.start_next_production_job(p_production_order_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job public.production_jobs%rowtype;
  v_op public.production_orders%rowtype;
  v_item public.sales_order_items%rowtype;
  v_spool public.material_spools%rowtype;
  v_job_id uuid;
  v_committed integer;
  v_quantity integer;
  v_plates integer;
  v_estimated_g integer;
  v_estimated_minutes integer;
begin
  if v_tenant is null or auth.uid() is null or not private.has_tenant_module('production')
    or not private.has_tenant_module('stock')
    or not private.has_tenant_role(array['owner','admin','production','operator'])
    or not private.tenant_license_allows_writes() then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  select * into v_op from public.production_orders
  where id = p_production_order_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Production order not found' using errcode = 'P0002'; end if;
  select * into v_job from public.production_jobs
  where production_order_id = p_production_order_id and tenant_id = v_tenant and status = 'queued'
  order by created_at, id limit 1 for update;
  if not found then
    select * into v_item from public.sales_order_items
    where id = v_op.sales_order_item_id and tenant_id = v_tenant;
    if not found or v_op.material_id is null or v_item.estimated_g is null
      or v_item.estimated_minutes is null or v_item.units_per_plate is null then
      raise exception 'Production recipe snapshot is incomplete' using errcode = '22023';
    end if;
    select coalesce(sum(case when status = 'completed' then good_qty else quantity end), 0)::integer
    into v_committed from public.production_jobs
    where production_order_id = v_op.id and tenant_id = v_tenant
      and status in ('queued', 'running', 'completed');
    v_quantity := greatest(v_op.target_qty - v_committed, 0);
    if v_quantity = 0 then raise exception 'No remaining quantity to plan' using errcode = '22023'; end if;
    v_plates := ceil(v_quantity::numeric / v_item.units_per_plate)::integer;
    v_estimated_g := v_item.estimated_g * v_plates;
    v_estimated_minutes := v_item.estimated_minutes * v_plates;
    select s.* into v_spool from public.material_spools s
    where s.tenant_id = v_tenant and s.material_id = v_op.material_id and s.status = 'active'
      and s.current_gross_g - s.tare_g - coalesce((
        select sum(r.reserved_g) from public.material_reservations r
        where r.tenant_id = v_tenant and r.spool_id = s.id and r.status = 'active'
      ), 0) >= v_estimated_g
    order by (s.current_gross_g - s.tare_g) desc, s.code, s.id
    limit 1 for update skip locked;
    if not found then raise exception 'No spool has enough available material' using errcode = '22023'; end if;
    v_job_id := public.create_production_job(
      v_op.id, null, v_spool.id, v_quantity, v_estimated_minutes, v_estimated_g
    );
    select * into v_job from public.production_jobs where id = v_job_id and tenant_id = v_tenant;
  end if;
  perform public.start_production_job(v_job.id);
  return v_job.id;
end;
$$;
revoke all on function public.start_next_production_job(uuid) from public, anon;
grant execute on function public.start_next_production_job(uuid) to authenticated;
