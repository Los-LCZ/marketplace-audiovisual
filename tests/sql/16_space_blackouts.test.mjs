import { setup, as, expectError, check } from "./harness.mjs";
import { seed, chileTs, chileDate, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

const d3 = await chileDate(db, 3);
const d4 = await chileDate(db, 4);
const yesterday = await chileDate(db, -1);

// Cerrar días: solo el dueño, no en el pasado, no más allá de un año
await as(db, HOST, `insert into public.space_blackouts (space_id, date, reason) values ($1, $2, 'Vacaciones')`, [SPACE, d3]);
check(true, "el anfitrión cierra un día futuro");
await expectError(as(db, CLIENT, `insert into public.space_blackouts (space_id, date) values ($1, $2)`, [SPACE, d4]), "row-level security", "otro usuario no puede cerrar días");
await expectError(as(db, HOST, `insert into public.space_blackouts (space_id, date) values ($1, $2)`, [SPACE, yesterday]), "ya pasó", "no se cierra un día pasado");
await expectError(as(db, HOST, `insert into public.space_blackouts (space_id, date) values ($1, (current_date + 400))`, [SPACE]), "próximo año", "no más allá de un año");
await expectError(as(db, HOST, `insert into public.space_blackouts (space_id, date) values ($1, $2)`, [SPACE, d3]), "duplicate key|unique", "no se cierra dos veces el mismo día");

// El motivo es privado; las fechas son públicas vía RPC
check((await as(db, CLIENT, `select * from public.space_blackouts`)).length === 0, "el motivo no es visible para otros");
const pub = await as(db, null, `select public.get_space_blackout_dates($1, current_date, current_date + 30) d`, [SPACE]);
check(pub.length === 1 && String(pub[0].d).length > 0, "las fechas cerradas son públicas (sin motivo)");

// No se reserva en un día cerrado
await expectError(
  as(db, CLIENT, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4)`,
    [SPACE, CLIENT, await chileTs(db, 3, 10), await chileTs(db, 3, 12)]),
  "cerró este espacio ese día", "no se reserva en un día cerrado");

// Horarios ocupados: el día cerrado aparece completo
const slots = await as(db, null, `select * from public.get_space_busy_slots($1, now(), now() + interval '10 days')`, [SPACE]);
const hours = slots.map((s) => (new Date(s.end_time) - new Date(s.start_time)) / 3600000);
check(slots.length === 1 && hours[0] >= 23 && hours[0] <= 25, "el día cerrado sale como ocupado completo", JSON.stringify(hours));

// Disponibilidad: excluye el día cerrado, no los demás
const avail = async (d) => (await as(db, null, `select public.get_available_space_ids($1::date) id`, [d])).map((r) => r.id);
check(!(await avail(d3)).includes(SPACE) && (await avail(d4)).includes(SPACE), "la disponibilidad excluye solo el día cerrado");

// No se cierra un día con reservas o solicitudes activas
await as(db, CLIENT, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4)`,
  [SPACE, CLIENT, await chileTs(db, 4, 10), await chileTs(db, 4, 12)]);
await expectError(as(db, HOST, `insert into public.space_blackouts (space_id, date) values ($1, $2)`, [SPACE, d4]), "ya tiene reservas", "no se cierra un día con reservas");

// No se acepta una solicitud en un día que se cerró después
const d5 = await chileDate(db, 5);
await db.exec(`update public.profiles set min_client_rating = 4 where id = '${HOST}'`);
const req = await as(db, CLIENT2, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4) returning id, status`,
  [SPACE, CLIENT2, await chileTs(db, 5, 10), await chileTs(db, 5, 12)]);
check(req[0].status === "requested", "la solicitud queda pendiente");
await expectError(as(db, HOST, `insert into public.space_blackouts (space_id, date) values ($1, $2)`, [SPACE, d5]), "ya tiene reservas", "tampoco se cierra un día con solicitudes");
// Forzado como soporte (SQL Editor) y luego intentar aceptar
await db.exec(`insert into public.space_blackouts (space_id, date) values ('${SPACE}', '${d5}')`);
await expectError(as(db, HOST, `update public.bookings set status = 'confirmed' where id = $1`, [req[0].id]), "cerró este espacio ese día", "no se acepta una solicitud en un día cerrado");
await as(db, HOST, `update public.bookings set status = 'rejected' where id = $1`, [req[0].id]);
check(true, "sí se puede rechazarla");

// Reabrir: el dueño borra el cierre
const del = await as(db, HOST, `delete from public.space_blackouts where space_id = $1 and date = $2 returning id`, [SPACE, d3]);
check(del.length === 1 && (await avail(d3)).includes(SPACE), "reabrir el día lo vuelve a dejar disponible");
