create table public.platform_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
create policy platform_admins_select_self on public.platform_admins for select to authenticated using (
  id = (select auth.uid()) and active
);
revoke all on public.platform_admins from public, anon, authenticated;
grant select (id, full_name, active) on public.platform_admins to authenticated;
grant all on public.platform_admins to service_role;

create table public.platform_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.platform_admins(id),
  tenant_id uuid references platform.tenants(id),
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index platform_audit_events_created_idx on public.platform_audit_events (created_at desc);
alter table public.platform_audit_events enable row level security;
revoke all on public.platform_audit_events from public, anon, authenticated;
grant all on public.platform_audit_events to service_role;

create or replace function public.platform_update_tenant(
  p_tenant_id uuid, p_plan text, p_license_status text, p_actor_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_before platform.tenants%rowtype;
begin
  if auth.role() <> 'service_role'
    or not exists (select 1 from public.platform_admins a where a.id = p_actor_id and a.active) then
    raise exception 'Platform access denied' using errcode = '42501';
  end if;
  if p_plan not in ('start','pro','business') or p_license_status not in ('active','past_due','suspended') then
    raise exception 'Invalid plan or license status' using errcode = '22023';
  end if;
  select * into v_before from platform.tenants where id = p_tenant_id for update;
  if not found then raise exception 'Tenant not found' using errcode = '22023'; end if;
  update platform.tenants set plan = p_plan, license_status = p_license_status where id = p_tenant_id;
  insert into public.platform_audit_events (actor_id, tenant_id, action, before_state, after_state)
  values (p_actor_id, p_tenant_id, 'tenant.update',
    jsonb_build_object('plan',v_before.plan,'license_status',v_before.license_status),
    jsonb_build_object('plan',p_plan,'license_status',p_license_status));
end;
$$;
revoke all on function public.platform_update_tenant(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.platform_update_tenant(uuid,text,text,uuid) to service_role;

create or replace function public.platform_set_module(
  p_tenant_id uuid, p_module_key text, p_enabled boolean, p_actor_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_previous boolean;
begin
  if auth.role() <> 'service_role'
    or not exists (select 1 from public.platform_admins a where a.id = p_actor_id and a.active)
    or not exists (select 1 from platform.tenants t where t.id = p_tenant_id) then
    raise exception 'Platform access denied' using errcode = '42501';
  end if;
  select enabled into v_previous from public.tenant_modules
  where tenant_id = p_tenant_id and module_key = p_module_key for update;
  insert into public.tenant_modules (tenant_id, module_key, enabled)
  values (p_tenant_id, p_module_key, p_enabled)
  on conflict (tenant_id, module_key) do update set enabled = excluded.enabled;
  insert into public.platform_audit_events (actor_id, tenant_id, action, before_state, after_state)
  values (p_actor_id, p_tenant_id, 'tenant.module', jsonb_build_object('key',p_module_key,'enabled',v_previous),
    jsonb_build_object('key',p_module_key,'enabled',p_enabled));
end;
$$;
revoke all on function public.platform_set_module(uuid,text,boolean,uuid) from public, anon, authenticated;
grant execute on function public.platform_set_module(uuid,text,boolean,uuid) to service_role;

create or replace function public.platform_assign_tenant_user(
  p_tenant_id uuid, p_user_id uuid, p_full_name text, p_email text, p_role text, p_actor_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role'
    or p_role not in ('admin','sales','production','operator','stock','finance','viewer')
    or length(btrim(coalesce(p_full_name,''))) not between 1 and 120
    or length(btrim(coalesce(p_email,''))) not between 3 and 254
    or not exists (
      select 1 from public.profiles p join platform.tenants t on t.id = p.tenant_id
      where p.id = p_actor_id and p.tenant_id = p_tenant_id and p.active
        and p.role in ('owner','admin') and t.license_status <> 'suspended'
    ) then raise exception 'Tenant user access denied' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'User already assigned' using errcode = '23505';
  end if;
  insert into public.profiles (id, tenant_id, full_name, email, role, active)
  values (p_user_id, p_tenant_id, btrim(p_full_name), lower(btrim(p_email)), p_role, true);
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (p_tenant_id, p_actor_id, 'users.invite', 'profile', p_user_id,
    jsonb_build_object('role',p_role,'email',lower(btrim(p_email))));
end;
$$;
revoke all on function public.platform_assign_tenant_user(uuid,uuid,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.platform_assign_tenant_user(uuid,uuid,text,text,text,uuid) to service_role;

create or replace function public.platform_update_tenant_user(
  p_tenant_id uuid, p_user_id uuid, p_role text, p_active boolean, p_actor_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_before public.profiles%rowtype;
begin
  if auth.role() <> 'service_role'
    or p_role not in ('admin','sales','production','operator','stock','finance','viewer')
    or p_actor_id = p_user_id
    or not exists (
      select 1 from public.profiles p join platform.tenants t on t.id = p.tenant_id
      where p.id = p_actor_id and p.tenant_id = p_tenant_id and p.active
        and p.role in ('owner','admin') and t.license_status <> 'suspended'
    ) then raise exception 'Tenant user access denied' using errcode = '42501';
  end if;
  select * into v_before from public.profiles
  where id = p_user_id and tenant_id = p_tenant_id for update;
  if not found or v_before.role = 'owner' then raise exception 'User unavailable' using errcode = '22023'; end if;
  update public.profiles set role = p_role, active = p_active where id = p_user_id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (p_tenant_id, p_actor_id, 'users.update', 'profile', p_user_id,
    jsonb_build_object('role',v_before.role,'active',v_before.active),
    jsonb_build_object('role',p_role,'active',p_active));
end;
$$;
revoke all on function public.platform_update_tenant_user(uuid,uuid,text,boolean,uuid) from public, anon, authenticated;
grant execute on function public.platform_update_tenant_user(uuid,uuid,text,boolean,uuid) to service_role;
