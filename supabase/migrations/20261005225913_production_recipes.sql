create table public.production_recipes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  product_variant_id uuid not null,
  design_revision_id uuid not null,
  material_id uuid not null,
  version integer not null check (version > 0),
  estimated_g integer not null check (estimated_g between 1 and 100000),
  estimated_minutes integer not null check (estimated_minutes between 1 and 1000000),
  units_per_plate integer not null default 1 check (units_per_plate between 1 and 10000),
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, product_variant_id) references public.product_variants(tenant_id, id),
  foreign key (tenant_id, design_revision_id) references public.design_revisions(tenant_id, id),
  foreign key (tenant_id, material_id) references public.materials(tenant_id, id),
  unique (tenant_id, id),
  unique (product_variant_id, version)
);
create unique index production_recipes_one_active_idx on public.production_recipes (product_variant_id) where active;
create index production_recipes_tenant_variant_idx on public.production_recipes (tenant_id, product_variant_id, version desc);
alter table public.production_recipes enable row level security;
create policy production_recipes_select_own on public.production_recipes for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','stock','viewer']))
);
revoke all on public.production_recipes from public, anon, authenticated;
grant select (id, tenant_id, product_variant_id, design_revision_id, material_id, version,
  estimated_g, estimated_minutes, units_per_plate, active, created_at) on public.production_recipes to authenticated;
grant all on public.production_recipes to service_role;

alter table public.quote_items add column material_id uuid;
alter table public.quote_items add foreign key (tenant_id, material_id) references public.materials(tenant_id, id);
grant select (material_id) on public.quote_items to authenticated;
create or replace function public.create_production_recipe(
  p_variant_id uuid, p_design_revision_id uuid, p_material_id uuid,
  p_estimated_g integer, p_estimated_minutes integer, p_units_per_plate integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_version integer; v_recipe_id uuid;
begin
  if v_tenant is null or not private.has_tenant_module('catalog') or not private.has_tenant_module('stock')
    or not private.tenant_license_allows_writes() or not private.has_tenant_role(array['owner','admin']) then
    raise exception 'Recipe access denied' using errcode = '42501';
  end if;
  if p_estimated_g not between 1 and 100000 or p_estimated_minutes not between 1 and 1000000
    or p_units_per_plate not between 1 and 10000 then raise exception 'Invalid recipe values' using errcode = '22023'; end if;
  perform 1 from public.product_variants v join public.products p on p.id = v.product_id and p.tenant_id = v.tenant_id
  where v.id = p_variant_id and v.tenant_id = v_tenant and v.active and p.active for update of v;
  if not found or not exists (
    select 1 from public.design_revisions r join public.designs d on d.id = r.design_id and d.tenant_id = r.tenant_id
    where r.id = p_design_revision_id and r.tenant_id = v_tenant and d.active
  ) or not exists (select 1 from public.materials m where m.id = p_material_id and m.tenant_id = v_tenant and m.active) then
    raise exception 'Invalid recipe references' using errcode = '22023';
  end if;
  select coalesce(max(version),0) + 1 into v_version from public.production_recipes
  where tenant_id = v_tenant and product_variant_id = p_variant_id;
  update public.production_recipes set active = false
  where tenant_id = v_tenant and product_variant_id = p_variant_id and active;
  insert into public.production_recipes (
    tenant_id, product_variant_id, design_revision_id, material_id, version,
    estimated_g, estimated_minutes, units_per_plate, created_by
  ) values (
    v_tenant, p_variant_id, p_design_revision_id, p_material_id, v_version,
    p_estimated_g, p_estimated_minutes, p_units_per_plate, auth.uid()
  ) returning id into v_recipe_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'catalog.create_recipe', 'recipe', v_recipe_id,
    jsonb_build_object('version',v_version,'variant_id',p_variant_id));
  return v_recipe_id;
end;
$$;
revoke all on function public.create_production_recipe(uuid,uuid,uuid,integer,integer,integer) from public, anon;
grant execute on function public.create_production_recipe(uuid,uuid,uuid,integer,integer,integer) to authenticated;

create or replace function private.quote_item_default_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.product_variant_id is not null then
    if new.design_revision_id is null then
      select r.design_revision_id, r.material_id into new.design_revision_id, new.material_id
      from public.production_recipes r
      where r.tenant_id = new.tenant_id and r.product_variant_id = new.product_variant_id and r.active;
    else
      select r.material_id into new.material_id
      from public.production_recipes r
      where r.tenant_id = new.tenant_id and r.product_variant_id = new.product_variant_id
        and r.design_revision_id = new.design_revision_id and r.active;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.quote_item_default_revision() from public, anon, authenticated;
create trigger quote_items_default_revision before insert on public.quote_items
for each row execute function private.quote_item_default_revision();

create or replace function private.production_order_material_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select qi.material_id into new.material_id
  from public.sales_order_items i
  join public.quote_items qi on qi.id = i.quote_item_id and qi.tenant_id = i.tenant_id
  where i.id = new.sales_order_item_id and i.tenant_id = new.tenant_id;
  return new;
end;
$$;
revoke all on function private.production_order_material_snapshot() from public, anon, authenticated;
create trigger production_orders_material_snapshot before insert on public.production_orders
for each row execute function private.production_order_material_snapshot();
