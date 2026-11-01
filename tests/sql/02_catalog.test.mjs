import { setup, as, check } from "./harness.mjs";
import { seed, chileTs, chileDate, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);
const SPACE2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
await db.exec(`insert into public.spaces (id, host_id, title, category, address, city, commune, price_per_hour, min_hours, open_hour, close_hour)
  values ('${SPACE2}', '${HOST}', 'Set Sur', 'filming_set', 'x', 'Santiago', 'Ñuñoa', 50000, 3, 10, 14);`);

const day = await chileDate(db, 3);
const avail = async (cats = null) =>
  (await as(db, null, `select public.get_available_space_ids($1::date, $2::public.space_category[]) as id`, [day, cats ? `{${cats.join(",")}}` : null])).map((r) => r.id).sort();

check(JSON.stringify(await avail()) === JSON.stringify([SPACE, SPACE2].sort()), "ambos disponibles sin reservas (anon)");
check(JSON.stringify(await avail(["filming_set"])) === JSON.stringify([SPACE2]), "filtra por categorías");

const book = (who, space, s, e, days = 3) =>
  Promise.all([chileTs(db, days, s), chileTs(db, days, e)]).then(([a, b]) =>
    as(db, who, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4) returning id`, [space, who, a, b]));

// SPACE2: 10–14 con mínimo 3 h. Reservar 11–14 deja un hueco de 1 h => no disponible.
await book(CLIENT, SPACE2, 11, 14);
check(!(await avail()).includes(SPACE2), "sin hueco de min_hours => no disponible");
// SPACE: 09–18, mín. 2. Reservar 09–17 deja 1 h => no disponible; cancelar => vuelve.
const [b] = await book(CLIENT2, SPACE, 9, 17);
check(!(await avail()).includes(SPACE), "espacio lleno => no disponible");
await as(db, CLIENT2, `update public.bookings set status = 'cancelled' where id = $1`, [b.id]);
check((await avail()).includes(SPACE), "reserva cancelada libera el día");

// space_cards: solo publicados, con rating
await db.exec(`update public.spaces set status = 'draft' where id = '${SPACE2}'`);
const cards = await as(db, null, `select id, avg_rating, review_count from public.space_cards`);
check(cards.length === 1 && cards[0].id === SPACE && cards[0].review_count === 0 && cards[0].avg_rating === null, "space_cards: publicados con rating vacío", JSON.stringify(cards));
// Orden por rating con nulls al final (lo que hace PostgREST con nullsFirst:false)
const ordered = await as(db, null, `select id from public.space_cards order by avg_rating desc nulls last, review_count desc, created_at desc, id`);
check(ordered.length === 1, "orden por rating ejecuta");
