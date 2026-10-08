alter table public.production_orders
  add column pipeline_stage text not null default 'planning'
  check (pipeline_stage in ('planning', 'queued', 'running', 'completed', 'attention'));

update public.production_orders
set pipeline_stage = case
  when status = 'completed' then 'completed'
  when status = 'in_progress' then 'running'
  when status = 'canceled' then 'attention'
  else 'planning'
end;

create or replace function public.move_production_order_pipeline_stage(
  p_production_order_id uuid,
  p_pipeline_stage text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_tenant uuid := private.current_tenant_id();
begin
  if v_tenant is null or auth.uid() is null
    or not private.has_tenant_module('production')
    or not private.has_tenant_role(array['owner', 'admin', 'production', 'operator'])
    or not private.tenant_license_allows_writes() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_pipeline_stage not in ('planning', 'queued', 'running', 'completed', 'attention') then
    raise exception 'Invalid pipeline stage' using errcode = '22023';
  end if;

  update public.production_orders
  set pipeline_stage = p_pipeline_stage
  where id = p_production_order_id and tenant_id = v_tenant;

  if not found then raise exception 'Production order not found' using errcode = 'P0002'; end if;

  insert into public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_tenant, auth.uid(), 'production.pipeline_move', 'production_order', p_production_order_id,
    jsonb_build_object('pipeline_stage', p_pipeline_stage));
end;
$$;

revoke all on function public.move_production_order_pipeline_stage(uuid, text) from public, anon;
grant execute on function public.move_production_order_pipeline_stage(uuid, text) to authenticated;
