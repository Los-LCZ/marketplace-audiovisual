// Límite de intentos por ventana deslizante, en memoria.
//
// Es una capa de defensa en la app (frena fuerza bruta y abuso desde una misma IP o
// cuenta), no un sustituto del límite de infraestructura: en Vercel cada instancia
// tiene su propia memoria y se reinicia sola. El límite global va en Supabase Auth
// (Rate Limits) y en el firewall de Vercel; ver docs/security/2026-11-auditoria-seguridad.md.

type Bucket = { hits: number[] };

export type RateLimitRule = { limit: number; windowMs: number };

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

const MAX_KEYS = 10_000;

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** Registra un intento para `key` y dice si sigue dentro del límite. */
  hit(key: string, { limit, windowMs }: RateLimitRule): RateLimitResult {
    const now = this.now();
    const bucket = this.buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

    if (bucket.hits.length >= limit) {
      this.buckets.set(key, bucket);
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.hits[0] + windowMs - now) / 1000)) };
    }

    bucket.hits.push(now);
    // Map conserva el orden de inserción: al pasar el tope se descarta la clave más antigua.
    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    if (this.buckets.size > MAX_KEYS) this.buckets.delete(this.buckets.keys().next().value!);
    return { ok: true };
  }

  /** Olvida los intentos de `key` (p. ej. tras un login correcto). */
  reset(key: string) {
    this.buckets.delete(key);
  }
}

/** Límites por acción. Por IP y, cuando aplica, por cuenta (correo). */
export const RATE_LIMITS = {
  loginByIp: { limit: 20, windowMs: 15 * 60_000 },
  loginByEmail: { limit: 5, windowMs: 15 * 60_000 },
  signupByIp: { limit: 5, windowMs: 60 * 60_000 },
  passwordResetByIp: { limit: 5, windowMs: 60 * 60_000 },
  passwordResetByEmail: { limit: 3, windowMs: 60 * 60_000 },
  passwordUpdateByIp: { limit: 10, windowMs: 15 * 60_000 },
  bookingByUser: { limit: 20, windowMs: 60 * 60_000 },
  uploadByUser: { limit: 30, windowMs: 60 * 60_000 },
} satisfies Record<string, RateLimitRule>;

export const rateLimiter = new RateLimiter();

export function tooManyAttemptsMessage(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Demasiados intentos. Intenta de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
}
