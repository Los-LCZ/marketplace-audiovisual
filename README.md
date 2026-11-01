# Marketplace Audiovisual

Marketplace estilo Airbnb para arrendar estudios de grabación, salas de ensayo y sets de rodaje.
Stack: Next.js 16 (App Router, `src/proxy.ts` en vez de `middleware.ts`), Supabase (Postgres + Auth + Storage), Tailwind CSS.

## Desarrollo

```bash
npm install
npm run dev
```

Variables en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y, en producción, `NEXT_PUBLIC_SITE_URL` (para el enlace de confirmación de correo).

### Tests

```bash
npm run test:sql   # migraciones, RLS, triggers y RPC sobre PGlite (ver tests/sql/README.md)
npm run lint
npx tsc --noEmit
```

GitHub Actions (`.github/workflows/ci.yml`) corre los tres en cada PR y en cada push a `main`. Cada migración nueva debe traer sus pruebas en `tests/sql/`.

### Entornos

| Entorno | Supabase | Quién lo usa |
|---|---|---|
| **Producción** | `tskhtlbpbvfuvqguypkh` | Solo el deploy de producción de Vercel (`main`) |
| **Staging** | `lyrwiuqpwgvwjlfmsvfj` | Desarrollo local (`.env.local`) y los previews de Vercel de cada PR |

