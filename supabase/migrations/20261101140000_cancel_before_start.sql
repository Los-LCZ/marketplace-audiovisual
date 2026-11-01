-- =============================================================================
-- QA nov: solo se cancela ANTES de que empiece la reserva.
-- Antes, cliente y anfitrión podían cancelar una reserva en curso o ya terminada
-- (p. ej. para evitar la calificación). Ahora:
--   cliente:   requested | pending_payment | confirmed -> cancelled, si aún no empieza
--   anfitrión: pending_payment | confirmed -> cancelled, si aún no empieza;
--              una vez terminada, solo puede completarla.
-- El resto de guard_booking_update queda igual (incluye `expired`).
-- =============================================================================

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

  if new.status = 'cancelled' and (v_is_host or v_is_client) and old.start_time <= now() then
    raise exception 'Solo puedes cancelar antes de que comience la reserva';
  end if;

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
