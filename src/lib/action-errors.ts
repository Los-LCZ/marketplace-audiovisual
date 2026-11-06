import { logSecurityEvent } from "@/lib/security-log";

type DbError = { code?: string; message: string };

/**
 * Mensaje de error apto para mostrar al usuario a partir de un error de Supabase.
 * Los `raise exception` de los triggers (código P0001) son mensajes de negocio escritos
 * para el usuario y se muestran tal cual. Cualquier otro error (constraint, RLS, columna,
 * red) puede revelar el esquema: queda en el log del servidor y el usuario ve `fallback`.
 */
export function publicDbError(error: DbError, fallback: string, context: string): string {
  if (error.code === "P0001") return error.message;
  logSecurityEvent("server_error", { context, errorCode: error.code ?? "unknown" });
  return fallback;
}
