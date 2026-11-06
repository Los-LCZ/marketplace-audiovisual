# Auditoría de seguridad — Señal (noviembre 2026)

## Resumen

| | |
|---|---|
| Fecha | 6-nov-2026 |
| Alcance | Código de la app (Next.js 16.4, `src/`), configuración, dependencias, historial de Git, migraciones y políticas de Supabase (`supabase/`) |
| Base | `main` en `d6b8d3e` · rama de arreglos `security/hardening-nov` |
| Método | Revisión de código, auditoría de dependencias (`npm audit`), búsqueda de secretos en todo el historial, build de producción local y pruebas simuladas (cabeceras, CSRF, fuerza bruta, archivos maliciosos, archivos sensibles, CORS, CSP en el navegador) |

**Resultado:** no se encontraron vulnerabilidades críticas abiertas. La autorización de datos ya estaba bien resuelta en la base (RLS en las 9 tablas, triggers que protegen roles, precios y estados). Se corrigieron **11 hallazgos** en la app (4 altos, 5 medios, 2 bajos) y quedan **tareas de configuración** para backend e infraestructura (Supabase Auth, Vercel y monitoreo), que no se pueden resolver desde el código.

| Severidad | Encontrados | Corregidos en la rama | Derivados a backend |
|---|---|---|---|
| Alta | 4 | 4 | — |
| Media | 5 | 5 | 2 (complementos) |
| Baja | 2 | 2 | — |
| Configuración / infraestructura | — | — | 12 tareas (sección *Tareas para backend*) |

---

## Hallazgos y arreglos

### H-01 · Alta · Cookies de sesión legibles por JavaScript, sin `Secure` y con 400 días de vida
- **Hallazgo:** `@supabase/ssr` usa por defecto `httpOnly: false`, sin `Secure` y `maxAge` de 400 días. Un XSS podía robar el token de sesión desde `document.cookie`, y la cookie viajaba también por HTTP.
- **Arreglo:** `src/lib/auth-cookies.ts` → `httpOnly: true`, `secure` en producción, `sameSite: "lax"`, `maxAge` 7 días (se renueva con cada refresh). Se aplica en `src/utils/supabase/server.ts` y en el proxy (`src/utils/supabase/middleware.ts`).
- **Prerrequisito:** se eliminó `src/utils/supabase/client.ts` (cliente de navegador). Nadie lo importaba y con `HttpOnly` dejaría de funcionar. **Regla nueva:** Supabase solo se usa desde el servidor.
- **Prueba:** test unitario (`cookies de sesión…`). Verificación manual pendiente en el navegador: iniciar sesión y comprobar que `document.cookie` no muestra `sb-…-auth-token`.

