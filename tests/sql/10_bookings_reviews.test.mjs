import { setup, as, expectError, check } from "./harness.mjs";
import { seed, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

let n = 0;
async function completed(client) {
  const id = `b0000000-0000-0000-0000-00000000000${++n}`;
  await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;
    insert into public.bookings (id, space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount, status, completed_at)
    values ('${id}', '${SPACE}', '${client}', now() - interval '${n} days 3 hours', now() - interval '${n} days 1 hour', 2, 1, 0, 1, 'completed', now());
    alter table public.bookings enable trigger bookings_compute_amounts;`);
  return id;
}
const b1 = await completed(CLIENT);
const b2 = await completed(CLIENT2);
await as(db, CLIENT, `insert into public.reviews (booking_id, rating) values ($1, 5)`, [b1]);

const batch = async (who, ids) =>
  Object.fromEntries((await as(db, who, `select * from public.get_bookings_reviews($1::uuid[])`, [`{${ids.join(",")}}`])).map((r) => [r.booking_id, r.reviews]));

const asHost = await batch(HOST, [b1, b2, b1]);
check(Object.keys(asHost).length === 2, "anfitrión recibe ambas reservas (ids repetidos se ignoran)");
check(asHost[b1].space_review === null && asHost[b1].space_review_submitted === true, "mantiene la regla a ciegas (anfitrión no ve la reseña oculta)");

const single = (await as(db, HOST, `select public.get_booking_reviews($1) r`, [b1]))[0].r;
check(JSON.stringify(single) === JSON.stringify(asHost[b1]), "mismo resultado que get_booking_reviews");

const asClient = await batch(CLIENT, [b1, b2]);
check(Object.keys(asClient).length === 1 && asClient[b1].space_review?.rating === 5, "cliente solo recibe sus reservas y ve su reseña");

await expectError(as(db, null, `select * from public.get_bookings_reviews('{${b1}}')`), "permission denied", "anon no puede");
