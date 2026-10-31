-- =============================================================================
-- Calificación de ida y vuelta, a ciegas
-- - reviews:        el cliente califica el espacio/anfitrión (ya existía; + tags).
-- - client_reviews: el anfitrión califica al cliente (nueva).
-- Ninguna parte ve la reseña de la otra hasta que ambas reseñas existan o hasta
-- 14 días después de completada la reserva. Las estadísticas y listados públicos
-- solo cuentan reseñas ya reveladas, para no filtrar la nota antes de tiempo.
-- =============================================================================

alter table public.bookings add column completed_at timestamptz;

update public.bookings
set completed_at = end_time
where status = 'completed' and completed_at is null;

alter table public.reviews
  add column tags text[] not null default '{}' check (cardinality(tags) <= 8);

create table public.client_reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  rating      integer not null check (rating >= 1 and rating <= 5),
  comment     text check (char_length(comment) <= 2000),
  tags        text[] not null default '{}' check (cardinality(tags) <= 8),
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Helpers (security definer => sin recursión de RLS)
-- -----------------------------------------------------------------------------
create or replace function public.is_booking_client(p_booking_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.bookings where id = p_booking_id and client_id = auth.uid());
$$;

create or replace function public.is_booking_host(p_booking_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b join public.spaces s on s.id = b.space_id
    where b.id = p_booking_id and s.host_id = auth.uid()
  );
$$;

create or replace function public.is_booking_completed(p_booking_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.bookings where id = p_booking_id and status = 'completed');
$$;

