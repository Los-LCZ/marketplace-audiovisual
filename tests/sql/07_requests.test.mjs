import { setup, as, expectError, check } from "./harness.mjs";
import { seed, chileTs, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

const book = async (who, s, e, days = 2, extra = {}) =>
  (await as(db, who, `insert into public.bookings (space_id, client_id, start_time, end_time, project, message, status)
    values ($1,$2,$3,$4,$5,$6, coalesce($7, 'confirmed')::public.booking_status) returning *`,
    [SPACE, who, await chileTs(db, days, s), await chileTs(db, days, e), extra.project ?? null, extra.message ?? null, extra.status ?? null]))[0];

// Sin nota mínima => confirmed, aunque el cliente pida otro estado
const b1 = await book(CLIENT, 9, 11, 2, { status: "completed" });
check(b1.status === "confirmed" && b1.decided_at === null, "sin mínimo => confirmed (ignora estado enviado)");

// Con mínimo y cliente sin reseñas => requested, con proyecto y mensaje
await db.exec(`update public.profiles set min_client_rating = 4 where id = '${HOST}'`);
const r1 = await book(CLIENT2, 12, 14, 2, { project: "Videoclip", message: "Hola, somos 4" });
check(r1.status === "requested" && r1.project === "Videoclip", "con mínimo y sin nota => requested");

// requested no bloquea: otra solicitud de otro cliente en el mismo horario
await db.exec(`update public.profiles set min_client_rating = null where id = '${HOST}'`);
const c2 = await book(CLIENT, 12, 14, 2);
check(c2.status === "confirmed", "una solicitud no bloquea el horario (otro cliente confirma encima)");
await db.exec(`update public.profiles set min_client_rating = 4 where id = '${HOST}'`);

// Solicitud sobre horario confirmado => error claro
await expectError(book(CLIENT2, 9, 11), "ya está reservado en ese horario", "no se solicita un horario ya confirmado");
// Solicitud duplicada del mismo cliente
const r2 = await book(CLIENT2, 15, 17);
await expectError(book(CLIENT2, 16, 18), "Ya enviaste una solicitud", "no duplica solicitud solapada");

// Aceptar: solo el anfitrión; valida solape con lo confirmado
await expectError(as(db, CLIENT2, `update public.bookings set status = 'confirmed' where id = $1`, [r2.id]), "Cambio de estado no permitido", "cliente no puede auto-aceptar");
await expectError(as(db, HOST, `update public.bookings set status = 'confirmed' where id = $1`, [r1.id]), "bookings_no_overlap", "aceptar sobre horario ya tomado falla por solape");
await as(db, HOST, `update public.bookings set status = 'confirmed' where id = $1`, [r2.id]);
const acc = (await db.query(`select status, decided_at from public.bookings where id = '${r2.id}'`)).rows[0];
check(acc.status === "confirmed" && acc.decided_at !== null, "anfitrión acepta y se fija decided_at");

// Rechazar
await as(db, HOST, `update public.bookings set status = 'rejected' where id = $1`, [r1.id]);
check((await db.query(`select status from public.bookings where id = '${r1.id}'`)).rows[0].status === "rejected", "anfitrión rechaza");
await expectError(as(db, HOST, `update public.bookings set status = 'confirmed' where id = $1`, [r1.id]), "ya está cerrada", "no se reabre una rechazada");

// Cliente cancela su solicitud; anfitrión no puede 'cancelar' una solicitud (debe rechazar)
const r3 = await book(CLIENT2, 9, 11, 4);
await expectError(as(db, HOST, `update public.bookings set status = 'cancelled' where id = $1`, [r3.id]), "Cambio de estado no permitido", "anfitrión rechaza, no cancela, una solicitud");
await as(db, CLIENT2, `update public.bookings set status = 'cancelled' where id = $1`, [r3.id]);
check(true, "cliente cancela su solicitud");
await expectError(as(db, CLIENT2, `update public.bookings set message = 'otro' where id = $1`, [r2.id]), "Solo se puede modificar el estado", "mensaje inmutable");

// Disponibilidad y slots ocupados ignoran solicitudes
const day = (await db.query(`select (((now() at time zone 'America/Santiago')::date + 5))::text d`)).rows[0].d;
await book(CLIENT2, 9, 18, 5);
const avail = await as(db, null, `select public.get_available_space_ids($1::date) id`, [day]);
check(avail.some((r) => r.id === SPACE), "una solicitud de todo el día no quita disponibilidad");

// Resumen de clientes
const sum = await as(db, HOST, `select * from public.get_client_summaries($1::uuid[])`, [`{${CLIENT},${CLIENT2}}`]);
check(sum.length === 2 && sum.every((s) => s.review_count === 0 && s.last_review === null) && sum.some((s) => s.full_name === "Camila Cliente"), "get_client_summaries", JSON.stringify(sum));
await expectError(as(db, null, `select * from public.get_client_summaries($1::uuid[])`, [`{${CLIENT}}`]), "permission denied", "anon no puede pedir resúmenes");
