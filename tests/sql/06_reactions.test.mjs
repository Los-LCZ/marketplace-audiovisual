import { setup, as, expectError, check } from "./harness.mjs";
import { seed, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);
const S2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const S3 = "cccccccc-cccc-cccc-cccc-cccccccccccc";
await db.exec(`insert into public.spaces (id, host_id, title, category, address, city, commune, price_per_hour, featured) values
  ('${S2}', '${HOST}', 'Set Sur', 'filming_set', 'x', 'Santiago', 'Ñuñoa', 50000, true),
  ('${S3}', '${CLIENT}', 'Sala del cliente', 'rehearsal_room', 'x', 'Santiago', 'Macul', 8000, false);`);

const deck = async (who, cats = null) =>
  (await as(db, who, `select * from public.get_discover_deck($1::public.space_category[], 10)`, [cats ? `{${cats.join(",")}}` : null]));

let d = await deck(CLIENT);
check(d.length === 2 && d[0].space_id === S2, "mazo: excluye propios y destacados primero", JSON.stringify(d.map((x) => x.space_id)));
check(d.every((x) => x.is_match === true), "sin nota mínima => match");

await as(db, CLIENT, `insert into public.space_reactions (space_id, kind) values ($1, 'like')`, [S2]);
await as(db, CLIENT, `insert into public.space_reactions (space_id, kind) values ($1, 'pass')`, [SPACE]);
check((await deck(CLIENT)).length === 0, "mazo excluye espacios ya reaccionados");
check((await deck(CLIENT2)).length === 3, "las reacciones son por usuario");

// upsert (cambiar de pass a like) y deshacer
await as(db, CLIENT, `insert into public.space_reactions (space_id, kind) values ($1, 'like') on conflict (user_id, space_id) do update set kind = excluded.kind, created_at = now()`, [SPACE]);
const likes = await as(db, CLIENT, `select space_id from public.space_reactions where kind = 'like' order by created_at desc`);
check(likes.length === 2, "upsert cambia pass por like");
await as(db, CLIENT, `delete from public.space_reactions where space_id = $1`, [SPACE]);
check((await deck(CLIENT)).some((x) => x.space_id === SPACE), "deshacer devuelve el espacio al mazo");

// RLS: no se ven ni crean reacciones ajenas
check((await as(db, CLIENT2, `select * from public.space_reactions`)).length === 0, "no ve reacciones ajenas");
await expectError(as(db, CLIENT2, `insert into public.space_reactions (user_id, space_id, kind) values ($1, $2, 'like')`, [CLIENT, SPACE]), "row-level security", "no crea reacciones a nombre de otro");
await expectError(as(db, null, `select * from public.get_discover_deck(null, 10)`), "permission denied", "anon no puede pedir el mazo");

// match con nota mínima
await db.exec(`update public.profiles set min_client_rating = 4 where id = '${HOST}'`);
d = await deck(CLIENT2);
check(d.filter((x) => x.host_min_client_rating !== null).every((x) => x.is_match === false), "con mínimo y sin reseñas => no match");
