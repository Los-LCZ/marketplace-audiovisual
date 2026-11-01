import type { Metadata } from "next";

/**
 * URL pública del sitio. Todo URL absoluto (metadataBase, sitemap, robots, Open Graph)
 * sale de aquí: cambiar de dominio es solo cambiar NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://marketplace-audiovisual.vercel.app").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "Señal";
export const SITE_TITLE = "Señal · Estudios, salas, sets y locaciones por hora";
export const SITE_DESCRIPTION =
  "Marketplace de estudios de grabación, salas de ensayo, sets de filmación y locaciones por hora en Santiago, con ficha técnica completa antes de reservar.";

/** Imagen por defecto al compartir (route handler src/app/og/route.tsx). */
export const DEFAULT_OG_IMAGE = { url: "/og", width: 1200, height: 630, alt: SITE_TITLE };

/**
 * Open Graph base para repetir en cada página: Next fusiona la metadata de forma
 * superficial, así que un `openGraph` propio reemplaza entero al del layout.
 */
export const BASE_OPEN_GRAPH = {
  siteName: SITE_NAME,
  locale: "es_CL",
  type: "website",
} satisfies Metadata["openGraph"];

/** Recorta un texto para descripciones de metadata sin cortar palabras. */
export function excerpt(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}
