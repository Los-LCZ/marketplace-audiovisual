-- =============================================================================
-- Borra los datos demo cargados con seed_demo.sql (usuarios @senal-demo.test).
-- También borra las reservas que usuarios reales hayan hecho en espacios demo.
-- Se ejecuta a mano en el SQL Editor.
--
-- Fotos: Supabase no permite borrar archivos de Storage con SQL (y borrar solo la
-- fila de storage.objects dejaría el archivo huérfano). Este script AVISA qué
-- carpetas de space-images y avatars tienen fotos de usuarios demo; bórralas desde
-- Dashboard → Storage (ver README, "Datos demo").
-- =============================================================================

do $$
declare
  v_users    int;
  v_bookings int;
  v_folders  text;
begin
  select string_agg(distinct (storage.foldername(o.name))[1], ', ')
  into v_folders
  from storage.objects o
  where o.bucket_id in ('space-images', 'avatars')
    and (storage.foldername(o.name))[1] in (
      select id::text from auth.users where email like '%@senal-demo.test'
    );

  -- Las reservas tienen FK "on delete restrict" hacia espacios y perfiles:
  -- primero se borran (sus reseñas caen en cascada).
  delete from public.bookings b
  where b.client_id in (select id from auth.users where email like '%@senal-demo.test')
     or b.space_id in (
       select s.id from public.spaces s
       join auth.users u on u.id = s.host_id
       where u.email like '%@senal-demo.test'
     );
  get diagnostics v_bookings = row_count;

  -- Usuarios: en cascada se borran identidades, perfiles, espacios,
  -- amenities de los espacios y me gusta / descartes.
  delete from auth.users where email like '%@senal-demo.test';
  get diagnostics v_users = row_count;

  raise notice 'Datos demo borrados: % usuarios y % reservas.', v_users, v_bookings;
  if v_folders is not null then
    raise warning 'Quedan fotos de usuarios demo en Storage. Borra estas carpetas de space-images y avatars desde el Dashboard: %', v_folders;
  end if;
end;
$$;
