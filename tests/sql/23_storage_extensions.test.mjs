import { setup, as, expectError, check } from "./harness.mjs";
import { seed, HOST, CLIENT } from "./fixtures.mjs";

// B-07: en Storage solo se suben (o renombran a) archivos con extensión de imagen.
const db = await setup();
await seed(db);

const SPACE = "11111111-1111-4111-8111-111111111111";
const insert = (user, bucket, name) =>
  as(db, user, `insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, name]);

// space-images
for (const ext of ["jpg", "jpeg", "png", "webp", "avif", "JPG"]) {
  await insert(HOST, "space-images", `${HOST}/${SPACE}/foto-${ext}.${ext}`);
  check(true, `space-images acepta .${ext}`);
}
for (const name of ["x.html", "x.svg", "x.js", "x.jpg.html", "sin-extension", "x.gif"]) {
  await expectError(insert(HOST, "space-images", `${HOST}/${SPACE}/${name}`), "row-level security", `space-images rechaza ${name}`);
}
// La regla de la carpeta propia se mantiene
await expectError(insert(CLIENT, "space-images", `${HOST}/${SPACE}/ajena.jpg`), "row-level security", "space-images: no sube en la carpeta de otro");

// avatars (sin avif, igual que el bucket)
for (const ext of ["jpg", "jpeg", "png", "webp"]) {
  await insert(CLIENT, "avatars", `${CLIENT}/a.${ext}`);
  check(true, `avatars acepta .${ext}`);
}
for (const name of ["a.avif", "a.html", "a.svg"]) {
  await expectError(insert(CLIENT, "avatars", `${CLIENT}/${name}`), "row-level security", `avatars rechaza ${name}`);
}

// Renombrar (update) a una extensión que no es de imagen
await expectError(
  as(db, HOST, `update storage.objects set name = $1 where name = $2`, [`${HOST}/${SPACE}/foto.html`, `${HOST}/${SPACE}/foto-jpg.jpg`]),
  "row-level security",
  "space-images: no renombra a .html",
);
await expectError(
  as(db, CLIENT, `update storage.objects set name = $1 where name = $2`, [`${CLIENT}/a.svg`, `${CLIENT}/a.png`]),
  "row-level security",
  "avatars: no renombra a .svg",
);
const renamed = await as(db, CLIENT, `update storage.objects set name = $1 where name = $2 returning id`, [`${CLIENT}/b.webp`, `${CLIENT}/a.png`]);
check(renamed.length === 1, "avatars: renombra entre extensiones de imagen");
