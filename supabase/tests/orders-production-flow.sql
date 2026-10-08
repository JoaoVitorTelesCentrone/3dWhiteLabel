begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (id, email) values ('eac00158-f74f-4b2f-98e9-647515d9f7a0', 'flow-owner@example.test');
insert into platform.tenants (id, name, slug, setup_status) values ('3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Flow Test', 'flow-test', 'active');
insert into public.profiles (id, tenant_id, full_name, email, role) values
  ('eac00158-f74f-4b2f-98e9-647515d9f7a0', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Flow Owner', 'flow-owner@example.test', 'owner');
insert into public.tenant_modules (tenant_id, module_key, enabled)
select '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', key, true from unnest(array['orders','production','catalog','stock']) key;
insert into public.customers (id, tenant_id, name) values
  ('10000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Flow Customer');
insert into public.products (id, tenant_id, name, active) values
  ('20000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Flow Product', true);
insert into public.product_variants (id, tenant_id, product_id, name, sku, price_cents, cost_cents, active, is_default) values
  ('30000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', '20000000-0000-4000-8000-000000000001', 'Padrão', 'FLOW-1', 8000, 2700, true, true);
insert into public.materials (id, tenant_id, name, kind, color, cost_per_kg_cents) values
  ('50000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'PLA Preto', 'PLA', 'Preto', 5000);
insert into public.printers (id, tenant_id, name, status, active) values
  ('60000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Printer 1', 'idle', true);
insert into public.material_spools (id, tenant_id, material_id, code, tare_g, initial_gross_g, current_gross_g, status) values
  ('70000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', '50000000-0000-4000-8000-000000000001', 'FLOW-SPOOL', 100, 1100, 1100, 'active');
insert into public.designs (id, tenant_id, name, created_by) values
  ('80000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Later model', 'eac00158-f74f-4b2f-98e9-647515d9f7a0');
insert into public.design_revisions (id, tenant_id, design_id, version, created_by) values
  ('80000000-0000-4000-8000-000000000002', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', '80000000-0000-4000-8000-000000000001', '1', 'eac00158-f74f-4b2f-98e9-647515d9f7a0');

set local role authenticated;
set local request.jwt.claim.sub = 'eac00158-f74f-4b2f-98e9-647515d9f7a0';
set local request.jwt.claim.role = 'authenticated';
select lives_ok($$select public.create_sales_order('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',3)$$, 'order sells without a production recipe');
select is((select total_price_cents from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), 24000::bigint, 'price snapshot totals three units');

set local role service_role;
insert into public.production_recipes (tenant_id,product_variant_id,design_revision_id,material_id,version,estimated_g,estimated_minutes,units_per_plate,active,created_by)
values ('3103a46c-3d2f-426d-86ab-1c6cd5838a6a','30000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001',1,30,40,1,true,'eac00158-f74f-4b2f-98e9-647515d9f7a0');
select throws_ok($$update public.sales_orders set status='delivered' where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'$$, '23514', null, 'direct status jump is blocked by database');
set local role authenticated;
select lives_ok($$select public.release_order_to_production((select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'))$$, 'order can be released without a recipe snapshot');
select is((select material_id from public.production_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), null::uuid, 'later recipe changes do not rewrite the sale snapshot');
select lives_ok($$select public.create_production_job_once('90000000-0000-4000-8000-000000000001',(select id from public.production_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'),'60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',3,120,90)$$, 'job reserves a compatible spool');
select lives_ok($$select public.create_production_job_once('90000000-0000-4000-8000-000000000001',(select id from public.production_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'),'60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',3,120,90)$$, 'repeated submission returns the original job');
select is((select count(*)::integer from public.production_jobs where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), 1, 'retry does not duplicate job or reservation');
set local role service_role;
update public.materials set cost_per_kg_cents=9000 where id='50000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select material_cost_per_kg_cents from public.production_jobs where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), 5000::bigint, 'job keeps the material price from planning');
select lives_ok($$select public.start_next_production_job((select id from public.production_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'))$$, 'pipeline start action starts the queued job');
select is((select status from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), 'in_production', 'order remains in production until good quantity reaches target');
select lives_ok($$select public.complete_production_job((select id from public.production_jobs where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'),120,90,3,0)$$, 'job completion records output and consumes its reservation');
select is((public.get_operational_report(current_date,current_date)->'finance'->>'actual_material_cents')::bigint, 450::bigint, 'report uses snapshotted material price instead of current catalog price');
select is((select status from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), 'ready', 'production completion makes order ready');
select lives_ok($$select public.ship_order((select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'),null,null)$$, 'shipment creates an order shipment record');
select lives_ok($$select public.deliver_order((select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'))$$, 'delivery closes the shipment record');
select is((select status from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), 'delivered', 'order reaches delivered only after shipment confirmation');
select lives_ok($$select public.create_sales_order('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1)$$, 'next sale is independent from the delivered order');
select lives_ok($$select public.release_order_to_production((select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' order by number desc limit 1))$$, 'second order creates its own production order');
select lives_ok($$select public.create_production_job_once('90000000-0000-4000-8000-000000000002',(select id from public.production_orders where sales_order_id=(select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' order by number desc limit 1)),'60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',1,40,30)$$, 'retry job reserves only the remaining order quantity');
select lives_ok($$select public.start_next_production_job((select id from public.production_orders where sales_order_id=(select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' order by number desc limit 1)))$$, 'retry job starts after previous order releases the printer');
select lives_ok($$select public.fail_production_job((select id from public.production_jobs where production_order_id=(select id from public.production_orders where sales_order_id=(select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' order by number desc limit 1))),'Layer shift',10,10)$$, 'failure records actual time and material');
select is((select status from public.material_reservations where job_id=(select id from public.production_jobs where production_order_id=(select id from public.production_orders where sales_order_id=(select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' order by number desc limit 1)))), 'consumed', 'failure resolves the active reservation');
select lives_ok($$select public.create_production_job_once('90000000-0000-4000-8000-000000000003',(select id from public.production_orders where sales_order_id=(select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' order by number desc limit 1)),'60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',1,40,30)$$, 'failed quantity can be planned again');
select is((select count(*)::integer from public.material_reservations where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' and status='active'), 1, 'retry creates one fresh active reservation');
select lives_ok($$select public.cancel_queued_production_job((select id from public.production_jobs where status='queued' and production_order_id=(select id from public.production_orders where sales_order_id=(select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' order by number desc limit 1))),'Operator canceled')$$, 'queued job can be canceled with an audit reason');
select is((select status from public.production_jobs where status='canceled' and production_order_id=(select id from public.production_orders where sales_order_id=(select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' order by number desc limit 1)) limit 1), 'canceled', 'canceled job is no longer counted as active');
select is((select count(*)::integer from public.material_reservations where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a' and status='active'), 0, 'queued cancellation releases its material reservation');
select * from finish();
rollback;
