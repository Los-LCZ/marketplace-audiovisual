import { setup, as, check } from "./harness.mjs";
import { seed, HOST } from "./fixtures.mjs";

const db = await setup();
await seed(db);
await db.exec(`insert into public.spaces (host_id, title, category, address, city, commune, price_per_hour, status) values
  ('${HOST}', 'AAA', 'recording_studio', 'x', 'Santiago', 'providencia ', 15000, 'published'),
  ('${HOST}', 'BBB', 'photo_studio', 'x', 'Santiago', 'Ñuñoa', 30000, 'published'),
  ('${HOST}', 'CCC', 'photo_studio', 'x', 'Santiago', 'Las Condes', 5000, 'draft');`);

const communes = await as(db, null, `select * from public.list_communes()`);
check(communes.length === 2 && communes[0].space_count === 2 && /providencia/i.test(communes[0].commune), "comunas agrupadas sin mayúsculas y sin borradores", JSON.stringify(communes));

const asHost = await as(db, HOST, `select * from public.list_communes()`);
check(!asHost.some((c) => c.commune === "Las Condes"), "el dueño tampoco ve sus borradores en comunas");

const stats = await as(db, null, `select * from public.get_category_stats() order by category`);
const rec = stats.find((s) => s.category === "recording_studio");
const photo = stats.find((s) => s.category === "photo_studio");
check(rec.space_count === 2 && rec.min_price === 15000 && photo.space_count === 1 && photo.min_price === 30000, "stats por categoría sin borradores", JSON.stringify(stats));
