alter table public.sales_leads
  add column assigned_to uuid references public.platform_admins(id) on delete set null,
  add column utm_source text check (utm_source is null or length(utm_source) <= 100),
  add column utm_medium text check (utm_medium is null or length(utm_medium) <= 100),
  add column utm_campaign text check (utm_campaign is null or length(utm_campaign) <= 100),
  add column demo_scheduled_at timestamptz,
  add column proposal_sent_at timestamptz;

alter table public.sales_leads drop constraint sales_leads_status_check;
alter table public.sales_leads add constraint sales_leads_status_check
  check (status in ('new', 'contacted', 'qualified', 'demo_scheduled', 'demo_completed', 'proposal_sent', 'closed'));

create index sales_leads_assigned_status_created_idx
  on public.sales_leads (assigned_to, status, created_at desc);
create index sales_leads_demo_scheduled_idx on public.sales_leads (demo_scheduled_at) where demo_scheduled_at is not null;
create index sales_leads_proposal_sent_idx on public.sales_leads (proposal_sent_at) where proposal_sent_at is not null;

create table public.sales_funnel_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in ('lp_view', 'cta_click', 'form_start', 'form_submit')),
  page_path text not null check (length(page_path) between 1 and 200),
  utm_source text check (utm_source is null or length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or length(utm_campaign) <= 100),
  created_at timestamptz not null default now()
);

create index sales_funnel_events_created_event_idx
  on public.sales_funnel_events (created_at desc, event_name);

alter table public.sales_funnel_events enable row level security;
revoke all on public.sales_funnel_events from public, anon, authenticated;
grant all on public.sales_funnel_events to service_role;
