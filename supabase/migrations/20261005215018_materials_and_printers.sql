create table public.materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 120),
  kind text not null check (kind in ('PLA','PETG','ABS','ASA','TPU','resin','other')),
  color text check (color is null or length(btrim(color)) <= 80),
  cost_per_kg_cents bigint not null default 0 check (cost_per_kg_cents between 0 and 999999999),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create index materials_tenant_name_idx on public.materials (tenant_id, active, lower(name));
create trigger materials_set_updated_at before update on public.materials
for each row execute function private.set_updated_at();

create table public.printers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 120),
  model text check (model is null or length(btrim(model)) <= 120),
  status text not null default 'idle' check (status in ('idle','printing','maintenance','disabled')),
  active boolean not null default true,
  runtime_min bigint not null default 0 check (runtime_min >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, name),
  check (status <> 'printing' or active)
);
create index printers_tenant_status_idx on public.printers (tenant_id, status, active);
create trigger printers_set_updated_at before update on public.printers
for each row execute function private.set_updated_at();

create table public.material_spools (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  material_id uuid not null,
  code text not null check (length(btrim(code)) between 1 and 80),
  tare_g integer not null check (tare_g between 0 and 100000),
  initial_gross_g integer not null check (initial_gross_g > tare_g and initial_gross_g <= 100000),
  current_gross_g integer not null check (current_gross_g >= tare_g and current_gross_g <= 100000),
  status text not null default 'active' check (status in ('active','empty','discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, material_id) references public.materials(tenant_id, id),
  unique (tenant_id, id),
  unique (tenant_id, code),
  check (status <> 'empty' or current_gross_g = tare_g)
);
create index material_spools_tenant_status_idx on public.material_spools (tenant_id, status, material_id);
create trigger material_spools_set_updated_at before update on public.material_spools
for each row execute function private.set_updated_at();

create table public.spool_movements (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  spool_id uuid not null,
  kind text not null check (kind in ('receive','adjustment','consume')),
  delta_g integer not null,
  gross_after_g integer not null check (gross_after_g >= 0),
  reason text not null check (length(btrim(reason)) between 2 and 500),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, spool_id) references public.material_spools(tenant_id, id)
);
create index spool_movements_spool_idx on public.spool_movements (tenant_id, spool_id, created_at desc);

alter table public.materials enable row level security;
alter table public.printers enable row level security;
alter table public.material_spools enable row level security;
alter table public.spool_movements enable row level security;

create policy materials_select_own on public.materials for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('stock'))
  and (select private.has_tenant_role(array['owner','admin','stock','production','operator','viewer']))
);
create policy materials_insert_own on public.materials for insert to authenticated with check (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('stock'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin','stock']))
);
create policy materials_update_own on public.materials for update to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('stock'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin','stock']))
) with check (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('stock'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin','stock']))
);
create policy printers_select_own on public.printers for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','stock','viewer']))
);
create policy printers_insert_own on public.printers for insert to authenticated with check (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
);
create policy printers_update_own on public.printers for update to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
) with check (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
);
create policy material_spools_select_own on public.material_spools for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('stock'))
  and (select private.has_tenant_role(array['owner','admin','stock','production','operator','viewer']))
);
create policy spool_movements_select_own on public.spool_movements for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('stock'))
  and (select private.has_tenant_role(array['owner','admin','stock','production','operator','viewer']))
);

revoke all on public.materials, public.printers, public.material_spools, public.spool_movements from public, anon, authenticated;
grant select (id, tenant_id, name, kind, color, active, created_at, updated_at) on public.materials to authenticated;
grant insert on public.materials to authenticated;
grant select, insert on public.printers to authenticated;
grant update (name, kind, color, cost_per_kg_cents, active) on public.materials to authenticated;
grant update (name, model, active) on public.printers to authenticated;
grant select on public.material_spools, public.spool_movements to authenticated;
grant all on public.materials, public.printers, public.material_spools, public.spool_movements to service_role;

create or replace function public.receive_spool(p_material_id uuid, p_code text, p_gross_g integer, p_tare_g integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_spool_id uuid;
begin
  if v_tenant is null or not private.has_tenant_module('stock') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','stock']) then
    raise exception 'Stock access denied' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_code,''))) not between 1 and 80 or p_tare_g not between 0 and 100000
    or p_gross_g not between p_tare_g + 1 and 100000
    or not exists (select 1 from public.materials m where m.id = p_material_id and m.tenant_id = v_tenant and m.active) then
    raise exception 'Invalid spool' using errcode = '22023';
  end if;
  insert into public.material_spools (tenant_id, material_id, code, tare_g, initial_gross_g, current_gross_g)
  values (v_tenant, p_material_id, btrim(p_code), p_tare_g, p_gross_g, p_gross_g)
  returning id into v_spool_id;
  insert into public.spool_movements (tenant_id, spool_id, kind, delta_g, gross_after_g, reason, actor_id)
  values (v_tenant, v_spool_id, 'receive', p_gross_g, p_gross_g, 'Recebimento da bobina', auth.uid());
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'stock.receive_spool', 'spool', v_spool_id,
    jsonb_build_object('gross_g',p_gross_g,'tare_g',p_tare_g));
  return v_spool_id;
end;
$$;
revoke all on function public.receive_spool(uuid,text,integer,integer) from public, anon;
grant execute on function public.receive_spool(uuid,text,integer,integer) to authenticated;

create or replace function public.adjust_spool_weight(p_spool_id uuid, p_new_gross_g integer, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_spool public.material_spools%rowtype;
begin
  if v_tenant is null or not private.has_tenant_module('stock') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','stock']) then
    raise exception 'Stock access denied' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 2 and 500 then
    raise exception 'Adjustment reason required' using errcode = '22023';
  end if;
  select * into v_spool from public.material_spools where id = p_spool_id and tenant_id = v_tenant for update;
  if not found or v_spool.status = 'discarded' or p_new_gross_g not between v_spool.tare_g and 100000 then
    raise exception 'Invalid spool weight' using errcode = '22023';
  end if;
  update public.material_spools
  set current_gross_g = p_new_gross_g, status = case when p_new_gross_g = v_spool.tare_g then 'empty' else 'active' end
  where id = p_spool_id;
  insert into public.spool_movements (tenant_id, spool_id, kind, delta_g, gross_after_g, reason, actor_id)
  values (v_tenant, p_spool_id, 'adjustment', p_new_gross_g - v_spool.current_gross_g, p_new_gross_g, btrim(p_reason), auth.uid());
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'stock.adjust_spool', 'spool', p_spool_id,
    jsonb_build_object('gross_g',v_spool.current_gross_g), jsonb_build_object('gross_g',p_new_gross_g,'reason',btrim(p_reason)));
end;
$$;
revoke all on function public.adjust_spool_weight(uuid,integer,text) from public, anon;
grant execute on function public.adjust_spool_weight(uuid,integer,text) to authenticated;
