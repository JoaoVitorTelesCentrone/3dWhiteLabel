create table public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  printer_id uuid not null,
  interval_min integer not null check (interval_min between 60 and 10000000),
  alert_before_min integer not null default 600 check (alert_before_min between 0 and 1000000),
  last_service_runtime_min bigint not null default 0 check (last_service_runtime_min >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, printer_id) references public.printers(tenant_id, id),
  unique (tenant_id, id),
  unique (printer_id),
  check (alert_before_min <= interval_min)
);
create index maintenance_plans_tenant_active_idx on public.maintenance_plans (tenant_id, active);
create trigger maintenance_plans_set_updated_at before update on public.maintenance_plans
for each row execute function private.set_updated_at();

create table public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  printer_id uuid not null,
  plan_id uuid not null,
  runtime_at_service_min bigint not null check (runtime_at_service_min >= 0),
  cost_cents bigint not null default 0 check (cost_cents between 0 and 999999999999),
  notes text not null check (length(btrim(notes)) between 2 and 4000),
  performed_by uuid not null references auth.users(id),
  performed_at timestamptz not null default now(),
  foreign key (tenant_id, printer_id) references public.printers(tenant_id, id),
  foreign key (tenant_id, plan_id) references public.maintenance_plans(tenant_id, id)
);
create index maintenance_logs_printer_idx on public.maintenance_logs (tenant_id, printer_id, performed_at desc);

alter table public.maintenance_plans enable row level security;
alter table public.maintenance_logs enable row level security;
create policy maintenance_plans_select_own on public.maintenance_plans for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','viewer']))
);
create policy maintenance_plans_insert_own on public.maintenance_plans for insert to authenticated with check (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.tenant_license_allows_writes()) and (select private.has_tenant_role(array['owner','admin']))
);
create policy maintenance_plans_update_own on public.maintenance_plans for update to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.tenant_license_allows_writes()) and (select private.has_tenant_role(array['owner','admin']))
) with check (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.tenant_license_allows_writes()) and (select private.has_tenant_role(array['owner','admin']))
);
create policy maintenance_logs_select_own on public.maintenance_logs for select to authenticated using (
  tenant_id = (select private.current_tenant_id()) and (select private.has_tenant_module('printers'))
  and (select private.has_tenant_role(array['owner','admin','production','operator','viewer']))
);
revoke all on public.maintenance_plans, public.maintenance_logs from public, anon, authenticated;
grant select on public.maintenance_plans to authenticated;
grant insert (tenant_id, printer_id, interval_min, alert_before_min, active) on public.maintenance_plans to authenticated;
grant update (interval_min, alert_before_min, active) on public.maintenance_plans to authenticated;
grant select on public.maintenance_logs to authenticated;
grant all on public.maintenance_plans, public.maintenance_logs to service_role;

create or replace function public.record_printer_maintenance(p_plan_id uuid, p_cost_cents bigint, p_notes text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := private.current_tenant_id(); v_plan public.maintenance_plans%rowtype; v_printer public.printers%rowtype; v_log_id uuid;
begin
  if v_tenant is null or not private.has_tenant_module('printers') or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin']) then
    raise exception 'Maintenance access denied' using errcode = '42501';
  end if;
  if p_cost_cents not between 0 and 999999999999 or length(btrim(coalesce(p_notes,''))) not between 2 and 4000 then
    raise exception 'Invalid maintenance record' using errcode = '22023';
  end if;
  select * into v_plan from public.maintenance_plans where id = p_plan_id and tenant_id = v_tenant for update;
  if not found or not v_plan.active then raise exception 'Maintenance plan unavailable' using errcode = '22023'; end if;
  select * into v_printer from public.printers where id = v_plan.printer_id and tenant_id = v_tenant for update;
  if not found or v_printer.status = 'printing' then raise exception 'Printer is printing' using errcode = '22023'; end if;
  insert into public.maintenance_logs (tenant_id, printer_id, plan_id, runtime_at_service_min, cost_cents, notes, performed_by)
  values (v_tenant, v_printer.id, v_plan.id, v_printer.runtime_min, p_cost_cents, btrim(p_notes), auth.uid())
  returning id into v_log_id;
  update public.maintenance_plans set last_service_runtime_min = v_printer.runtime_min where id = v_plan.id;
  insert into public.audit_events (tenant_id, actor_id, action, entity, entity_id, after_state)
  values (v_tenant, auth.uid(), 'maintenance.record', 'printer', v_printer.id,
    jsonb_build_object('log_id',v_log_id,'runtime_min',v_printer.runtime_min,'cost_cents',p_cost_cents));
  return v_log_id;
end;
$$;
revoke all on function public.record_printer_maintenance(uuid,bigint,text) from public, anon;
grant execute on function public.record_printer_maintenance(uuid,bigint,text) to authenticated;
