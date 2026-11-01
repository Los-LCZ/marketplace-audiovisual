-- =============================================================================
-- Datos demo de Señal: 3 anfitriones, 3 clientes, 12 espacios, reservas pasadas
-- con reseñas reveladas en ambos sentidos, reservas futuras y una solicitud.
--
-- NO es una migración: se ejecuta a mano en el SQL Editor (una sola vez).
-- Todo lo demo usa correos @senal-demo.test; se borra con unseed_demo.sql.
--
-- Antes de ejecutar: reemplaza CAMBIAME (línea de v_password) por una contraseña
-- de al menos 10 caracteres. Es la de las 6 cuentas demo; no la subas al repo.
-- =============================================================================

do $$
declare
  v_password text := 'CAMBIAME';
  v_today    date := (now() at time zone 'America/Santiago')::date;
begin
  if v_password = 'CAMBIAME' or length(v_password) < 10 then
    raise exception 'Reemplaza CAMBIAME por una contraseña de al menos 10 caracteres';
  end if;

  if exists (select 1 from auth.users where email like '%@senal-demo.test') then
    raise exception 'Ya hay datos demo: ejecuta unseed_demo.sql antes de volver a cargarlos';
  end if;

  -- ---------------------------------------------------------------------------
  -- Usuarios (handle_new_user crea el perfil con nombre, teléfono y rol)
  -- ---------------------------------------------------------------------------
  create temporary table demo_users (id uuid, email text, full_name text, role text) on commit drop;
  insert into demo_users values
    ('de000000-0000-4000-8000-000000000001', 'ana.rojas@senal-demo.test',      'Ana Rojas',        'host'),
    ('de000000-0000-4000-8000-000000000002', 'diego.fuentes@senal-demo.test',  'Diego Fuentes',    'host'),
    ('de000000-0000-4000-8000-000000000003', 'valentina.soto@senal-demo.test', 'Valentina Soto',   'host'),
    ('de000000-0000-4000-8000-000000000011', 'matias.perez@senal-demo.test',   'Matías Pérez',     'client'),
    ('de000000-0000-4000-8000-000000000012', 'camila.munoz@senal-demo.test',   'Camila Muñoz',     'client'),
    ('de000000-0000-4000-8000-000000000013', 'joaquin.herrera@senal-demo.test','Joaquín Herrera',  'client');

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  select
    '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
    extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', u.full_name, 'role', u.role),
    now() - interval '120 days', now(), '', '', '', ''
  from demo_users u;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', now(), now(), now()
  from demo_users u;

  -- Perfil público
  update public.profiles p
  set headline = v.headline, bio = v.bio, commune = v.commune, tags = v.tags,
      verified = v.verified, min_client_rating = v.min_rating
  from (values
    ('de000000-0000-4000-8000-000000000001'::uuid, 'Ingeniera de sonido · Ñuñoa',
     'Produzco bandas independientes hace 12 años. Mi estudio tiene control room independiente y sala de toma tratada.',
     'Ñuñoa', array['mezcla', 'grabación en vivo', 'indie'], true, null::numeric),
    ('de000000-0000-4000-8000-000000000002', 'Salas de ensayo con backline completo',
     'Baterista y dueño de dos salas. Pido nota mínima 4 para reservar directo; si eres nuevo, envíame una solicitud.',
     'Ñuñoa', array['backline', 'rock', 'ensayo'], false, 4.0),
    ('de000000-0000-4000-8000-000000000003', 'Directora de fotografía · sets y estudios',
     'Arriendo sets con ciclorama y estudios fotográficos con luz natural. Apoyo técnico disponible.',
     'Recoleta', array['ciclorama', 'publicidad', 'moda'], true, null),
    ('de000000-0000-4000-8000-000000000011', 'Productor musical', 'Grabo maquetas y videoclips para bandas emergentes.',
     'Providencia', array['videoclip', 'maquetas'], false, null),
    ('de000000-0000-4000-8000-000000000012', 'Fotógrafa de moda', 'Busco estudios con buena luz y ciclorama.',
     'Santiago Centro', array['moda', 'retrato'], false, null),
    ('de000000-0000-4000-8000-000000000013', 'Bajista', 'Recién empezando con mi banda.', 'Macul', array['rock'], false, null)
  ) as v(id, headline, bio, commune, tags, verified, min_rating)
  where p.id = v.id;

  -- ---------------------------------------------------------------------------
  -- Espacios (sin fotos: la tarjeta muestra el ícono de la categoría)
  -- ---------------------------------------------------------------------------
  insert into public.spaces (
    id, host_id, title, category, summary, description, address, city, commune, neighborhood,
    price_per_hour, min_hours, size_m2, capacity, open_hour, close_hour, rules, gear, featured, status
  ) values
    ('de5ace00-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000001',
     'Estudio Ñuble', 'recording_studio',
     'Control room independiente y sala de toma con tratamiento acústico.',
     'Estudio profesional para grabar bandas completas o voces. Incluye ingeniero por hora adicional.',
     'Av. Irarrázaval 2450', 'Santiago', 'Ñuñoa', 'Plaza Ñuñoa',
     25000, 2, 60, 8, 10, 23, array['No fumar', 'Máximo 8 personas', 'Llegar 10 minutos antes'],
     '[{"category":"microfonos","items":["Neumann U87","Shure SM7B","AKG C414"]},{"category":"consolas","items":["Audient ASP8024"]}]',
     true, 'published'),
    ('de5ace00-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000001',
     'Cabina Bellavista', 'recording_studio',
     'Cabina de voz ideal para podcast y locución.',
     'Cabina pequeña y silenciosa en pleno Bellavista. Perfecta para voces, podcast y doblaje.',
     'Constitución 150', 'Santiago', 'Providencia', 'Bellavista',
     15000, 1, 12, 3, 9, 23, array['No fumar'],
     '[{"category":"microfonos","items":["Rode NT1","Shure SM7B"]}]',
     false, 'published'),
    ('de5ace00-0000-4000-8000-000000000003', 'de000000-0000-4000-8000-000000000001',
     'Control Room Matta', 'recording_studio',
     'Sala de mezcla con monitoreo de referencia.',
     'Control room para mezcla y masterización con monitores de campo cercano y medio.',
     'Av. Matta 820', 'Santiago', 'Santiago Centro', 'Barrio Matta',
     35000, 3, 30, 4, 10, 22, array['Solo mezcla y masterización'],
     '[{"category":"consolas","items":["SSL SiX"]},{"category":"amplificacion","items":["Monitores Genelec 8040"]}]',
     false, 'published'),
    ('de5ace00-0000-4000-8000-000000000004', 'de000000-0000-4000-8000-000000000002',
     'Sala Ensayo Irarrázaval', 'rehearsal_room',
     'Backline completo listo para enchufar y tocar.',
     'Sala de ensayo con batería, amplificadores de guitarra y bajo, y PA para voces.',
     'Av. Irarrázaval 3300', 'Santiago', 'Ñuñoa', 'Villa Frei',
     8000, 2, 25, 6, 12, 24, array['Traer platillos propios', 'No comer dentro de la sala'],
     '[{"category":"amplificacion","items":["Marshall JCM800","Ampeg SVT"]},{"category":"microfonos","items":["Shure SM58 x3"]}]',
     false, 'published'),
    ('de5ace00-0000-4000-8000-000000000005', 'de000000-0000-4000-8000-000000000002',
     'Bunker Macul', 'rehearsal_room',
     'Sala insonorizada para bandas de rock y metal.',
     'Sala subterránea con muy buena aislación. Ideal para ensayar a volumen alto.',
     'Av. Macul 4100', 'Santiago', 'Macul', null,
     10000, 2, 30, 6, 14, 24, array['No fumar'],
     '[{"category":"amplificacion","items":["Mesa Boogie Dual Rectifier","Fender Twin Reverb"]}]',
     false, 'published'),
    ('de5ace00-0000-4000-8000-000000000006', 'de000000-0000-4000-8000-000000000002',
     'Sala Barrio Italia', 'rehearsal_room',
     'Sala acústica para ensambles y música de cámara.',
     'Sala luminosa con piano vertical, ideal para ensayos acústicos y clases.',
     'Av. Italia 1200', 'Santiago', 'Providencia', 'Barrio Italia',
     12000, 1, 35, 10, 9, 21, array['Sin amplificación eléctrica'],
     '[]',
     false, 'published'),
    ('de5ace00-0000-4000-8000-000000000007', 'de000000-0000-4000-8000-000000000003',
     'Set Ciclorama Recoleta', 'filming_set',
     'Ciclorama blanco de 8 metros con parrilla de luces.',
     'Set para publicidad y videoclips con ciclorama infinito, parrilla y potencia trifásica.',
     'Av. Recoleta 1500', 'Santiago', 'Recoleta', 'Patronato',
     45000, 4, 200, 25, 8, 22, array['Pintar el ciclorama tiene costo extra', 'Carga y descarga por el portón'],
     '[{"category":"iluminacion","items":["Aputure 600d x2","Kino Flo 4x4","Parrilla con 12 puntos"]}]',
     true, 'published'),
    ('de5ace00-0000-4000-8000-000000000008', 'de000000-0000-4000-8000-000000000003',
     'Galpón Quilicura', 'filming_set',
     'Galpón industrial para producciones grandes.',
     'Galpón de 600 m² con altura de 9 metros, acceso para camiones y camarines.',
     'Av. Lo Marcoleta 400', 'Santiago', 'Quilicura', null,
     60000, 4, 600, 60, 7, 23, array['Seguro de producción obligatorio'],
     '[{"category":"iluminacion","items":["Generador 60 kVA"]}]',
     false, 'published'),
    ('de5ace00-0000-4000-8000-000000000009', 'de000000-0000-4000-8000-000000000003',
     'Estudio Luz Norte', 'photo_studio',
     'Estudio fotográfico con luz natural y fondos de papel.',
     'Ventanales orientados al norte, fondos de papel de colores y flashes de estudio.',
     'Av. Providencia 2100', 'Santiago', 'Providencia', 'Los Leones',
     18000, 2, 70, 10, 9, 21, array['Calzado limpio sobre el fondo'],
     '[{"category":"iluminacion","items":["Profoto D2 x3","Softbox 120 cm","Beauty dish"]}]',
     true, 'published'),
    ('de5ace00-0000-4000-8000-000000000010', 'de000000-0000-4000-8000-000000000003',
     'Foto Lastarria', 'photo_studio',
     'Estudio boutique en barrio Lastarria.',
     'Estudio para retrato y producto con blackout total y fondos de tela.',
     'José Victorino Lastarria 90', 'Santiago', 'Santiago Centro', 'Lastarria',
     22000, 2, 45, 6, 10, 22, array['No fumar'],
     '[{"category":"iluminacion","items":["Godox AD600 x2"]}]',
     false, 'published'),
    ('de5ace00-0000-4000-8000-000000000011', 'de000000-0000-4000-8000-000000000003',
     'Azotea Vitacura', 'outdoor_location',
     'Terraza con vista a la cordillera para atardeceres.',
     'Azotea de 150 m² con vista panorámica. Ideal para sesiones de fotos y videoclips al atardecer.',
     'Av. Vitacura 5200', 'Santiago', 'Vitacura', null,
     30000, 2, 150, 20, 10, 22, array['Sin música amplificada después de las 21:00'],
     '[]',
     false, 'published'),
    ('de5ace00-0000-4000-8000-000000000012', 'de000000-0000-4000-8000-000000000003',
     'Viñedo Pirque', 'outdoor_location',
     'Viñedo y casona colonial a 40 minutos de Santiago.',
     'Locación rural con viñedos, casona y bodega. Apta para publicidad, moda y cine.',
     'Camino El Principal 2000', 'Pirque', 'Pirque', null,
     50000, 4, 5000, 40, 8, 20, array['Coordinar acceso con 48 horas de anticipación'],
     '[]',
     false, 'published');

  insert into public.space_amenities (space_id, amenity_id)
  select v.space_id, a.id
  from (values
    ('de5ace00-0000-4000-8000-000000000001'::uuid, array['Tratamiento Acústico', 'Consola Análoga', 'Microfonía Condensador', 'Control Room Independiente']),
    ('de5ace00-0000-4000-8000-000000000002', array['Tratamiento Acústico', 'Microfonía Condensador']),
    ('de5ace00-0000-4000-8000-000000000003', array['Tratamiento Acústico', 'Control Room Independiente']),
    ('de5ace00-0000-4000-8000-000000000004', array['Backline Batería/Amps', 'Tratamiento Acústico']),
    ('de5ace00-0000-4000-8000-000000000005', array['Backline Batería/Amps']),
    ('de5ace00-0000-4000-8000-000000000006', array['Tratamiento Acústico', 'Luz Natural']),
    ('de5ace00-0000-4000-8000-000000000007', array['Ciclorama Blanco', 'Potencia Trifásica', 'Blackout Total']),
    ('de5ace00-0000-4000-8000-000000000008', array['Potencia Trifásica', 'Blackout Total']),
    ('de5ace00-0000-4000-8000-000000000009', array['Luz Natural', 'Ciclorama Blanco']),
    ('de5ace00-0000-4000-8000-000000000010', array['Blackout Total']),
    ('de5ace00-0000-4000-8000-000000000011', array['Luz Natural']),
    ('de5ace00-0000-4000-8000-000000000012', array['Luz Natural', 'Potencia Trifásica'])
  ) as v(space_id, names)
  join public.amenities a on a.name = any (v.names);

  -- ---------------------------------------------------------------------------
  -- Reservas. Se apaga el trigger de montos para poder crear reservas pasadas;
  -- los montos se calculan igual que el trigger (horas × precio + 10%).
  -- ---------------------------------------------------------------------------
  alter table public.bookings disable trigger bookings_compute_amounts;

  insert into public.bookings (
    id, space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount,
    status, completed_at, project, message, created_at
  )
  select
    v.id, v.space_id, v.client_id,
    ((v_today + v.day_offset) + make_interval(hours => v.start_hour)) at time zone 'America/Santiago',
    ((v_today + v.day_offset) + make_interval(hours => v.start_hour + v.hours)) at time zone 'America/Santiago',
    v.hours, v.hours * s.price_per_hour, round(v.hours * s.price_per_hour * 0.10)::int,
    v.hours * s.price_per_hour + round(v.hours * s.price_per_hour * 0.10)::int,
    v.status::public.booking_status,
    case when v.status = 'completed'
         then (((v_today + v.day_offset) + make_interval(hours => v.start_hour + v.hours)) at time zone 'America/Santiago') + interval '1 day' end,
    v.project, v.message,
    least(now(), ((v_today + v.day_offset) at time zone 'America/Santiago') - interval '7 days')
  from (values
    ('deb00c00-0000-4000-8000-000000000001'::uuid, 'de5ace00-0000-4000-8000-000000000001'::uuid, 'de000000-0000-4000-8000-000000000011'::uuid, -30, 15, 3, 'completed', 'Maqueta EP', null::text),
    ('deb00c00-0000-4000-8000-000000000002', 'de5ace00-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000012', -21, 11, 2, 'completed', 'Voces para spot', null),
    ('deb00c00-0000-4000-8000-000000000003', 'de5ace00-0000-4000-8000-000000000004', 'de000000-0000-4000-8000-000000000011', -18, 19, 2, 'completed', 'Ensayo banda', null),
    ('deb00c00-0000-4000-8000-000000000004', 'de5ace00-0000-4000-8000-000000000007', 'de000000-0000-4000-8000-000000000012', -25,  9, 6, 'completed', 'Campaña de moda', null),
    ('deb00c00-0000-4000-8000-000000000005', 'de5ace00-0000-4000-8000-000000000009', 'de000000-0000-4000-8000-000000000011', -12, 10, 3, 'completed', 'Fotos de prensa', null),
    ('deb00c00-0000-4000-8000-000000000006', 'de5ace00-0000-4000-8000-000000000011', 'de000000-0000-4000-8000-000000000012', -40, 17, 2, 'completed', 'Sesión al atardecer', null),
    ('deb00c00-0000-4000-8000-000000000007', 'de5ace00-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000011',  -9, 14, 2, 'completed', 'Podcast', null),
    ('deb00c00-0000-4000-8000-000000000008', 'de5ace00-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000012',   3, 15, 3, 'confirmed', 'Single', null),
    ('deb00c00-0000-4000-8000-000000000009', 'de5ace00-0000-4000-8000-000000000007', 'de000000-0000-4000-8000-000000000011',   5,  9, 5, 'confirmed', 'Videoclip', null),
    ('deb00c00-0000-4000-8000-000000000010', 'de5ace00-0000-4000-8000-000000000004', 'de000000-0000-4000-8000-000000000013',   2, 20, 2, 'requested', 'Primer ensayo de la banda',
     'Hola Diego, somos un trío de rock y es nuestro primer ensayo. ¡Cuidaremos la sala!')
  ) as v(id, space_id, client_id, day_offset, start_hour, hours, status, project, message)
  join public.spaces s on s.id = v.space_id;

  alter table public.bookings enable trigger bookings_compute_amounts;

  -- ---------------------------------------------------------------------------
  -- Reseñas en ambos sentidos (al existir las dos, quedan reveladas)
  -- ---------------------------------------------------------------------------
  insert into public.reviews (booking_id, rating, comment, tags, created_at)
  select v.booking_id, v.rating, v.comment, v.tags, b.completed_at + interval '2 hours'
  from (values
    ('deb00c00-0000-4000-8000-000000000001'::uuid, 5, 'Sonido impecable y Ana es una gran ingeniera.', array['acústica', 'equipo impecable']),
    ('deb00c00-0000-4000-8000-000000000002', 4, 'Muy buen estudio, el estacionamiento es difícil.', array['acústica', 'buena ubicación']),
    ('deb00c00-0000-4000-8000-000000000003', 5, 'Backline en perfecto estado.', array['equipo impecable', 'puntual']),
    ('deb00c00-0000-4000-8000-000000000004', 5, 'El ciclorama estaba recién pintado. Volveremos.', array['espacioso', 'equipo impecable']),
    ('deb00c00-0000-4000-8000-000000000005', 4, 'Linda luz natural en la mañana.', array['buena luz']),
    ('deb00c00-0000-4000-8000-000000000006', 3, 'La vista es increíble, pero hacía mucho viento.', array['buena ubicación']),
    ('deb00c00-0000-4000-8000-000000000007', 5, 'Cabina silenciosa, ideal para podcast.', array['acústica', 'puntual'])
  ) as v(booking_id, rating, comment, tags)
  join public.bookings b on b.id = v.booking_id;

  insert into public.client_reviews (booking_id, rating, comment, tags, created_at)
  select v.booking_id, v.rating, v.comment, v.tags, b.completed_at + interval '5 hours'
  from (values
    ('deb00c00-0000-4000-8000-000000000001'::uuid, 5, 'Puntual y cuidadoso con los equipos.', array['puntual', 'ordenado']),
    ('deb00c00-0000-4000-8000-000000000002', 4, 'Todo bien, llegó 10 minutos tarde.', array['comunicativa']),
    ('deb00c00-0000-4000-8000-000000000003', 5, 'Dejaron la sala impecable.', array['ordenado']),
    ('deb00c00-0000-4000-8000-000000000004', 5, 'Producción muy profesional.', array['puntual', 'ordenado']),
    ('deb00c00-0000-4000-8000-000000000005', 4, 'Sin problemas.', array['puntual']),
    ('deb00c00-0000-4000-8000-000000000006', 4, 'Buena comunicación.', array['comunicativa']),
    ('deb00c00-0000-4000-8000-000000000007', 5, 'Excelente cliente.', array['puntual'])
  ) as v(booking_id, rating, comment, tags)
  join public.bookings b on b.id = v.booking_id;

  raise notice 'Datos demo cargados: 6 usuarios, 12 espacios, 10 reservas y 14 reseñas.';
end;
$$;
