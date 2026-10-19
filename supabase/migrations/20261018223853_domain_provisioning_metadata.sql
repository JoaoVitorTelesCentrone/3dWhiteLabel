-- Provider state for Cloudflare for SaaS. These fields are intentionally not
-- granted to anon/authenticated roles because they are operational metadata.
alter table public.tenant_domains
  add column if not exists provider text,
  add column if not exists provider_hostname_id text,
  add column if not exists verification_record jsonb,
  add column if not exists ssl_status text,
  add column if not exists last_error text,
  add column if not exists checked_at timestamptz;

create unique index if not exists tenant_domains_provider_hostname_id_idx
  on public.tenant_domains (provider, provider_hostname_id)
  where provider_hostname_id is not null;

alter table public.tenant_domains
  add constraint tenant_domains_provider_check
  check (provider is null or provider in ('cloudflare'));

alter table public.tenant_domains
  add constraint tenant_domains_ssl_status_check
  check (ssl_status is null or ssl_status in ('pending', 'active', 'failed'));

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  company text not null check (length(btrim(company)) between 2 and 160),
  email text not null check (length(btrim(email)) between 3 and 254),
  phone text check (phone is null or length(btrim(phone)) between 8 and 30),
  message text check (message is null or length(btrim(message)) <= 2000),
  source text not null default 'website',
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.sales_leads enable row level security;
revoke all on public.sales_leads from public, anon, authenticated;
grant all on public.sales_leads to service_role;
create index if not exists sales_leads_email_created_at_idx on public.sales_leads (lower(email), created_at desc);

create or replace function private.enforce_sales_lead_cooldown()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if exists (
    select 1 from public.sales_leads
    where lower(email) = lower(new.email)
      and created_at >= now() - interval '10 minutes'
  ) then
    raise exception 'A recent request already exists' using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_sales_lead_cooldown() from public, anon, authenticated;
create trigger sales_leads_limit_repeated_email
before insert on public.sales_leads
for each row execute function private.enforce_sales_lead_cooldown();
