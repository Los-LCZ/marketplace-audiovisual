import { setup, as, expectError, check } from "./harness.mjs";
import { seed, chileTs, chileDate, CLIENT, HOST, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

const insert = `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4) returning id`;

// Último día reservable: el mismo que el último día que se puede cerrar
const last = await as(db, CLIENT, insert, [SPACE, CLIENT, await chileTs(db, 366, 10), await chileTs(db, 366, 12)]);
check(last.length === 1, "se reserva hasta un año adelante");

await expectError(
  as(db, CLIENT, insert, [SPACE, CLIENT, await chileTs(db, 367, 10), await chileTs(db, 367, 12)]),
  "próximo año", "no se reserva más allá de un año");

await expectError(
  as(db, CLIENT, insert, [SPACE, CLIENT, await chileTs(db, 800, 10), await chileTs(db, 800, 12)]),
  "próximo año", "no se reserva a años de distancia");

// El anfitrión puede cerrar cualquier día reservable (sin reservas activas ese día)
await as(db, HOST, `insert into public.space_blackouts (space_id, date) values ($1, $2)`, [SPACE, await chileDate(db, 365)]);
check(true, "el último tramo reservable también se puede cerrar");

// Contexto de confianza (SQL Editor / service_role) no tiene el límite
await db.query(insert, [SPACE, CLIENT, await chileTs(db, 500, 10), await chileTs(db, 500, 12)]);
check(true, "el SQL Editor puede cargar reservas lejanas");
