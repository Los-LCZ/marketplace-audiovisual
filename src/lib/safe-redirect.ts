// Valida destinos de redirección que vienen del usuario (`?next=`), para evitar
// redirecciones abiertas. Se usa en el login, en /auth/callback y en el proxy.

const FALLBACK = "/";
// Barra invertida (los navegadores la tratan como "/") y caracteres de control.
const UNSAFE = /[\\\u0000-\u001f\u007f]/;

/**
 * Devuelve `next` como ruta interna segura (pathname + search + hash) o "/" si no lo es.
 * Solo acepta rutas relativas al propio sitio: rechaza `//host`, `/\host`, URLs absolutas,
 * esquemas como `javascript:` y cualquier variante codificada de esos casos.
 */
export function safeRedirectPath(next: string | null | undefined, origin = "http://localhost"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return FALLBACK;

  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return FALLBACK;
  }
  if (UNSAFE.test(next) || UNSAFE.test(decoded) || decoded.startsWith("//")) return FALLBACK;

  let url: URL;
  try {
    url = new URL(next, origin);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== new URL(origin).origin) return FALLBACK;

  return `${url.pathname}${url.search}${url.hash}`;
}
