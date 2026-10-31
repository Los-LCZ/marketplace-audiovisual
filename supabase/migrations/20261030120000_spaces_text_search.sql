-- =============================================================================
-- Búsqueda por texto en espacios (listPublishedSpaces({ q }))
-- Índices trigram para que `ilike '%término%'` no haga seq scan.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

create index if not exists spaces_title_trgm_idx
  on public.spaces using gin (title extensions.gin_trgm_ops);

create index if not exists spaces_description_trgm_idx
  on public.spaces using gin (description extensions.gin_trgm_ops);

create index if not exists spaces_city_trgm_idx
  on public.spaces using gin (city extensions.gin_trgm_ops);

create index if not exists spaces_commune_trgm_idx
  on public.spaces using gin (commune extensions.gin_trgm_ops);