### H-02 · Alta · Sin cabeceras de seguridad HTTP (CSP, HSTS, anti-framing, nosniff)
- **Hallazgo:** las respuestas no tenían `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` ni `Permissions-Policy`, y anunciaban `X-Powered-By: Next.js`. El sitio se podía enmarcar en otro dominio (clickjacking) y no había defensa en profundidad contra XSS.
- **Arreglo:** `src/lib/security-headers.ts` + `headers()` en `next.config.ts`, para todas las rutas:
  - **CSP:** `default-src 'self'`, scripts solo del propio sitio, `connect-src` limitado al propio sitio y a las teselas del mapa, `img-src` al sitio, Supabase Storage y el mapa, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri`/`form-action 'self'` y `upgrade-insecure-requests` en HTTPS.
  - **HSTS:** `max-age=63072000; includeSubDomains; preload`, solo en despliegues HTTPS (Vercel o `FORCE_HTTPS=1`).
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara, micrófono, geolocalización y pagos desactivados), `Cross-Origin-Opener-Policy: same-origin`, `poweredByHeader: false`.
- **Limitación aceptada:** `script-src` incluye `'unsafe-inline'`, porque Next necesita scripts inline para hidratar y la alternativa (nonces) obliga a renderizar todo dinámicamente. El build muestra que casi todas las rutas ya son dinámicas (ƒ), así que el siguiente paso de bajo costo es migrar a CSP con nonce (ver *Siguientes pasos*).
- **Prueba:** build de producción + `curl` de las cabeceras. En el navegador, la portada, /explorar, la ficha con mapa, /login, /registro y /u/ cargan sin ninguna violación de CSP (el estilo, las teselas y los sprites del mapa responden 200).

### H-03 · Alta · Sin límite de intentos en login, registro y recuperación (fuerza bruta)
- **Hallazgo:** las Server Actions de auth no limitaban intentos. Solo existía el límite global de Supabase Auth, que no distingue entre cuenta e IP.
- **Arreglo:** `src/lib/rate-limit.ts` (ventana deslizante) + `src/lib/request-meta.ts` (IP del cliente según `x-real-ip` / `x-forwarded-for` de Vercel). Límites:

  | Acción | Por IP | Por cuenta o usuario |
  |---|---|---|
  | Login | 20 / 15 min | 5 / 15 min por correo (se reinicia al entrar bien) |
  | Registro | 5 / hora | — |
  | Pedir recuperación | 5 / hora | 3 / hora por correo (responde siempre igual, sin revelar el bloqueo) |
  | Nueva contraseña | 10 / 15 min | — |
  | Crear reserva | — | 20 / hora por usuario |
  | Subir fotos (espacios y avatar) | — | 30 / hora por usuario |

- **Limitación:** el límite vive en la memoria de cada instancia serverless. Frena ataques desde una IP o contra una cuenta, pero no reemplaza el límite global, que se deriva a infraestructura (B-03, B-04).
- **Prueba:** simulación con 8 intentos fallidos contra la misma cuenta en el build local: del 1 al 5 se ejecutan y **del 6 al 8 devuelven "Demasiados intentos…"**. También hay tests unitarios (incluida la simulación de 50 intentos).

### H-04 · Alta · El tipo de archivo subido se validaba solo con datos del cliente
- **Hallazgo:** `validateImage` / `validateAvatar` confiaban en `file.type` (lo declara el navegador), y la extensión del archivo guardado salía de `file.name`. Se podía subir HTML o SVG renombrado como `.jpg`, o un archivo con extensión `.html`, al bucket público.
- **Arreglo:** `src/lib/file-signature.ts` detecta el tipo real por los primeros bytes (*magic numbers*: JPEG, PNG, WebP, AVIF). `uploadSpaceImages` y `uploadAvatar` (`src/lib/storage.ts`) rechazan lo que no coincida, y la extensión y el `Content-Type` de Storage salen del tipo detectado, nunca del nombre. Los límites de tamaño (5 MB por foto, 2 MB por avatar, 10 por espacio) se siguen validando en el servidor y en los buckets.
- **Prueba:** tests unitarios con HTML, SVG con `onload`, GIF y un ejecutable (`MZ`) disfrazados de `foto.jpg`: todos se rechazan. JPEG, PNG, WebP y AVIF reales pasan. El avatar no acepta AVIF.
- **Complemento derivado:** B-07 (quien sube directo a la API de Storage con su token se salta la app).

### H-05 · Media · Errores internos de la base de datos se mostraban al usuario
- **Hallazgo:** más de 20 ramas de error en las Server Actions devolvían `error.message` de Postgres/PostgREST tal cual: nombres de tablas, columnas, constraints y políticas RLS (información útil para un atacante).
- **Arreglo:** `src/lib/action-errors.ts` (`publicDbError`). Los mensajes de negocio de los triggers (`P0001`) se siguen mostrando; cualquier otro error queda en el log del servidor (`server_error` con su código) y el usuario ve un mensaje genérico. Se aplicó en `bookings.ts`, `spaces.ts`, `profile.ts`, `reactions.ts` y `auth/actions.ts`. Los errores de subida a Storage tampoco exponen el mensaje interno.

### H-06 · Media · Los enlaces de los correos de auth tomaban el dominio del header `Origin`
- **Hallazgo:** `signup` y `requestPasswordReset` armaban `emailRedirectTo` / `redirectTo` con `headers().get("origin")`. Si la allowlist de Supabase es amplia, un Origin manipulado puede apuntar el enlace del correo a otro dominio.
- **Arreglo:** se usa `NEXT_PUBLIC_SITE_URL` cuando está configurada; el Origin queda solo como respaldo en previews. Complemento: B-02 (allowlist de URLs de redirección).

### H-07 · Media · Ventana de recuperación de contraseña amplia y sesiones viejas activas tras el cambio
- **Hallazgo:** tras abrir el enlace de recuperación había 1 hora para cambiar la contraseña, y una entrada `amr` en formato texto se aceptaba sin revisar la hora. Además, al cambiar la contraseña las demás sesiones seguían activas.
- **Arreglo:** la ventana baja a **15 minutos** y solo vale con la marca de tiempo del método `recovery`. Al cambiar la contraseña se cierran las demás sesiones (`signOut({ scope: "others" })`). El enlace sigue siendo de un solo uso (PKCE: el `code` se canjea una vez y exige el verificador en la cookie del navegador que lo pidió). La caducidad del enlace en sí es configuración de Supabase (B-01). Se actualizó el README.

### H-08 · Media · Validación de entrada incompleta en el servidor
- **Hallazgo:** las Server Actions reciben argumentos directos (`spaceId`, `bookingId`, `categories`, `urls`) que cualquiera puede invocar con cualquier valor. No se validaba el formato de los IDs, ni el largo del nombre o del teléfono, ni el largo del correo o la contraseña.
- **Arreglo:** `src/lib/uuid.ts` (`isUuid`) en todas las acciones que reciben un ID. Las categorías de `resetPasses` se validan contra la lista. Se agregaron largos máximos (nombre 100, correo 254, contraseña 72, que es el límite efectivo de bcrypt) y formato de teléfono en registro y perfil. `updateSpaceStatus` filtra también por `host_id` (además de RLS).

### H-09 · Media · Sin registro de actividad sospechosa
- **Hallazgo:** solo había `console.error` sueltos y sin estructura; los intentos fallidos de login no quedaban registrados.
- **Arreglo:** `src/lib/security-log.ts`. Una línea JSON por evento (`login_failed`, `login_succeeded`, `signup_failed`, `password_reset_*`, `password_updated`, `auth_callback_failed`, `rate_limited`, `upload_rejected`, `server_error`). Los correos, IPs e ids van como **hash SHA-256 de 12 caracteres**, que sirve para correlacionar sin exponerlos. Las claves `password`, `token`, `secret`, `cookie`, `code`, etc. se descartan siempre.
- **Prueba:** test unitario de redacción. En la simulación de fuerza bruta, los logs muestran `login_failed` y `rate_limited` con hashes, sin correo ni IP en claro.
- **Complemento derivado:** B-09 (enviar los logs a un sistema con alertas).

### H-10 · Baja · Dependencias vulnerables en el toolchain de desarrollo
- **Hallazgo:** `npm audit` reportaba 8 moderadas, todas por `minimatch` < 11.0.1 (ReDoS, GHSA-g3hv-75wg-m249) dentro de `@typescript-eslint` (solo lint, no llega a producción). Producción: 0.
- **Arreglo:** `overrides` de `minimatch ^11.0.1` para `@typescript-eslint/typescript-estree` (el lint sigue funcionando), más parches de Next 16.4.3 → **16.4.5**, React 19.3.0 → **19.3.1**, `eslint-config-next` 16.4.5 y `@supabase/supabase-js` 2.119.0. **`npm audit`: 0 vulnerabilidades.** No hay paquetes sin uso (los 7 de producción se importan).

### H-11 · Baja · Opciones de producción no explícitas
- **Arreglo:** `productionBrowserSourceMaps: false` (sin código fuente en el navegador) y `poweredByHeader: false`. Next en producción no expone stacks (los errores llegan al cliente solo con un `digest`). No hay modo debug ni variables de depuración.


---

## Controles revisados que ya estaban bien

| Punto del checklist | Estado | Evidencia |
|---|---|---|
| Autorización de datos / acceso no autorizado a la base | ✅ | RLS habilitado en las 9 tablas. `profiles` solo se lee como dueño, contraparte o admin. Los perfiles públicos van por la vista `public_profiles`. Storage solo permite escribir en la carpeta `auth.uid()`. |
| Rutas de administrador / escalada de privilegios | ✅ | No hay panel de admin en la app. `role` y `verified` los protege el trigger `protect_profile_role`. `becomeHost` solo permite client → host (migración `become_host`). `featured` solo lo cambia un admin. Un cliente o un anfitrión que abre `/editar` de un espacio ajeno recibe 404 (QA F4). |
| CSRF | ✅ (verificado) | Las Server Actions comparan `Origin` con `Host`. **Simulación:** un POST al formulario de login con `Origin: https://evil.example` → **500, la acción no se ejecuta**; el mismo POST desde el propio origen → 200. Además, las cookies son `SameSite=Lax`. Los route handlers son solo GET. |
| Hash de contraseñas | ✅ (no aplica a la app) | Las contraseñas las guarda Supabase Auth con **bcrypt**; la app nunca las almacena ni las registra en logs. |
| Inyección SQL | ✅ | Solo se usa el query builder de supabase-js / PostgREST (parametrizado) y RPCs. El filtro `.or()` de búsqueda escapa comodines y comillas (`escapeLike`, `buildSearchFilter`). El único SQL dinámico (`execute format`) está en migraciones, sin datos del usuario. |
| Precios y pagos | ✅ | El cliente no envía montos: el trigger `compute_booking_amounts` calcula horas, subtotal, comisión, total y estado, e ignora lo que venga. `guard_booking_update` impide cambiar montos o fechas después. Aún no hay pasarela de pago (ver B-12). |
| XSS | ✅ | React escapa todo; no hay `dangerouslySetInnerHTML`, `innerHTML` ni `eval`. `svgMarkup` escapa texto (tests). Ahora la CSP y las cookies HttpOnly agregan defensa en profundidad. |
| CORS | ✅ (verificado) | La app no expone API pública; Next no envía `Access-Control-Allow-Origin`. Con `Origin` ajeno no aparece la cabecera, así que el navegador bloquea la lectura. |
| Claves en el frontend | ✅ | Al navegador solo llegan `NEXT_PUBLIC_SUPABASE_URL` y la **publishable/anon key** (pública por diseño; la protección es RLS) y `NEXT_PUBLIC_SITE_URL`. `SUPABASE_SERVICE_ROLE_KEY` solo la usa `scripts/geocode-spaces.mjs`, localmente. `.env*` está en `.gitignore`. |
| Archivos sensibles expuestos | ✅ (verificado) | Contra el build de producción: `/.env`, `/.env.local`, `/.git/config`, `/.git/HEAD`, `/package.json`, `/next.config.ts`, `/README.md`, `/supabase/demo/seed_demo.sql`, `/src/...`, `/backup.zip`, `/.next/...` y `/node_modules/...` → **todos 404**. `public/` solo tiene 5 SVG. |
| Secretos en el historial de Git | ✅ | Se buscó en **todos los commits de todas las ramas**: JWT (`eyJ…`), `sb_secret_`, `sb_publishable_`, `sk_live/test`, `ghp_`, `AKIA…`, claves privadas PEM y asignaciones `password/secret/service_role`. **Sin coincidencias** (solo el marcador `CAMBIAME` del seed). Nunca se versionó un `.env`. **No hace falta rotar claves.** |
| Redirecciones abiertas | ✅ | `safeRedirectPath` (arreglo de E-05 del QA). Simulación: `/auth/callback?next=/%5Cexample.com` → redirige a `/login?error=auth_callback`, nunca a otro dominio. |
| Enlace de recuperación de un solo uso | ✅ | Flujo PKCE de Supabase. La caducidad del enlace es configuración (B-01). |

