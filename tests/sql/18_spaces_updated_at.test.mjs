import { setup, as, check } from "./harness.mjs";
import { seed, HOST, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);

const OLD = "2000-01-01T00:00:00Z";

// Deja updated_at en una fecha vieja sin pasar por los triggers.
async function resetStamp() {
  await db.query(`set session_replication_role = replica`);
  await db.query(`update public.spaces set updated_at = $1 where id = $2`, [OLD, SPACE]);
  await db.query(`set session_replication_role = origin`);
}
async function stamp() {
  return (await db.query(`select updated_at from public.spaces where id = $1`, [SPACE])).rows[0].updated_at;
}
const isOld = (t) => new Date(t).getTime() === new Date(OLD).getTime();

check(!isOld(await stamp()), "un espacio nuevo tiene updated_at");

await resetStamp();
await as(db, HOST, `update public.spaces set title = 'Título nuevo' where id = $1`, [SPACE]);
check(!isOld(await stamp()), "editar el espacio renueva updated_at");

await resetStamp();
await as(db, HOST, `update public.spaces set images = array['https://x.supabase.co/a.jpg'] where id = $1`, [SPACE]);
check(!isOld(await stamp()), "cambiar las fotos renueva updated_at");

await resetStamp();
await as(db, HOST, `update public.spaces set title = title where id = $1`, [SPACE]);
check(isOld(await stamp()), "un update sin cambios no la renueva");

await resetStamp();
await as(db, HOST, `update public.spaces set updated_at = '1999-01-01' where id = $1`, [SPACE]);
check(!isOld(await stamp()) && new Date(await stamp()).getFullYear() > 2000, "no se puede fijar a mano");

await resetStamp();
await as(db, HOST, `select public.set_space_amenities($1, array[1,2])`, [SPACE]);
check(!isOld(await stamp()), "cambiar amenities renueva updated_at");

await resetStamp();
await as(db, HOST, `delete from public.space_amenities where space_id = $1 and amenity_id = 1`, [SPACE]);
check(!isOld(await stamp()), "quitar una amenity renueva updated_at");

// space_cards expone la columna
const card = await as(db, null, `select updated_at from public.space_cards where id = $1`, [SPACE]);
check(card.length === 1 && card[0].updated_at, "space_cards incluye updated_at");

// Borrar el espacio (cascada a amenities) no falla por el trigger
await as(db, HOST, `delete from public.spaces where id = $1`, [SPACE]);
check((await db.query(`select 1 from public.spaces where id = $1`, [SPACE])).rows.length === 0, "borrar el espacio sigue funcionando");
