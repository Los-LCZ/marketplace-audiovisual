-- =============================================================================
-- Descubrir: me gusta / descarte por espacio y mazo de espacios por ver.
-- =============================================================================

create table public.space_reactions (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  space_id   uuid not null references public.spaces (id) on delete cascade,
  kind       text not null check (kind in ('like', 'pass')),
  created_at timestamptz not null default now(),
  primary key (user_id, space_id)
);

create index space_reactions_user_kind_idx on public.space_reactions (user_id, kind, created_at desc);

alter table public.space_reactions enable row level security;

create policy "space_reactions_owner_all" on public.space_reactions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Mazo del usuario actual: espacios publicados que no son suyos y a los que aún
-- no reaccionó. `is_match` indica si cumple la nota mínima del anfitrión (si no,
-- al reservar queda como solicitud).
create or replace function public.get_discover_deck(
  p_categories public.space_category[] default null,
  p_limit      int default 20
)
returns table (
  space_id               uuid,
  is_match               boolean,
  host_min_client_rating numeric,
  my_client_rating       numeric
)
language sql stable security definer set search_path = ''
as $$
  with me as (
    select r.avg_rating from public.get_client_rating(auth.uid()) r
  )
  select
    c.id,
    public.client_meets_minimum(auth.uid(), c.host_id),
    h.min_client_rating,
    me.avg_rating
  from public.space_cards c
  join public.profiles h on h.id = c.host_id
  cross join me
  where auth.uid() is not null
    and c.host_id <> auth.uid()
    and (p_categories is null or c.category = any (p_categories))
    and not exists (
      select 1 from public.space_reactions x
      where x.user_id = auth.uid() and x.space_id = c.id
    )
  order by c.featured desc, c.avg_rating desc nulls last, c.created_at desc, c.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.get_discover_deck(public.space_category[], int) from anon, public;
grant execute on function public.get_discover_deck(public.space_category[], int) to authenticated;
