// Geocodifica los espacios que aún no tienen coordenadas (lat/lng o centro de comuna),
// respetando el límite de Nominatim (1 petición por segundo). Se corre una vez por
// ambiente después de aplicar la migración 20261105100000_space_location.sql, y se puede
// repetir: solo toca los espacios a los que les falta algo.
//
// Necesita la service_role key (lee address, que la API ya no entrega). Ponla en un
// archivo .env.* local (están en .gitignore), nunca en una variable NEXT_PUBLIC_*:
//
//   # .env.geocode.staging
//   SUPABASE_URL=https://<proyecto>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...
//
//   node --experimental-strip-types --env-file=.env.geocode.staging scripts/geocode-spaces.mjs --dry-run
//   node --experimental-strip-types --env-file=.env.geocode.staging scripts/geocode-spaces.mjs
//
// Opciones: --dry-run (no escribe), --all (vuelve a geocodificar todos).
import { createClient } from "@supabase/supabase-js";
import { buildQuery, geocode } from "../src/lib/geocode.ts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (ver el encabezado del script).");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");
const all = process.argv.includes("--all");

const supabase = createClient(url, key, { auth: { persistSession: false } });

let query = supabase
  .from("spaces")
  .select("id, title, address, commune, city, lat, lng, commune_lat, commune_lng")
  .order("created_at");
if (!all) query = query.or("lat.is.null,lng.is.null,commune_lat.is.null,commune_lng.is.null");
const { data: spaces, error } = await query;
if (error) {
  console.error(`No se pudieron leer los espacios: ${error.message}`);
  process.exit(1);
}

console.log(`${url} · ${spaces.length} espacio(s) por geocodificar${dryRun ? " (dry run)" : ""}`);

// Un centro por comuna: muchos espacios comparten comuna.
const communeCache = new Map();
let ok = 0;
let partial = 0;

for (const s of spaces) {
  const patch = {};
  if (all || s.lat == null || s.lng == null) {
    const exact = await geocode(buildQuery([s.address, s.commune, s.city]));
    if (exact) Object.assign(patch, { lat: exact.lat, lng: exact.lng });
  }
  if (all || s.commune_lat == null || s.commune_lng == null) {
    const cacheKey = `${s.commune}|${s.city}`.toLowerCase();
    if (!communeCache.has(cacheKey)) communeCache.set(cacheKey, await geocode(buildQuery([s.commune, s.city]), { settlement: true }));
    const center = communeCache.get(cacheKey);
    if (center) Object.assign(patch, { commune_lat: center.lat, commune_lng: center.lng });
  }

  const missing = [
    patch.lat == null && (all || s.lat == null) ? "punto exacto" : null,
    patch.commune_lat == null && (all || s.commune_lat == null) ? "centro de comuna" : null,
  ].filter(Boolean);
  const label = `${s.title} (${s.commune}, ${s.city})`;

  if (Object.keys(patch).length && !dryRun) {
    const { error: updateError } = await supabase.from("spaces").update(patch).eq("id", s.id);
    if (updateError) {
      console.log(`✗ ${label}: ${updateError.message}`);
      partial++;
      continue;
    }
  }
  if (missing.length) {
    partial++;
    console.log(`~ ${label}: sin ${missing.join(" ni ")}`);
  } else {
    ok++;
    console.log(`✓ ${label}`);
  }
}

console.log(`\nListo: ${ok} completo(s), ${partial} con datos faltantes${dryRun ? " · dry run: no se escribió nada" : ""}.`);
