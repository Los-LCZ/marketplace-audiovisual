import { setup, as, expectError, check } from "./harness.mjs";
import { seed, HOST, CLIENT, ADMIN } from "./fixtures.mjs";

const db = await setup();
await seed(db);

// El dueño edita sus campos públicos y su nota mínima
await as(db, HOST, `update public.profiles set headline = 'Productora', tags = '{rock,jazz}', min_client_rating = 4.5 where id = $1`, [HOST]);
const pub = await as(db, null, `select * from public.public_profiles where id = $1`, [HOST]);
check(pub[0].headline === "Productora" && pub[0].tags.length === 2 && Number(pub[0].min_client_rating) === 4.5, "vista pública con campos nuevos (anon)");
check(!("phone" in pub[0]), "vista pública sin teléfono");

await expectError(as(db, HOST, `update public.profiles set verified = true where id = $1`, [HOST]), "Solo un administrador", "no puede auto-verificarse");
await expectError(as(db, HOST, `update public.profiles set role = 'admin' where id = $1`, [HOST]), "No tienes permisos", "no puede cambiarse el rol");
await expectError(as(db, HOST, `update public.profiles set min_client_rating = 6 where id = $1`, [HOST]), "check constraint", "nota mínima fuera de rango");
await expectError(as(db, HOST, `update public.profiles set tags = array_fill('x'::text, array[13]) where id = $1`, [HOST]), "check constraint", "máximo 12 etiquetas");

await as(db, ADMIN, `update public.profiles set verified = true where id = $1`, [HOST]);
check((await db.query(`select verified from public.profiles where id = '${HOST}'`)).rows[0].verified, "admin puede verificar");

// SQL Editor (sin JWT) puede ascender a admin: corrige init.sql
await db.exec(`update public.profiles set role = 'admin' where id = '${CLIENT}'`);
check((await db.query(`select role from public.profiles where id = '${CLIENT}'`)).rows[0].role === "admin", "SQL Editor puede cambiar rol");

// Otro usuario no ve el teléfono ajeno en profiles
const other = await as(db, HOST, `select phone from public.profiles where id = $1`, [ADMIN]);
check(other.length === 0, "profiles sigue privado para terceros");
