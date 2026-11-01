-- =============================================================================
-- Estado `expired`: una solicitud (requested) que el anfitrión no respondió
-- antes de que empezara el horario. Va en su propio archivo (y en su propia
-- ejecución del SQL Editor): un valor de enum no se puede usar en la misma
-- transacción en que se agrega.
-- =============================================================================

alter type public.booking_status add value if not exists 'expired';