---

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npx next typegen` + `npx tsc --noEmit` | ✅ sin errores |
| `npm run lint` | ✅ |
| `npm run test:unit` | ✅ **37/37**, incluidos 13 nuevos en `tests/unit/security.test.mjs` |
| `npm audit` | ✅ 0 vulnerabilidades (antes: 8 moderadas de desarrollo) |
| `npm run build` | ✅ |
| Cabeceras en el build local (`curl`) | ✅ CSP, nosniff, DENY, Referrer, Permissions, COOP; sin `X-Powered-By`. HSTS y `upgrade-insecure-requests` solo con HTTPS (verificado que no aparecen en http://localhost). |
| CSRF (POST con Origin ajeno a la Server Action de login) | ✅ rechazado (500) |
| Fuerza bruta (8 logins fallidos, misma cuenta) | ✅ bloqueado desde el 6.º intento |
| Archivos maliciosos disfrazados de imagen | ✅ rechazados (tests) |
| Archivos sensibles por URL | ✅ todos 404 |
| CORS con Origin ajeno | ✅ sin `Access-Control-Allow-Origin` |
| CSP en el navegador (6 páginas, incluido el mapa) | ✅ sin violaciones; mapa, fuentes e imágenes cargan |
| Logs de seguridad | ✅ JSON con hashes, sin PII |

**Pendiente de verificar en un preview de Vercel** (no se puede reproducir en local): HSTS y `upgrade-insecure-requests` en HTTPS; que `document.cookie` no muestre el token tras iniciar sesión (HttpOnly); que el límite de intentos use la IP real (`x-real-ip`).

---

## Tareas para backend e infraestructura

Configuración que no vive en el código. Orden de prioridad.

### B-01 · Alta · Supabase Auth: caducidad corta de los enlaces de correo
Authentication → Providers → Email: **Email OTP Expiration = 900 s** (15 min; hoy probablemente 3600 s). Confirmar que **Secure email change** está activo (requiere confirmar en el correo antiguo y en el nuevo).

### B-02 · Alta · Supabase Auth: allowlist de URLs de redirección
Authentication → URL Configuration: **Site URL** = `https://marketplace-audiovisual.vercel.app` y **Redirect URLs** solo con ese dominio y el patrón exacto de los previews del equipo (p. ej. `https://marketplace-audiovisual-*-los-lcz.vercel.app/**`). Quitar comodines amplios (`*`, `http://`, dominios ajenos). Junto con H-06, impide que un enlace de confirmación o recuperación apunte a otro dominio.

