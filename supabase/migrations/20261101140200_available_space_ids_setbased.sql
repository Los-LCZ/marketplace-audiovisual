-- =============================================================================
-- QA nov (rendimiento): get_available_space_ids como una sola consulta.
-- Misma semántica que la versión con bucle (20261031110000):
--   - ventana del día en hora de Chile: open_hour–close_hour, desde la próxima
--     hora en punto si p_date es hoy;
--   - bloquean pending_payment y confirmed (requested no);
--   - disponible si hay al menos min_hours seguidas libres.
-- Todo hueco libre empieza en el inicio de la ventana o al terminar una reserva
-- que bloquea, así que basta con probar esos candidatos.
-- =============================================================================

create or replace function public.get_available_space_ids(
  p_date       date,
  p_categories public.space_category[] default null
)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  with win as (
    select
      s.id,
      make_interval(hours => s.min_hours) as need,
      greatest(
        (p_date + make_interval(hours => s.open_hour)) at time zone 'America/Santiago',
        date_trunc('hour', now()) + interval '1 hour'
      ) as w_start,
      (p_date + make_interval(hours => s.close_hour)) at time zone 'America/Santiago' as w_end
    from public.spaces s
    where s.status = 'published'
      and (p_categories is null or s.category = any (p_categories))
  ),
  candidates as (
    select w.id, w.need, w.w_end, w.w_start as c_start
    from win w
    union all
    select w.id, w.need, w.w_end, b.end_time
    from win w
    join public.bookings b
      on b.space_id = w.id
     and b.status in ('pending_payment', 'confirmed')
     and b.end_time > w.w_start
     and b.end_time < w.w_end
  )
  select distinct c.id
  from candidates c
  where c.c_start + c.need <= c.w_end
    and not exists (
      select 1
      from public.bookings b
      where b.space_id = c.id
        and b.status in ('pending_payment', 'confirmed')
        and b.start_time < c.c_start + c.need
        and b.end_time > c.c_start
    );
$$;
