-- =============================================================================
-- Descubrir: "volver a ver todo". Borra los descartes (pass) del usuario actual,
-- opcionalmente solo de ciertas categorías. No toca los me gusta.
-- Security invoker: RLS de space_reactions limita el borrado al propio usuario.
-- =============================================================================

create or replace function public.reset_passes(p_categories public.space_category[] default null)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  delete from public.space_reactions r
  where r.user_id = auth.uid()
    and r.kind = 'pass'
    and (
      p_categories is null
      or exists (
        select 1 from public.spaces s
        where s.id = r.space_id and s.category = any (p_categories)
      )
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.reset_passes(public.space_category[]) from anon, public;
grant execute on function public.reset_passes(public.space_category[]) to authenticated;
