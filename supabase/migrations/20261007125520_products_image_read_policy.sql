drop policy product_images_select on storage.objects;

create policy product_images_select on storage.objects for select to authenticated using (
  bucket_id = 'forja-products'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] = (select private.current_tenant_id())::text
  and (storage.foldername(name))[3] = 'products'
  and (storage.foldername(name))[4] ~* '^[0-9a-f-]{36}$'
  and storage.filename(name) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}\.(png|jpg|webp)$'
  and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','stock','viewer']))
);
