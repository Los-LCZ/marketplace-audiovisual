-- =============================================================================
-- Consultas de apoyo para portada y filtros.
-- =============================================================================

-- Comunas con espacios publicados (agrupadas sin distinguir mayúsculas).
create or replace function public.list_communes()
returns table (commune text, space_count int)
language sql stable security invoker set search_path = ''
as $$
  select mode() within group (order by trim(s.commune)), count(*)::int
  from public.spaces s
  where s.status = 'published'
  group by lower(trim(s.commune))
  order by 2 desc, 1;
$$;

-- Cantidad de espacios publicados y precio mínimo por categoría.
create or replace function public.get_category_stats()
returns table (category public.space_category, space_count int, min_price int)
language sql stable security invoker set search_path = ''
as $$
  select s.category, count(*)::int, min(s.price_per_hour)::int
  from public.spaces s
  where s.status = 'published'
  group by s.category;
$$;

grant execute on function public.list_communes(), public.get_category_stats() to anon, authenticated;
