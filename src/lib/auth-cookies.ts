import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Opciones de las cookies de sesión de Supabase (las de @supabase/ssr por defecto son
 * httpOnly: false, sin Secure y 400 días de vida).
 *
 * - httpOnly: el JavaScript de la página no puede leer el token (mitiga robo por XSS).
 *   Es posible porque la app solo usa Supabase desde el servidor (server.ts y el proxy);
 *   no hay cliente de navegador.
 * - secure: solo viajan por HTTPS (en localhost se omite, porque es http).
 * - sameSite "lax": no se envían en POST de otros sitios (CSRF), pero sí al llegar
 *   desde un enlace externo (p. ej. el de confirmación de correo).
 * - maxAge 7 días: el refresh token rota en cada uso; si la cookie no se usa en una
 *   semana, hay que volver a iniciar sesión.
 */
export function authCookieOptions(isProduction = process.env.NODE_ENV === "production"): CookieOptionsWithName {
  return {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  };
}