-- Reemplaza el placeholder de la migración del catálogo: space_cards,
-- space_rating_stats y get_space_reviews quedan respetando la regla.
create or replace function public.is_review_public(p_booking_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (
      exists (select 1 from public.reviews        where booking_id = p_booking_id)
      and exists (select 1 from public.client_reviews where booking_id = p_booking_id)
    )
    or exists (
      select 1 from public.bookings b
      where b.id = p_booking_id
        and b.status = 'completed'
        and coalesce(b.completed_at, b.end_time) + interval '14 days' <= now()
    );
$$;

-- Nota de un usuario como cliente (solo reseñas reveladas).
create or replace function public.get_client_rating(p_profile_id uuid)
returns table (avg_rating numeric, review_count int)
language sql stable security definer set search_path = ''
as $$
  select round(avg(cr.rating), 2)::numeric(3, 2), count(cr.id)::int
  from public.client_reviews cr
  join public.bookings b on b.id = cr.booking_id
  where b.client_id = p_profile_id
    and public.is_review_public(b.id);
$$;

-- ¿El cliente cumple la nota mínima del anfitrión? Sin mínimo => sí.
-- Con mínimo y sin reseñas reveladas => no (el anfitrión debe aprobar).
create or replace function public.client_meets_minimum(p_client_id uuid, p_host_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when h.min_client_rating is null then true
    else coalesce((select r.avg_rating from public.get_client_rating(p_client_id) r) >= h.min_client_rating, false)
  end
  from public.profiles h
  where h.id = p_host_id;
$$;

grant execute on function public.get_client_rating(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.client_reviews enable row level security;

-- reviews: antes era lectura pública; ahora a ciegas.
drop policy "reviews_select_all"     on public.reviews;
drop policy "reviews_update_author"  on public.reviews;
drop policy "reviews_delete_author"  on public.reviews;

create policy "reviews_select_visible" on public.reviews
  for select to anon, authenticated
  using (public.is_review_public(booking_id) or public.is_booking_client(booking_id) or public.is_admin());

-- Editar o borrar solo mientras sigue oculta (evita represalias tras ver la otra).
create policy "reviews_update_author_while_hidden" on public.reviews
  for update to authenticated
  using (public.is_booking_client(booking_id) and not public.is_review_public(booking_id))
  with check (public.is_booking_client(booking_id) and not public.is_review_public(booking_id));

create policy "reviews_delete_author_while_hidden" on public.reviews
  for delete to authenticated
  using ((public.is_booking_client(booking_id) and not public.is_review_public(booking_id)) or public.is_admin());

-- client_reviews: las escribe el anfitrión de una reserva completada.
create policy "client_reviews_select_visible" on public.client_reviews
  for select to anon, authenticated
  using (public.is_review_public(booking_id) or public.is_booking_host(booking_id) or public.is_admin());

create policy "client_reviews_insert_host" on public.client_reviews
  for insert to authenticated
  with check (public.is_booking_host(booking_id) and public.is_booking_completed(booking_id));

create policy "client_reviews_update_host_while_hidden" on public.client_reviews
  for update to authenticated
  using (public.is_booking_host(booking_id) and not public.is_review_public(booking_id))
  with check (public.is_booking_host(booking_id) and not public.is_review_public(booking_id));

create policy "client_reviews_delete_host_while_hidden" on public.client_reviews
  for delete to authenticated
  using ((public.is_booking_host(booking_id) and not public.is_review_public(booking_id)) or public.is_admin());

-- -----------------------------------------------------------------------------
-- RPC: ambas reseñas de una reserva, según lo que el usuario actual puede ver.
-- null si el usuario no participa en la reserva.
-- -----------------------------------------------------------------------------
create or replace function public.get_booking_reviews(p_booking_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_host_id uuid;
  v_role    text;
  v_public  boolean;
  v_space   public.reviews%rowtype;
  v_client  public.client_reviews%rowtype;
begin
  select b.* into v_booking from public.bookings b where b.id = p_booking_id;
  if not found then
    return null;
  end if;
  select s.host_id into v_host_id from public.spaces s where s.id = v_booking.space_id;

  v_role := case
    when auth.uid() = v_booking.client_id then 'client'
    when auth.uid() = v_host_id then 'host'
    when public.is_admin() then 'admin'
  end;
  if v_role is null then
    return null;
  end if;

  v_public := public.is_review_public(p_booking_id);
  select * into v_space  from public.reviews        where booking_id = p_booking_id;
  select * into v_client from public.client_reviews where booking_id = p_booking_id;

  return jsonb_build_object(
    'role', v_role,
    'revealed', v_public,
    'reveal_at', case when v_booking.status = 'completed'
                      then coalesce(v_booking.completed_at, v_booking.end_time) + interval '14 days' end,
    'space_review_submitted', v_space.id is not null,
    'client_review_submitted', v_client.id is not null,
    'space_review', case when v_space.id is not null and (v_public or v_role in ('client', 'admin'))
      then jsonb_build_object('id', v_space.id, 'rating', v_space.rating, 'comment', v_space.comment,
                              'tags', to_jsonb(v_space.tags), 'created_at', v_space.created_at) end,
    'client_review', case when v_client.id is not null and (v_public or v_role in ('host', 'admin'))
      then jsonb_build_object('id', v_client.id, 'rating', v_client.rating, 'comment', v_client.comment,
                              'tags', to_jsonb(v_client.tags), 'created_at', v_client.created_at) end
  );
end;
$$;

grant execute on function public.get_booking_reviews(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Updates de reservas: completed_at lo fija la base, y solo se completa una
-- reserva cuando terminó su horario.
-- -----------------------------------------------------------------------------
create or replace function public.guard_booking_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_is_host boolean;
begin
  if public.is_trusted_context() then
    if new.status = 'completed' and old.status is distinct from 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
    return new;
  end if;

  if (new.space_id, new.client_id, new.start_time, new.end_time, new.total_hours,
      new.subtotal, new.platform_fee, new.total_amount, new.payment_id, new.completed_at)
     is distinct from
     (old.space_id, old.client_id, old.start_time, old.end_time, old.total_hours,
      old.subtotal, old.platform_fee, old.total_amount, old.payment_id, old.completed_at) then
    raise exception 'Solo se puede modificar el estado de la reserva';
  end if;

  if new.status is distinct from old.status then
    v_is_host := public.owns_space(old.space_id);

    if old.status in ('cancelled', 'completed') then
      raise exception 'La reserva ya está cerrada';
    end if;

    -- Cliente: solo puede cancelar. Anfitrión: puede cancelar o marcar completada.
    if not v_is_host and new.status <> 'cancelled' then
      raise exception 'Solo puedes cancelar tu reserva';
    end if;

    if v_is_host and new.status not in ('cancelled', 'completed', 'confirmed') then
      raise exception 'Estado no permitido';
    end if;

    if new.status = 'completed' then
      if old.end_time > now() then
        raise exception 'Solo puedes completar una reserva cuando termina el horario';
      end if;
      new.completed_at := now();
    end if;
  end if;

  return new;
end;
$$;
