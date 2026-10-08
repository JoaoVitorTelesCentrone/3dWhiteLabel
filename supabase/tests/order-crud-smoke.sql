begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values ('eac00158-f74f-4b2f-98e9-647515d9f7a0', 'orders-owner@example.test');
insert into platform.tenants (id, name, slug, setup_status) values ('3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Orders Test', 'orders-test', 'active');
insert into public.profiles (id, tenant_id, full_name, email, role) values
  ('eac00158-f74f-4b2f-98e9-647515d9f7a0', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Orders Owner', 'orders-owner@example.test', 'owner');
insert into public.tenant_modules (tenant_id, module_key, enabled)
select '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', key, true from unnest(array['orders','production','catalog','stock']) key;
insert into public.customers (id, tenant_id, name) values
  ('10000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Test Customer');
insert into public.products (id, tenant_id, name, active) values
  ('20000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', 'Test Product', true);
insert into public.product_variants (id, tenant_id, product_id, name, sku, price_cents, cost_cents, active, is_default) values
  ('30000000-0000-4000-8000-000000000001', '3103a46c-3d2f-426d-86ab-1c6cd5838a6a', '20000000-0000-4000-8000-000000000001', 'Padrão', 'TEST-1', 4500, 1300, true, true);

set local role authenticated;
set local request.jwt.claim.sub = 'eac00158-f74f-4b2f-98e9-647515d9f7a0';
set local request.jwt.claim.role = 'authenticated';
select lives_ok($$select public.create_sales_order('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',2)$$, 'direct order can be created from a product');
select lives_ok($$select public.update_sales_order((select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), '10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',4)$$, 'open untouched order can be edited');
select is((select total_price_cents from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'), 18000::bigint, 'edit recalculates order total');
select lives_ok($$select public.delete_sales_order((select id from public.sales_orders where tenant_id='3103a46c-3d2f-426d-86ab-1c6cd5838a6a'))$$, 'open order can be deleted');
select * from finish();
rollback;