### B-03 · Alta · Vercel: límite global de peticiones (WAF)
El límite de la app es por instancia (H-03). En Vercel → Firewall, agregar reglas de **rate limit por IP** para `POST` a `/login`, `/registro`, `/recuperar` y `/recuperar/nueva` (p. ej. 10 por minuto) y una regla general anti-DDoS. Activar **Attack Challenge Mode** ante un ataque.

### B-04 · Alta · Supabase Auth: límites, contraseña y CAPTCHA
- Authentication → Rate Limits: revisar los límites de sign-in, sign-up, envío de correos y token refresh por IP.
- Authentication → Passwords: **largo mínimo 10** y exigir letras y dígitos; activar **Leaked password protection** (HaveIBeenPwned; plan Pro). Avisar a frontend para subir el mínimo de 8 a 10 en `auth/actions.ts` y en los formularios.
- Evaluar **CAPTCHA** (Cloudflare Turnstile o hCaptcha) en registro, login y recuperación. Requiere un widget en frontend y agregar su dominio a la CSP (`script-src`, `frame-src`, `connect-src`).

### B-05 · Media · Variables de entorno en Vercel
- **`NEXT_PUBLIC_SITE_URL` debe estar definida en Production** (H-06 la usa para los enlaces de los correos). En Preview, dejarla vacía o con la URL del preview.
- Marcar como **Sensitive** cualquier secreto. Confirmar que no existe ninguna variable `NEXT_PUBLIC_*` con la service role o una `sb_secret_`.
- Migrar a las **API keys nuevas** de Supabase (publishable + secret) y, cuando todo use las nuevas, **desactivar las JWT legacy** (anon / service_role). No hay filtración, pero así cada clave se puede rotar por separado.

