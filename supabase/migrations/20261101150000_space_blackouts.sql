-- =============================================================================
-- Días cerrados a elección del anfitrión (vacaciones, mantención, eventos propios).
-- Por defecto todo está abierto (feriados incluidos): solo se cierra lo que el
-- anfitrión marca. Días completos, en hora de Chile.
-- - No se crean ni aceptan reservas en un día cerrado.
-- - No se puede cerrar un día que ya tiene reservas activas.
-- - get_space_busy_slots devuelve el día cerrado como ocupado completo (la ficha
--   no necesita cambios) y get_available_space_ids lo excluye.
-- =============================================================================

create table public.space_blackouts (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces (id) on delete cascade,
  date       date not null,
  -- Nota privada del anfitrión (no se expone al público).
  reason     text check (char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  unique (space_id, date)
);

create index space_blackouts_space_date_idx on public.space_blackouts (space_id, date);

alter table public.space_blackouts enable row level security;

create policy "space_blackouts_select_owner" on public.space_blackouts
  for select to authenticated
  using (public.owns_space(space_id) or public.is_admin());

create policy "space_blackouts_insert_owner" on public.space_blackouts
  for insert to authenticated
  with check (public.owns_space(space_id) or public.is_admin());

create policy "space_blackouts_delete_owner" on public.space_blackouts
  for delete to authenticated
  using (public.owns_space(space_id) or public.is_admin());

-- ¿El espacio está cerrado ese día (hora de Chile)?
create or replace function public.is_space_blacked_out(p_space_id uuid, p_day date)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.space_blackouts where space_id = p_space_id and date = p_day);
$$;

-- Validaciones al cerrar un día: hoy o futuro (hasta un año) y sin reservas activas.
create or replace function public.validate_space_blackout()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Santiago')::date;
begin
  if public.is_trusted_context() then
    return new;
  end if;

  if new.date < v_today then
    raise exception 'No puedes cerrar un día que ya pasó';
  end if;
  if new.date > v_today + 366 then
    raise exception 'Solo puedes cerrar días dentro del próximo año';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.space_id = new.space_id
      and b.status in ('requested', 'pending_payment', 'confirmed')
      and (b.start_time at time zone 'America/Santiago')::date = new.date
  ) then
    raise exception 'Ese día ya tiene reservas o solicitudes: cancélalas o recházalas antes de cerrarlo';
  end if;

  return new;
end;
$$;

create trigger space_blackouts_validate
  before insert on public.space_blackouts
  for each row execute function public.validate_space_blackout();

-- -----------------------------------------------------------------------------
-- Reservas: no en días cerrados (al crear, y al aceptar una solicitud).
-- Corre antes que bookings_compute_amounts (orden alfabético de triggers).
-- -----------------------------------------------------------------------------
create or replace function public.check_booking_blackout()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;

  if (tg_op = 'INSERT' or (old.status = 'requested' and new.status = 'confirmed'))
     and public.is_space_blacked_out(new.space_id, (new.start_time at time zone 'America/Santiago')::date) then
    raise exception 'El anfitrión cerró este espacio ese día';
  end if;

  return new;
end;
$$;

create trigger bookings_check_blackout
  before insert or update of status on public.bookings
  for each row execute function public.check_booking_blackout();

-- -----------------------------------------------------------------------------
-- Horarios ocupados: suma los días cerrados como bloques de día completo.
-- -----------------------------------------------------------------------------
create or replace function public.get_space_busy_slots(
  p_space_id uuid,
  p_from     timestamptz,
  p_to       timestamptz
)
returns table (start_time timestamptz, end_time timestamptz)
language sql stable security definer set search_path = ''
as $$
  select slot.start_time, slot.end_time
  from (
    select b.start_time, b.end_time
    from public.bookings b
    where b.space_id = p_space_id
      and b.status in ('pending_payment', 'confirmed')
      and b.start_time < p_to
      and b.end_time   > p_from
    union all
    select x.date::timestamp at time zone 'America/Santiago',
           (x.date + 1)::timestamp at time zone 'America/Santiago'
    from public.space_blackouts x
    where x.space_id = p_space_id
      and (x.date + 1)::timestamp at time zone 'America/Santiago' > p_from
      and x.date::timestamp at time zone 'America/Santiago' < p_to
  ) slot
  join public.spaces s on s.id = p_space_id and s.status = 'published'
  order by slot.start_time;
$$;

-- Días cerrados de un espacio publicado (sin el motivo), para calendarios públicos.
create or replace function public.get_space_blackout_dates(p_space_id uuid, p_from date, p_to date)
returns setof date
language sql stable security definer set search_path = ''
as $$
  select x.date
  from public.space_blackouts x
  join public.spaces s on s.id = x.space_id
  where x.space_id = p_space_id
    and (s.status = 'published' or s.host_id = auth.uid())
    and x.date between p_from and p_to
  order by x.date;
$$;

grant execute on function public.get_space_blackout_dates(uuid, date, date) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Disponibilidad por día: igual que 20261101140200, excluyendo días cerrados.
-- -----------------------------------------------------------------------------
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
      and not exists (select 1 from public.space_blackouts x where x.space_id = s.id and x.date = p_date)
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
