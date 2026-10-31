-- =============================================================================
-- Solicitudes de reserva
-- - Si el cliente cumple la nota mínima del anfitrión (o no hay mínimo), la
--   reserva nace `confirmed`; si no, nace `requested` y el anfitrión decide.
-- - `requested` NO bloquea el horario (no entra en la restricción de solape ni en
--   la disponibilidad). Al aceptar, la restricción bookings_no_overlap valida
--   que el horario siga libre.
-- Requiere haber ejecutado antes 20261031160000_booking_request_status.sql.
-- =============================================================================

alter table public.bookings
  add column project    text check (char_length(project) <= 200),
  add column message    text check (char_length(message) <= 2000),
  add column decided_at timestamptz;

create index bookings_requested_idx on public.bookings (space_id, start_time) where status = 'requested';

create or replace function public.compute_booking_amounts()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_space   public.spaces%rowtype;
  v_seconds numeric;
  v_day     date;
  v_open    timestamptz;
  v_close   timestamptz;
begin
  select * into v_space from public.spaces where id = new.space_id;

  if not found or v_space.status <> 'published' then
    raise exception 'El espacio no está disponible para reservas';
  end if;

  if v_space.host_id = new.client_id then
    raise exception 'No puedes reservar tu propio espacio';
  end if;

  if new.start_time <= now() then
    raise exception 'La reserva debe comenzar en el futuro';
  end if;

  v_seconds := extract(epoch from (new.end_time - new.start_time));

  if v_seconds <= 0 or mod(v_seconds, 3600) <> 0 then
    raise exception 'La reserva debe ser por horas completas';
  end if;

  v_day   := (new.start_time at time zone 'America/Santiago')::date;
  v_open  := (v_day + make_interval(hours => v_space.open_hour)) at time zone 'America/Santiago';
  v_close := (v_day + make_interval(hours => v_space.close_hour)) at time zone 'America/Santiago';

  if new.start_time < v_open or new.end_time > v_close then
    raise exception 'Este espacio funciona de %:00 a %:00 (hora de Chile)',
      lpad(v_space.open_hour::text, 2, '0'), lpad(v_space.close_hour::text, 2, '0');
  end if;

  new.total_hours := (v_seconds / 3600)::integer;

  if new.total_hours < v_space.min_hours then
    raise exception 'Este espacio requiere un mínimo de % hora(s)', v_space.min_hours;
  end if;

  new.subtotal     := new.total_hours * v_space.price_per_hour;
  new.platform_fee := round(new.subtotal * 0.10)::integer;
  new.total_amount := new.subtotal + new.platform_fee;

  -- Seeds, pagos (service_role) y admins conservan el estado indicado.
  if public.is_trusted_context() then
    return new;
  end if;

  new.payment_id   := null;
  new.decided_at   := null;
  new.completed_at := null;

  if exists (
    select 1 from public.bookings b
    where b.space_id = new.space_id
      and b.status in ('pending_payment', 'confirmed')
      and b.start_time < new.end_time
      and b.end_time > new.start_time
  ) then
    raise exception 'El espacio ya está reservado en ese horario';
  end if;

  if public.client_meets_minimum(new.client_id, v_space.host_id) then
    new.status := 'confirmed';
  else
    if exists (
      select 1 from public.bookings b
      where b.space_id = new.space_id
        and b.client_id = new.client_id
        and b.status = 'requested'
        and b.start_time < new.end_time
        and b.end_time > new.start_time
    ) then
      raise exception 'Ya enviaste una solicitud para ese horario';
    end if;
    new.status := 'requested';
  end if;

  return new;
end;
$$;

-- Transiciones permitidas (fuera de service_role / admin / SQL Editor):
--   anfitrión: requested -> confirmed | rejected   (aceptar solo si aún no empieza)
--              pending_payment | confirmed -> cancelled | completed (completar al terminar)
--   cliente:   requested | pending_payment | confirmed -> cancelled
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
      if old.status = 'requested' then
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

  if old.status in ('cancelled', 'completed', 'rejected') then
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
-- Resumen público de clientes (para solicitudes y reservas del anfitrión):
-- nombre, avatar, verificado, nota como cliente y última reseña recibida.
-- Solo cuenta reseñas reveladas.
-- -----------------------------------------------------------------------------
create or replace function public.get_client_summaries(p_client_ids uuid[])
returns table (
  client_id    uuid,
  full_name    text,
  avatar_url   text,
  verified     boolean,
  avg_rating   numeric,
  review_count int,
  last_review  jsonb
)
language sql stable security definer set search_path = ''
as $$
  select
    p.id, p.full_name, p.avatar_url, p.verified,
    r.avg_rating, coalesce(r.review_count, 0),
    (
      select jsonb_build_object('rating', cr.rating, 'comment', cr.comment,
                                'tags', to_jsonb(cr.tags), 'created_at', cr.created_at)
      from public.client_reviews cr
      join public.bookings b on b.id = cr.booking_id
      where b.client_id = p.id
        and public.is_review_public(b.id)
      order by cr.created_at desc
      limit 1
    )
  from public.profiles p
  cross join lateral public.get_client_rating(p.id) r
  where p.id = any (p_client_ids);
$$;

revoke execute on function public.get_client_summaries(uuid[]) from anon, public;
grant execute on function public.get_client_summaries(uuid[]) to authenticated;
