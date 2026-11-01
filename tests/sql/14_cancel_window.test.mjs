import { setup, as, expectError, check } from "./harness.mjs";
import { seed, chileTs, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

// Reservas con horario en el pasado o en curso (sin el trigger de montos).
async function booking(id, client, startOffset, endOffset, status = "confirmed") {
  await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;
    insert into public.bookings (id, space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount, status)
    values ('${id}', '${SPACE}', '${client}', now() + interval '${startOffset}', now() + interval '${endOffset}', 2, 1, 0, 1, '${status}');
    alter table public.bookings enable trigger bookings_compute_amounts;`);
}
const ENDED = "c0000000-0000-0000-0000-000000000001";
const ONGOING = "c0000000-0000-0000-0000-000000000002";
const ENDED_HOST = "c0000000-0000-0000-0000-000000000003";
await booking(ENDED, CLIENT, "-4 hours", "-2 hours");
await booking(ONGOING, CLIENT, "-1 hour", "1 hour");
await booking(ENDED_HOST, CLIENT2, "-8 hours", "-6 hours");

const MSG = "Solo puedes cancelar antes de que comience la reserva";
await expectError(as(db, CLIENT, `update public.bookings set status = 'cancelled' where id = $1`, [ENDED]), MSG, "cliente no cancela una reserva que ya terminó");
await expectError(as(db, CLIENT, `update public.bookings set status = 'cancelled' where id = $1`, [ONGOING]), MSG, "cliente no cancela una reserva en curso");
await expectError(as(db, HOST, `update public.bookings set status = 'cancelled' where id = $1`, [ENDED_HOST]), MSG, "anfitrión no cancela una reserva que ya terminó");
await expectError(as(db, HOST, `update public.bookings set status = 'cancelled' where id = $1`, [ONGOING]), MSG, "anfitrión no cancela una reserva en curso");

// Lo que sí se puede
await as(db, HOST, `update public.bookings set status = 'completed' where id = $1`, [ENDED_HOST]);
check((await db.query(`select status from public.bookings where id = '${ENDED_HOST}'`)).rows[0].status === "completed", "anfitrión completa una reserva terminada");

const future = await as(db, CLIENT2, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4) returning id`,
  [SPACE, CLIENT2, await chileTs(db, 3, 10), await chileTs(db, 3, 12)]);
await as(db, CLIENT2, `update public.bookings set status = 'cancelled' where id = $1`, [future[0].id]);
check((await db.query(`select status from public.bookings where id = '${future[0].id}'`)).rows[0].status === "cancelled", "cliente cancela una reserva futura");

const future2 = await as(db, CLIENT, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4) returning id`,
  [SPACE, CLIENT, await chileTs(db, 4, 10), await chileTs(db, 4, 12)]);
await as(db, HOST, `update public.bookings set status = 'cancelled' where id = $1`, [future2[0].id]);
check((await db.query(`select status from public.bookings where id = '${future2[0].id}'`)).rows[0].status === "cancelled", "anfitrión cancela una reserva futura");

// El SQL Editor (soporte) conserva el poder de corregir cualquier estado
await db.exec(`update public.bookings set status = 'cancelled' where id = '${ONGOING}'`);
check((await db.query(`select status from public.bookings where id = '${ONGOING}'`)).rows[0].status === "cancelled", "SQL Editor puede cancelar para soporte");