### B-06 · Media · Sesiones y refresh tokens (Supabase Auth → Sessions)
Confirmar **Refresh token rotation** activo con *reuse interval* ≤ 10 s. Con plan Pro, configurar **Time-box** (p. ej. 30 días) e **Inactivity timeout** (p. ej. 7 días, igual al `maxAge` de la cookie).

### B-07 · Media · Storage: validación en el servidor de Storage
Quien tenga sesión puede subir directo a la API de Storage con su token y saltarse la validación por bytes de la app (H-04). Los buckets ya limitan tamaño y MIME declarado (`space-images` 5 MB, `avatars` 2 MB), pero el MIME declarado lo elige el cliente. Se recomienda:
1. En las políticas `*_owner_insert`, exigir la extensión: `storage.extension(name) in ('jpg','png','webp','avif')`.
2. Opcional: una Edge Function o un webhook de Storage que lea los primeros bytes y borre lo que no sea imagen.
3. Confirmar que Storage responde con `X-Content-Type-Options: nosniff` y el `Content-Type` guardado. Si no, servir las fotos solo vía `next/image`.

### B-08 · Media · Base de datos: red y exposición
- Settings → Database: **Enforce SSL** activo y **Network restrictions** (allowlist de IPs) para conexiones directas a Postgres.
- Settings → API: exponer solo el esquema `public` (y `graphql_public` solo si se usa; si no, desactivar `pg_graphql`).
- Correr el **Security Advisor** de Supabase y resolver sus avisos. Mantener la regla: toda tabla nueva con RLS en su misma migración (hoy 9 de 9).
- Admins: no hay panel. Los cambios de admin se hacen por SQL Editor. Exigir **MFA** a los miembros de la organización de Supabase y de Vercel, y revisar quién tiene rol Owner/Admin.

