import { setup, as, expectError, check } from "./harness.mjs";
import { seed, chileTs, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

// Reservas en el pasado (el trigger exige futuro): se insertan con el trigger apagado.
async function pastBooking(id, client, daysAgo, status = "confirmed", completedDaysAgo = null) {
  await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;
    insert into public.bookings (id, space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount, status, completed_at)
    values ('${id}', '${SPACE}', '${client}', now() - interval '${daysAgo} days' - interval '3 hours',
            now() - interval '${daysAgo} days' - interval '1 hour', 2, 40000, 4000, 44000, '${status}',
            ${completedDaysAgo === null ? "null" : `now() - interval '${completedDaysAgo} days'`});
    alter table public.bookings enable trigger bookings_compute_amounts;`);
}
const B1 = "b1000000-0000-0000-0000-000000000001";
const B2 = "b2000000-0000-0000-0000-000000000002";
await pastBooking(B1, CLIENT, 1);

// completar: solo cuando terminó y fija completed_at
const fut = await as(db, CLIENT2, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4) returning id`,
  [SPACE, CLIENT2, await chileTs(db, 2, 10), await chileTs(db, 2, 12)]);
await expectError(as(db, HOST, `update public.bookings set status = 'completed' where id = $1`, [fut[0].id]), "cuando termina el horario", "no completa antes de terminar");
await expectError(as(db, CLIENT, `update public.bookings set completed_at = now() where id = $1`, [B1]), "Solo se puede modificar el estado", "cliente no puede fijar completed_at");
await as(db, HOST, `update public.bookings set status = 'completed' where id = $1`, [B1]);
check((await db.query(`select completed_at from public.bookings where id = '${B1}'`)).rows[0].completed_at !== null, "completar fija completed_at");

// Reseñas a ciegas
await expectError(as(db, CLIENT, `insert into public.client_reviews (booking_id, rating) values ($1, 5)`, [B1]), "row-level security", "cliente no puede calificar al cliente");
await as(db, CLIENT, `insert into public.reviews (booking_id, rating, comment, tags) values ($1, 4, 'Buen sonido', '{acustica}')`, [B1]);
check((await as(db, CLIENT, `select id from public.reviews where booking_id = $1`, [B1])).length === 1, "el cliente ve su propia reseña");
check((await as(db, HOST, `select id from public.reviews where booking_id = $1`, [B1])).length === 0, "el anfitrión NO ve la reseña antes de enviar la suya");
check((await as(db, null, `select id from public.reviews`)).length === 0, "anon no ve reseñas ocultas");
check((await as(db, null, `select review_count from public.space_cards where id = $1`, [SPACE]))[0].review_count === 0, "space_cards no cuenta reseñas ocultas");
check((await as(db, null, `select * from public.get_space_reviews($1)`, [SPACE])).length === 0, "get_space_reviews no muestra ocultas");

let br = (await as(db, HOST, `select public.get_booking_reviews($1) as r`, [B1]))[0].r;
check(br.role === "host" && br.revealed === false && br.space_review_submitted === true && br.space_review === null, "get_booking_reviews oculta al anfitrión la reseña del cliente", JSON.stringify(br));

await as(db, CLIENT, `update public.reviews set rating = 5 where booking_id = $1`, [B1]);
check(true, "el cliente puede editar mientras está oculta");

await as(db, HOST, `insert into public.client_reviews (booking_id, rating, comment, tags) values ($1, 3, 'Llegó tarde', '{puntual}')`, [B1]);
check((await as(db, HOST, `select id from public.reviews where booking_id = $1`, [B1])).length === 1, "tras enviar la suya, el anfitrión ve la del cliente");
check((await as(db, null, `select review_count, avg_rating from public.space_cards where id = $1`, [SPACE]))[0].review_count === 1, "space_cards cuenta la reseña revelada");
br = (await as(db, CLIENT, `select public.get_booking_reviews($1) as r`, [B1]))[0].r;
check(br.revealed === true && br.client_review?.rating === 3 && br.space_review?.rating === 5, "get_booking_reviews revela ambas", JSON.stringify(br));

const upd = await as(db, CLIENT, `update public.reviews set rating = 1 where booking_id = $1 returning id`, [B1]);
check(upd.length === 0, "no se puede editar tras revelarse");
const del = await as(db, HOST, `delete from public.client_reviews where booking_id = $1 returning id`, [B1]);
check(del.length === 0, "no se puede borrar tras revelarse");

const rating = (await as(db, null, `select * from public.get_client_rating($1)`, [CLIENT]))[0];
check(Number(rating.avg_rating) === 3 && rating.review_count === 1, "nota del cliente con reseñas reveladas", JSON.stringify(rating));

// Regla de 14 días: solo una reseña, completada hace 15 días => pública
await pastBooking(B2, CLIENT2, 16, "completed", 15);
await as(db, CLIENT2, `insert into public.reviews (booking_id, rating) values ($1, 2)`, [B2]);
check((await as(db, null, `select id from public.reviews where booking_id = $1`, [B2])).length === 1, "pasados 14 días la reseña es pública");

// client_meets_minimum
check((await db.query(`select public.client_meets_minimum('${CLIENT}', '${HOST}') m`)).rows[0].m === true, "sin mínimo => cumple");
await db.exec(`update public.profiles set min_client_rating = 3.5 where id = '${HOST}'`);
check((await db.query(`select public.client_meets_minimum('${CLIENT}', '${HOST}') m`)).rows[0].m === false, "nota 3 < mínimo 3.5 => no cumple");
check((await db.query(`select public.client_meets_minimum('${CLIENT2}', '${HOST}') m`)).rows[0].m === false, "sin reseñas y con mínimo => no cumple");
await db.exec(`update public.profiles set min_client_rating = 3 where id = '${HOST}'`);
check((await db.query(`select public.client_meets_minimum('${CLIENT}', '${HOST}') m`)).rows[0].m === true, "nota 3 >= mínimo 3 => cumple");

// Un tercero no participa
check((await as(db, CLIENT2, `select public.get_booking_reviews($1) as r`, [B1]))[0].r === null, "tercero recibe null en get_booking_reviews");
