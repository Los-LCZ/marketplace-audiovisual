import { setup, as, check } from "./harness.mjs";
import { seed, HOST } from "./fixtures.mjs";

const db = await setup();
await seed(db);

// Debe coincidir con WORLDS en src/lib/world.ts.
const EXPECTED = {
  recording_studio: "mu",
  rehearsal_room: "mu",
  filming_set: "av",
  photo_studio: "av",
  outdoor_location: "av",
};

for (const category of Object.keys(EXPECTED)) {
  await as(db, HOST, `insert into public.spaces (host_id, title, category, address, city, commune, price_per_hour)
                      values ($1, $2, $3, 'Calle 1', 'Santiago', 'Providencia', 10000)`, [HOST, `Espacio ${category}`, category]);
}

const rows = await as(db, null, `select category, world from public.space_cards where title like 'Espacio %'`);
check(rows.length === 5 && rows.every((r) => EXPECTED[r.category] === r.world), "world sale de la categoría como en world.ts", JSON.stringify(rows));

// Orden "relevance" de listPublishedSpaces: world asc pone Audiovisual primero; desc, Música.
const av = await as(db, null, `select world from public.space_cards order by world asc, created_at desc, id`);
const firstMu = av.findIndex((r) => r.world === "mu");
check(av.slice(firstMu).every((r) => r.world === "mu"), "ascendente: todo Audiovisual antes que Música");
const mu = await as(db, null, `select world from public.space_cards order by world desc, created_at desc, id`);
check(mu[0].world === "mu" && mu[mu.length - 1].world === "av", "descendente: Música primero");
