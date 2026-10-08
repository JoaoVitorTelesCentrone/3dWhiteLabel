create or replace function public.set_sales_order_status(p_order_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_actor uuid := auth.uid();
  v_order public.sales_orders%rowtype;
begin
  if v_tenant is null or v_actor is null or not private.has_tenant_module('orders')
    or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','sales']) then
    raise exception 'Order access denied' using errcode = '42501';
  end if;
  if p_status not in ('open','in_production','ready','shipped','delivered') then
    raise exception 'Invalid order status' using errcode = '22023';
  end if;

  select * into v_order from public.sales_orders
  where id = p_order_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  if v_order.status = p_status then return; end if;

  if p_status = 'in_production' and not exists (
    select 1 from public.production_orders where sales_order_id = p_order_id and tenant_id = v_tenant
  ) then
    insert into public.production_orders (tenant_id, sales_order_id, sales_order_item_id, design_revision_id, target_qty, created_by)
    select v_tenant, p_order_id, i.id, i.design_revision_id, i.quantity, v_actor
    from public.sales_order_items i where i.order_id = p_order_id and i.tenant_id = v_tenant;
  end if;

  if p_status = 'open' and exists (
    select 1 from public.production_orders where sales_order_id = p_order_id and tenant_id = v_tenant
  ) then
    raise exception 'Order with production cannot return to open' using errcode = '22023';
  end if;

  update public.sales_orders set status = p_status where id = p_order_id and tenant_id = v_tenant;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, v_actor, 'orders.status_update', 'order', p_order_id,
    jsonb_build_object('status', v_order.status), jsonb_build_object('status', p_status));
end;
$$;

revoke all on function public.set_sales_order_status(uuid,text) from public, anon;
grant execute on function public.set_sales_order_status(uuid,text) to authenticated;
