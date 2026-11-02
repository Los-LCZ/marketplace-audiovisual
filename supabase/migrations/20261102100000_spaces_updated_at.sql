-- =============================================================================
-- spaces.updated_at: última modificación del espacio (datos, fotos o amenities).
-- La usa el sitemap como lastModified.
-- =============================================================================

alter table public.spaces
  add column updated_at timestamptz not null default now();

-- Los espacios existentes parten con su fecha de creación.
update public.spaces set updated_at = created_at;

-- Cada update de spaces (incluidas las fotos, que viven en spaces.images) la renueva.
-- No se puede fijar a mano: siempre queda en now().
create or replace function public.set_space_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := now();
  elsif new is distinct from old then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

create trigger spaces_set_updated_at
  before insert or update on public.spaces
  for each row execute function public.set_space_updated_at();

-- Cambiar amenities también cuenta como modificación del espacio.
create or replace function public.touch_space_from_amenities()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.spaces
     set updated_at = now()
   where id = coalesce(new.space_id, old.space_id);
  return null;
end;
$$;

create trigger space_amenities_touch_space
  after insert or update or delete on public.space_amenities
  for each row execute function public.touch_space_from_amenities();

-- `s.*` de space_cards se fija al crearla: se recrea para incluir updated_at.
drop view public.space_cards;

create view public.space_cards
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
