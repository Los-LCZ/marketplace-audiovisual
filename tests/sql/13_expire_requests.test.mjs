import { setup, as, expectError, check } from "./harness.mjs";
import { seed, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

// Solicitudes "viejas": se insertan sin el trigger de montos para poder ponerlas en el pasado.
async function request(id, client, startOffset) {
  await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;
    insert into public.bookings (id, space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount, status, requested_at)
    values ('${id}', '${SPACE}', '${client}', now() + interval '${startOffset}', now() + interval '${startOffset}' + interval '2 hours',
            2, 1, 0, 1, 'requested', now() - interval '3 days');
    alter table public.bookings enable trigger bookings_compute_amounts;`);
}
const PAST = "e0000000-0000-0000-0000-000000000001";
const FUTURE = "e0000000-0000-0000-0000-000000000002";
await request(PAST, CLIENT, "-1 hour");
await request(FUTURE, CLIENT2, "2 days");

// Una reserva confirmada en el pasado no se toca
await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;
  insert into public.bookings (space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount, status)
  values ('${SPACE}', '${CLIENT2}', now() - interval '5 hours', now() - interval '3 hours', 2, 1, 0, 1, 'confirmed');
  alter table public.bookings enable trigger bookings_compute_amounts;`);

const before = (await as(db, null, `select public.get_host_response_stats($1) s`, [HOST]))[0].s;
check(Number(before.response_rate) === 0, "KPI cuenta como vencida una solicitud pasada aún sin cron", JSON.stringify(before));

const n = (await db.query(`select public.expire_stale_requests() n`)).rows[0].n;
check(n === 1, "vence solo la solicitud cuyo horario ya empezó", String(n));
const rows = Object.fromEntries((await db.query(`select id, status, decided_at from public.bookings`)).rows.map((r) => [r.id, r]));
check(rows[PAST].status === "expired" && rows[PAST].decided_at === null, "queda expired y sin decided_at (no es decisión del anfitrión)");
check(rows[FUTURE].status === "requested", "la solicitud futura sigue pendiente");
check((await db.query(`select count(*)::int n from public.bookings where status = 'confirmed'`)).rows[0].n === 1, "no toca reservas confirmadas");
check((await db.query(`select public.expire_stale_requests() n`)).rows[0].n === 0, "volver a correrla no cambia nada");

const after = (await as(db, null, `select public.get_host_response_stats($1) s`, [HOST]))[0].s;
check(Number(after.response_rate) === 0 && after.decided_count === 0 && after.request_count === 2, "KPI cuenta la expired como vencida", JSON.stringify(after));

// Estado cerrado
await expectError(as(db, HOST, `update public.bookings set status = 'confirmed' where id = $1`, [PAST]), "ya está cerrada", "el anfitrión no acepta una vencida");
await expectError(as(db, CLIENT, `update public.bookings set status = 'cancelled' where id = $1`, [PAST]), "ya está cerrada", "el cliente no cancela una vencida");

// Solo la base la ejecuta
await expectError(as(db, CLIENT, `select public.expire_stale_requests()`), "permission denied", "un usuario no puede ejecutarla");
await expectError(as(db, null, `select public.expire_stale_requests()`), "permission denied", "anon no puede ejecutarla");

// El anfitrión sigue pudiendo aceptar la futura (y eso sí fija decided_at)
await as(db, HOST, `update public.bookings set status = 'confirmed' where id = $1`, [FUTURE]);
const fut = (await db.query(`select status, decided_at from public.bookings where id = '${FUTURE}'`)).rows[0];
check(fut.status === "confirmed" && fut.decided_at !== null, "aceptar una vigente fija decided_at");

