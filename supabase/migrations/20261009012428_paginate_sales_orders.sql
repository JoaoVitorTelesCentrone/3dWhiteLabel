-- Keep search, count and pagination inside Postgres. The caller's RLS still applies.
create or replace function public.list_sales_orders_page(
  p_tenant_id uuid,
  p_page integer default 1,
  p_page_size integer default 10,
  p_search text default '',
  p_status text default '',
  p_selected_order_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with options as (
    select
      least(greatest(coalesce(p_page_size, 10), 1), 50) as page_size,
      nullif(btrim(coalesce(p_search, '')), '') as search_text,
      nullif(btrim(coalesce(p_status, '')), '') as status_text
  ),
  filtered as (
    select o.id, o.number, o.customer_id, c.name as customer_name,
      o.quote_id, o.status, o.total_price_cents, o.total_cost_cents, o.created_at
    from public.sales_orders o
    join public.customers c on c.id = o.customer_id and c.tenant_id = o.tenant_id
    cross join options opt
    where o.tenant_id = p_tenant_id
      and (opt.status_text is null or o.status = opt.status_text)
      and (opt.search_text is null
        or strpos(lower(o.number::text), lower(opt.search_text)) > 0
        or strpos(lower(c.name), lower(opt.search_text)) > 0
        or strpos(lower(o.status), lower(opt.search_text)) > 0
        or exists (
          select 1 from public.sales_order_items i
          where i.tenant_id = o.tenant_id and i.order_id = o.id
            and strpos(lower(i.description), lower(opt.search_text)) > 0
        ))
  ),
  total as (select count(*)::integer as value from filtered),
  target_page as (
    select ((count(*)::integer / (select page_size from options)) + 1) as value
    from filtered f
    where p_selected_order_id is not null
      and f.number > (select selected.number from filtered selected where selected.id = p_selected_order_id)
  ),
  current_page as (
    select case
      when p_selected_order_id is not null and exists (select 1 from filtered where id = p_selected_order_id)
        then (select value from target_page)
      else least(greatest(coalesce(p_page, 1), 1), greatest(1, (total.value + opt.page_size - 1) / opt.page_size))
    end as value
    from total cross join options opt
  ),
  page_rows as (
    select f.* from filtered f
    order by f.number desc
    limit (select page_size from options)
    offset ((select value from current_page) - 1) * (select page_size from options)
  )
  select jsonb_build_object(
    'count', (select value from total),
    'page', (select value from current_page),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'number', p.number,
        'customer_id', p.customer_id,
        'customer_name', p.customer_name,
        'quote_id', p.quote_id,
        'status', p.status,
        'total_price_cents', p.total_price_cents,
        'total_cost_cents', p.total_cost_cents,
        'created_at', p.created_at,
        'item_summary', items.item_summary,
        'item_count', items.item_count,
        'edit_item_id', items.item_ids[1],
        'edit_variant_id', items.variant_ids[1],
        'edit_quantity', items.quantities[1],
        'can_edit', p.status = 'open' and p.quote_id is null
          and items.item_count = 1 and items.quote_item_ids[1] is null
          and not exists (select 1 from public.order_payments pay where pay.tenant_id = p_tenant_id and pay.order_id = p.id)
          and not exists (select 1 from public.production_orders prod where prod.tenant_id = p_tenant_id and prod.sales_order_id = p.id)
          and not exists (select 1 from public.order_shipments ship where ship.tenant_id = p_tenant_id and ship.order_id = p.id)
      ) order by p.number desc)
      from page_rows p
      cross join lateral (
        select count(*)::integer as item_count,
          coalesce(string_agg(i.quantity::text || ' × ' || i.description, ', ' order by i.id), '') as item_summary,
          array_agg(i.id order by i.id) as item_ids,
          array_agg(i.product_variant_id order by i.id) as variant_ids,
          array_agg(i.quantity order by i.id) as quantities,
          array_agg(i.quote_item_id order by i.id) as quote_item_ids
        from public.sales_order_items i
        where i.tenant_id = p_tenant_id and i.order_id = p.id
      ) items
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.list_sales_orders_page(uuid, integer, integer, text, text, uuid) from public, anon;
grant execute on function public.list_sales_orders_page(uuid, integer, integer, text, text, uuid) to authenticated;
