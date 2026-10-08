create table public.order_shipments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null,
  carrier text check (carrier is null or length(btrim(carrier)) <= 120),
  tracking_code text check (tracking_code is null or length(btrim(tracking_code)) <= 160),
  shipped_by uuid not null references auth.users(id),
  shipped_at timestamptz not null default now(),
  delivered_at timestamptz,
  foreign key (tenant_id, order_id) references public.sales_orders(tenant_id, id),
  unique (order_id)
);
create index order_shipments_tenant_idx on public.order_shipments (tenant_id, shipped_at desc);

create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null,
  amount_cents bigint not null check (amount_cents between 1 and 999999999999),
  method text not null check (method in ('pix','cash','card','bank_transfer','other')),
  idempotency_key uuid not null,
  received_by uuid not null references auth.users(id),
  received_at timestamptz not null default now(),
  foreign key (tenant_id, order_id) references public.sales_orders(tenant_id, id),
  unique (tenant_id, idempotency_key)
);
create index order_payments_order_idx on public.order_payments (tenant_id, order_id, received_at desc);

create table public.operational_expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  category text not null check (category in ('rent','energy','maintenance','payroll','supplies','shipping','other')),
  amount_cents bigint not null check (amount_cents between 1 and 999999999999),
  description text not null check (length(btrim(description)) between 2 and 500),
  incurred_on date not null,
  idempotency_key uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);
create index operational_expenses_tenant_date_idx on public.operational_expenses (tenant_id, incurred_on desc);

alter table public.order_shipments enable row level security;
alter table public.order_payments enable row level security;
alter table public.operational_expenses enable row level security;
create policy order_shipments_select_own on public.order_shipments for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('orders'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','finance','viewer']))
);
create policy order_payments_select_own on public.order_payments for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_role(array['owner','admin','finance']))
);
create policy operational_expenses_select_own on public.operational_expenses for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_role(array['owner','admin','finance']))
);
revoke all on public.order_shipments, public.order_payments, public.operational_expenses from public, anon, authenticated;
grant select on public.order_shipments, public.order_payments, public.operational_expenses to authenticated;
grant all on public.order_shipments, public.order_payments, public.operational_expenses to service_role;

create or replace function public.ship_order(p_order_id uuid, p_carrier text, p_tracking_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_order public.sales_orders%rowtype; v_shipment_id uuid;
begin
  if v_tenant is null or not private.has_tenant_module('orders') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','sales']) then
    raise exception 'Shipping access denied' using errcode = '42501';
  end if;
  if length(coalesce(p_carrier,'')) > 120 or length(coalesce(p_tracking_code,'')) > 160 then
    raise exception 'Invalid shipment details' using errcode = '22023';
  end if;
  select * into v_order from public.sales_orders where id = p_order_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  if v_order.status = 'shipped' then
    select id into v_shipment_id from public.order_shipments where order_id = p_order_id and tenant_id = v_tenant;
    return v_shipment_id;
  end if;
  if v_order.status <> 'ready' then raise exception 'Order is not ready' using errcode = '22023'; end if;
  insert into public.order_shipments (tenant_id, order_id, carrier, tracking_code, shipped_by)
  values (v_tenant, p_order_id, nullif(btrim(p_carrier),''), nullif(btrim(p_tracking_code),''), auth.uid())
  returning id into v_shipment_id;
  update public.sales_orders set status = 'shipped' where id = p_order_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'orders.ship', 'order', p_order_id, jsonb_build_object('status','ready'),
    jsonb_build_object('status','shipped','shipment_id',v_shipment_id));
  return v_shipment_id;
end;
$$;
revoke all on function public.ship_order(uuid,text,text) from public, anon;
grant execute on function public.ship_order(uuid,text,text) to authenticated;

