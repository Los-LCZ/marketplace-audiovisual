-- =============================================================================
-- KPI de respuesta del anfitrión a solicitudes de reserva.
-- `requested_at` marca que la reserva nació como solicitud (lo fija la base), así
-- se distingue de una reserva confirmada aunque después se cancele.
-- =============================================================================

alter table public.bookings add column requested_at timestamptz;

-- Backfill: solicitudes pendientes o ya decididas.
update public.bookings
set requested_at = created_at
where requested_at is null
  and (status = 'requested' or decided_at is not null);

create index bookings_requested_at_idx on public.bookings (requested_at) where requested_at is not null;

-- Se ejecuta después de bookings_compute_amounts (orden alfabético de triggers),
-- cuando el estado final ya está decidido.
create or replace function public.set_booking_requested_at()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'requested' then
    new.requested_at := coalesce(new.requested_at, now());
  elsif not public.is_trusted_context() then
    new.requested_at := null;
  end if;
  return new;
end;
$$;

create trigger bookings_set_requested_at
  before insert on public.bookings
  for each row execute function public.set_booking_requested_at();

create or replace function public.protect_booking_requested_at()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.requested_at is distinct from old.requested_at and not public.is_trusted_context() then
    raise exception 'Solo se puede modificar el estado de la reserva';
  end if;
  return new;
end;
$$;

create trigger bookings_protect_requested_at
  before update on public.bookings
  for each row execute function public.protect_booking_requested_at();

-- -----------------------------------------------------------------------------
-- Solicitudes de los últimos 90 días en los espacios del anfitrión:
--   median_response_minutes: mediana de (decided_at - requested_at) de las decididas.
--   response_rate: decididas antes de que empezara el horario / (decididas + vencidas).
--     Vencida = sigue requested y su horario ya empezó. Las que el cliente canceló
--     antes de la decisión y las aún vigentes no cuentan.
--   null cuando no hay datos.
-- -----------------------------------------------------------------------------
create or replace function public.get_host_response_stats(p_host_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with req as (
    select b.requested_at, b.decided_at, b.start_time, b.status
    from public.bookings b
    join public.spaces s on s.id = b.space_id
    where s.host_id = p_host_id
      and b.requested_at >= now() - interval '90 days'
  ),
  counted as (
    select
      count(*) filter (where decided_at is not null)                                     as decided,
      count(*) filter (where decided_at is not null and decided_at < start_time)         as on_time,
      count(*) filter (where decided_at is null and status = 'requested' and start_time <= now()) as expired,
      count(*)                                                                           as total,
      percentile_cont(0.5) within group (order by extract(epoch from decided_at - requested_at) / 60)
        filter (where decided_at is not null)                                            as median_minutes
    from req
  )
  select jsonb_build_object(
    'median_response_minutes', case when decided > 0 then round(median_minutes)::int end,
    'response_rate', case when decided + expired > 0
                          then round(on_time::numeric / (decided + expired), 2) end,
    'request_count', total::int,
    'decided_count', decided::int
  )
  from counted;
$$;

grant execute on function public.get_host_response_stats(uuid) to anon, authenticated;
