-- =============================================================================
-- Estados nuevos de reserva. Va en su propio archivo (y en su propia ejecución
-- del SQL Editor): Postgres no deja usar un valor de enum en la misma
-- transacción en que se agrega.
--   requested: el cliente no cumple la nota mínima del anfitrión; espera aprobación.
--   rejected:  el anfitrión rechazó la solicitud.
-- =============================================================================

alter type public.booking_status add value if not exists 'requested';
alter type public.booking_status add value if not exists 'rejected';
