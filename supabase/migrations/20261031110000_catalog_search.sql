-- =============================================================================
-- Catálogo: orden por rating en la base, filtro por varias categorías y
-- disponibilidad por día.
-- =============================================================================

-- ¿La reseña de esta reserva ya es pública? Por ahora siempre; la migración de
-- calificación a ciegas reemplaza el cuerpo y todo lo que la usa queda al día.
create or replace function public.is_review_public(p_booking_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select true;
$$;

-- Espacios publicados con su rating (solo reseñas públicas). Es la fuente del
-- catálogo: permite filtrar, ordenar por rating y paginar en una sola query.
-- OJO: `s.*` se fija al crear la vista; si se agregan columnas a `spaces`,
-- hay que recrearla.
create or replace view public.space_cards
with (security_invoker = false)
as
  select
    s.*,
    stats.avg_rating,
    stats.review_count
  from public.spaces s
  left join lateral (
    select
      round(avg(r.rating), 1)::numeric(2, 1) as avg_rating,
      count(r.id)::int                       as review_count
    from public.bookings b
    join public.reviews r on r.booking_id = b.id
    where b.space_id = s.id
      and public.is_review_public(b.id)
  ) stats on true
  where s.status = 'published';

grant select on public.space_cards to anon, authenticated;

-- Las estadísticas y reseñas existentes también respetan la visibilidad.
create or replace view public.space_rating_stats
with (security_invoker = false)
as
  select
    s.id                                          as space_id,
    round(avg(r.rating), 1)::numeric(2, 1)        as avg_rating,
    count(r.id)::int                              as review_count
  from public.spaces s
  left join public.bookings b on b.space_id = s.id and public.is_review_public(b.id)
  left join public.reviews  r on r.booking_id = b.id
  where s.status = 'published' or s.host_id = auth.uid()
  group by s.id;

create or replace function public.get_space_reviews(
  p_space_id uuid,
  p_limit    int default 20,
  p_offset   int default 0
)
returns table (
  id            uuid,
  rating        integer,
  comment       text,
  created_at    timestamptz,
  author_name   text,
  author_avatar text
)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.rating, r.comment, r.created_at, p.full_name, p.avatar_url
  from public.reviews r
  join public.bookings b on b.id = r.booking_id
  join public.spaces   s on s.id = b.space_id
  join public.profiles p on p.id = b.client_id
  where s.id = p_space_id
    and s.status = 'published'
    and public.is_review_public(b.id)
  order by r.created_at desc, r.id
  limit  least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- -----------------------------------------------------------------------------
-- Disponibilidad: ids de espacios publicados con al menos `min_hours` horas
-- seguidas libres el día `p_date` (hora de Chile), dentro de open_hour–close_hour.
-- Bloquean el horario las reservas pending_payment y confirmed. Si p_date es hoy,
-- solo cuenta desde la próxima hora en punto.
-- -----------------------------------------------------------------------------
create or replace function public.get_available_space_ids(
  p_date       date,
  p_categories public.space_category[] default null
)
returns setof uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_space  record;
  v_busy   record;
  v_start  timestamptz;
  v_end    timestamptz;
  v_cursor timestamptz;
  v_need   interval;
  v_ok     boolean;
  v_next_hour timestamptz := date_trunc('hour', now()) + interval '1 hour';
begin
  for v_space in
    select s.id, s.min_hours, s.open_hour, s.close_hour
    from public.spaces s
    where s.status = 'published'
      and (p_categories is null or s.category = any (p_categories))
  loop
    v_start  := (p_date + make_interval(hours => v_space.open_hour)) at time zone 'America/Santiago';
    v_end    := (p_date + make_interval(hours => v_space.close_hour)) at time zone 'America/Santiago';
    v_start  := greatest(v_start, v_next_hour);
    v_need   := make_interval(hours => v_space.min_hours);
    v_cursor := v_start;
    v_ok     := false;

    if v_end - v_start >= v_need then
      for v_busy in
        select greatest(b.start_time, v_start) as s, least(b.end_time, v_end) as e
        from public.bookings b
        where b.space_id = v_space.id
          and b.status in ('pending_payment', 'confirmed')
          and b.start_time < v_end
          and b.end_time > v_start
        order by b.start_time
      loop
        if v_busy.s - v_cursor >= v_need then
          v_ok := true;
          exit;
        end if;
        v_cursor := greatest(v_cursor, v_busy.e);
      end loop;

      if not v_ok and v_end - v_cursor >= v_need then
        v_ok := true;
      end if;
    end if;

    if v_ok then
      return next v_space.id;
    end if;
  end loop;
end;
$$;

grant execute on function public.get_available_space_ids(date, public.space_category[]) to anon, authenticated;
