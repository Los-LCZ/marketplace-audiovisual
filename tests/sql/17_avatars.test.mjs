import { setup, as, expectError, check } from "./harness.mjs";
import { seed, HOST, CLIENT } from "./fixtures.mjs";

const db = await setup();
await seed(db);

const bucket = (await db.query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars'`)).rows[0];
check(bucket?.public === true && Number(bucket.file_size_limit) === 2097152 && bucket.allowed_mime_types.length === 3, "bucket avatars público, 2 MB, 3 formatos");

// Storage: cada usuario solo en su carpeta
await as(db, CLIENT, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${CLIENT}/foto.jpg`]);
check(true, "sube su foto a su propia carpeta");
await expectError(as(db, CLIENT, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${HOST}/foto.jpg`]), "row-level security", "no sube en la carpeta de otro");
await expectError(as(db, CLIENT, `insert into storage.objects (bucket_id, name) values ('avatars', 'foto.jpg')`), "row-level security", "no sube fuera de una carpeta propia");
const delOther = await as(db, HOST, `delete from storage.objects where bucket_id = 'avatars' and name = $1 returning id`, [`${CLIENT}/foto.jpg`]);
check(delOther.length === 0, "no borra la foto de otro");
check((await as(db, null, `select name from storage.objects where bucket_id = 'avatars'`)).length === 1, "las fotos son de lectura pública");
const delOwn = await as(db, CLIENT, `delete from storage.objects where bucket_id = 'avatars' and name = $1 returning id`, [`${CLIENT}/foto.jpg`]);
check(delOwn.length === 1, "borra su propia foto");

// avatar_url: solo URLs del bucket avatars de Supabase
const ok = "https://lyrwiuqpwgvwjlfmsvfj.supabase.co/storage/v1/object/public/avatars/" + CLIENT + "/a.jpg";
await as(db, CLIENT, `update public.profiles set avatar_url = $1 where id = $2`, [ok, CLIENT]);
check((await as(db, null, `select avatar_url from public.public_profiles where id = $1`, [CLIENT]))[0].avatar_url === ok, "guarda una URL del bucket y se ve en el perfil público");
for (const bad of [
  "https://evil.example.com/a.jpg",
  "https://abc.supabase.co/storage/v1/object/public/space-images/a.jpg",
  "http://abc.supabase.co/storage/v1/object/public/avatars/a.jpg",
  "javascript:alert(1)",
]) {
  await expectError(as(db, CLIENT, `update public.profiles set avatar_url = $1 where id = $2`, [bad, CLIENT]), "profiles_avatar_url_check", `rechaza ${bad.slice(0, 40)}`);
}
await as(db, CLIENT, `update public.profiles set avatar_url = null where id = $1`, [CLIENT]);
check(true, "puede quitar su foto");
