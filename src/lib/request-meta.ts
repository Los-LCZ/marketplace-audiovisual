import { headers } from "next/headers";

/**
 * IP del cliente para límites de intentos y logs. En Vercel, `x-real-ip` y el primer
 * valor de `x-forwarded-for` los fija la plataforma (no el cliente). En otros hostings
 * detrás de un proxy no confiable, estos valores se pueden falsificar.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return h.get("x-real-ip")?.trim() || forwarded || "unknown";
}
