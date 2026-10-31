# Marketplace Audiovisual

Marketplace estilo Airbnb para arrendar estudios de grabación, salas de ensayo y sets de rodaje.
Stack: Next.js 16 (App Router, `src/proxy.ts` en vez de `middleware.ts`), Supabase (Postgres + Auth + Storage), Tailwind CSS.

## Desarrollo

```bash
npm install
npm run dev
```

Variables en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y, en producción, `NEXT_PUBLIC_SITE_URL` (para el enlace de confirmación de correo).

### Base de datos

Ejecutar las migraciones de `supabase/migrations/` **en orden** (SQL Editor o `supabase db push`):

| Migración | Contenido |
|---|---|
| `init.sql` | Esquema, RLS, triggers, bucket `space-images`, amenities iniciales |
| `20261030120000_spaces_text_search.sql` | Índices trigram (`pg_trgm`) para la búsqueda por texto |
| `20261030130000_space_reviews_and_ratings.sql` | RPC `get_space_reviews` y vista `space_rating_stats` |

`init.sql` no se edita: cada cambio de esquema va en una migración nueva `<timestamp>_<descripcion>.sql`.

## Rutas

| Ruta | Quién | Estado |
|---|---|---|
| `/` | Público | Listado de espacios |
| `/espacios/[id]` | Público (borradores solo su dueño) | Ficha del espacio |
| `/espacios/nuevo` | Anfitrión (protegida) | Crear espacio |
| `/mis-reservas` | Cliente (protegida) | Reservas hechas por el usuario |
| `/dashboard` | Anfitrión (protegida) | **Ruta definitiva del panel del anfitrión.** La construye frontend; backend ya redirige y revalida ahí |
| `/perfil` | Usuario (protegida) | Perfil |
| `/login`, `/registro` | Público (redirige a `/` con sesión) | Autenticación |

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
| `pending_payment` | Pendiente de pago | Reservado a la espera del pago (aún no se usa, ver abajo) |
| `confirmed` | Confirmada | Horario bloqueado para el cliente |
| `completed` | Completada | El anfitrión la marcó como realizada; el cliente puede reseñarla |
| `cancelled` | Cancelada | Libera el horario |

`space_status`: `draft` → Borrador, `published` → Publicado, `archived` → Archivado.

## Notas de negocio

- **Montos:** los calcula el trigger `compute_booking_amounts` (horas completas × `price_per_hour`, comisión de plataforma de 10%). El cliente nunca envía montos.
- **`pending_payment` (integración de pago futura):** hoy `createBooking` no envía `status`, así que toda reserva nace `confirmed`. Cuando se integre una pasarela de pago (p. ej. Webpay/Flow/Mercado Pago):
  1. `createBooking` insertará con `status: 'pending_payment'`. Ese estado ya bloquea el horario, igual que `confirmed`.
  2. El webhook de la pasarela, con `service_role`, guardará `payment_id` y pasará la reserva a `confirmed`.
  3. Habrá que expirar las `pending_payment` sin pagar (cron) y quitarle al anfitrión la transición `pending_payment → confirmed`, que hoy permite `guard_booking_update`.
- **Reseñas:** una por reserva (`reviews.booking_id` es único), solo del cliente y solo si la reserva está `completed`.
