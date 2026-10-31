-- =============================================================================
-- Perfil público: titular, bio, comuna, etiquetas, verificado (solo admin) y
-- nota mínima que un anfitrión exige a sus clientes.
-- =============================================================================

alter table public.profiles
  add column headline          text check (char_length(headline) <= 120),
  add column bio               text check (char_length(bio) <= 2000),
  add column commune           text check (char_length(commune) <= 80),
  add column tags              text[] not null default '{}' check (cardinality(tags) <= 12),
  add column verified          boolean not null default false,
  -- null = acepta a cualquier cliente sin pedir aprobación.
  add column min_client_rating numeric(3, 2) check (min_client_rating between 1 and 5);

-- Rol y verificado solo los cambia un admin, service_role o el SQL Editor.
-- (Corrige init.sql: antes el SQL Editor tampoco podía, porque no trae JWT.)
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'No tienes permisos para cambiar el rol';
  end if;

  if new.verified is distinct from old.verified then
    raise exception 'Solo un administrador puede verificar perfiles';
  end if;

  return new;
end;
$$;

-- Vista pública (sin teléfono). Las columnas nuevas van al final para poder
-- usar `create or replace`.
create or replace view public.public_profiles as
  select
    id, full_name, avatar_url, role, created_at,
    headline, bio, commune, tags, verified, min_client_rating
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;
