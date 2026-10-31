-- =============================================================================
-- Reseñas por espacio y rating promedio
-- `reviews` solo se relaciona con un espacio a través de `bookings`, y RLS
-- impide que anon lea `bookings`. Estas funciones/vistas exponen solo lo
-- necesario para la ficha y el listado de espacios.
-- =============================================================================

-- Reseñas de un espacio publicado, más recientes primero. Nunca expone el teléfono.
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
  order by r.created_at desc, r.id
  limit  least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.get_space_reviews(uuid, int, int) to anon, authenticated;

-- Rating promedio y cantidad de reseñas por espacio.
-- Vista con permisos del dueño (security_invoker = false) para poder leer
-- `bookings`; filtra a espacios publicados o propios del usuario actual.
create or replace view public.space_rating_stats
with (security_invoker = false)
as
  select
    s.id                                          as space_id,
    round(avg(r.rating), 1)::numeric(2, 1)        as avg_rating,
    count(r.id)::int                              as review_count
  from public.spaces s
  left join public.bookings b on b.space_id = s.id
  left join public.reviews  r on r.booking_id = b.id
  where s.status = 'published' or s.host_id = auth.uid()
  group by s.id;

grant select on public.space_rating_stats to anon, authenticated;
