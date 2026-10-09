create table public.finished_goods_stock (
  tenant_id uuid not null,
  product_variant_id uuid not null,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, product_variant_id),
  foreign key (tenant_id, product_variant_id) references public.product_variants(tenant_id, id) on delete cascade
);

create table public.finished_goods_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  product_variant_id uuid not null,
  kind text not null check (kind in ('initial', 'adjustment')),
  delta_quantity integer not null check (delta_quantity <> 0),
  quantity_after integer not null check (quantity_after >= 0),
  reason text not null check (length(btrim(reason)) between 2 and 500),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, product_variant_id) references public.product_variants(tenant_id, id)
);

create index finished_goods_movements_variant_created_idx on public.finished_goods_movements (tenant_id, product_variant_id, created_at desc);

alter table public.finished_goods_stock enable row level security;
alter table public.finished_goods_movements enable row level security;

create policy finished_goods_stock_select_own on public.finished_goods_stock for select to authenticated using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('stock'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','stock','viewer']))
);
create policy finished_goods_movements_select_own on public.finished_goods_movements for select to authenticated using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('stock'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','stock','viewer']))
);

revoke all on public.finished_goods_stock, public.finished_goods_movements from public, anon, authenticated;
grant select on public.finished_goods_stock, public.finished_goods_movements to authenticated;
grant all on public.finished_goods_stock, public.finished_goods_movements to service_role;

create or replace function public.set_finished_goods_quantity(
  p_product_variant_id uuid, p_quantity integer, p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_previous integer := 0;
begin
  if v_tenant is null or not private.has_tenant_module('stock') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','stock']) then
    raise exception 'Finished goods stock access denied' using errcode = '42501';
  end if;
  if p_quantity not between 0 and 1000000 or length(btrim(coalesce(p_reason, ''))) not between 2 and 500 then
    raise exception 'Invalid finished goods stock adjustment' using errcode = '22023';
  end if;
  perform 1 from public.product_variants where id = p_product_variant_id and tenant_id = v_tenant and active for key share;
  if not found then raise exception 'Product variant not found' using errcode = '22023'; end if;
  select quantity into v_previous from public.finished_goods_stock
  where tenant_id = v_tenant and product_variant_id = p_product_variant_id for update;
  v_previous := coalesce(v_previous, 0);
  if v_previous = p_quantity then return; end if;
  insert into public.finished_goods_stock (tenant_id, product_variant_id, quantity)
  values (v_tenant, p_product_variant_id, p_quantity)
  on conflict (tenant_id, product_variant_id) do update set quantity = excluded.quantity, updated_at = now();
  insert into public.finished_goods_movements (tenant_id, product_variant_id, kind, delta_quantity, quantity_after, reason, actor_id)
  values (v_tenant, p_product_variant_id, case when v_previous = 0 then 'initial' else 'adjustment' end,
    p_quantity - v_previous, p_quantity, btrim(p_reason), auth.uid());
end;
$$;
revoke all on function public.set_finished_goods_quantity(uuid, integer, text) from public, anon;
grant execute on function public.set_finished_goods_quantity(uuid, integer, text) to authenticated;
