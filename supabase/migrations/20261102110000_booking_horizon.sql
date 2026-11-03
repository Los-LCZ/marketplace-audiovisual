-- =============================================================================
-- Reservas: como máximo un año hacia adelante (el mismo límite que los días
-- cerrados), para que el anfitrión siempre pueda cerrar un día reservable.
-- =============================================================================

create or replace function public.check_booking_horizon()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;

  -- Mismo cálculo que validate_space_blackout: día de inicio en hora de Chile.
  if (new.start_time at time zone 'America/Santiago')::date
     > (now() at time zone 'America/Santiago')::date + 366 then
    raise exception 'Solo puedes reservar dentro del próximo año';
  end if;

  return new;
end;
$$;

create trigger bookings_check_horizon
  before insert on public.bookings
  for each row execute function public.check_booking_horizon();
