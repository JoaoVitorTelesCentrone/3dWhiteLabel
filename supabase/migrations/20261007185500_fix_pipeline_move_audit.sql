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

  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'production.pipeline_move', 'production_order', p_production_order_id,
    jsonb_build_object('pipeline_stage', p_pipeline_stage));
end;
$$;
