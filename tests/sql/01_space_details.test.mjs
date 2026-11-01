import { setup, as, expectError, check } from "./harness.mjs";
import { seed, chileTs, HOST, CLIENT, ADMIN, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

const book = async (who, startH, endH, days = 2) =>
  as(db, who, `insert into public.bookings (space_id, client_id, start_time, end_time) values ($1,$2,$3,$4) returning *`,
    [SPACE, who, await chileTs(db, days, startH), await chileTs(db, days, endH)]);

// Horario 09–18 hora de Chile
await expectError(book(CLIENT, 8, 10), "funciona de 09:00 a 18:00", "rechaza reserva antes de abrir");
await expectError(book(CLIENT, 17, 19), "funciona de 09:00 a 18:00", "rechaza reserva después de cerrar");
const ok = await book(CLIENT, 9, 11);
check(ok[0]?.total_hours === 2 && ok[0]?.subtotal === 40000 && ok[0]?.total_amount === 44000, "reserva dentro del horario con montos");

// close_hour 24: termina a medianoche del día siguiente
await db.exec(`update public.spaces set close_hour = 24 where id = '${SPACE}'`);
const late = await book(CLIENT, 22, 24, 3);
check(late.length === 1, "reserva que termina a las 24:00 dentro de close_hour 24");

// featured: solo admin
await expectError(as(db, HOST, `update public.spaces set featured = true where id = $1`, [SPACE]), "Solo un administrador", "anfitrión no puede destacar");
const ins = await as(db, HOST, `insert into public.spaces (host_id, title, category, address, city, commune, price_per_hour, featured)
  values ($1, 'Otro', 'photo_studio', 'x', 'Santiago', 'Ñuñoa', 10000, true) returning featured`, [HOST]);
check(ins[0].featured === false, "insert de anfitrión fuerza featured=false");
await as(db, ADMIN, `update public.spaces set featured = true where id = $1`, [SPACE]);
check((await db.query(`select featured from public.spaces where id = '${SPACE}'`)).rows[0].featured === true, "admin puede destacar");
await db.exec(`update public.spaces set featured = false where id = '${SPACE}'`);
check(true, "SQL Editor (sin JWT) puede cambiar featured");

// gear y horario
await expectError(as(db, HOST, `update public.spaces set gear = '[{"category":"cables","items":["x"]}]' where id = $1`, [SPACE]), "spaces_gear_check", "gear con categoría inválida");
await expectError(as(db, HOST, `update public.spaces set gear = '[{"category":"microfonos","items":[1]}]' where id = $1`, [SPACE]), "spaces_gear_check", "gear con item no string");
await as(db, HOST, `update public.spaces set gear = '[{"category":"microfonos","items":["SM7B","U87"]}]' where id = $1`, [SPACE]);
check(true, "gear válido aceptado");
await expectError(as(db, HOST, `update public.spaces set open_hour = 20, close_hour = 10 where id = $1`, [SPACE]), "spaces_open_hours_check", "open_hour >= close_hour rechazado");

// set_space_amenities
await as(db, HOST, `select public.set_space_amenities($1, array[1,2,3])`, [SPACE]);
await as(db, HOST, `select public.set_space_amenities($1, array[2,5])`, [SPACE]);
const am = await db.query(`select array_agg(amenity_id order by amenity_id) a from public.space_amenities where space_id = '${SPACE}'`);
check(JSON.stringify(am.rows[0].a) === "[2,5]", "set_space_amenities reemplaza el set", JSON.stringify(am.rows[0].a));
await expectError(as(db, CLIENT, `select public.set_space_amenities($1, array[1])`, [SPACE]), "Espacio no encontrado", "otro usuario no puede cambiar amenities");
