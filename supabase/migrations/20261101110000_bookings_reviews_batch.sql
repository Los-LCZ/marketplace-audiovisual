-- =============================================================================
-- Reseñas de varias reservas en una sola llamada. Aplica exactamente las mismas
-- reglas que get_booking_reviews (calificación a ciegas): solo devuelve las
-- reservas en las que participa el usuario actual. Máximo 100 ids por llamada.
-- =============================================================================

create or replace function public.get_bookings_reviews(p_booking_ids uuid[])
returns table (booking_id uuid, reviews jsonb)
language sql stable security definer set search_path = ''
as $$
  select ids.id, r.reviews
  from (
    select distinct unnest(p_booking_ids[1:100]) as id
  ) ids
  cross join lateral (select public.get_booking_reviews(ids.id) as reviews) r
  where r.reviews is not null;
$$;

revoke execute on function public.get_bookings_reviews(uuid[]) from anon, public;
grant execute on function public.get_bookings_reviews(uuid[]) to authenticated;