### B-09 · Media · Monitoreo y alertas
- Vercel → **Log Drains** hacia un servicio con alertas (Axiom, Better Stack, Datadog). Filtrar `"type":"security"`.
- Alertas sugeridas: más de 20 `login_failed` del mismo `email` (hash) en 15 min; más de 50 `rate_limited` en 5 min; cualquier `server_error` repetido; aumento de `upload_rejected`.
- Revisar periódicamente los **Auth logs** de Supabase. Si se agrega Sentry, sumar su dominio a `connect-src` en la CSP.

### B-10 · Baja · Rotación de la service role usada en scripts
`scripts/geocode-spaces.mjs` requiere `SUPABASE_SERVICE_ROLE_KEY` en local. Guardarla en un gestor de secretos (no en `.env` compartidos por chat) y rotarla si alguna vez se compartió fuera del equipo. Hoy no hay evidencia de filtración.

### B-11 · Baja · Dependabot / Renovate
Activar Dependabot (alertas y PRs de seguridad) en GitHub y agregar `npm audit --omit=dev` al CI.

### B-12 · Baja (futura) · Pasarela de pago
Cuando se integre (estado `pending_payment`, ver README):
- Verificar la **firma** de cada webhook.
- Hacerlos **idempotentes** (`payment_id` único).
- Comparar el monto pagado con `total_amount` de la base, **nunca** con un valor del cliente.
- Usar la secret key solo en el servidor.
- Agregar el dominio de la pasarela a `form-action` / `frame-src` de la CSP si usa redirección o iframe.

---

## Siguientes pasos en la app

1. **CSP con nonce** (quitar `'unsafe-inline'` de `script-src`): generar el nonce en `src/proxy.ts`, siguiendo `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`. El build ya muestra casi todo dinámico, así que el impacto en rendimiento es bajo. Probar en un preview antes de mergear.
2. **Rate limit distribuido** (Upstash Redis o Vercel KV) si el límite del WAF (B-03) no alcanza, reutilizando las reglas de `RATE_LIMITS`.
3. Subir el mínimo de contraseña a 10 cuando backend lo aplique (B-04).

## Archivos cambiados

| Archivo | Cambio |
|---|---|
| `next.config.ts` | Cabeceras de seguridad, `poweredByHeader: false`, sin source maps |
| `src/lib/security-headers.ts` *(nuevo)* | CSP, HSTS y cabeceras |
| `src/lib/auth-cookies.ts` *(nuevo)* | Opciones de cookies de sesión |
| `src/lib/rate-limit.ts` *(nuevo)* | Límite de intentos |
| `src/lib/request-meta.ts` *(nuevo)* | IP del cliente |
| `src/lib/security-log.ts` *(nuevo)* | Logs de seguridad sin PII |
| `src/lib/file-signature.ts` *(nuevo)* | Tipo real de archivo por bytes |
| `src/lib/action-errors.ts` *(nuevo)* | Errores de base de datos sin detalles internos |
| `src/lib/uuid.ts` *(nuevo)* | Validación de ids |
| `src/lib/storage.ts` | Validación por bytes, extensión y Content-Type seguros |
| `src/utils/supabase/server.ts`, `middleware.ts` | Cookies seguras |
| `src/utils/supabase/client.ts` | **Eliminado** (sin uso; incompatible con HttpOnly) |
| `src/app/auth/actions.ts` | Rate limit, logs, validación, URL de redirección segura, ventana de 15 min, cierre de otras sesiones al cambiar la contraseña |
| `src/app/auth/callback/route.ts` | Log de fallos |
| `src/app/actions/{bookings,spaces,profile,reactions}.ts` | Errores genéricos, validación de ids, rate limit de reservas y subidas, logs |
| `package.json`, `package-lock.json` | Next 16.4.5, React 19.3.1, supabase-js 2.119, override de `minimatch` |
| `README.md` | Ventana de recuperación de 15 min |
| `tests/unit/security.test.mjs` *(nuevo)* | 13 pruebas de las protecciones |
