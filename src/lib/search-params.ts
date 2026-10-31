import type { SpaceFilters } from "@/lib/queries/spaces";
import { isSpaceCategory } from "@/lib/labels";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

export function allParams(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
}

function positiveInt(value: string | undefined) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

// Search params de la URL del listado (?q=&category=&city=&commune=&min=&max=&amenity=&page=).
export function parseSpaceFilters(params: RawSearchParams): SpaceFilters {
  const category = firstParam(params.category);
  return {
    q: firstParam(params.q),
    category: isSpaceCategory(category) ? category : undefined,
    city: firstParam(params.city),
    commune: firstParam(params.commune),
    minPrice: positiveInt(firstParam(params.min)),
    maxPrice: positiveInt(firstParam(params.max)),
    amenityIds: allParams(params.amenity).map(Number).filter((n) => Number.isInteger(n) && n > 0),
    page: positiveInt(firstParam(params.page)) ?? 1,
  };
}

// Reconstruye la query string sin valores vacíos; `overrides` reemplaza claves (undefined = quitar).
export function buildQueryString(
  params: RawSearchParams,
  overrides: Record<string, string | undefined> = {},
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key in overrides) continue;
    for (const v of allParams(value)) search.append(key, v);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
