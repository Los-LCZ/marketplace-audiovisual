import { setup, as, expectError, check } from "./harness.mjs";
import { seed, chileTs, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

const stats = async () => (await as(db, null, `select public.get_host_response_stats($1) s`, [HOST]))[0].s;
let s = await stats();
check(s.request_count === 0 && s.median_response_minutes === null && s.response_rate === null, "sin solicitudes => nulls", JSON.stringify(s));

// Con mínimo, las reservas de clientes sin nota nacen requested y marcan requested_at
await db.exec(`update public.profiles set min_client_rating = 4 where id = '${HOST}'`);
const book = async (who, s0, e0, days) =>
  (await as(db, who, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4) returning id, status, requested_at`,
    [SPACE, who, await chileTs(db, days, s0), await chileTs(db, days, e0)]))[0];
const r1 = await book(CLIENT, 9, 11, 2);
check(r1.status === "requested" && r1.requested_at !== null, "la solicitud fija requested_at");
await expectError(as(db, CLIENT, `update public.bookings set requested_at = now() - interval '1 day' where id = $1`, [r1.id]), "Solo se puede modificar el estado", "requested_at inmutable para usuarios");

// Confirmada directa: sin requested_at aunque el cliente intente enviarlo
await db.exec(`update public.profiles set min_client_rating = null where id = '${HOST}'`);
const c1 = (await as(db, CLIENT2, `insert into public.bookings (space_id, client_id, start_time, end_time, requested_at) values ($1,$2,$3,$4, now()) returning status, requested_at`,
  [SPACE, CLIENT2, await chileTs(db, 3, 9), await chileTs(db, 3, 11)]))[0];
check(c1.status === "confirmed" && c1.requested_at === null, "reserva confirmada no tiene requested_at");

// Escenario controlado (como SQL Editor): decidida en 30 min, decidida en 90 min, vencida, cancelada por el cliente
await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;
  insert into public.bookings (space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount, status, requested_at, decided_at) values
   ('${SPACE}', '${CLIENT}', now() + interval '5 days', now() + interval '5 days 2 hours', 2,1,0,1, 'confirmed', now() - interval '2 days', now() - interval '2 days' + interval '30 minutes'),
   ('${SPACE}', '${CLIENT}', now() + interval '6 days', now() + interval '6 days 2 hours', 2,1,0,1, 'rejected',  now() - interval '3 days', now() - interval '3 days' + interval '90 minutes'),
   ('${SPACE}', '${CLIENT2}', now() - interval '1 day', now() - interval '1 day' + interval '2 hours', 2,1,0,1, 'requested', now() - interval '4 days', null),
   ('${SPACE}', '${CLIENT2}', now() + interval '7 days', now() + interval '7 days 2 hours', 2,1,0,1, 'cancelled', now() - interval '1 day', null),
   ('${SPACE}', '${CLIENT2}', now() + interval '8 days', now() + interval '8 days 2 hours', 2,1,0,1, 'confirmed', now() - interval '200 days', now() - interval '199 days');
  alter table public.bookings enable trigger bookings_compute_amounts;`);
s = await stats();
// decididas: 2 (30 y 90 min) => mediana 60; vencidas: 1 => rate 2/3 = 0.67; r1 vigente no cuenta; la de hace 200 días queda fuera
check(s.median_response_minutes === 60, "mediana de minutos de respuesta", JSON.stringify(s));
check(Number(s.response_rate) === 0.67, "tasa: decididas a tiempo / (decididas + vencidas)", JSON.stringify(s));
check(s.request_count === 5 && s.decided_count === 2, "conteos de los últimos 90 días", JSON.stringify(s));
