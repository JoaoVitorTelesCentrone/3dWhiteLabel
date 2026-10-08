-- Orders are the commercial entry point. Quotes remain readable historical records,
-- but new orders snapshot price and cost from the selected product variant.
alter table public.sales_orders
  alter column quote_id drop not null,
  add column total_cost_cents bigint not null default 0 check (total_cost_cents >= 0);

alter table public.sales_order_items
  alter column quote_item_id drop not null;

update public.sales_orders o
set total_cost_cents = q.total_cost_cents
from public.quotes q
where o.quote_id = q.id
  and o.tenant_id = q.tenant_id;

create or replace function public.create_sales_order(
  p_customer_id uuid,
  p_product_variant_id uuid,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_actor uuid := auth.uid();
  v_variant record;
  v_order_id uuid;
  v_description text;
  v_total_price bigint;
  v_total_cost bigint;
begin
  if v_tenant is null
    or v_actor is null
    or not private.has_tenant_role(array['owner','admin','sales'])
    or not private.has_tenant_module('orders')
    or not private.tenant_license_allows_writes() then
    raise exception 'Order access denied' using errcode = '42501';
  end if;

  if p_quantity not between 1 and 100000
    or not exists (
      select 1
      from public.customers c
      where c.id = p_customer_id
        and c.tenant_id = v_tenant
        and c.archived_at is null
    ) then
    raise exception 'Invalid order reference' using errcode = '22023';
  end if;

  select
    v.id,
    v.name as variant_name,
    v.price_cents,
    v.cost_cents,
    p.name as product_name
  into v_variant
  from public.product_variants v
  join public.products p
    on p.id = v.product_id
    and p.tenant_id = v.tenant_id
  where v.id = p_product_variant_id
    and v.tenant_id = v_tenant
    and v.active
    and p.active;

  if not found
    or v_variant.price_cents is null
    or v_variant.cost_cents is null then
    raise exception 'The selected product needs price and cost' using errcode = '22023';
  end if;

  v_total_price := v_variant.price_cents * p_quantity;
  v_total_cost := v_variant.cost_cents * p_quantity;
  if v_total_price > 999999999999 or v_total_cost > 999999999999 then
    raise exception 'Order total exceeds limit' using errcode = '22023';
  end if;
  v_description := case
    when v_variant.variant_name = 'Padrão' then v_variant.product_name
    else v_variant.product_name || ' · ' || v_variant.variant_name
  end;

  insert into public.sales_orders (
    tenant_id,
    number,
    customer_id,
    quote_id,
    total_price_cents,
    total_cost_cents,
    created_by
  ) values (
    v_tenant,
    private.next_document_number(v_tenant, 'order'),
    p_customer_id,
    null,
    v_total_price,
    v_total_cost,
    v_actor
  ) returning id into v_order_id;

  insert into public.sales_order_items (
    tenant_id,
    order_id,
    quote_item_id,
    product_variant_id,
    design_revision_id,
    description,
    quantity,
    unit_price_cents,
    total_price_cents
  ) values (
    v_tenant,
    v_order_id,
    null,
    p_product_variant_id,
    null,
    v_description,
    p_quantity,
    v_variant.price_cents,
    v_total_price
  );

  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (
    v_tenant,
    v_actor,
    'orders.create',
    'order',
    v_order_id,
    jsonb_build_object(
      'customer_id', p_customer_id,
      'product_variant_id', p_product_variant_id,
      'quantity', p_quantity,
      'total_price_cents', v_total_price,
      'total_cost_cents', v_total_cost
    )
  );

  return v_order_id;
end;
$$;

revoke all on function public.create_sales_order(uuid, uuid, integer) from public, anon;
grant execute on function public.create_sales_order(uuid, uuid, integer) to authenticated;

create or replace function public.get_operational_report(p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_finance_allowed boolean;
  v_order_count bigint;
  v_job_count bigint;
  v_good_qty bigint;
  v_bad_qty bigint;
  v_failures bigint;
  v_print_minutes bigint;
  v_sales_cents bigint;
  v_planned_cost_cents bigint;
  v_received_cents bigint;
  v_expenses_cents bigint;
  v_material_cents bigint;
begin
  if v_tenant is null or not private.has_tenant_role(array['owner','admin','finance','viewer'])
    or p_start is null or p_end is null or p_end < p_start or p_end - p_start > 366 then
    raise exception 'Report access denied or invalid date range' using errcode = '42501';
  end if;
  v_finance_allowed := private.has_tenant_role(array['owner','admin','finance']);
  select count(*)::bigint, coalesce(sum(total_price_cents),0)::bigint into v_order_count, v_sales_cents
  from public.sales_orders
  where tenant_id = v_tenant and status <> 'canceled'
    and created_at >= p_start::timestamptz and created_at < (p_end + 1)::timestamptz;
  select count(*)::bigint, coalesce(sum(good_qty),0)::bigint, coalesce(sum(bad_qty),0)::bigint,
    coalesce(sum(actual_minutes),0)::bigint
  into v_job_count, v_good_qty, v_bad_qty, v_print_minutes
  from public.production_jobs
  where tenant_id = v_tenant and status = 'completed'
    and completed_at >= p_start::timestamptz and completed_at < (p_end + 1)::timestamptz;
  select count(*)::bigint into v_failures from public.job_failures
  where tenant_id = v_tenant and created_at >= p_start::timestamptz and created_at < (p_end + 1)::timestamptz;
  if v_finance_allowed then
    select coalesce(sum(total_cost_cents),0)::bigint into v_planned_cost_cents
    from public.sales_orders
    where tenant_id = v_tenant and status <> 'canceled'
      and created_at >= p_start::timestamptz and created_at < (p_end + 1)::timestamptz;
    select coalesce(sum(amount_cents),0)::bigint into v_received_cents from public.order_payments
    where tenant_id = v_tenant and received_at >= p_start::timestamptz and received_at < (p_end + 1)::timestamptz;
    select coalesce(sum(amount_cents),0)::bigint into v_expenses_cents from public.operational_expenses
    where tenant_id = v_tenant and incurred_on between p_start and p_end;
    select coalesce(sum(ceil(m.cost_per_kg_cents::numeric * j.consumed_g / 1000)),0)::bigint into v_material_cents
    from public.production_jobs j
    join public.material_spools s on s.id = j.spool_id and s.tenant_id = j.tenant_id
    join public.materials m on m.id = s.material_id and m.tenant_id = s.tenant_id
    where j.tenant_id = v_tenant and j.status in ('completed','failed') and j.consumed_g is not null
      and j.completed_at >= p_start::timestamptz and j.completed_at < (p_end + 1)::timestamptz;
  end if;
  return jsonb_build_object(
    'period_start', p_start, 'period_end', p_end,
    'orders_count', v_order_count, 'jobs_completed', v_job_count, 'jobs_failed', v_failures,
    'good_qty', v_good_qty, 'bad_qty', v_bad_qty, 'print_minutes', v_print_minutes,
    'finance', case when v_finance_allowed then jsonb_build_object(
      'sales_cents', v_sales_cents, 'planned_cost_cents', v_planned_cost_cents,
      'planned_gross_margin_cents', v_sales_cents - v_planned_cost_cents,
      'received_cents', v_received_cents, 'expenses_cents', v_expenses_cents,
      'actual_material_cents', v_material_cents
    ) else null end
  );
end;
$$;

revoke all on function public.get_operational_report(date, date) from public, anon;
grant execute on function public.get_operational_report(date, date) to authenticated;
