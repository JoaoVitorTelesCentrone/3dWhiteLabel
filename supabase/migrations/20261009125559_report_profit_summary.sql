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
  select count(*)::bigint, coalesce(sum(total_price_cents),0)::bigint,
    coalesce(sum(total_cost_cents),0)::bigint into v_order_count, v_sales_cents, v_planned_cost_cents
  from public.sales_orders
  where tenant_id = v_tenant and status <> 'canceled'
    and created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and created_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');

  select count(*)::bigint, coalesce(sum(good_qty),0)::bigint, coalesce(sum(bad_qty),0)::bigint,
    coalesce(sum(actual_minutes),0)::bigint
  into v_job_count, v_good_qty, v_bad_qty, v_print_minutes
  from public.production_jobs where tenant_id = v_tenant and status = 'completed'
    and completed_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and completed_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');

  select count(*)::bigint into v_failures from public.job_failures
  where tenant_id = v_tenant and created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and created_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');

  if v_finance_allowed then
    select coalesce(sum(amount_cents),0)::bigint into v_received_cents from public.order_payments
    where tenant_id = v_tenant and received_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
      and received_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');

    select coalesce(sum(amount_cents),0)::bigint into v_expenses_cents from public.operational_expenses
    where tenant_id = v_tenant and incurred_on between p_start and p_end;

    select coalesce(sum(ceil(coalesce(j.material_cost_per_kg_cents,m.cost_per_kg_cents)::numeric * j.consumed_g / 1000)),0)::bigint into v_material_cents
    from public.production_jobs j
    join public.material_spools s on s.id = j.spool_id and s.tenant_id = j.tenant_id
    join public.materials m on m.id = s.material_id and m.tenant_id = s.tenant_id
    where j.tenant_id = v_tenant and j.status in ('completed','failed') and j.consumed_g is not null
      and j.completed_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
      and j.completed_at < ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
  end if;

  return jsonb_build_object('period_start',p_start,'period_end',p_end,'orders_count',v_order_count,
    'jobs_completed',v_job_count,'jobs_failed',v_failures,'good_qty',v_good_qty,'bad_qty',v_bad_qty,
    'print_minutes',v_print_minutes,'finance',case when v_finance_allowed then jsonb_build_object(
      'sales_cents',v_sales_cents,'planned_cost_cents',v_planned_cost_cents,
      'planned_gross_margin_cents',v_sales_cents-v_planned_cost_cents,'received_cents',v_received_cents,
      'expenses_cents',v_expenses_cents,'actual_material_cents',v_material_cents,
      'net_profit_cents',v_received_cents-v_expenses_cents-v_material_cents) else null end);
end;
$$;

revoke all on function public.get_operational_report(date,date) from public, anon;
grant execute on function public.get_operational_report(date,date) to authenticated;