create or replace function public.deliver_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_status text;
begin
  if v_tenant is null or not private.has_tenant_module('orders') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','sales']) then
    raise exception 'Delivery access denied' using errcode = '42501';
  end if;
  select status into v_status from public.sales_orders where id = p_order_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  if v_status = 'delivered' then return; end if;
  if v_status <> 'shipped' then raise exception 'Order is not shipped' using errcode = '22023'; end if;
  update public.order_shipments set delivered_at = now() where order_id = p_order_id and tenant_id = v_tenant;
  update public.sales_orders set status = 'delivered' where id = p_order_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'orders.deliver', 'order', p_order_id, jsonb_build_object('status','shipped'),
    jsonb_build_object('status','delivered'));
end;
$$;
revoke all on function public.deliver_order(uuid) from public, anon;
grant execute on function public.deliver_order(uuid) to authenticated;

create or replace function public.record_order_payment(p_order_id uuid, p_amount_cents bigint, p_method text, p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_order public.sales_orders%rowtype; v_paid bigint; v_payment_id uuid;
begin
  if v_tenant is null or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','finance']) then
    raise exception 'Payment access denied' using errcode = '42501';
  end if;
  select id into v_payment_id from public.order_payments where tenant_id = v_tenant and idempotency_key = p_idempotency_key;
  if found then return v_payment_id; end if;
  if p_amount_cents not between 1 and 999999999999 or p_method not in ('pix','cash','card','bank_transfer','other')
    or p_idempotency_key is null then raise exception 'Invalid payment' using errcode = '22023'; end if;
  select * into v_order from public.sales_orders where id = p_order_id and tenant_id = v_tenant for update;
  if not found or v_order.status = 'canceled' then raise exception 'Order unavailable' using errcode = '22023'; end if;
  select coalesce(sum(amount_cents),0)::bigint into v_paid from public.order_payments
  where order_id = p_order_id and tenant_id = v_tenant;
  if v_paid + p_amount_cents > v_order.total_price_cents then
    raise exception 'Payment exceeds order balance' using errcode = '22023';
  end if;
  insert into public.order_payments (tenant_id, order_id, amount_cents, method, idempotency_key, received_by)
  values (v_tenant, p_order_id, p_amount_cents, p_method, p_idempotency_key, auth.uid())
  returning id into v_payment_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'finance.receive_payment', 'payment', v_payment_id,
    jsonb_build_object('order_id',p_order_id,'amount_cents',p_amount_cents));
  return v_payment_id;
end;
$$;
revoke all on function public.record_order_payment(uuid,bigint,text,uuid) from public, anon;
grant execute on function public.record_order_payment(uuid,bigint,text,uuid) to authenticated;

create or replace function public.record_operational_expense(
  p_category text, p_amount_cents bigint, p_description text, p_incurred_on date, p_idempotency_key uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_expense_id uuid;
begin
  if v_tenant is null or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','finance']) then
    raise exception 'Expense access denied' using errcode = '42501';
  end if;
  select id into v_expense_id from public.operational_expenses where tenant_id = v_tenant and idempotency_key = p_idempotency_key;
  if found then return v_expense_id; end if;
  if p_category not in ('rent','energy','maintenance','payroll','supplies','shipping','other')
    or p_amount_cents not between 1 and 999999999999
    or length(btrim(coalesce(p_description,''))) not between 2 and 500
    or p_incurred_on is null or p_idempotency_key is null then
    raise exception 'Invalid expense' using errcode = '22023';
  end if;
  insert into public.operational_expenses (tenant_id, category, amount_cents, description, incurred_on, idempotency_key, created_by)
  values (v_tenant, p_category, p_amount_cents, btrim(p_description), p_incurred_on, p_idempotency_key, auth.uid())
  returning id into v_expense_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'finance.record_expense', 'expense', v_expense_id,
    jsonb_build_object('category',p_category,'amount_cents',p_amount_cents));
  return v_expense_id;
end;
$$;
revoke all on function public.record_operational_expense(text,bigint,text,date,uuid) from public, anon;
grant execute on function public.record_operational_expense(text,bigint,text,date,uuid) to authenticated;
