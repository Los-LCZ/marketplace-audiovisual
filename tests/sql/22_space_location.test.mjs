import { setup, as, expectError, check } from "./harness.mjs";
import { seed, chileTs, HOST, CLIENT, CLIENT2, ADMIN, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

// Espacio de la fixture: dirección oculta, con punto exacto y centro de comuna.
await db.exec(`update public.spaces
  set hide_address = true, lat = -33.4263, lng = -70.6107, commune_lat = -33.4314, commune_lng = -70.6093
  where id = '${SPACE}'`);

// Otro espacio con la dirección a la vista, y un borrador oculto.
const OPEN = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const DRAFT = "cccccccc-cccc-cccc-cccc-cccccccccccc";
await db.exec(`insert into public.spaces (id, host_id, title, category, address, city, commune, price_per_hour,
    lat, lng, commune_lat, commune_lng, hide_address, status) values
  ('${OPEN}', '${HOST}', 'Set Sur', 'filming_set', 'Avenida 2', 'Santiago', 'Ñuñoa', 30000, -33.45, -70.6, -33.46, -70.59, false, 'published'),
  ('${DRAFT}', '${HOST}', 'Borrador', 'photo_studio', 'Pasaje 3', 'Santiago', 'Ñuñoa', 10000, -33.45, -70.6, -33.46, -70.59, true, 'draft')`);

const loc = async (who, id = SPACE) =>
  (await as(db, who, `select * from public.space_locations where space_id = $1`, [id]))[0];
const card = async (who, id = SPACE) =>
  (await as(db, who, `select address, map_lat, map_lng, address_hidden from public.space_cards where id = $1`, [id]))[0];

// --- La tabla no entrega dirección ni coordenadas exactas a la API ---
for (const [who, label] of [[null, "anon"], [CLIENT, "cliente"], [HOST, "anfitrión"]]) {
  await expectError(as(db, who, `select address from public.spaces where id = $1`, [SPACE]), "permission denied", `${label}: no lee spaces.address`);
  await expectError(as(db, who, `select lat, lng from public.spaces where id = $1`, [SPACE]), "permission denied", `${label}: no lee spaces.lat/lng`);
}
await expectError(as(db, null, `select * from public.spaces`), "permission denied", "anon: select * sobre spaces falla");
await expectError(as(db, null, `select id from public.spaces where address like 'Calle%'`), "permission denied", "anon: no puede filtrar por address");
const pub = await as(db, null, `select id, title, commune, hide_address, commune_lat from public.spaces where id = $1`, [SPACE]);
check(pub.length === 1 && pub[0].hide_address === true, "anon sigue leyendo las demás columnas de spaces");

// --- anon: dirección oculta => null y centro de la comuna ---
const a = await loc(null);
check(a.address === null && a.address_hidden === true, "anon no recibe la dirección oculta (space_locations)");
check(a.map_lat === -33.4314 && a.map_lng === -70.6093, "anon ve el centro de la comuna, no el punto exacto");
const ac = await card(null);
check(ac.address === null && ac.address_hidden === true && ac.map_lat === -33.4314, "anon no recibe la dirección oculta (space_cards)");
check((await as(db, null, `select id from public.space_cards where address = 'Calle 1' or map_lat = -33.4263`)).length === 0,
  "anon no encuentra el espacio filtrando por la dirección o el punto exacto");

// --- Dirección a la vista: todos la ven, con el punto exacto ---
const o = await card(null, OPEN);
check(o.address === "Avenida 2" && o.address_hidden === false && o.map_lat === -33.45 && o.map_lng === -70.6, "dirección no oculta: anon ve dirección y punto exacto");

// --- Cliente sin reserva, con solicitud pendiente y con reserva confirmada ---
check((await loc(CLIENT)).address === null, "cliente sin reserva no ve la dirección");

await db.exec(`update public.profiles set min_client_rating = 4 where id = '${HOST}'`);
const req = (await as(db, CLIENT2, `insert into public.bookings (space_id, client_id, start_time, end_time)
  values ($1, $2, $3, $4) returning id, status`, [SPACE, CLIENT2, await chileTs(db, 3, 10), await chileTs(db, 3, 12)]))[0];
check(req.status === "requested", "(prep) la reserva de CLIENT2 queda como solicitud");
check((await loc(CLIENT2)).address === null, "cliente con solicitud pendiente aún no ve la dirección");
await db.exec(`update public.profiles set min_client_rating = null where id = '${HOST}'`);

const conf = (await as(db, CLIENT, `insert into public.bookings (space_id, client_id, start_time, end_time)
  values ($1, $2, $3, $4) returning id, status`, [SPACE, CLIENT, await chileTs(db, 2, 10), await chileTs(db, 2, 12)]))[0];
check(conf.status === "confirmed", "(prep) la reserva de CLIENT queda confirmada");
const c = await loc(CLIENT);
check(c.address === "Calle 1" && c.address_hidden === false, "cliente con reserva confirmada recibe la dirección");
check(c.map_lat === -33.4263 && c.map_lng === -70.6107, "cliente con reserva confirmada recibe el punto exacto");
check((await card(CLIENT)).address === "Calle 1", "cliente con reserva confirmada la recibe también en space_cards");
check((await card(CLIENT2)).address === null, "otro cliente sigue sin verla");

await as(db, HOST, `update public.bookings set status = 'confirmed' where id = $1`, [req.id]);
check((await loc(CLIENT2)).address === "Calle 1", "al aceptar la solicitud el cliente pasa a ver la dirección");

await as(db, CLIENT, `update public.bookings set status = 'cancelled' where id = $1`, [conf.id]);
check((await loc(CLIENT)).address === null, "si cancela, deja de verla");

// --- Anfitrión y admin ---
const h = await loc(HOST);
check(h.address === "Calle 1" && h.address_hidden === false && h.map_lat === -33.4263, "el anfitrión ve su dirección y su punto exacto");
check((await loc(HOST, DRAFT))?.address === "Pasaje 3", "el anfitrión ve la dirección de su borrador");
check((await loc(ADMIN)).address === "Calle 1", "un admin ve la dirección");
check((await loc(null, DRAFT)) === undefined && (await loc(CLIENT, DRAFT)) === undefined, "nadie más ve la fila de un borrador");

// --- Sin geocodificar: map null; dirección visible sin punto exacto => centro de comuna ---
await db.exec(`update public.spaces set lat = null, lng = null where id = '${OPEN}'`);
const o2 = await card(null, OPEN);
check(o2.map_lat === -33.46 && o2.map_lng === -70.59, "dirección visible sin punto exacto: cae en el centro de la comuna");
await db.exec(`update public.spaces set commune_lat = null, commune_lng = null where id = '${OPEN}'`);
check((await card(null, OPEN)).map_lat === null, "sin geocodificar: map_lat null");

// --- Escritura: el anfitrión sigue pudiendo crear y editar con dirección ---
await as(db, HOST, `update public.spaces set hide_address = false where id = $1`, [SPACE]);
check((await loc(CLIENT)).address === "Calle 1", "el anfitrión puede desactivar el ocultamiento");
await expectError(as(db, CLIENT, `update public.spaces set hide_address = false where id = $1 returning id`, [DRAFT]).then((r) => {
  if (!r.length) throw new Error("sin filas (RLS)");
}), "sin filas", "otro usuario no puede cambiar hide_address");
const ins = await as(db, HOST, `insert into public.spaces (host_id, title, category, address, city, commune, price_per_hour, hide_address, lat, lng)
  values ($1, 'Nuevo', 'rehearsal_room', 'Calle 9', 'Santiago', 'Maipú', 15000, true, -33.5, -70.75) returning id`, [HOST]);
check(ins.length === 1, "el anfitrión crea un espacio con dirección oculta");

// --- Cambiar la dirección sin coordenadas nuevas borra las viejas ---
const coords = async (id) => (await db.query(`select lat, lng, commune_lat, commune_lng from public.spaces where id = $1`, [id])).rows[0];
await as(db, HOST, `update public.spaces set address = 'Calle 10' where id = $1`, [ins[0].id]);
let k = await coords(ins[0].id);
check(k.lat === null && k.lng === null, "cambiar la dirección sin coordenadas nuevas borra lat/lng");
await as(db, HOST, `update public.spaces set address = 'Calle 11', lat = -33.51, lng = -70.76, commune_lat = -33.52, commune_lng = -70.77 where id = $1`, [ins[0].id]);
k = await coords(ins[0].id);
check(k.lat === -33.51 && k.commune_lat === -33.52, "con coordenadas nuevas en el mismo update se guardan");
await as(db, HOST, `update public.spaces set address = 'Calle 12' where id = $1`, [ins[0].id]);
k = await coords(ins[0].id);
check(k.lat === null && k.commune_lat === -33.52, "cambiar solo la dirección conserva el centro de la comuna");
await as(db, HOST, `update public.spaces set commune = 'Pudahuel' where id = $1`, [ins[0].id]);
k = await coords(ins[0].id);
check(k.commune_lat === null, "cambiar la comuna borra su centro");
await as(db, HOST, `update public.spaces set title = 'Nuevo nombre', commune_lat = -33.44, commune_lng = -70.78 where id = $1`, [ins[0].id]);
check((await coords(ins[0].id)).commune_lat === -33.44, "un update sin tocar la dirección no borra nada");
