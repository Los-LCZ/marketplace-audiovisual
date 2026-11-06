import { createHash } from "node:crypto";

// Registro de eventos de seguridad: una línea JSON por evento en los logs del servidor
// (Vercel → Logs / Log Drains). Nunca se escriben contraseñas, tokens ni correos o IPs
// en claro: los identificadores van como hash corto para poder correlacionar intentos.

export type SecurityEvent =
  | "login_failed"
  | "login_succeeded"
  | "signup_failed"
  | "password_reset_requested"
  | "password_reset_failed"
  | "password_updated"
  | "auth_callback_failed"
  | "rate_limited"
  | "upload_rejected"
  | "server_error";

type Level = "info" | "warn" | "error";

const LEVELS: Record<SecurityEvent, Level> = {
  login_failed: "warn",
  login_succeeded: "info",
  signup_failed: "warn",
  password_reset_requested: "info",
  password_reset_failed: "warn",
  password_updated: "info",
  auth_callback_failed: "warn",
  rate_limited: "warn",
  upload_rejected: "warn",
  server_error: "error",
};

// Claves que nunca deben llegar al log aunque alguien las pase por error.
// ("code" a secas es el código de un solo uso de los enlaces de auth; los códigos de error van como errorCode).
const FORBIDDEN_KEYS = /pass|token|secret|api_?key|authorization|cookie|^code$|verifier/i;

/** Hash corto y estable de un identificador (correo, IP, id), para correlacionar sin exponerlo. */
export function fingerprint(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 12);
}

export function buildSecurityLogEntry(
  event: SecurityEvent,
  details: Record<string, string | number | boolean | null | undefined> = {},
  now = new Date(),
) {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined || value === null || FORBIDDEN_KEYS.test(key)) continue;
    safe[key] = typeof value === "string" ? value.slice(0, 200) : value;
  }
  return { type: "security", event, level: LEVELS[event], at: now.toISOString(), ...safe };
}

export function logSecurityEvent(
  event: SecurityEvent,
  details: Record<string, string | number | boolean | null | undefined> = {},
) {
  const entry = buildSecurityLogEntry(event, details);
  const line = JSON.stringify(entry);
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.info(line);
}
