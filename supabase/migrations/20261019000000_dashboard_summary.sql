create or replace function public.get_dashboard_summary(
  p_month_start date,
  p_month_end date,
  p_chart_start date,
  p_chart_end date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_orders_allowed boolean := private.has_tenant_module('orders') and private.has_tenant_role(array['owner','admin','sales','finance','viewer']);
  v_production_allowed boolean := private.has_tenant_module('production') and private.has_tenant_role(array['owner','admin','production','operator','viewer']);
  v_catalog_allowed boolean := private.has_tenant_module('catalog') and private.has_tenant_role(array['owner','admin','sales','production','stock','viewer']);
  v_finance_allowed boolean := private.has_tenant_role(array['owner','admin','finance']);
  v_costs_allowed boolean := private.has_tenant_role(array['owner','admin','production','operator','finance']);
  v_orders jsonb := null;
  v_production jsonb := null;
  v_catalog jsonb := null;
  v_finance jsonb := null;
  v_ongoing_orders bigint := 0;
  v_month_order_count bigint := 0;
  v_month_sales_cents bigint := 0;
  v_month_cost_cents bigint := 0;
  v_active_jobs bigint := 0;
  v_active_products bigint := 0;
  v_month_received_cents bigint := 0;
  v_month_expenses_cents bigint := 0;
  v_order_statuses jsonb := '{}'::jsonb;
  v_sales_by_month jsonb := '[]'::jsonb;
  v_received_by_month jsonb := '[]'::jsonb;
begin
  if v_tenant is null or auth.uid() is null
    or p_month_start is null or p_month_end is null
    or p_chart_start is null or p_chart_end is null
    or p_month_end < p_month_start
    or p_chart_end < p_chart_start
    or p_chart_end - p_chart_start > 366 then
    raise exception 'Dashboard access denied or invalid date range' using errcode = '42501';
  end if;

  if v_orders_allowed then
    select count(*) filter (where status in ('open', 'in_production'))::bigint,
      count(*) filter (where created_at >= (p_month_start::timestamp at time zone 'America/Sao_Paulo')
        and created_at < ((p_month_end + 1)::timestamp at time zone 'America/Sao_Paulo'))::bigint,
      coalesce(sum(total_price_cents) filter (where created_at >= (p_month_start::timestamp at time zone 'America/Sao_Paulo')
        and created_at < ((p_month_end + 1)::timestamp at time zone 'America/Sao_Paulo')), 0)::bigint,
      coalesce(sum(total_cost_cents) filter (where created_at >= (p_month_start::timestamp at time zone 'America/Sao_Paulo')
        and created_at < ((p_month_end + 1)::timestamp at time zone 'America/Sao_Paulo')), 0)::bigint
    into v_ongoing_orders, v_month_order_count, v_month_sales_cents, v_month_cost_cents
    from public.sales_orders
    where tenant_id = v_tenant and status <> 'canceled';

    select coalesce(jsonb_object_agg(status, status_count), '{}'::jsonb)
    into v_order_statuses
    from (
      select status, count(*)::bigint as status_count
      from public.sales_orders
      where tenant_id = v_tenant and status <> 'canceled'
        and created_at >= (p_month_start::timestamp at time zone 'America/Sao_Paulo')
        and created_at < ((p_month_end + 1)::timestamp at time zone 'America/Sao_Paulo')
      group by status
    ) statuses;

    select coalesce(jsonb_agg(jsonb_build_object(
      'key', month_key, 'sales_cents', sales_cents, 'order_count', order_count
    ) order by month_key), '[]'::jsonb)
    into v_sales_by_month
    from (
      select to_char(created_at at time zone 'America/Sao_Paulo', 'YYYY-MM') as month_key,
        coalesce(sum(total_price_cents), 0)::bigint as sales_cents,
        count(*)::bigint as order_count
      from public.sales_orders
      where tenant_id = v_tenant and status <> 'canceled'
        and created_at >= (p_chart_start::timestamp at time zone 'America/Sao_Paulo')
        and created_at < ((p_chart_end + 1)::timestamp at time zone 'America/Sao_Paulo')
      group by to_char(created_at at time zone 'America/Sao_Paulo', 'YYYY-MM')
    ) monthly_sales;

    v_orders := jsonb_build_object(
      'ongoing_count', v_ongoing_orders,
      'month_order_count', v_month_order_count,
      'month_sales_cents', v_month_sales_cents,
      'month_cost_cents', case when v_costs_allowed then v_month_cost_cents else null end,
      'statuses', v_order_statuses,
      'sales_by_month', v_sales_by_month
    );
  end if;

  if v_production_allowed then
    select count(*)::bigint into v_active_jobs
    from public.production_jobs
    where tenant_id = v_tenant and status in ('queued', 'running');
    v_production := jsonb_build_object('active_job_count', v_active_jobs);
  end if;

  if v_catalog_allowed then
    select count(*)::bigint into v_active_products
    from public.products
    where tenant_id = v_tenant and active;
    v_catalog := jsonb_build_object('active_product_count', v_active_products);
  end if;

  if v_finance_allowed then
    select coalesce(sum(amount_cents), 0)::bigint into v_month_received_cents
    from public.order_payments
    where tenant_id = v_tenant
      and received_at >= (p_month_start::timestamp at time zone 'America/Sao_Paulo')
      and received_at < ((p_month_end + 1)::timestamp at time zone 'America/Sao_Paulo');

    select coalesce(sum(amount_cents), 0)::bigint into v_month_expenses_cents
    from public.operational_expenses
    where tenant_id = v_tenant and incurred_on between p_month_start and p_month_end;

    select coalesce(jsonb_agg(jsonb_build_object(
      'key', month_key, 'received_cents', received_cents
    ) order by month_key), '[]'::jsonb)
    into v_received_by_month
    from (
      select to_char(received_at at time zone 'America/Sao_Paulo', 'YYYY-MM') as month_key,
        coalesce(sum(amount_cents), 0)::bigint as received_cents
      from public.order_payments
      where tenant_id = v_tenant
        and received_at >= (p_chart_start::timestamp at time zone 'America/Sao_Paulo')
        and received_at < ((p_chart_end + 1)::timestamp at time zone 'America/Sao_Paulo')
      group by to_char(received_at at time zone 'America/Sao_Paulo', 'YYYY-MM')
    ) monthly_received;

    v_finance := jsonb_build_object(
      'month_received_cents', v_month_received_cents,
      'month_expenses_cents', v_month_expenses_cents,
      'received_by_month', v_received_by_month
    );
  end if;

  return jsonb_build_object(
    'orders', v_orders,
    'production', v_production,
    'catalog', v_catalog,
    'finance', v_finance
  );
end;
$$;

revoke all on function public.get_dashboard_summary(date, date, date, date) from public, anon;
grant execute on function public.get_dashboard_summary(date, date, date, date) to authenticated;
