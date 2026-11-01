-- =============================================================================
-- Foto de perfil
-- - Bucket público `avatars` (máx. 2 MB; jpg, png o webp).
-- - Ruta: avatars/{auth.uid()}/{archivo}. Cada usuario solo sube, cambia o borra
--   lo de su propia carpeta.
-- - profiles.avatar_url solo acepta URLs del bucket `avatars` de Supabase: una URL
--   externa rompería next/image (solo permite *.supabase.co) en reseñas y perfiles.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Por si alguien ya tiene una URL que no cumple (hoy no se podía subir foto): se limpia.
update public.profiles
set avatar_url = null
where avatar_url is not null
  and avatar_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/';

alter table public.profiles
  add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/');
