-- =============================================================================
-- QA nov: el KPI de respuesta del anfitrión es PÚBLICO a propósito.
-- Solo expone agregados (mediana de minutos, tasa y conteos) sin datos de
-- clientes ni reservas, igual que los marketplaces muestran "responde en X min"
-- en el perfil del anfitrión. Por eso mantiene el grant a anon y authenticated.
-- Si algún día deja de ser público: revocar anon y devolver datos solo cuando
-- p_host_id = auth.uid() o public.is_admin().
-- =============================================================================

comment on function public.get_host_response_stats(uuid) is
  'KPI público de respuesta del anfitrión (últimos 90 días): solo agregados, sin datos de clientes. Ver migración 20261101140100.';
