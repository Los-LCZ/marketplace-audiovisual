-- =============================================================================
-- space_cards.world: mundo de cada espacio ('av' Audiovisual, 'mu' Música), para
-- ordenar "primero el mundo activo" en la base, antes de paginar.
-- Debe coincidir con WORLDS en src/lib/world.ts (Música = estudio de grabación y
-- sala de ensayo; el resto es Audiovisual).
-- Solo agrega una columna al final: create or replace basta.
-- =============================================================================

create or replace view public.space_cards
with (security_invoker = false)
as
  select
    s.*,
    stats.avg_rating,
    stats.review_count,
    case when s.category in ('recording_studio', 'rehearsal_room') then 'mu' else 'av' end as world
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
