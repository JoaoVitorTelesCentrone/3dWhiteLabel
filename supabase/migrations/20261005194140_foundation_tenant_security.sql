create schema if not exists platform;
create schema if not exists private;

revoke all on schema platform from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated;
grant usage on schema platform to authenticated, service_role;
grant usage on schema private to authenticated;

create table platform.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$'),
  plan text not null default 'start' check (plan in ('start', 'pro', 'business')),
  license_status text not null default 'active'
    check (license_status in ('active', 'past_due', 'suspended')),
  setup_status text not null default 'provisioning'
    check (setup_status in ('provisioning', 'active')),
  maintenance_status text not null default 'inactive'
    check (maintenance_status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  host text not null unique check (
    host = lower(btrim(host)) and host !~ '[/@?#:]' and length(host) between 3 and 253
  ),
  kind text not null default 'subdomain' check (kind in ('subdomain', 'custom')),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index tenant_domains_tenant_id_idx on public.tenant_domains (tenant_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references platform.tenants(id) on delete restrict,
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  email text not null,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'sales', 'production', 'operator', 'stock', 'finance', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);
create index profiles_tenant_id_idx on public.profiles (tenant_id);

create table public.tenant_settings (
  tenant_id uuid primary key references platform.tenants(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  locale text not null default 'pt-BR' check (locale = 'pt-BR'),
  currency text not null default 'BRL' check (currency = 'BRL'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_modules (
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  module_key text not null check (module_key in (
    'crm', 'quotes', 'orders', 'catalog', 'stock', 'printers', 'production',
    'maintenance', 'quality', 'qr_codes', 'actual_costs', 'planner', 'advanced_reports',
    'customer_portal', 'api', 'integrations', 'ai', 'multiunit', 'remove_branding'
  )),
  enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_key)
);
create index tenant_modules_tenant_id_idx on public.tenant_modules (tenant_id);
revoke all on public.tenant_modules from public, anon, authenticated;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 160),
  company_name text check (company_name is null or length(btrim(company_name)) <= 160),
  email text check (email is null or (length(email) <= 254 and position('@' in email) > 1)),
  phone text check (phone is null or length(phone) <= 40),
  notes text check (notes is null or length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index customers_tenant_name_idx on public.customers (tenant_id, lower(name));
revoke all on public.customers from public, anon, authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 160),
  category text check (category is null or length(btrim(category)) <= 80),
  description text check (description is null or length(description) <= 4000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create index products_tenant_active_name_idx on public.products (tenant_id, active, lower(name));
revoke all on public.products from public, anon, authenticated;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  product_id uuid not null,
  name text not null check (length(btrim(name)) between 1 and 120),
  sku text not null check (length(btrim(sku)) between 1 and 80),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  price_cents bigint not null check (price_cents between 0 and 999999999999),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete cascade,
  unique (tenant_id, sku)
);

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 160),
  description text check (description is null or length(description) <= 4000),
  category text check (category is null or length(btrim(category)) <= 80),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create index designs_tenant_active_name_idx on public.designs (tenant_id, active, lower(name));
revoke all on public.designs from public, anon, authenticated;

create table public.design_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references platform.tenants(id) on delete cascade,
  design_id uuid not null,
  version text not null check (length(btrim(version)) between 1 and 40),
  notes text check (notes is null or length(notes) <= 4000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, design_id) references public.designs(tenant_id, id) on delete cascade,
  unique (tenant_id, id),
  unique (tenant_id, design_id, id),
  unique (design_id, version)
);
create index design_revisions_design_idx on public.design_revisions (tenant_id, design_id, created_at desc);
revoke all on public.design_revisions from public, anon, authenticated;

