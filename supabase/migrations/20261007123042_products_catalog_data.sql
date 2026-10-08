alter table public.products add column image_path text;
alter table public.products add constraint products_image_path_check check (
  image_path is null or image_path ~ ('^tenants/' || tenant_id::text || '/products/' || id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$')
);

alter table public.product_variants add column cost_cents bigint;
alter table public.product_variants add column is_default boolean not null default false;
alter table public.product_variants add constraint product_variants_cost_cents_check check (
  cost_cents is null or cost_cents between 0 and 999999999999
);

with chosen as (
  select distinct on (product_id) id
  from public.product_variants
  order by product_id, active desc, created_at, id
)
update public.product_variants v set is_default = true
from chosen where chosen.id = v.id;

create unique index product_variants_one_default_per_product_idx
  on public.product_variants (tenant_id, product_id) where is_default;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forja-products', 'forja-products', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];

create policy product_images_select on storage.objects for select to authenticated using (
  bucket_id = 'forja-products'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] = (select private.current_tenant_id())::text
  and (storage.foldername(name))[3] = 'products'
  and exists (
    select 1 from public.products p
    where p.id::text = (storage.foldername(name))[4]
      and p.tenant_id = (select private.current_tenant_id())
      and p.image_path = name
  )
  and (select private.has_tenant_module('catalog'))
  and (select private.has_tenant_role(array['owner','admin','sales','production','stock','viewer']))
);

create policy product_images_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'forja-products'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] = (select private.current_tenant_id())::text
  and (storage.foldername(name))[3] = 'products'
  and (storage.foldername(name))[4] ~* '^[0-9a-f-]{36}$'
  and storage.filename(name) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}\.(png|jpg|webp)$'
  and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
);

create policy product_images_delete on storage.objects for delete to authenticated using (
  bucket_id = 'forja-products'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] = (select private.current_tenant_id())::text
  and (storage.foldername(name))[3] = 'products'
  and (select private.has_tenant_module('catalog'))
  and (select private.tenant_license_allows_writes())
  and (select private.has_tenant_role(array['owner','admin']))
);

create or replace function public.create_product_with_default_variant(
  p_product_id uuid,
  p_name text,
  p_price_cents bigint,
  p_cost_cents bigint,
  p_image_path text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant_id uuid := (select private.current_tenant_id());
begin
  if v_tenant_id is null or p_product_id is null
    or length(btrim(p_name)) not between 2 and 160
    or p_price_cents not between 1 and 999999999999
    or p_cost_cents not between 0 and 999999999999
    or p_image_path !~ ('^tenants/' || v_tenant_id::text || '/products/' || p_product_id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$') then
    raise exception 'Invalid product data';
  end if;

  insert into public.products (id, tenant_id, name, image_path)
  values (p_product_id, v_tenant_id, btrim(p_name), p_image_path);

  insert into public.product_variants (
    tenant_id, product_id, name, sku, price_cents, cost_cents, is_default
  ) values (
    v_tenant_id, p_product_id, 'Padrão', 'P-' || replace(p_product_id::text, '-', ''),
    p_price_cents, p_cost_cents, true
  );

  return p_product_id;
end;
$$;

revoke all on function public.create_product_with_default_variant(uuid, text, bigint, bigint, text) from public, anon;
grant execute on function public.create_product_with_default_variant(uuid, text, bigint, bigint, text) to authenticated;

grant update (image_path) on public.products to authenticated;
grant update (cost_cents) on public.product_variants to authenticated;
