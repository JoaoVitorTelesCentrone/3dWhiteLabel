-- A product recipe can enrich production, but an order can enter production
-- without a 3D model. The order and its production orders remain linked.
alter table public.production_orders alter column design_revision_id drop not null;
alter table public.production_jobs alter column design_revision_id drop not null;

create or replace function public.release_order_to_production(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_actor uuid := auth.uid();
  v_order public.sales_orders%rowtype;
begin
  if v_tenant is null or v_actor is null or not private.has_tenant_module('production')
    or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','production']) then
    raise exception 'Production access denied' using errcode = '42501';
  end if;
  select * into v_order from public.sales_orders
  where id = p_order_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  if v_order.status = 'in_production' and exists (
    select 1 from public.production_orders
    where sales_order_id = p_order_id and tenant_id = v_tenant
  ) then return; end if;
  if v_order.status <> 'open' or not exists (
    select 1 from public.sales_order_items i
    where i.order_id = p_order_id and i.tenant_id = v_tenant
  ) then raise exception 'Order cannot enter production' using errcode = '22023'; end if;

  insert into public.production_orders (
    tenant_id, sales_order_id, sales_order_item_id, design_revision_id, target_qty, created_by
  )
  select v_tenant, p_order_id, i.id, i.design_revision_id, i.quantity, v_actor
  from public.sales_order_items i
  where i.order_id = p_order_id and i.tenant_id = v_tenant;
  update public.sales_orders set status = 'in_production'
  where id = p_order_id and tenant_id = v_tenant;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, v_actor, 'orders.release', 'order', p_order_id,
    jsonb_build_object('status','open'), jsonb_build_object('status','in_production'));
end;
$$;
revoke all on function public.release_order_to_production(uuid) from public, anon;
grant execute on function public.release_order_to_production(uuid) to authenticated;
