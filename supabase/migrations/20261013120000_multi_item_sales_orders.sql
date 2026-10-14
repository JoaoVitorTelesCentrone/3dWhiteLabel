-- Direct sales orders may contain multiple product variants. Prices, costs and
-- active recipes are snapshotted atomically for every item at checkout time.
create or replace function public.create_sales_order(
  p_customer_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_actor uuid := auth.uid();
  v_order_id uuid;
  v_item jsonb;
  v_variant_id uuid;
  v_quantity integer;
  v_variant record;
  v_revision uuid;
  v_item_total_price bigint;
  v_item_total_cost bigint;
  v_total_price bigint := 0;
  v_total_cost bigint := 0;
begin
  if v_tenant is null or v_actor is null
    or not private.has_tenant_role(array['owner','admin','sales'])
    or not private.has_tenant_module('orders')
    or not private.tenant_license_allows_writes() then
    raise exception 'Order access denied' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.tenant_id = v_tenant and c.archived_at is null
  ) or p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Invalid order input' using errcode = '22023';
  end if;

  insert into public.sales_orders (
    tenant_id, number, customer_id, quote_id, total_price_cents, total_cost_cents, created_by
  ) values (
    v_tenant, private.next_document_number(v_tenant, 'order'), p_customer_id, null, 0, 0, v_actor
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_variant_id := (v_item ->> 'variantId')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Invalid order item' using errcode = '22023';
    end;

    if v_quantity not between 1 and 100000 then
      raise exception 'Invalid order item quantity' using errcode = '22023';
    end if;

    select v.name as variant_name, v.price_cents, v.cost_cents, p.name as product_name
    into v_variant
    from public.product_variants v
    join public.products p on p.id = v.product_id and p.tenant_id = v.tenant_id
    where v.id = v_variant_id and v.tenant_id = v_tenant and v.active and p.active;

    if not found or v_variant.price_cents is null or v_variant.cost_cents is null then
      raise exception 'The selected product needs price and cost' using errcode = '22023';
    end if;

    select r.design_revision_id into v_revision
    from public.production_recipes r
    where r.tenant_id = v_tenant and r.product_variant_id = v_variant_id and r.active;

    v_item_total_price := v_variant.price_cents * v_quantity;
    v_item_total_cost := v_variant.cost_cents * v_quantity;
    v_total_price := v_total_price + v_item_total_price;
    v_total_cost := v_total_cost + v_item_total_cost;

    if v_total_price > 999999999999 or v_total_cost > 999999999999 then
      raise exception 'Order total exceeds limit' using errcode = '22023';
    end if;

    insert into public.sales_order_items (
      tenant_id, order_id, quote_item_id, product_variant_id, design_revision_id,
      description, quantity, unit_price_cents, total_price_cents
    ) values (
      v_tenant, v_order_id, null, v_variant_id, v_revision,
      case when v_variant.variant_name = 'Padrão' then v_variant.product_name
        else v_variant.product_name || ' · ' || v_variant.variant_name end,
      v_quantity, v_variant.price_cents, v_item_total_price
    );
  end loop;

  update public.sales_orders
  set total_price_cents = v_total_price, total_cost_cents = v_total_cost
  where id = v_order_id and tenant_id = v_tenant;

  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, v_actor, 'orders.create', 'order', v_order_id,
    jsonb_build_object(
      'customer_id', p_customer_id,
      'items', p_items,
      'total_price_cents', v_total_price,
      'total_cost_cents', v_total_cost
    ));

  return v_order_id;
end;
$$;

revoke all on function public.create_sales_order(uuid, jsonb) from public, anon;
grant execute on function public.create_sales_order(uuid, jsonb) to authenticated;
