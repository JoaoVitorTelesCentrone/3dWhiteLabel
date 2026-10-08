create table public.tenant_branding (
  tenant_id uuid primary key references platform.tenants(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 2 and 120),
  primary_color text not null default '#FF5A1F' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#FFB25A' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_path text check (
    logo_path is null or (
      logo_path like ('tenants/' || tenant_id::text || '/branding/%')
      and logo_path ~ '/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tenant_branding_set_updated_at before update on public.tenant_branding
for each row execute function private.set_updated_at();
create or replace function private.create_tenant_branding()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tenant_branding (tenant_id, display_name) values (new.id, new.name);
  return new;
end;
$$;
revoke all on function private.create_tenant_branding() from public, anon, authenticated;
create trigger tenants_create_branding after insert on platform.tenants
for each row execute function private.create_tenant_branding();
insert into public.tenant_branding (tenant_id, display_name)
select id, name from platform.tenants on conflict (tenant_id) do nothing;

alter table public.tenant_branding enable row level security;
create policy tenant_branding_public_read on public.tenant_branding for select to anon, authenticated using (true);
create policy tenant_branding_update_own on public.tenant_branding for update to authenticated using (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_role(array['owner','admin']))
  and (select private.tenant_license_allows_writes())
) with check (
  tenant_id = (select private.current_tenant_id())
  and (select private.has_tenant_role(array['owner','admin']))
  and (select private.tenant_license_allows_writes())
);
revoke all on public.tenant_branding from public, anon, authenticated;
grant select (tenant_id, display_name, primary_color, accent_color, logo_path) on public.tenant_branding to anon, authenticated;
grant update (display_name, primary_color, accent_color, logo_path) on public.tenant_branding to authenticated;
grant all on public.tenant_branding to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forja-branding', 'forja-branding', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];
create policy branding_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'forja-branding'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] = (select private.current_tenant_id())::text
  and (storage.foldername(name))[3] = 'branding'
  and (select private.has_tenant_role(array['owner','admin']))
);
create policy branding_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'forja-branding'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] = (select private.current_tenant_id())::text
  and (storage.foldername(name))[3] = 'branding'
  and storage.extension(name) = any (array['png','jpg','jpeg','webp'])
  and (select private.has_tenant_role(array['owner','admin']))
  and (select private.tenant_license_allows_writes())
);
create policy branding_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'forja-branding'
  and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] = (select private.current_tenant_id())::text
  and (storage.foldername(name))[3] = 'branding'
  and (select private.has_tenant_role(array['owner','admin']))
  and (select private.tenant_license_allows_writes())
);
