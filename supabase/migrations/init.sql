-- =============================================================================
-- Marketplace Audiovisual — esquema inicial
-- Ejecutar completo en Supabase SQL Editor (o `supabase db push`).
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('client', 'host', 'admin');

create type public.space_category as enum (
  'recording_studio',
  'rehearsal_room',
  'filming_set',
  'photo_studio',
  'outdoor_location'
);

create type public.space_status as enum ('draft', 'published', 'archived');

create type public.booking_status as enum (
  'pending_payment',
  'confirmed',
  'completed',
  'cancelled'
);

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        public.user_role not null default 'client',
  created_at  timestamptz not null default now()
);

create table public.spaces (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 120),
  category        public.space_category not null,
  description     text,
  address         text not null,
  city            text not null,
  commune         text not null,
  price_per_hour  integer not null check (price_per_hour > 0),          -- CLP
  min_hours       integer not null default 1 check (min_hours >= 1),
  images          text[] not null default '{}',
  status          public.space_status not null default 'published',
  created_at      timestamptz not null default now()
);

create index spaces_host_id_idx  on public.spaces (host_id);
create index spaces_search_idx   on public.spaces (status, category, city, commune);

create table public.amenities (
  id        serial primary key,
  name      text not null unique,
  category  text not null check (category in ('audio', 'video', 'general'))
);

create table public.space_amenities (
  space_id    uuid not null references public.spaces (id) on delete cascade,
  amenity_id  integer not null references public.amenities (id) on delete cascade,
  primary key (space_id, amenity_id)
);

create index space_amenities_amenity_idx on public.space_amenities (amenity_id);

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references public.spaces (id) on delete restrict,
  client_id      uuid not null references public.profiles (id) on delete restrict,
  start_time     timestamptz not null,
  end_time       timestamptz not null,
  total_hours    integer not null,
  subtotal       integer not null,
  platform_fee   integer not null,
  total_amount   integer not null,
  status         public.booking_status not null default 'confirmed',
  payment_id     text,
  created_at     timestamptz not null default now(),

  constraint bookings_time_order check (end_time > start_time),
  -- Impide reservas solapadas del mismo espacio (las canceladas/completadas no bloquean).
  constraint bookings_no_overlap exclude using gist (
    space_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status in ('pending_payment', 'confirmed'))
);

create index bookings_client_id_idx on public.bookings (client_id);
create index bookings_space_id_idx  on public.bookings (space_id, start_time);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  rating      integer not null check (rating >= 1 and rating <= 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Funciones auxiliares (security definer => evitan recursión de RLS)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_host()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('host', 'admin')
  );
$$;

create or replace function public.owns_space(p_space_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.spaces where id = p_space_id and host_id = auth.uid()
  );
$$;

-- ¿El usuario actual es contraparte (cliente o anfitrión) de alguna reserva con p_profile_id?
create or replace function public.is_booking_counterparty(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.spaces s on s.id = b.space_id
    where (b.client_id = auth.uid() and s.host_id = p_profile_id)
       or (s.host_id = auth.uid() and b.client_id = p_profile_id)
  );
$$;

-- -----------------------------------------------------------------------------
-- Trigger: crear perfil al registrarse un usuario
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'avatar_url',
    -- Nunca se acepta 'admin' desde el registro público.
    case when new.raw_user_meta_data ->> 'role' = 'host'
         then 'host'::public.user_role
         else 'client'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: un usuario no puede cambiar su propio rol (solo admin / service_role)
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'No tienes permisos para cambiar el rol';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- -----------------------------------------------------------------------------
-- Trigger: cálculo de montos de la reserva en el servidor (no confiar en el cliente)
-- -----------------------------------------------------------------------------
-- Comisión de la plataforma: 10% sobre el subtotal.
create or replace function public.compute_booking_amounts()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_space   public.spaces%rowtype;
  v_seconds numeric;
begin
  select * into v_space from public.spaces where id = new.space_id;

  if not found or v_space.status <> 'published' then
    raise exception 'El espacio no está disponible para reservas';
  end if;

  if v_space.host_id = new.client_id then
    raise exception 'No puedes reservar tu propio espacio';
  end if;

  if new.start_time <= now() then
    raise exception 'La reserva debe comenzar en el futuro';
  end if;

  v_seconds := extract(epoch from (new.end_time - new.start_time));

  if v_seconds <= 0 or mod(v_seconds, 3600) <> 0 then
    raise exception 'La reserva debe ser por horas completas';
  end if;

  new.total_hours := (v_seconds / 3600)::integer;

  if new.total_hours < v_space.min_hours then
    raise exception 'Este espacio requiere un mínimo de % hora(s)', v_space.min_hours;
  end if;

  new.subtotal     := new.total_hours * v_space.price_per_hour;
  new.platform_fee := round(new.subtotal * 0.10)::integer;
  new.total_amount := new.subtotal + new.platform_fee;

  -- Los clientes solo pueden crear reservas confirmadas o pendientes de pago.
  if coalesce(auth.role(), '') <> 'service_role' then
    if new.status not in ('pending_payment', 'confirmed') then
      new.status := 'confirmed';
    end if;
    new.payment_id := null;
  end if;

  return new;
end;
$$;

create trigger bookings_compute_amounts
  before insert on public.bookings
  for each row execute function public.compute_booking_amounts();

