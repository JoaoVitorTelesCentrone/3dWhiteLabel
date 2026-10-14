-- Delivery details belong to the commercial snapshot, so later customer
-- changes do not rewrite the address agreed for an existing order.
alter table public.sales_orders
  add column delivery_address jsonb,
  add constraint sales_orders_delivery_address_check check (
    delivery_address is null or (
      jsonb_typeof(delivery_address) = 'object'
      and delivery_address ?& array['postalCode', 'street', 'number', 'neighborhood', 'city', 'state', 'country']
      and length(btrim(coalesce(delivery_address ->> 'postalCode', ''))) between 8 and 9
      and length(btrim(coalesce(delivery_address ->> 'street', ''))) between 2 and 160
      and length(btrim(coalesce(delivery_address ->> 'number', ''))) between 1 and 30
      and length(btrim(coalesce(delivery_address ->> 'neighborhood', ''))) between 2 and 100
      and length(btrim(coalesce(delivery_address ->> 'city', ''))) between 2 and 100
      and delivery_address ->> 'state' ~ '^[A-Z]{2}$'
      and delivery_address ->> 'country' = 'BR'
      and length(coalesce(delivery_address ->> 'complement', '')) <= 120
    )
  );

create or replace function public.create_sales_order(
  p_customer_id uuid,
  p_items jsonb,
  p_delivery_address jsonb
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
begin
  if p_delivery_address is null or jsonb_typeof(p_delivery_address) <> 'object' then
    raise exception 'Delivery address is required' using errcode = '22023';
  end if;

  v_order_id := public.create_sales_order(p_customer_id, p_items);

  update public.sales_orders
  set delivery_address = p_delivery_address
  where id = v_order_id and tenant_id = v_tenant;

  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, v_actor, 'orders.delivery_address.set', 'order', v_order_id, p_delivery_address);

  return v_order_id;
end;
$$;

revoke all on function public.create_sales_order(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_sales_order(uuid, jsonb, jsonb) to authenticated;
