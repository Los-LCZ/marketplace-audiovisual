-- =============================================================================
-- Estadísticas y reseñas de un perfil, como anfitrión y como cliente.
-- Solo reseñas reveladas (calificación a ciegas).
--   as_host:   reseñas de clientes sobre los espacios del perfil (reviews).
--   as_client: reseñas de anfitriones sobre el perfil como cliente (client_reviews).
-- =============================================================================

create or replace function public.get_profile_rating_stats(p_profile_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with rows as (
    select 'as_host' as role, r.rating, r.tags
    from public.reviews r
    join public.bookings b on b.id = r.booking_id
    join public.spaces s on s.id = b.space_id
    where s.host_id = p_profile_id and public.is_review_public(b.id)
    union all
    select 'as_client', cr.rating, cr.tags
    from public.client_reviews cr
    join public.bookings b on b.id = cr.booking_id
    where b.client_id = p_profile_id and public.is_review_public(b.id)
  ),
  roles as (
    select unnest(array['as_host', 'as_client']) as role
  ),
  agg as (
    select
      ro.role,
      round(avg(x.rating), 2) as avg,
      count(x.rating)::int    as cnt,
      jsonb_build_array(
        count(x.rating) filter (where x.rating = 5),
        count(x.rating) filter (where x.rating = 4),
        count(x.rating) filter (where x.rating = 3),
        count(x.rating) filter (where x.rating = 2),
        count(x.rating) filter (where x.rating = 1)
      ) as distribution
    from roles ro
    left join rows x on x.role = ro.role
    group by ro.role
  ),
  tag_counts as (
    select x.role, t.label, count(*)::int as n,
           row_number() over (partition by x.role order by count(*) desc, t.label) as rn
    from rows x
    cross join lateral unnest(x.tags) as t(label)
    group by x.role, t.label
  ),
  top_tags as (
    select role, jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc, label) as tags
    from tag_counts
    where rn <= 5
    group by role
  )
  select jsonb_object_agg(
    a.role,
    jsonb_build_object(
      'avg', a.avg,
      'count', a.cnt,
      'distribution', a.distribution,
      'top_tags', coalesce(t.tags, '[]'::jsonb)
    )
  )
  from agg a
  left join top_tags t on t.role = a.role;
$$;

-- Reseñas recibidas por un perfil en un rol ('host' | 'client'), paginadas.
create or replace function public.get_profile_reviews(
  p_profile_id uuid,
  p_role       text,
  p_page       int default 1,
  p_page_size  int default 20
)
returns table (
  id            uuid,
  rating        integer,
  comment       text,
  tags          text[],
  created_at    timestamptz,
  author_id     uuid,
  author_name   text,
  author_avatar text,
  space_id      uuid,
  space_title   text
)
language sql stable security definer set search_path = ''
as $$
  with params as (
    select least(greatest(coalesce(p_page_size, 20), 1), 50) as size,
           greatest(coalesce(p_page, 1), 1)                  as page
  ),
  all_reviews as (
    -- Como anfitrión: lo que escribieron los clientes.
    select r.id, r.rating, r.comment, r.tags, r.created_at,
           b.client_id as author_id, s.id as space_id, s.title as space_title
    from public.reviews r
    join public.bookings b on b.id = r.booking_id
    join public.spaces s on s.id = b.space_id
    where p_role = 'host' and s.host_id = p_profile_id and public.is_review_public(b.id)
    union all
    -- Como cliente: lo que escribieron los anfitriones.
    select cr.id, cr.rating, cr.comment, cr.tags, cr.created_at,
           s.host_id, s.id, s.title
    from public.client_reviews cr
    join public.bookings b on b.id = cr.booking_id
    join public.spaces s on s.id = b.space_id
    where p_role = 'client' and b.client_id = p_profile_id and public.is_review_public(b.id)
  )
  select a.id, a.rating, a.comment, a.tags, a.created_at,
         a.author_id, p.full_name, p.avatar_url, a.space_id, a.space_title
  from all_reviews a
  join public.profiles p on p.id = a.author_id
  cross join params
  order by a.created_at desc, a.id
  limit (select size from params)
  offset (select (page - 1) * size from params);
$$;

grant execute on function public.get_profile_rating_stats(uuid) to anon, authenticated;
grant execute on function public.get_profile_reviews(uuid, text, int, int) to anon, authenticated;