create table public.design_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  design_id uuid not null,
  revision_id uuid not null,
  storage_path text not null unique,
  filename text not null check (length(btrim(filename)) between 1 and 255),
  format text not null check (format in ('stl', '3mf', 'step', 'stp', 'obj', 'gcode')),
  mime_type text not null check (length(mime_type) <= 160),
  size_bytes bigint not null check (size_bytes between 1 and 104857600),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, design_id) references public.designs(tenant_id, id) on delete cascade,
  foreign key (tenant_id, design_id, revision_id) references public.design_revisions(tenant_id, design_id, id) on delete cascade,
  check (lower(storage_path) ~ '\.(stl|3mf|step|stp|obj|gcode)$'),
  check (format = regexp_replace(lower(storage_path), '^.*\.', ''))
);
create index design_files_revision_idx on public.design_files (tenant_id, revision_id, created_at desc);
revoke all on public.design_files from public, anon, authenticated;
create index product_variants_product_idx on public.product_variants (tenant_id, product_id, active);
revoke all on public.product_variants from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger tenants_set_updated_at before update on platform.tenants
for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger tenant_settings_set_updated_at before update on public.tenant_settings
for each row execute function private.set_updated_at();
create trigger tenant_modules_set_updated_at before update on public.tenant_modules
for each row execute function private.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function private.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function private.set_updated_at();
create trigger designs_set_updated_at before update on public.designs
for each row execute function private.set_updated_at();

create or replace function private.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.tenant_id
  from public.profiles as p
  where p.id = (select auth.uid()) and p.active
  limit 1
$$;

create or replace function private.has_tenant_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.active
      and p.role = any (allowed_roles)
  )
$$;

create or replace function private.tenant_license_allows_writes()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from platform.tenants as t
    where t.id = (select private.current_tenant_id())
      and t.license_status <> 'suspended'
  )
$$;

create or replace function private.has_tenant_module(module_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select tm.enabled
      from public.tenant_modules as tm
      where tm.tenant_id = (select private.current_tenant_id())
        and tm.module_key = $1
    ),
    exists (
      select 1
      from platform.tenants as t
      where t.id = (select private.current_tenant_id())
        and case t.plan
          when 'start' then $1 = any (array['crm','quotes','orders','catalog','stock','printers','production'])
          when 'pro' then $1 = any (array['crm','quotes','orders','catalog','stock','printers','production','maintenance','quality','qr_codes','actual_costs','planner','advanced_reports'])
          when 'business' then $1 = any (array['crm','quotes','orders','catalog','stock','printers','production','maintenance','quality','qr_codes','actual_costs','planner','advanced_reports','customer_portal','api','integrations','ai','multiunit','remove_branding'])
          else false
        end
    )
  )
$$;

revoke all on function private.current_tenant_id() from public, anon;
revoke all on function private.has_tenant_role(text[]) from public, anon;
grant execute on function private.current_tenant_id() to authenticated;
grant execute on function private.has_tenant_role(text[]) to authenticated;
revoke all on function private.tenant_license_allows_writes() from public, anon;
revoke all on function private.has_tenant_module(text) from public, anon;
grant execute on function private.tenant_license_allows_writes() to authenticated;
grant execute on function private.has_tenant_module(text) to authenticated;

alter table platform.tenants enable row level security;
alter table platform.tenants force row level security;
alter table public.tenant_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.tenant_modules enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.designs enable row level security;
alter table public.design_revisions enable row level security;
alter table public.design_files enable row level security;

create policy designs_select_own on public.designs for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','stock','viewer']))
);
create policy designs_insert_own on public.designs for insert to authenticated with check (
  tenant_id = (select private.current_tenant_id()) and created_by = (select auth.uid())
  and (select private.has_tenant_module('catalog')) and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
);
create policy designs_update_own on public.designs for update to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes()) and (select private.has_tenant_role(array['owner','admin']))
) with check (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes()) and (select private.has_tenant_role(array['owner','admin']))
);
create policy design_revisions_select_own on public.design_revisions for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','stock','viewer']))
);
create policy design_revisions_insert_own on public.design_revisions for insert to authenticated with check (
  tenant_id = (select private.current_tenant_id()) and created_by = (select auth.uid())
  and (select private.has_tenant_module('catalog')) and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
  and exists (select 1 from public.designs d where d.id = design_revisions.design_id and d.tenant_id = design_revisions.tenant_id and d.active)
);
create policy design_files_select_own on public.design_files for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','stock','viewer']))
);
create policy design_files_insert_own on public.design_files for insert to authenticated with check (
  tenant_id = (select private.current_tenant_id()) and created_by = (select auth.uid())
  and storage_path like ('tenants/' || tenant_id::text || '/designs/' || design_id::text || '/' || revision_id::text || '/%')
  and (select private.has_tenant_module('catalog')) and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
  and exists (select 1 from storage.objects o where o.bucket_id = 'forja-designs' and o.name = storage_path)
);

