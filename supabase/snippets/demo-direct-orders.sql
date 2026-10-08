-- Dados de demonstração locais para apresentar o fluxo de pedido direto.
-- Execute somente no projeto local Agencia 3D Demo.
do $$
declare
  v_tenant uuid := '3103a46c-3d2f-426d-86ab-1c6cd5838a6a';
  v_user uuid := 'eac00158-f74f-4b2f-98e9-647515d9f7a0';
begin
  insert into public.customers (id, tenant_id, name, company_name, email, phone) values
    ('10000000-0000-4000-8000-000000000001', v_tenant, 'Mariana Costa', 'Ateliê Maré', 'mariana@atelie-mare.test', '(11) 98888-1201'),
    ('10000000-0000-4000-8000-000000000002', v_tenant, 'Bruno Martins', 'BM Arquitetura', 'bruno@bm-arq.test', '(11) 97777-4820'),
    ('10000000-0000-4000-8000-000000000003', v_tenant, 'Lívia Nunes', null, 'livia@nunes.test', '(11) 96666-9012')
  on conflict (id) do nothing;

  insert into public.products (id, tenant_id, name, category, description) values
    ('20000000-0000-4000-8000-000000000001', v_tenant, 'Suporte para celular', 'Acessórios', 'Suporte de mesa impresso em 3D'),
    ('20000000-0000-4000-8000-000000000002', v_tenant, 'Vaso geométrico', 'Decoração', 'Vaso decorativo de mesa'),
    ('20000000-0000-4000-8000-000000000003', v_tenant, 'Organizador de cabos', 'Acessórios', 'Presilha para organizar cabos')
  on conflict (id) do nothing;

  insert into public.product_variants (id, tenant_id, product_id, name, sku, attributes, price_cents, cost_cents, is_default) values
    ('30000000-0000-4000-8000-000000000001', v_tenant, '20000000-0000-4000-8000-000000000001', 'Padrão', 'SUP-CEL-01', '{}'::jsonb, 4500, 1300, true),
    ('30000000-0000-4000-8000-000000000002', v_tenant, '20000000-0000-4000-8000-000000000002', 'Padrão', 'VAS-GEO-01', '{}'::jsonb, 8000, 2700, true),
    ('30000000-0000-4000-8000-000000000003', v_tenant, '20000000-0000-4000-8000-000000000003', 'Padrão', 'ORG-CAB-01', '{}'::jsonb, 2500, 600, true)
  on conflict (id) do nothing;

  insert into public.sales_orders (id, tenant_id, number, customer_id, status, total_price_cents, total_cost_cents, created_by, created_at) values
    ('40000000-0000-4000-8000-000000000001', v_tenant, 101, '10000000-0000-4000-8000-000000000001', 'open', 13500, 3900, v_user, now() - interval '1 day'),
    ('40000000-0000-4000-8000-000000000002', v_tenant, 102, '10000000-0000-4000-8000-000000000002', 'in_production', 16000, 5400, v_user, now() - interval '3 days'),
    ('40000000-0000-4000-8000-000000000003', v_tenant, 103, '10000000-0000-4000-8000-000000000003', 'ready', 15000, 3600, v_user, now() - interval '5 days'),
    ('40000000-0000-4000-8000-000000000004', v_tenant, 104, '10000000-0000-4000-8000-000000000001', 'delivered', 16000, 5400, v_user, now() - interval '8 days')
  on conflict (id) do nothing;

  insert into public.sales_order_items (id, tenant_id, order_id, product_variant_id, description, quantity, unit_price_cents, total_price_cents) values
    ('50000000-0000-4000-8000-000000000001', v_tenant, '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Suporte para celular', 3, 4500, 13500),
    ('50000000-0000-4000-8000-000000000002', v_tenant, '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Vaso geométrico', 2, 8000, 16000),
    ('50000000-0000-4000-8000-000000000003', v_tenant, '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Organizador de cabos', 6, 2500, 15000),
    ('50000000-0000-4000-8000-000000000004', v_tenant, '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'Vaso geométrico', 2, 8000, 16000)
  on conflict (id) do nothing;

  insert into public.materials (id, tenant_id, name, kind, color, cost_per_kg_cents)
  values ('80000000-0000-4000-8000-000000000001', v_tenant, 'PLA preto', 'PLA', 'Preto', 8500)
  on conflict (id) do nothing;
  insert into public.printers (id, tenant_id, name, model, status)
  values ('80000000-0000-4000-8000-000000000002', v_tenant, 'Impressora 01', 'Bambu Lab A1', 'idle')
  on conflict (id) do nothing;
  insert into public.material_spools (id, tenant_id, material_id, code, tare_g, initial_gross_g, current_gross_g, status)
  values ('80000000-0000-4000-8000-000000000003', v_tenant, '80000000-0000-4000-8000-000000000001', 'PLA-PRETO-01', 200, 1200, 1000, 'active')
  on conflict (id) do nothing;

  insert into public.production_orders (id, tenant_id, sales_order_id, sales_order_item_id, design_revision_id, target_qty, status, created_by)
  values ('80000000-0000-4000-8000-000000000004', v_tenant, '40000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002', null, 2, 'in_progress', v_user)
  on conflict (id) do nothing;
  insert into public.production_jobs (id, tenant_id, production_order_id, design_revision_id, printer_id, spool_id,
    quantity, estimated_minutes, estimated_g, status, created_by)
  values ('80000000-0000-4000-8000-000000000005', v_tenant, '80000000-0000-4000-8000-000000000004',
    null, '80000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000003',
    2, 150, 120, 'queued', v_user)
  on conflict (id) do nothing;
  insert into public.material_reservations (id, tenant_id, spool_id, job_id, reserved_g, status)
  values ('80000000-0000-4000-8000-000000000006', v_tenant, '80000000-0000-4000-8000-000000000003',
    '80000000-0000-4000-8000-000000000005', 120, 'active')
  on conflict (id) do nothing;

  insert into public.order_payments (id, tenant_id, order_id, amount_cents, method, idempotency_key, received_by, received_at) values
    ('60000000-0000-4000-8000-000000000001', v_tenant, '40000000-0000-4000-8000-000000000004', 16000, 'pix', '70000000-0000-4000-8000-000000000001', v_user, now() - interval '7 days')
  on conflict (id) do nothing;
end;
$$;
