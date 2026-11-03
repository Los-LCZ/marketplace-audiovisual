import { setup, as, expectError, check } from "./harness.mjs";
import { seed, HOST, CLIENT, CLIENT2 } from "./fixtures.mjs";

const db = await setup();
await seed(db);

const roleOf = async (id) => (await db.query(`select role from public.profiles where id = $1`, [id])).rows[0].role;

// Un cliente puede pasarse a anfitrión
await as(db, CLIENT, `update public.profiles set role = 'host' where id = $1`, [CLIENT]);
check((await roleOf(CLIENT)) === "host", "el cliente se convierte en anfitrión");

// Pero no a admin, ni de vuelta a cliente
await expectError(as(db, CLIENT, `update public.profiles set role = 'admin' where id = $1`, [CLIENT]), "No tienes permisos", "no puede hacerse admin");
await expectError(as(db, CLIENT, `update public.profiles set role = 'client' where id = $1`, [CLIENT]), "No tienes permisos", "un anfitrión no vuelve a cliente solo");
await expectError(as(db, CLIENT2, `update public.profiles set role = 'admin' where id = $1`, [CLIENT2]), "No tienes permisos", "un cliente no puede hacerse admin");
await expectError(as(db, HOST, `update public.profiles set role = 'admin' where id = $1`, [HOST]), "No tienes permisos", "un anfitrión no puede hacerse admin");

// Tampoco puede cambiar el rol de otro (RLS no deja tocar perfiles ajenos)
await as(db, CLIENT, `update public.profiles set role = 'host' where id = $1`, [CLIENT2]);
check((await roleOf(CLIENT2)) === "client", "no cambia el rol de otro usuario");

// Verificado sigue protegido
await expectError(as(db, CLIENT2, `update public.profiles set verified = true where id = $1`, [CLIENT2]), "verificar", "verified sigue protegido");
