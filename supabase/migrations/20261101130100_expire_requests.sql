-- =============================================================================
-- Vencimiento de solicitudes
-- - expire_stale_requests() pasa a `expired` las solicitudes cuyo horario ya
--   empezó sin respuesta del anfitrión. La ejecuta pg_cron cada 15 minutos.
-- - Una solicitud vencida queda cerrada: no se acepta, rechaza ni cancela.
-- - El KPI de respuesta cuenta las vencidas.
-- Requiere haber ejecutado antes 20261101130000_booking_expired_status.sql.
-- =============================================================================

create or replace function public.expire_stale_requests()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings
  set status = 'expired'
  where status = 'requested'
    and start_time <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Solo la base (pg_cron / SQL Editor) y service_role.
revoke execute on function public.expire_stale_requests() from anon, authenticated, public;

-- -----------------------------------------------------------------------------
-- guard_booking_update: `expired` es un estado cerrado, y vencer una solicitud
-- no cuenta como decisión del anfitrión (decided_at queda null).
-- -----------------------------------------------------------------------------
create or replace function public.guard_booking_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_is_host   boolean;
  v_is_client boolean;
begin
  if public.is_trusted_context() then
    if new.status is distinct from old.status then
      if old.status = 'requested' and new.status in ('confirmed', 'rejected') then
        new.decided_at := coalesce(new.decided_at, now());
      end if;
      if new.status = 'completed' then
        new.completed_at := coalesce(new.completed_at, now());
      end if;
    end if;
    return new;
  end if;

  if (new.space_id, new.client_id, new.start_time, new.end_time, new.total_hours,
      new.subtotal, new.platform_fee, new.total_amount, new.payment_id, new.completed_at,
      new.project, new.message, new.decided_at)
     is distinct from
     (old.space_id, old.client_id, old.start_time, old.end_time, old.total_hours,
      old.subtotal, old.platform_fee, old.total_amount, old.payment_id, old.completed_at,
      old.project, old.message, old.decided_at) then
    raise exception 'Solo se puede modificar el estado de la reserva';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status in ('cancelled', 'completed', 'rejected', 'expired') then
    raise exception 'La reserva ya está cerrada';
  end if;

  v_is_host   := public.owns_space(old.space_id);
  v_is_client := old.client_id = auth.uid();

  if v_is_host and old.status = 'requested' and new.status in ('confirmed', 'rejected') then
    if new.status = 'confirmed' and old.start_time <= now() then
      raise exception 'La solicitud venció: el horario ya comenzó';
    end if;
    new.decided_at := now();

  elsif v_is_host and old.status in ('pending_payment', 'confirmed') and new.status in ('cancelled', 'completed') then
    if new.status = 'completed' then
      if old.end_time > now() then
        raise exception 'Solo puedes completar una reserva cuando termina el horario';
      end if;
      new.completed_at := now();
    end if;

  elsif v_is_client and new.status = 'cancelled' and old.status in ('requested', 'pending_payment', 'confirmed') then
    null;

  else
    raise exception 'Cambio de estado no permitido';
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- KPI: vencida = `expired`, o `requested` cuyo horario ya empezó (aún sin cron).
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
      count(*) filter (where decided_at is not null)                             as decided,
      count(*) filter (where decided_at is not null and decided_at < start_time) as on_time,
      count(*) filter (where decided_at is null
                         and (status = 'expired' or (status = 'requested' and start_time <= now()))) as expired,
      count(*)                                                                   as total,
      percentile_cont(0.5) within group (order by extract(epoch from decided_at - requested_at) / 60)
        filter (where decided_at is not null)                                    as median_minutes
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

-- -----------------------------------------------------------------------------
-- Tarea programada (pg_cron, disponible en Supabase). Si la extensión no existe
-- (por ejemplo en los tests con PGlite), se omite sin error.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'expire-stale-requests';
    perform cron.schedule('expire-stale-requests', '*/15 * * * *', 'select public.expire_stale_requests()');
  else
    raise notice 'pg_cron no está disponible: expire_stale_requests() no quedó programada';
  end if;
end;
$$;
