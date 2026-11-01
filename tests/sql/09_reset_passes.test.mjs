import { setup, as, expectError, check } from "./harness.mjs";
import { seed, HOST, CLIENT, CLIENT2, SPACE } from "./fixtures.mjs";

const db = await setup();
await seed(db);
const S2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const S3 = "cccccccc-cccc-cccc-cccc-cccccccccccc";
await db.exec(`insert into public.spaces (id, host_id, title, category, address, city, commune, price_per_hour) values
  ('${S2}', '${HOST}', 'Set Sur', 'filming_set', 'x', 'Santiago', 'Ñuñoa', 50000),
  ('${S3}', '${HOST}', 'Sala Tres', 'rehearsal_room', 'x', 'Santiago', 'Macul', 8000);`);

// CLIENT: pass en SPACE (recording_studio) y S2 (filming_set), like en S3. CLIENT2: pass en SPACE.
await as(db, CLIENT, `insert into public.space_reactions (space_id, kind) values ($1,'pass'), ($2,'pass'), ($3,'like')`, [SPACE, S2, S3]);
await as(db, CLIENT2, `insert into public.space_reactions (space_id, kind) values ($1,'pass')`, [SPACE]);

const n1 = (await as(db, CLIENT, `select public.reset_passes('{filming_set}') n`))[0].n;
check(n1 === 1, "solo borra descartes de las categorías pedidas", String(n1));
const left = await as(db, CLIENT, `select space_id, kind from public.space_reactions order by kind`);
check(left.length === 2 && left.some((r) => r.kind === "like"), "no toca los me gusta ni otras categorías");

const n2 = (await as(db, CLIENT, `select public.reset_passes() n`))[0].n;
check(n2 === 1, "sin categorías borra todos los descartes restantes");
check((await as(db, CLIENT, `select * from public.space_reactions`)).length === 1, "queda solo el me gusta");
check((await as(db, CLIENT2, `select * from public.space_reactions`)).length === 1, "no toca reacciones de otro usuario");
await expectError(as(db, null, `select public.reset_passes()`), "permission denied", "anon no puede");