create or replace function private.design_storage_path_matches(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (storage.foldername($1))[1] = 'tenants'
    and (storage.foldername($1))[2] = (select private.current_tenant_id())::text
    and (storage.foldername($1))[3] = 'designs'
    and exists (
      select 1 from public.design_revisions r
      join public.designs d on d.tenant_id = r.tenant_id and d.id = r.design_id
      where r.tenant_id = (select private.current_tenant_id())
        and r.id::text = (storage.foldername($1))[5]
        and d.id::text = (storage.foldername($1))[4]
    )
$$;
revoke all on function private.design_storage_path_matches(text) from public, anon;
grant execute on function private.design_storage_path_matches(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forja-designs', 'forja-designs', false, 104857600, null)
on conflict (id) do update set public = false, file_size_limit = 104857600, allowed_mime_types = null;
create policy design_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'forja-designs' and private.design_storage_path_matches(name)
  and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','stock','viewer']))
);
create policy design_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'forja-designs' and private.design_storage_path_matches(name)
  and storage.extension(name) = any (array['stl','3mf','step','stp','obj','gcode'])
  and exists (
    select 1 from public.designs d
      where d.id::text = (storage.foldername(storage.objects.name))[4]
      and d.tenant_id = (select private.current_tenant_id()) and d.active
  )
  and (select private.has_tenant_module('catalog')) and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
);
create policy design_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'forja-designs' and private.design_storage_path_matches(name)
  and (select private.has_tenant_module('catalog')) and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
);

create policy tenants_select_own on platform.tenants
for select to authenticated
using (id = (select private.current_tenant_id()));

create policy tenant_domains_select_active on public.tenant_domains
for select to anon, authenticated
using (status = 'active');

create policy profiles_select_self on public.profiles
for select to authenticated
using (id = (select auth.uid()) and tenant_id = (select private.current_tenant_id()));

create policy tenant_settings_select_own on public.tenant_settings
for select to authenticated
using (tenant_id = (select private.current_tenant_id()));

create policy tenant_modules_select_own on public.tenant_modules
for select to authenticated
using (tenant_id = (select private.current_tenant_id()));

create policy customers_select_own on public.customers
for select to authenticated
using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('crm'))
  and (select private.has_tenant_role(array['owner', 'admin', 'sales', 'viewer']))
);

create policy customers_insert_own on public.customers
for insert to authenticated
with check (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('crm'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin', 'sales']))
);

create policy customers_update_own on public.customers
for update to authenticated
using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('crm'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin', 'sales']))
)
with check (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('crm'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin', 'sales']))
);

create policy products_select_own on public.products
for select to authenticated
using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner', 'admin', 'sales', 'production', 'stock', 'viewer']))
);

create policy products_insert_own on public.products
for insert to authenticated
with check (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin']))
);

create policy products_update_own on public.products
for update to authenticated
using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin']))
)
with check (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin']))
);

create policy product_variants_select_own on public.product_variants
for select to authenticated
using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner', 'admin', 'sales', 'production', 'stock', 'viewer']))
);

create policy product_variants_insert_own on public.product_variants
for insert to authenticated
with check (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin']))
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.tenant_id = (select private.current_tenant_id()) and p.active
  )
);

create policy product_variants_update_own on public.product_variants
for update to authenticated
using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin']))
)
with check (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin']))
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.tenant_id = (select private.current_tenant_id()) and p.active
  )
);

create policy tenant_settings_update_admin on public.tenant_settings
for update to authenticated
using (
  tenant_id = (select private.current_tenant_id())
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin']))
)
with check (
  tenant_id = (select private.current_tenant_id())
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner', 'admin']))
);