- En Vercel, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` tienen un valor para **Production** y otro para **Preview**, ambos de tipo *Config* (Vercel no permite `NEXT_PUBLIC_*` como *Secret*; la anon/publishable key es pública por diseño y la protección la dan las políticas RLS).
- **Regla:** cada migración nueva se aplica **primero en staging**, se prueba en local o en el preview del PR, y recién **al mergear** se aplica en producción.
- Staging tiene *Confirm email* desactivado para crear cuentas de prueba al instante; producción lo mantiene activo.
- Nunca pongas la `service_role` / secret key en variables `NEXT_PUBLIC_*`.

### Base de datos

Ejecutar las migraciones de `supabase/migrations/` **en orden** (SQL Editor o `supabase db push`):

| Migración | Contenido |
|---|---|
| `init.sql` | Esquema, RLS, triggers, bucket `space-images`, amenities iniciales |
| `20261030120000_spaces_text_search.sql` | Índices trigram (`pg_trgm`) para la búsqueda por texto |
| `20261030130000_space_reviews_and_ratings.sql` | RPC `get_space_reviews` y vista `space_rating_stats` |
| `20261031100000_space_details.sql` | Ficha Señal: horario, aforo, equipamiento (`gear`), reglas, `featured` |
| `20261031110000_catalog_search.sql` | Vista `space_cards`, orden en la base, disponibilidad por día |
| `20261031120000_catalog_queries.sql` | Comunas y estadísticas por categoría |
| `20261031130000_public_profiles.sql` | Perfil público (titular, bio, etiquetas, verificado, nota mínima) |
| `20261031140000_client_reviews.sql` | Calificación del cliente y calificación a ciegas |
| `20261031150000_space_reactions.sql` | Me gusta / descarte y mazo de Descubrir |
| `20261031160000_booking_request_status.sql` | Estados `requested` y `rejected` (**ejecutar sola**, ver abajo) |
| `20261031160100_booking_requests.sql` | Solicitudes de reserva y resumen de clientes |
| `20261031170000_profile_rating_stats.sql` | Estadísticas y reseñas por perfil |
| `20261101100000_reset_passes.sql` | Descubrir: volver a ver los descartados |
| `20261101110000_bookings_reviews_batch.sql` | Reseñas de varias reservas en una llamada |
| `20261101120000_host_response_stats.sql` | `requested_at` y KPI de respuesta del anfitrión |
| `20261101130000_booking_expired_status.sql` | Estado `expired` (**ejecutar sola**) |
| `20261101130100_expire_requests.sql` | Vencimiento automático de solicitudes (pg_cron cada 15 min) |
| `20261101140000_cancel_before_start.sql` | Solo se cancela antes de que empiece la reserva |
| `20261101140100_host_response_stats_public.sql` | Documenta que el KPI de respuesta es público |
| `20261101140200_available_space_ids_setbased.sql` | Disponibilidad por día en una sola consulta (rendimiento) |

`init.sql` no se edita: cada cambio de esquema va en una migración nueva `<timestamp>_<descripcion>.sql`.

En el SQL Editor, ejecuta **cada archivo por separado**. Postgres no permite usar un valor nuevo de un enum en la misma transacción en que se agrega, así que `..._booking_request_status.sql` tiene que terminar antes de correr `..._booking_requests.sql`.

La vista `space_cards` usa `spaces.*`: si agregas columnas a `spaces`, recrea la vista en la misma migración.

### Datos demo

`supabase/demo/` **no son migraciones**: se ejecutan a mano en el SQL Editor.

- `seed_demo.sql` carga 3 anfitriones, 3 clientes, 12 espacios (sin fotos), 10 reservas, una solicitud pendiente y reseñas reveladas en ambos sentidos. Antes de ejecutarlo, reemplaza `CAMBIAME` por la contraseña de las cuentas demo (mínimo 10 caracteres) y **no la subas al repo**.
- `unseed_demo.sql` borra todo lo demo (usuarios `@senal-demo.test`), incluidas las reservas que usuarios reales hayan hecho en espacios demo.
  - **Fotos:** Supabase no permite borrar archivos de Storage con SQL. Si un anfitrión demo subió fotos, el script avisa con un *warning* qué carpetas quedan. Bórralas a mano en **Dashboard → Storage → `space-images`**: cada carpeta lleva el id del anfitrión demo (empieza con `de000000-`). Hazlo **antes o después** del unseed; no afecta a los datos.

Cuentas demo: `ana.rojas`, `diego.fuentes` y `valentina.soto` (anfitriones; Diego exige nota mínima 4); `matias.perez`, `camila.munoz` y `joaquin.herrera` (clientes; Joaquín no tiene reseñas). Todas con `@senal-demo.test`.

## Rutas

| Ruta | Quién | Estado |
|---|---|---|
| `/` | Público | Listado de espacios |
| `/espacios/[id]` | Público (borradores solo su dueño) | Ficha del espacio |
| `/espacios/nuevo` | Anfitrión (protegida) | Crear espacio |
| `/mis-reservas` | Cliente (protegida) | Reservas hechas por el usuario |
| `/dashboard` | Anfitrión (protegida) | **Ruta definitiva del panel del anfitrión.** La construye frontend; backend ya redirige y revalida ahí |
| `/perfil` | Usuario (protegida) | Edición del perfil propio (protege también `/perfil/*`: el perfil público debe ir en otra ruta) |
| `/descubrir` | Usuario (protegida) | Mazo de me gusta / descarte |
| `/login`, `/registro` | Público (redirige a `/` con sesión) | Autenticación |
| `/recuperar` | Público | Pedir el enlace para recuperar la contraseña |
| `/recuperar/nueva` | Quien abrió el enlace del correo (vale 1 hora) | Crear la nueva contraseña |

Las rutas protegidas se definen en `PROTECTED_PREFIXES` de `src/utils/supabase/middleware.ts`.

## Etiquetas para la UI

`space_category`:

| Valor | Etiqueta |
|---|---|
| `recording_studio` | Estudio de grabación |
| `rehearsal_room` | Sala de ensayo |
| `filming_set` | Set de rodaje |
| `photo_studio` | Estudio fotográfico |
| `outdoor_location` | Locación exterior |

`booking_status`:

| Valor | Etiqueta | Significado |
|---|---|---|
| `requested` | Solicitada | El cliente no cumple la nota mínima del anfitrión: espera aprobación. **No bloquea el horario** |
| `pending_payment` | Pendiente de pago | Reservado a la espera del pago (aún no se usa, ver abajo) |
| `confirmed` | Confirmada | Horario bloqueado para el cliente |
| `completed` | Completada | El anfitrión la marcó como realizada (solo cuando terminó); ambas partes pueden calificarse |
| `cancelled` | Cancelada | Libera el horario |
| `rejected` | Rechazada | El anfitrión rechazó la solicitud |
| `expired` | Vencida | La solicitud no tuvo respuesta antes de que empezara el horario (lo marca pg_cron cada 15 min) |

`space_status`: `draft` → Borrador, `published` → Publicado, `archived` → Archivado.

## Notas de negocio

- **Montos:** los calcula el trigger `compute_booking_amounts` (horas completas × `price_per_hour`, comisión de plataforma de 10%). El cliente nunca envía montos.
- **Horario:** cada espacio tiene `open_hour`–`close_hour` (hora de Chile); las reservas fuera de ese rango se rechazan.
- **Solicitudes:** la reserva nace `confirmed` si el anfitrión no exige nota mínima o el cliente la cumple. Si no, nace `requested` y el anfitrión la acepta (`acceptBooking`) o rechaza (`rejectBooking`). Un cliente sin reseñas reveladas no cumple ningún mínimo. Al aceptar, la restricción de solape valida que el horario siga libre.
- **`pending_payment` (integración de pago futura):** hoy ninguna reserva nace así. Cuando se integre una pasarela de pago (p. ej. Webpay/Flow/Mercado Pago):
  1. El trigger `compute_booking_amounts` pondrá `pending_payment` en vez de `confirmed`. Ese estado ya bloquea el horario.
  2. El webhook de la pasarela, con `service_role`, guardará `payment_id` y pasará la reserva a `confirmed`.
  3. Habrá que expirar las `pending_payment` sin pagar (cron). El anfitrión ya no puede confirmarlas por su cuenta.
- **Calificación de ida y vuelta, a ciegas:** el cliente califica el espacio (`reviews`) y el anfitrión al cliente (`client_reviews`), una vez por reserva `completed`. Ninguna parte ve la reseña de la otra hasta que ambas existan o pasen 14 días desde que se completó. Promedios, listados y el orden por rating solo cuentan reseñas reveladas. Una reseña no se puede editar ni borrar después de revelada.
- **Destacados y verificados:** `spaces.featured` y `profiles.verified` solo los cambia un admin (o el SQL Editor).
