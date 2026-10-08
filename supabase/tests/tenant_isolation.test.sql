begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'rls-owner-a@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'rls-owner-b@example.test');
insert into platform.tenants (id, name, slug, setup_status) values
  ('20000000-0000-0000-0000-000000000001', 'Empresa A', 'rls-empresa-a', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'Empresa B', 'rls-empresa-b', 'active');
insert into public.profiles (id, tenant_id, full_name, email, role) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Owner A', 'rls-owner-a@example.test', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Owner B', 'rls-owner-b@example.test', 'owner');
insert into public.customers (tenant_id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Cliente A'),
  ('20000000-0000-0000-0000-000000000002', 'Cliente B');
insert into public.designs (id, tenant_id, name, created_by) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Modelo A', '10000000-0000-0000-0000-000000000001');
insert into public.design_revisions (id, tenant_id, design_id, version, created_by) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '1', '10000000-0000-0000-0000-000000000001');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';
select results_eq('select count(*) from public.customers', array[1::bigint], 'Tenant A sees only its customer');
select is(
  private.design_storage_path_matches('tenants/20000000-0000-0000-0000-000000000001/designs/30000000-0000-0000-0000-000000000001/40000000-0000-0000-0000-000000000001/model.stl'),
  true, 'Tenant A can resolve its design file'
);
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select results_eq('select count(*) from public.customers', array[1::bigint], 'Tenant B sees only its customer');
select is(
  private.design_storage_path_matches('tenants/20000000-0000-0000-0000-000000000001/designs/30000000-0000-0000-0000-000000000001/40000000-0000-0000-0000-000000000001/model.stl'),
  false, 'Tenant B cannot resolve tenant A file'
);
select * from finish();
rollback;
