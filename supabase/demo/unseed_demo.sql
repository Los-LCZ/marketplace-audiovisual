-- =============================================================================
-- Borra los datos demo cargados con seed_demo.sql (usuarios @senal-demo.test).
-- También borra las reservas que usuarios reales hayan hecho en espacios demo.
-- Se ejecuta a mano en el SQL Editor.
-- =============================================================================

do $$
declare
  v_users    int;
  v_bookings int;
begin
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
end;
$$;
