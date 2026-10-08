-- Starting a queued job from the pipeline should use an available printer when
-- the printer chosen during planning has since become busy.
create or replace function public.start_next_production_job(p_production_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_job public.production_jobs%rowtype;
  v_idle_printer public.printers%rowtype;
  v_previous_printer_id uuid;
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

  select * into v_job from public.production_jobs
  where production_order_id = p_production_order_id and tenant_id = v_tenant and status = 'queued'
  order by created_at, id limit 1 for update;
  if not found then raise exception 'No queued job to start' using errcode = '22023'; end if;

  -- Preserve the planned printer when it is idle. Otherwise, use any active
  -- idle printer in this tenant so that moving the card is actionable.
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
