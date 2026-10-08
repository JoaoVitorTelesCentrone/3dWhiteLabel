-- A direct order may be sold without a recipe, but an active recipe is copied
-- when present so production is bound to the file and material in effect at sale.
update public.sales_order_items i
set design_revision_id = r.design_revision_id
from public.sales_orders o, public.production_recipes r
where i.order_id = o.id
  and i.tenant_id = o.tenant_id
  and r.tenant_id = o.tenant_id
  and r.product_variant_id = i.product_variant_id
  and r.active
  and o.quote_id is null
  and i.design_revision_id is null;

create or replace function public.create_sales_order(p_customer_id uuid, p_product_variant_id uuid, p_quantity integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_actor uuid := auth.uid();
  v_variant record;
  v_recipe record;
  v_order_id uuid;
  v_total_price bigint;
  v_total_cost bigint;
begin
  if v_tenant is null or v_actor is null or not private.has_tenant_role(array['owner','admin','sales'])
    or not private.has_tenant_module('orders') or not private.tenant_license_allows_writes() then
    raise exception 'Order access denied' using errcode = '42501';
  end if;
  if p_quantity not between 1 and 100000 or not exists (
    select 1 from public.customers c where c.id = p_customer_id and c.tenant_id = v_tenant and c.archived_at is null
  ) then raise exception 'Invalid order reference' using errcode = '22023'; end if;

  select v.name as variant_name, v.price_cents, v.cost_cents, p.name as product_name into v_variant
  from public.product_variants v join public.products p on p.id = v.product_id and p.tenant_id = v.tenant_id
  where v.id = p_product_variant_id and v.tenant_id = v_tenant and v.active and p.active;
  if not found or v_variant.price_cents is null or v_variant.cost_cents is null then
    raise exception 'The selected product needs price and cost' using errcode = '22023';
  end if;
  select design_revision_id into v_recipe from public.production_recipes
  where tenant_id = v_tenant and product_variant_id = p_product_variant_id and active;

  v_total_price := v_variant.price_cents * p_quantity;
  v_total_cost := v_variant.cost_cents * p_quantity;
  if v_total_price > 999999999999 or v_total_cost > 999999999999 then
    raise exception 'Order total exceeds limit' using errcode = '22023';
  end if;

  insert into public.sales_orders (tenant_id, number, customer_id, quote_id, total_price_cents, total_cost_cents, created_by)
  values (v_tenant, private.next_document_number(v_tenant, 'order'), p_customer_id, null, v_total_price, v_total_cost, v_actor)
  returning id into v_order_id;
  insert into public.sales_order_items (tenant_id, order_id, quote_item_id, product_variant_id, design_revision_id, description, quantity, unit_price_cents, total_price_cents)
  values (v_tenant, v_order_id, null, p_product_variant_id, v_recipe.design_revision_id,
    case when v_variant.variant_name = 'Padrão' then v_variant.product_name else v_variant.product_name || ' · ' || v_variant.variant_name end,
    p_quantity, v_variant.price_cents, v_total_price);
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, v_actor, 'orders.create', 'order', v_order_id,
    jsonb_build_object('customer_id',p_customer_id,'product_variant_id',p_product_variant_id,'quantity',p_quantity,'total_price_cents',v_total_price,'total_cost_cents',v_total_cost));
  return v_order_id;
end;
$$;

create or replace function private.production_order_material_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(qi.material_id, r.material_id) into new.material_id
  from public.sales_order_items i
  left join public.quote_items qi on qi.id = i.quote_item_id and qi.tenant_id = i.tenant_id
  left join public.production_recipes r on r.product_variant_id = i.product_variant_id and r.tenant_id = i.tenant_id and r.active
  where i.id = new.sales_order_item_id and i.tenant_id = new.tenant_id;
  return new;
end;
$$;
revoke all on function private.production_order_material_snapshot() from public, anon, authenticated;
