-- Direct orders can be corrected or removed while still open and untouched by
-- production, payment, or shipment. Completed transactions retain their history.
create or replace function public.update_sales_order(
  p_order_id uuid, p_customer_id uuid, p_product_variant_id uuid, p_quantity integer
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_actor uuid := auth.uid();
  v_order public.sales_orders%rowtype;
  v_item public.sales_order_items%rowtype;
  v_variant record;
  v_revision uuid;
  v_total_price bigint;
  v_total_cost bigint;
begin
  if v_tenant is null or v_actor is null or not private.has_tenant_role(array['owner','admin','sales'])
    or not private.has_tenant_module('orders') or not private.tenant_license_allows_writes() then
    raise exception 'Order access denied' using errcode = '42501';
  end if;
  if p_quantity not between 1 and 100000 or not exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.tenant_id = v_tenant and c.archived_at is null
  ) then raise exception 'Invalid order input' using errcode = '22023'; end if;

  select * into v_order from public.sales_orders
  where id = p_order_id and tenant_id = v_tenant for update;
  if not found or v_order.status <> 'open' or v_order.quote_id is not null
    or exists (select 1 from public.production_orders po where po.sales_order_id = p_order_id and po.tenant_id = v_tenant)
    or exists (select 1 from public.order_payments op where op.order_id = p_order_id and op.tenant_id = v_tenant)
    or exists (select 1 from public.order_shipments os where os.order_id = p_order_id and os.tenant_id = v_tenant)
  then raise exception 'Order cannot be edited' using errcode = '22023'; end if;
  select * into v_item from public.sales_order_items
  where order_id = p_order_id and tenant_id = v_tenant for update;
  if not found or v_item.quote_item_id is not null or (
    select count(*) from public.sales_order_items where order_id = p_order_id and tenant_id = v_tenant
  ) <> 1 then raise exception 'Order items cannot be edited' using errcode = '22023'; end if;

  select v.name as variant_name, v.price_cents, v.cost_cents, p.name as product_name
  into v_variant
  from public.product_variants v
  join public.products p on p.id = v.product_id and p.tenant_id = v.tenant_id
  where v.id = p_product_variant_id and v.tenant_id = v_tenant and v.active and p.active;
  if not found or v_variant.price_cents is null or v_variant.cost_cents is null then
    raise exception 'Product needs price and cost' using errcode = '22023';
  end if;
  select r.design_revision_id into v_revision from public.production_recipes r
  where r.tenant_id = v_tenant and r.product_variant_id = p_product_variant_id and r.active;
  v_total_price := v_variant.price_cents * p_quantity;
  v_total_cost := v_variant.cost_cents * p_quantity;
  if v_total_price > 999999999999 or v_total_cost > 999999999999 then
    raise exception 'Order total exceeds limit' using errcode = '22023';
  end if;

  update public.sales_order_items set
    product_variant_id = p_product_variant_id,
    design_revision_id = v_revision,
    description = case when v_variant.variant_name = 'Padrão' then v_variant.product_name
      else v_variant.product_name || ' · ' || v_variant.variant_name end,
    quantity = p_quantity,
    unit_price_cents = v_variant.price_cents,
    total_price_cents = v_total_price
  where id = v_item.id and tenant_id = v_tenant;
  update public.sales_orders set customer_id = p_customer_id,
    total_price_cents = v_total_price, total_cost_cents = v_total_cost
  where id = p_order_id and tenant_id = v_tenant;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, v_actor, 'orders.update', 'order', p_order_id,
    jsonb_build_object('customer_id',v_order.customer_id,'product_variant_id',v_item.product_variant_id,
      'quantity',v_item.quantity,'total_price_cents',v_order.total_price_cents,'total_cost_cents',v_order.total_cost_cents),
    jsonb_build_object('customer_id',p_customer_id,'product_variant_id',p_product_variant_id,
      'quantity',p_quantity,'total_price_cents',v_total_price,'total_cost_cents',v_total_cost));
end;
$$;
revoke all on function public.update_sales_order(uuid,uuid,uuid,integer) from public, anon;
grant execute on function public.update_sales_order(uuid,uuid,uuid,integer) to authenticated;

create or replace function public.delete_sales_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_actor uuid := auth.uid();
  v_order public.sales_orders%rowtype;
begin
  if v_tenant is null or v_actor is null or not private.has_tenant_role(array['owner','admin'])
    or not private.has_tenant_module('orders') or not private.tenant_license_allows_writes() then
    raise exception 'Order access denied' using errcode = '42501';
  end if;
  select * into v_order from public.sales_orders
  where id = p_order_id and tenant_id = v_tenant for update;
  if not found or v_order.status <> 'open' or v_order.quote_id is not null
    or exists (select 1 from public.production_orders po where po.sales_order_id = p_order_id and po.tenant_id = v_tenant)
    or exists (select 1 from public.order_payments op where op.order_id = p_order_id and op.tenant_id = v_tenant)
    or exists (select 1 from public.order_shipments os where os.order_id = p_order_id and os.tenant_id = v_tenant)
  then raise exception 'Order cannot be deleted' using errcode = '22023'; end if;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state)
  values (v_tenant, v_actor, 'orders.delete', 'order', p_order_id,
    jsonb_build_object('number',v_order.number,'customer_id',v_order.customer_id,
      'total_price_cents',v_order.total_price_cents,'total_cost_cents',v_order.total_cost_cents));
  delete from public.sales_orders where id = p_order_id and tenant_id = v_tenant;
end;
$$;
revoke all on function public.delete_sales_order(uuid) from public, anon;
grant execute on function public.delete_sales_order(uuid) to authenticated;
