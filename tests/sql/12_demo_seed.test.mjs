import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setup, as, expectError, check, REPO_ROOT } from "./harness.mjs";

const repo = REPO_ROOT;
const db = await setup(repo);
// auth más parecido a Supabase: columnas que usa GoTrue, identities y pgcrypto en `extensions`.
await db.exec(`
  create extension if not exists pgcrypto with schema extensions;
  alter table auth.users
    add column instance_id uuid, add column aud text, add column role text,
    add column encrypted_password text, add column email_confirmed_at timestamptz,
    add column raw_app_meta_data jsonb, add column created_at timestamptz, add column updated_at timestamptz,
    add column confirmation_token text, add column email_change text,
    add column email_change_token_new text, add column recovery_token text;
  create table auth.identities (id uuid primary key, user_id uuid references auth.users (id) on delete cascade,
    provider_id text, identity_data jsonb, provider text, last_sign_in_at timestamptz,
    created_at timestamptz, updated_at timestamptz);
  -- Un usuario y un espacio reales que el unseed no debe tocar.
  insert into auth.users (id, email, raw_user_meta_data) values ('99999999-9999-9999-9999-999999999999', 'real@gmail.com', '{"full_name":"Real","role":"host"}');
  insert into public.spaces (host_id, title, category, address, city, commune, price_per_hour)
  values ('99999999-9999-9999-9999-999999999999', 'Espacio real', 'photo_studio', 'x', 'Santiago', 'Ñuñoa', 10000);
`);

const seedSql = readFileSync(join(repo, "supabase/demo/seed_demo.sql"), "utf8");
await expectError(db.exec(seedSql), "Reemplaza CAMBIAME", "se niega a correr con la contraseña placeholder");
await db.exec(seedSql.replace("'CAMBIAME';", "'demo-pass-123';"));
await expectError(db.exec(seedSql.replace("'CAMBIAME';", "'demo-pass-123';")), "Ya hay datos demo", "no se carga dos veces");

const n = async (sql) => Number((await db.query(sql)).rows[0].n);
check((await n(`select count(*) n from auth.users where email like '%@senal-demo.test'`)) === 6, "6 usuarios demo");
check((await n(`select count(*) n from public.profiles where id::text like 'de000000%'`)) === 6, "perfiles creados por handle_new_user");
check((await n(`select count(*) n from public.profiles where id::text like 'de000000%' and role = 'host'`)) === 3, "3 anfitriones");
check((await n(`select count(*) n from public.spaces where id::text like 'de5ace00%'`)) === 12, "12 espacios");
check((await n(`select count(*) n from public.space_amenities where space_id::text like 'de5ace00%'`)) >= 20, "amenities asociadas por nombre");
check((await n(`select count(*) n from public.bookings where id::text like 'deb00c00%'`)) === 10, "10 reservas");
check((await db.query(`select tgenabled from pg_trigger where tgname = 'bookings_compute_amounts'`)).rows[0].tgenabled === "O", "trigger de montos vuelve a quedar activo");

const pw = (await db.query(`select extensions.crypt('demo-pass-123', encrypted_password) = encrypted_password ok from auth.users where email = 'ana.rojas@senal-demo.test'`)).rows[0].ok;
check(pw === true, "contraseña bcrypt válida para iniciar sesión");

const card = (await as(db, null, `select avg_rating, review_count from public.space_cards where title = 'Estudio Ñuble'`))[0];
check(Number(card.avg_rating) === 4.5 && card.review_count === 2, "space_cards muestra rating revelado (anon)", JSON.stringify(card));
const reviews = await as(db, null, `select * from public.get_space_reviews('de5ace00-0000-4000-8000-000000000001')`);
check(reviews.length === 2 && reviews[0].author_name, "reseñas públicas con autor");
const hostStats = (await as(db, null, `select public.get_profile_rating_stats('de000000-0000-4000-8000-000000000003') s`))[0].s;
check(hostStats.as_host.count === 3, "estadísticas de anfitrión", JSON.stringify(hostStats.as_host));
const matias = (await as(db, null, `select * from public.get_client_rating('de000000-0000-4000-8000-000000000011')`))[0];
check(Number(matias.avg_rating) === 4.75 && matias.review_count === 4, "nota de Matías como cliente", JSON.stringify(matias));

const req = (await db.query(`select status, requested_at from public.bookings where id = 'deb00c00-0000-4000-8000-000000000010'`)).rows[0];
check(req.status === "requested" && req.requested_at !== null, "solicitud pendiente con requested_at");
const deck = await as(db, "de000000-0000-4000-8000-000000000013", `select * from public.get_discover_deck(null, 50)`);
const diego = deck.find((d) => d.space_id === "de5ace00-0000-4000-8000-000000000004");
check(diego && diego.is_match === false, "Joaquín (sin nota) no hace match con Diego (mínimo 4)");
const deckM = await as(db, "de000000-0000-4000-8000-000000000011", `select * from public.get_discover_deck(null, 50)`);
check(deckM.find((d) => d.space_id === "de5ace00-0000-4000-8000-000000000004")?.is_match === true, "Matías (4,75) sí hace match");
check((await as(db, null, `select * from public.list_communes()`)).length >= 7, "comunas para los filtros");

// Una reserva real en un espacio demo también se borra con el unseed
await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;
  insert into public.bookings (space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount)
  values ('de5ace00-0000-4000-8000-000000000002', '99999999-9999-9999-9999-999999999999', now() + interval '20 days', now() + interval '20 days 1 hour', 1, 1, 0, 1);
  alter table public.bookings enable trigger bookings_compute_amounts;`);

// Una foto de un anfitrión demo en Storage: el unseed debe avisar, sin fallar.
await db.exec(`insert into storage.objects (bucket_id, name) values
  ('space-images', 'de000000-0000-4000-8000-000000000001/de5ace00-0000-4000-8000-000000000001/foto.jpg')`);
const notices = [];
const unseedSql = readFileSync(join(repo, "supabase/demo/unseed_demo.sql"), "utf8");
await db.query(unseedSql, [], { onNotice: (n) => notices.push(n.message) });
check(notices.some((m) => m.includes("de000000-0000-4000-8000-000000000001")), "unseed avisa qué carpetas de Storage borrar a mano", JSON.stringify(notices));
check((await n(`select count(*) n from auth.users where email like '%@senal-demo.test'`)) === 0, "unseed borra usuarios demo");
check((await n(`select count(*) n from public.spaces where id::text like 'de5ace00%'`)) === 0, "unseed borra espacios demo");
check((await n(`select count(*) n from public.bookings`)) === 0, "unseed borra reservas demo y las de reales en espacios demo");
check((await n(`select count(*) n from public.reviews`)) + (await n(`select count(*) n from public.client_reviews`)) === 0, "reseñas borradas en cascada");
check((await n(`select count(*) n from auth.identities`)) === 0, "identidades borradas en cascada");
check((await n(`select count(*) n from public.spaces where title = 'Espacio real'`)) === 1 && (await n(`select count(*) n from auth.users`)) === 1, "no toca usuarios ni espacios reales");
check((await n(`select count(*) n from public.amenities`)) === 9, "catálogo de amenities intacto");
