drop policy if exists design_storage_insert on storage.objects;

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
