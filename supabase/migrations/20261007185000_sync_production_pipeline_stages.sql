update public.production_orders po
set pipeline_stage = case
  when po.status = 'completed' then 'completed'
  when exists (
    select 1 from public.production_jobs pj
    where pj.production_order_id = po.id and pj.tenant_id = po.tenant_id and pj.status in ('failed', 'canceled')
  ) then 'attention'
  when exists (
    select 1 from public.production_jobs pj
    where pj.production_order_id = po.id and pj.tenant_id = po.tenant_id and pj.status = 'running'
  ) then 'running'
  when exists (
    select 1 from public.production_jobs pj
    where pj.production_order_id = po.id and pj.tenant_id = po.tenant_id and pj.status = 'queued'
  ) then 'queued'
  else 'planning'
end;
