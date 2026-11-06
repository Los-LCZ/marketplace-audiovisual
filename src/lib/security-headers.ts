// Cabeceras de seguridad HTTP para todas las respuestas (las aplica next.config.ts).
//
// CSP sin nonces: Next 16 necesita scripts inline para hidratar y un nonce obligaría a
// renderizar todo en cada request (ver node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md). Por eso `script-src` admite 'unsafe-inline', pero solo
// desde el propio sitio: no se pueden cargar scripts de otros dominios, ni enviar datos
// fuera (connect-src), ni enmarcar la página (frame-ancestors).

/** Orígenes externos que usa el navegador (todo lo demás sale del propio sitio). */
const MAP_TILES = "https://tiles.openfreemap.org"; // estilo, teselas, glifos y sprites del mapa
const SUPABASE_STORAGE = "https://*.supabase.co"; // fotos de perfil (<img> directo al bucket público)

/**
 * `httpsOnly`: el sitio se sirve solo por HTTPS (Vercel). Activa upgrade-insecure-requests
 * y HSTS; fuera de eso (dev o `next start` en localhost por http) romperían la navegación.
 */
export function contentSecurityPolicy(isDev: boolean, httpsOnly = !isDev): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' solo en desarrollo: React lo usa para reconstruir stacks del servidor.
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    // MapLibre y los componentes usan atributos style inline.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", SUPABASE_STORAGE, MAP_TILES],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", MAP_TILES, ...(isDev ? ["ws:"] : [])],
    // El worker de MapLibre se sirve desde el propio sitio; blob: por compatibilidad.
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (httpsOnly) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders(isDev: boolean, httpsOnly = !isDev): { key: string; value: string }[] {
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev, httpsOnly) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Redundante con frame-ancestors, para navegadores antiguos.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];
  // HSTS solo con HTTPS: en localhost (http) el navegador lo ignoraría o, peor, lo recordaría.
  if (httpsOnly) {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
  }
  return headers;
}
