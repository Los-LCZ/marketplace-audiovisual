-- =============================================================================
-- Ubicación de los espacios y dirección oculta.
--
-- - spaces.lat / spaces.lng: punto exacto (geocodificado en el servidor al guardar).
-- - spaces.commune_lat / spaces.commune_lng: centro de la comuna (dato público).
-- - spaces.hide_address: el anfitrión oculta su dirección exacta hasta que la
--   reserva esté confirmada.
--
-- La dirección y el punto exacto NO se pueden leer desde la API: anon y
-- authenticated pierden el SELECT sobre address, lat y lng (privilegios por
-- columna). Se leen solo a través de las vistas space_locations y space_cards,
-- que los enmascaran según quién mira:
--   visible = el espacio no oculta su dirección, o quien mira es el anfitrión,
--             un admin, o un cliente con una reserva confirmada (o completada)
--             en ese espacio.
-- Si no es visible: address = null y el mapa usa el centro de la comuna.
--
-- OJO al agregar columnas a spaces: anon/authenticated ya no tienen SELECT a
-- nivel de tabla, así que cada columna nueva necesita su `grant select (col)`.
-- Y `select *` sobre spaces falla para ellos: usar columnas explícitas.
-- =============================================================================

alter table public.spaces
  add column lat          double precision check (lat between -90 and 90),
  add column lng          double precision check (lng between -180 and 180),
  add column commune_lat  double precision check (commune_lat between -90 and 90),
  add column commune_lng  double precision check (commune_lng between -180 and 180),
  add column hide_address boolean not null default false;

-- -----------------------------------------------------------------------------
-- Coordenadas viejas no sobreviven a un cambio de dirección: si cambian
-- address/commune/city y el mismo update no trae coordenadas nuevas, se borran
-- (quedan null hasta la próxima geocodificación).
-- -----------------------------------------------------------------------------
create or replace function public.reset_space_coords()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (new.address, new.commune, new.city) is distinct from (old.address, old.commune, old.city)
     and (new.lat, new.lng) is not distinct from (old.lat, old.lng) then
    new.lat := null;
    new.lng := null;
  end if;
  if (new.commune, new.city) is distinct from (old.commune, old.city)
     and (new.commune_lat, new.commune_lng) is not distinct from (old.commune_lat, old.commune_lng) then
    new.commune_lat := null;
    new.commune_lng := null;
  end if;
  return new;
end;
$$;

create trigger spaces_reset_coords
  before update of address, commune, city on public.spaces
  for each row execute function public.reset_space_coords();

-- -----------------------------------------------------------------------------
-- Privilegios por columna: todo menos address, lat y lng.
-- (insert/update siguen a nivel de tabla, con RLS: el anfitrión escribe su dirección.)
-- -----------------------------------------------------------------------------
revoke select on public.spaces from anon, authenticated;

do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'spaces'
    and column_name not in ('address', 'lat', 'lng');

  execute format('grant select (%s) on public.spaces to anon, authenticated', v_cols);
end;
$$;

-- -----------------------------------------------------------------------------
-- ¿Quien mira tiene una reserva confirmada (o ya completada) en el espacio?
-- -----------------------------------------------------------------------------
create or replace function public.has_confirmed_booking(p_space_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.bookings b
    where b.space_id = p_space_id
      and b.client_id = auth.uid()
      and b.status in ('confirmed', 'completed')
  );
$$;

-- -----------------------------------------------------------------------------
-- space_locations: ubicación enmascarada de cada espacio que quien mira puede ver
-- (publicados, los propios, todos para admin, y los que reservó con confirmación).
-- -----------------------------------------------------------------------------
create view public.space_locations
with (security_invoker = false)
as
  select
    s.id as space_id,
    not v.visible as address_hidden,
    case when v.visible then s.address end as address,
    case when v.exact then s.lat else s.commune_lat end as map_lat,
    case when v.exact then s.lng else s.commune_lng end as map_lng
  from public.spaces s
  -- coalesce: para anon auth.uid() es null y la comparación daría null.
  cross join lateral (
    select
      coalesce(s.host_id = auth.uid(), false) as is_owner,
      public.is_admin()                       as is_admin
  ) who
  cross join lateral (
    select not s.hide_address or who.is_owner or who.is_admin
           or public.has_confirmed_booking(s.id) as visible
  ) vis
  cross join lateral (
    select
      vis.visible,
      vis.visible and s.lat is not null and s.lng is not null as exact
  ) v
  where s.status = 'published'
     or who.is_owner
     or who.is_admin
     or public.has_confirmed_booking(s.id);

grant select on public.space_locations to anon, authenticated;

-- -----------------------------------------------------------------------------
-- space_cards: igual que antes, pero sin address/lat/lng crudos; trae la
-- ubicación enmascarada de space_locations. Se recrea porque cambia el `s.*`.
-- -----------------------------------------------------------------------------
drop view public.space_cards;

do $$
declare
  v_cols text;
begin
  select string_agg('s.' || quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'spaces'
    and column_name not in ('address', 'lat', 'lng');

  execute format($v$
    create view public.space_cards
    with (security_invoker = false)
    as
      select
        %s,
        stats.avg_rating,
        stats.review_count,
        case when s.category in ('recording_studio', 'rehearsal_room') then 'mu' else 'av' end as world,
        loc.address,
        loc.map_lat,
        loc.map_lng,
        loc.address_hidden
      from public.spaces s
      join public.space_locations loc on loc.space_id = s.id
      left join lateral (
        select
          round(avg(r.rating), 1)::numeric(2, 1) as avg_rating,
          count(r.id)::int                       as review_count
        from public.bookings b
        join public.reviews r on r.booking_id = b.id
        where b.space_id = s.id
          and public.is_review_public(b.id)
      ) stats on true
      where s.status = 'published'
  $v$, v_cols);
end;
$$;

grant select on public.space_cards to anon, authenticated;
