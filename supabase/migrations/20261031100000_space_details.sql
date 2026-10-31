-- =============================================================================
-- Ficha del espacio (Señal): barrio, tamaño, aforo, horario, resumen, reglas,
-- destacado y equipamiento técnico (`gear`).
-- =============================================================================

-- Contexto de confianza: conexión directa a la base (SQL Editor, migraciones,
-- cron: sin JWT => auth.role() es null), service_role o un admin.
create or replace function public.is_trusted_context()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.role(), 'service_role') = 'service_role' or public.is_admin();
$$;

-- `gear`: [{ "category": "microfonos"|"consolas"|"amplificacion"|"iluminacion", "items": ["..."] }]
create or replace function public.is_valid_gear(p_gear jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select jsonb_typeof(p_gear) = 'array'
     and not exists (
       select 1
       from jsonb_array_elements(p_gear) g
       where jsonb_typeof(g) <> 'object'
          or coalesce(g ->> 'category', '') not in ('microfonos', 'consolas', 'amplificacion', 'iluminacion')
          or jsonb_typeof(g -> 'items') is distinct from 'array'
          or exists (
            select 1 from jsonb_array_elements(g -> 'items') i where jsonb_typeof(i) <> 'string'
          )
     );
$$;

alter table public.spaces
  add column neighborhood text check (char_length(neighborhood) <= 80),
  add column size_m2      integer check (size_m2 > 0),
  add column capacity     integer check (capacity > 0),
  add column open_hour    integer not null default 8,
  add column close_hour   integer not null default 24,
  add column summary      text check (char_length(summary) <= 280),
  add column rules        text[] not null default '{}',
  add column featured     boolean not null default false,
  add column gear         jsonb not null default '[]',
  add constraint spaces_open_hours_check
    check (open_hour between 0 and 24 and close_hour between 0 and 24 and open_hour < close_hour),
  add constraint spaces_gear_check check (public.is_valid_gear(gear));

create index spaces_featured_idx on public.spaces (featured) where featured and status = 'published';

-- Solo un admin (o service_role) puede destacar espacios.
create or replace function public.protect_space_admin_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.featured := false;
  elsif new.featured is distinct from old.featured then
    raise exception 'Solo un administrador puede destacar espacios';
  end if;

  return new;
end;
$$;

create trigger spaces_protect_admin_fields
  before insert or update on public.spaces
  for each row execute function public.protect_space_admin_fields();

-- Reemplaza las amenities de un espacio en una sola transacción (RLS del invocador).
create or replace function public.set_space_amenities(p_space_id uuid, p_amenity_ids integer[])
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.owns_space(p_space_id) and not public.is_admin() then
    raise exception 'Espacio no encontrado';
  end if;

  delete from public.space_amenities where space_id = p_space_id;

  insert into public.space_amenities (space_id, amenity_id)
  select p_space_id, a
  from unnest(coalesce(p_amenity_ids, '{}')) as a
  on conflict do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reservas: además de lo anterior, deben caer dentro del horario del espacio
-- (open_hour–close_hour, hora de Chile).
-- -----------------------------------------------------------------------------
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

  if coalesce(auth.role(), '') <> 'service_role' then
    if new.status not in ('pending_payment', 'confirmed') then
      new.status := 'confirmed';
    end if;
    new.payment_id := null;
  end if;

  return new;
end;
$$;