-- Trigger: en updates solo se permite cambiar estado (y payment_id vía service_role).
create or replace function public.guard_booking_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_is_host boolean;
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;

  if (new.space_id, new.client_id, new.start_time, new.end_time, new.total_hours,
      new.subtotal, new.platform_fee, new.total_amount, new.payment_id)
     is distinct from
     (old.space_id, old.client_id, old.start_time, old.end_time, old.total_hours,
      old.subtotal, old.platform_fee, old.total_amount, old.payment_id) then
    raise exception 'Solo se puede modificar el estado de la reserva';
  end if;

  if new.status is distinct from old.status then
    v_is_host := public.owns_space(old.space_id);

    if old.status in ('cancelled', 'completed') then
      raise exception 'La reserva ya está cerrada';
    end if;

    -- Cliente: solo puede cancelar. Anfitrión: puede cancelar o marcar completada.
    if not v_is_host and new.status <> 'cancelled' then
      raise exception 'Solo puedes cancelar tu reserva';
    end if;

    if v_is_host and new.status not in ('cancelled', 'completed', 'confirmed') then
      raise exception 'Estado no permitido';
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_guard_update
  before update on public.bookings
  for each row execute function public.guard_booking_update();

-- -----------------------------------------------------------------------------
-- RPC: horarios ocupados de un espacio (sin exponer datos de otros clientes)
-- -----------------------------------------------------------------------------
create or replace function public.get_space_busy_slots(
  p_space_id uuid,
  p_from     timestamptz,
  p_to       timestamptz
)
returns table (start_time timestamptz, end_time timestamptz)
language sql stable security definer set search_path = ''
as $$
  select b.start_time, b.end_time
  from public.bookings b
  join public.spaces s on s.id = b.space_id
  where b.space_id = p_space_id
    and s.status = 'published'
    and b.status in ('pending_payment', 'confirmed')
    and b.start_time < p_to
    and b.end_time   > p_from
  order by b.start_time;
$$;

-- -----------------------------------------------------------------------------
-- Vista pública de anfitriones (sin teléfono)
-- -----------------------------------------------------------------------------
create or replace view public.public_profiles as
  select id, full_name, avatar_url, role, created_at
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.spaces           enable row level security;
alter table public.amenities        enable row level security;
alter table public.space_amenities  enable row level security;
alter table public.bookings         enable row level security;
alter table public.reviews          enable row level security;

-- profiles: datos de contacto visibles solo para el dueño y sus contrapartes de reserva.
create policy "profiles_select_own_or_counterparty" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_booking_counterparty(id) or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- spaces
create policy "spaces_select_published_or_own" on public.spaces
  for select to anon, authenticated
  using (status = 'published' or host_id = auth.uid() or public.is_admin());

create policy "spaces_insert_host" on public.spaces
  for insert to authenticated
  with check (host_id = auth.uid() and public.is_host());

create policy "spaces_update_own" on public.spaces
  for update to authenticated
  using (host_id = auth.uid() or public.is_admin())
  with check (host_id = auth.uid() or public.is_admin());

create policy "spaces_delete_own" on public.spaces
  for delete to authenticated
  using (host_id = auth.uid() or public.is_admin());

-- amenities: catálogo público, administrado por admins.
create policy "amenities_select_all" on public.amenities
  for select to anon, authenticated
  using (true);

create policy "amenities_admin_all" on public.amenities
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- space_amenities
create policy "space_amenities_select_visible" on public.space_amenities
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.spaces s
      where s.id = space_id
        and (s.status = 'published' or s.host_id = auth.uid())
    )
  );

create policy "space_amenities_insert_owner" on public.space_amenities
  for insert to authenticated
  with check (public.owns_space(space_id) or public.is_admin());

create policy "space_amenities_delete_owner" on public.space_amenities
  for delete to authenticated
  using (public.owns_space(space_id) or public.is_admin());

-- bookings: visibles para el cliente y el anfitrión del espacio.
create policy "bookings_select_participants" on public.bookings
  for select to authenticated
  using (client_id = auth.uid() or public.owns_space(space_id) or public.is_admin());

create policy "bookings_insert_client" on public.bookings
  for insert to authenticated
  with check (client_id = auth.uid());

create policy "bookings_update_participants" on public.bookings
  for update to authenticated
  using (client_id = auth.uid() or public.owns_space(space_id) or public.is_admin())
  with check (client_id = auth.uid() or public.owns_space(space_id) or public.is_admin());

-- reviews: lectura pública; solo el cliente de una reserva completada puede reseñar.
create policy "reviews_select_all" on public.reviews
  for select to anon, authenticated
  using (true);

create policy "reviews_insert_booking_client" on public.reviews
  for insert to authenticated
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.client_id = auth.uid()
        and b.status = 'completed'
    )
  );

create policy "reviews_update_author" on public.reviews
  for update to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.client_id = auth.uid()))
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.client_id = auth.uid()));

create policy "reviews_delete_author" on public.reviews
  for delete to authenticated
  using (
    exists (select 1 from public.bookings b where b.id = booking_id and b.client_id = auth.uid())
    or public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- Storage: bucket público para fotos de locaciones
-- Ruta esperada: space-images/{auth.uid()}/{space_id}/{archivo}
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'space-images',
  'space-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "space_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'space-images');

create policy "space_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'space-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "space_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'space-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'space-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "space_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'space-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- Datos iniciales: amenities del rubro audiovisual
-- -----------------------------------------------------------------------------
insert into public.amenities (name, category) values
  ('Tratamiento Acústico',       'audio'),
  ('Consola Análoga',            'audio'),
  ('Microfonía Condensador',     'audio'),
  ('Backline Batería/Amps',      'audio'),
  ('Control Room Independiente', 'audio'),
  ('Ciclorama Blanco',           'video'),
  ('Luz Natural',                'video'),
  ('Blackout Total',             'video'),
  ('Potencia Trifásica',         'general')
on conflict (name) do nothing;
