/**
 * Geocodificación de espacios con Nominatim (OpenStreetMap), solo en el servidor.
 *
 * Política de uso de Nominatim: máximo 1 petición por segundo y un User-Agent que
 * identifique la aplicación (NOMINATIM_USER_AGENT; hay uno por defecto). Si algo falla
 * (red, timeout, sin resultados) se devuelve null y el espacio se guarda igual.
 * Sin dependencias de Next para poder probarlo con node --test.
 */

export type LatLng = { lat: number; lng: number };

export type SpaceCoords = {
  lat: number | null;
  lng: number | null;
  commune_lat: number | null;
  commune_lng: number | null;
};

const ENDPOINT = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ?? "senal-marketplace/1.0 (+https://github.com/Los-LCZ/marketplace-audiovisual)";
const MIN_INTERVAL_MS = 1100;
const TIMEOUT_MS = 5000;

/** Texto de búsqueda: "dirección, comuna, ciudad, Chile" sin partes vacías ni repetidas. */
export function buildQuery(parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const part of [...parts, "Chile"]) {
    const value = part?.replace(/\s+/g, " ").trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    clean.push(value);
  }
  return clean.join(", ");
}

/** Primer resultado válido de una respuesta de Nominatim (jsonv2), o null. */
export function parseResult(body: unknown): LatLng | null {
  if (!Array.isArray(body) || !body.length) return null;
  const lat = Number(body[0]?.lat);
  const lng = Number(body[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Cola global del proceso: las peticiones salen de a una, separadas por MIN_INTERVAL_MS.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Geocodifica un texto libre dentro de Chile. null si no hay resultado o algo falla.
 * `settlement: true` busca solo ciudades/comunas: sin eso "Providencia, Santiago" puede
 * caer en una calle llamada Providencia en vez del centro de la comuna.
 */
export async function geocode(
  query: string,
  options: { settlement?: boolean } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<LatLng | null> {
  if (!query) return null;
  const url = new URL(ENDPOINT);
  const params: Record<string, string> = { q: query, format: "jsonv2", limit: "1", countrycodes: "cl" };
  if (options.settlement) params.featureType = "settlement";
  url.search = new URLSearchParams(params).toString();
  try {
    return await throttled(async () => {
      const res = await fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "es" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
      return parseResult(await res.json());
    });
  } catch (e) {
    console.error(`geocode: "${query}": ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/**
 * Punto exacto (dirección + comuna + ciudad) y centro de la comuna.
 * `exact: false` o `commune: false` se saltan esa búsqueda (devuelven null en esos campos).
 */
export async function geocodeSpace(
  place: { address: string; commune: string; city: string },
  which: { exact?: boolean; commune?: boolean } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<SpaceCoords> {
  const exact =
    which.exact === false ? null : await geocode(buildQuery([place.address, place.commune, place.city]), {}, fetchImpl);
  const commune =
    which.commune === false ? null : await geocode(buildQuery([place.commune, place.city]), { settlement: true }, fetchImpl);
  return {
    lat: exact?.lat ?? null,
    lng: exact?.lng ?? null,
    commune_lat: commune?.lat ?? null,
    commune_lng: commune?.lng ?? null,
  };
}
