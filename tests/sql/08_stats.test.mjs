import { setup, as, check } from "./harness.mjs";
import { seed, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

let n = 0;
async function completedBooking(client) {
  const id = `b0000000-0000-0000-0000-00000000000${++n}`;
  await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;
    insert into public.bookings (id, space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount, status, completed_at)
    values ('${id}', '${SPACE}', '${client}', now() - interval '${n} days 3 hours', now() - interval '${n} days 1 hour', 2, 1, 0, 1, 'completed', now());
    alter table public.bookings enable trigger bookings_compute_amounts;`);
  return id;
}
const b1 = await completedBooking(CLIENT);
const b2 = await completedBooking(CLIENT2);
const b3 = await completedBooking(CLIENT);
// b1 y b2: ambas reseñas (reveladas). b3: solo la del cliente (oculta).
await as(db, CLIENT, `insert into public.reviews (booking_id, rating, tags) values ($1, 5, '{acustica,puntual}')`, [b1]);
await as(db, HOST, `insert into public.client_reviews (booking_id, rating, comment, tags) values ($1, 4, 'Ordenado', '{puntual}')`, [b1]);
await as(db, CLIENT2, `insert into public.reviews (booking_id, rating, tags) values ($1, 3, '{acustica}')`, [b2]);
await as(db, HOST, `insert into public.client_reviews (booking_id, rating, tags) values ($1, 2, '{ruidoso}')`, [b2]);
await as(db, CLIENT, `insert into public.reviews (booking_id, rating) values ($1, 1)`, [b3]);

const hostStats = (await as(db, null, `select public.get_profile_rating_stats($1) s`, [HOST]))[0].s;
check(hostStats.as_host.count === 2 && Number(hostStats.as_host.avg) === 4, "as_host: solo reseñas reveladas (oculta excluida)", JSON.stringify(hostStats.as_host));
check(JSON.stringify(hostStats.as_host.distribution) === "[1,0,1,0,0]", "distribución 5..1");
check(hostStats.as_host.top_tags[0].label === "acustica" && hostStats.as_host.top_tags[0].count === 2, "top tags ordenados", JSON.stringify(hostStats.as_host.top_tags));
check(hostStats.as_client.count === 0 && hostStats.as_client.avg === null && JSON.stringify(hostStats.as_client.top_tags) === "[]", "as_client vacío");

const clientStats = (await as(db, null, `select public.get_profile_rating_stats($1) s`, [CLIENT]))[0].s;
check(clientStats.as_client.count === 1 && Number(clientStats.as_client.avg) === 4, "as_client del cliente", JSON.stringify(clientStats.as_client));

const hostReviews = await as(db, null, `select * from public.get_profile_reviews($1, 'host', 1)`, [HOST]);
check(hostReviews.length === 2 && hostReviews.every((r) => r.space_title === "Estudio Norte") && hostReviews.some((r) => r.author_name === "Carlos Cliente"), "get_profile_reviews host", JSON.stringify(hostReviews.map((r) => [r.rating, r.author_name])));
const clientReviews = await as(db, null, `select * from public.get_profile_reviews($1, 'client', 1)`, [CLIENT]);
check(clientReviews.length === 1 && clientReviews[0].author_name === "Ana Host" && clientReviews[0].comment === "Ordenado", "get_profile_reviews client");
const page2 = await as(db, null, `select * from public.get_profile_reviews($1, 'host', 2, 1)`, [HOST]);
check(page2.length === 1, "paginación");
check((await as(db, null, `select * from public.get_profile_reviews($1, 'otro', 1)`, [HOST])).length === 0, "rol inválido => vacío");