grant select (tenant_id, host, kind, status) on public.tenant_domains to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.tenant_settings to authenticated;
grant select on public.tenant_modules to authenticated;
grant select, insert on public.customers to authenticated;
grant update (name, company_name, email, phone, notes, archived_at) on public.customers to authenticated;
grant select, insert on public.products, public.product_variants to authenticated;
grant update (name, category, description, active) on public.products to authenticated;
grant update (name, sku, attributes, price_cents, active) on public.product_variants to authenticated;
grant select, insert on public.designs to authenticated;
grant update (name, description, category, active) on public.designs to authenticated;
grant select, insert on public.design_revisions, public.design_files to authenticated;
grant update (timezone, locale, currency) on public.tenant_settings to authenticated;
grant select on platform.tenants to authenticated, service_role;
grant all on platform.tenants to service_role;
grant all on public.tenant_domains, public.profiles, public.tenant_settings, public.tenant_modules, public.customers, public.products, public.product_variants to service_role;
grant all on public.designs, public.design_revisions, public.design_files to service_role;

create view public.tenant_runtime
with (security_invoker = true)
as
select id, name, slug, plan, license_status, maintenance_status
from platform.tenants
where setup_status = 'active';
grant select on public.tenant_runtime to authenticated;

create or replace function public.provision_tenant_with_owner(
  p_name text,
  p_slug text,
  p_host text,
  p_owner_id uuid,
  p_owner_name text,
  p_owner_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_setup_status text;
  v_profile_tenant_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only server provisioning is allowed' using errcode = '42501';
  end if;

  if lower(btrim(p_slug)) !~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$'
    or length(btrim(p_name)) not between 2 and 120
    or length(btrim(p_owner_name)) not between 1 and 120
    or length(btrim(p_owner_email)) not between 3 and 254
    or lower(btrim(p_host)) !~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]+([a-z0-9-]*[a-z0-9])?)*$'
    or p_host ~ '[/@?#:]'
  then
    raise exception 'Invalid tenant or owner details' using errcode = '22023';
  end if;

  select t.id, t.setup_status into v_tenant_id, v_setup_status
  from platform.tenants as t
  where t.slug = lower(btrim(p_slug))
  for update;

  if v_tenant_id is null then
    insert into platform.tenants (name, slug, setup_status)
    values (btrim(p_name), lower(btrim(p_slug)), 'provisioning')
    returning id into v_tenant_id;
  elsif v_setup_status <> 'provisioning' then
    raise exception 'Tenant slug is already active' using errcode = '23505';
  end if;

  insert into public.tenant_domains (tenant_id, host, kind, status)
  values (v_tenant_id, lower(btrim(p_host)), 'subdomain', 'pending')
  on conflict (host) do nothing;

  if not exists (
    select 1 from public.tenant_domains d
    where d.tenant_id = v_tenant_id and d.host = lower(btrim(p_host))
  ) then
    raise exception 'Host is already assigned to another tenant' using errcode = '23505';
  end if;

  insert into public.tenant_settings (tenant_id)
  values (v_tenant_id)
  on conflict (tenant_id) do nothing;

  select p.tenant_id into v_profile_tenant_id
  from public.profiles p where p.id = p_owner_id;
  if v_profile_tenant_id is not null and v_profile_tenant_id <> v_tenant_id then
    raise exception 'Owner account is already assigned to another tenant' using errcode = '23505';
  end if;

  insert into public.profiles (id, tenant_id, full_name, email, role)
  values (p_owner_id, v_tenant_id, btrim(p_owner_name), lower(btrim(p_owner_email)), 'owner')
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = 'owner',
        active = true
    where profiles.tenant_id = excluded.tenant_id;

  update public.tenant_domains
  set status = 'active', verified_at = coalesce(verified_at, now())
  where tenant_id = v_tenant_id and host = lower(btrim(p_host));

  update platform.tenants set setup_status = 'active' where id = v_tenant_id;
  return v_tenant_id;
end;
$$;
revoke all on function public.provision_tenant_with_owner(text, text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.provision_tenant_with_owner(text, text, text, uuid, text, text) to service_role;

alter default privileges in schema platform
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema private
  revoke execute on functions from public, anon, authenticated;
