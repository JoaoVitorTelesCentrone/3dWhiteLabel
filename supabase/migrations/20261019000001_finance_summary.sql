create or replace function public.get_finance_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_open_order_count bigint := 0;
  v_open_balance_cents bigint := 0;
  v_open_orders jsonb := '[]'::jsonb;
begin
  if v_tenant is null or auth.uid() is null or not private.has_tenant_role(array['owner','admin','finance']) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;

  select count(*)::bigint, coalesce(sum(total_price_cents - paid_cents), 0)::bigint
  into v_open_order_count, v_open_balance_cents
  from (
    select o.id, o.total_price_cents,
      coalesce(sum(p.amount_cents), 0)::bigint as paid_cents
    from public.sales_orders o
    left join public.order_payments p on p.tenant_id = o.tenant_id and p.order_id = o.id
    where o.tenant_id = v_tenant
      and o.status <> 'canceled'
    group by o.id, o.total_price_cents
    having o.total_price_cents - coalesce(sum(p.amount_cents), 0) > 0
  ) open_orders;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'number', number,
    'status', status,
    'total_price_cents', total_price_cents,
    'paid_cents', paid_cents,
    'due_cents', due_cents
  ) order by number desc), '[]'::jsonb)
  into v_open_orders
  from (
    select o.id, o.number, o.status, o.total_price_cents,
      coalesce(sum(p.amount_cents), 0)::bigint as paid_cents,
      (o.total_price_cents - coalesce(sum(p.amount_cents), 0))::bigint as due_cents
    from public.sales_orders o
    left join public.order_payments p on p.tenant_id = o.tenant_id and p.order_id = o.id
    where o.tenant_id = v_tenant
      and o.status <> 'canceled'
    group by o.id, o.number, o.status, o.total_price_cents
    having o.total_price_cents - coalesce(sum(p.amount_cents), 0) > 0
    order by o.number desc
    limit 100
  ) limited_open_orders;

  return jsonb_build_object(
    'open_order_count', v_open_order_count,
    'open_balance_cents', v_open_balance_cents,
    'open_orders', v_open_orders
  );
end;
$$;

revoke all on function public.get_finance_summary() from public, anon;
grant execute on function public.get_finance_summary() to authenticated;
