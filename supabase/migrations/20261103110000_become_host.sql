-- =============================================================================
-- Cliente → anfitrión: un cliente puede pasar SU PROPIO perfil a 'host' (para
-- publicar espacios). Cualquier otro cambio de rol (a admin, de host a client,
-- o en el perfil de otro) sigue reservado a admin, service_role o el SQL Editor.
-- =============================================================================

create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;

  if new.role is distinct from old.role
     and not (old.role = 'client' and new.role = 'host' and new.id = auth.uid()) then
    raise exception 'No tienes permisos para cambiar el rol';
  end if;

  if new.verified is distinct from old.verified then
    raise exception 'Solo un administrador puede verificar perfiles';
  end if;

  return new;
end;
$$;
