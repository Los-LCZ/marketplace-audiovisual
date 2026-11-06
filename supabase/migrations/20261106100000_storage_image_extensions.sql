-- =============================================================================
-- Storage: solo archivos con extensión de imagen (auditoría de seguridad, B-07)
--
-- La app valida el tipo real por los bytes (src/lib/file-signature.ts), pero quien
-- tenga sesión puede subir directo a la API de Storage con su token. Los buckets ya
-- limitan tamaño y MIME declarado; el MIME lo elige el cliente, así que además se
-- exige que el nombre termine en una extensión de imagen. Así nada subido se sirve
-- como .html, .svg o .js desde el dominio de Storage.
--
-- Se aplica al subir (insert) y al mover o renombrar (update). Los archivos que ya
-- existen no cambian. La app siempre usa extensiones en minúscula (jpg, png, webp,
-- avif); se acepta también jpeg.
-- =============================================================================

drop policy if exists "space_images_owner_insert" on storage.objects;
create policy "space_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'space-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  );

drop policy if exists "space_images_owner_update" on storage.objects;
create policy "space_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'space-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'space-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  );

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );
