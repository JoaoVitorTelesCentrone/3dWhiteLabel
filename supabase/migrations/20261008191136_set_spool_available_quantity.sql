-- Set the usable stock of one spool without changing active reservations.
create or replace function public.set_spool_available_quantity(p_spool_id uuid, p_available_g integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := private.current_tenant_id();
  v_spool public.material_spools%rowtype;
  v_reserved_g integer;
  v_current_available_g integer;
  v_new_gross_g integer;
begin
  if v_tenant is null or auth.uid() is null or not private.has_tenant_module('stock')
    or not private.tenant_license_allows_writes()
    or not private.has_tenant_role(array['owner','admin','stock']) then
    raise exception 'Stock access denied' using errcode = '42501';
  end if;
  if p_available_g is null or p_available_g < 0 or p_available_g > 100000 then
    raise exception 'Invalid available quantity' using errcode = '22023';
  end if;

  select * into v_spool from public.material_spools
  where id = p_spool_id and tenant_id = v_tenant for update;
  if not found or v_spool.status = 'discarded' then
    raise exception 'Spool unavailable' using errcode = '22023';
  end if;

  select coalesce(sum(reserved_g), 0)::integer into v_reserved_g
  from public.material_reservations
  where tenant_id = v_tenant and spool_id = p_spool_id and status = 'active';
  v_current_available_g := v_spool.current_gross_g - v_spool.tare_g - v_reserved_g;
  v_new_gross_g := v_spool.tare_g + v_reserved_g + p_available_g;
  if v_new_gross_g > 100000 then
    raise exception 'Spool weight exceeds limit' using errcode = '22023';
  end if;
  if v_new_gross_g = v_spool.current_gross_g then return; end if;

  update public.material_spools
  set current_gross_g = v_new_gross_g,
      status = case when v_new_gross_g = tare_g then 'empty' else 'active' end
  where id = p_spool_id and tenant_id = v_tenant;
  insert into public.spool_movements
    (tenant_id, spool_id, kind, delta_g, gross_after_g, reason, actor_id)
  values (v_tenant, p_spool_id, 'adjustment', v_new_gross_g - v_spool.current_gross_g,
    v_new_gross_g, 'Contagem manual do saldo disponível', auth.uid());
  insert into public.audit_events
    (tenant_id, actor_id, action, entity, entity_id, before_state, after_state)
  values (v_tenant, auth.uid(), 'stock.set_spool_available', 'spool', p_spool_id,
    jsonb_build_object('available_g', v_current_available_g, 'gross_g', v_spool.current_gross_g),
    jsonb_build_object('available_g', p_available_g, 'gross_g', v_new_gross_g,
      'reserved_g', v_reserved_g));
end;
$$;
revoke all on function public.set_spool_available_quantity(uuid,integer) from public, anon, authenticated;
grant execute on function public.set_spool_available_quantity(uuid,integer) to authenticated;
