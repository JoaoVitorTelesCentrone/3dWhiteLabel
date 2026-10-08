-- The visible production flow has three stages. When an order without a job
-- is started from the queue, create its job from the order recipe snapshot,
-- reserve material and start it on an idle printer in one transaction.
create or replace function public.start_next_production_job(p_production_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job public.production_jobs%rowtype;
  v_op public.production_orders%rowtype;
  v_item public.sales_order_items%rowtype;
  v_idle_printer public.printers%rowtype;
  v_spool public.material_spools%rowtype;
  v_job_id uuid;
  v_previous_printer_id uuid;
  v_committed integer;
  v_quantity integer;
  v_plates integer;
  v_estimated_g integer;
  v_estimated_minutes integer;
begin
  if v_tenant is null or auth.uid() is null
    or not private.has_tenant_module('production')
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

    select * into v_idle_printer from public.printers
    where tenant_id = v_tenant and active and status = 'idle'
    order by name, id limit 1 for update skip locked;
    if not found then raise exception 'No idle printer is available' using errcode = '22023'; end if;

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
      v_op.id, v_idle_printer.id, v_spool.id, v_quantity, v_estimated_minutes, v_estimated_g
    );
    select * into v_job from public.production_jobs where id = v_job_id and tenant_id = v_tenant;
  end if;

  if not exists (
    select 1 from public.printers
    where id = v_job.printer_id and tenant_id = v_tenant and active and status = 'idle'
  ) then
    select * into v_idle_printer from public.printers
    where tenant_id = v_tenant and active and status = 'idle'
    order by name, id limit 1 for update skip locked;
    if not found then raise exception 'No idle printer is available' using errcode = '22023'; end if;

    v_previous_printer_id := v_job.printer_id;
    update public.production_jobs set printer_id = v_idle_printer.id where id = v_job.id;
    insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
    values (v_tenant, auth.uid(), 'production.reassign_job_printer', 'job', v_job.id,
      jsonb_build_object('printer_id', v_previous_printer_id), jsonb_build_object('printer_id', v_idle_printer.id));
  end if;

  perform public.start_production_job(v_job.id);
  return v_job.id;
end;
$$;

revoke all on function public.start_next_production_job(uuid) from public, anon;
grant execute on function public.start_next_production_job(uuid) to authenticated;
