/**
 * Escapa texto del usuario para usarlo literalmente en un patrón LIKE/ILIKE:
 * `\`, `%` y `_` se anteponen con `\` (el escape por defecto de Postgres), y se quita
 * `*`, que PostgREST trata como alias de `%`.
 */
export function escapeLike(value: string): string {
  return value.replace(/\*/g, "").replace(/[\\%_]/g, "\\$&");
}
