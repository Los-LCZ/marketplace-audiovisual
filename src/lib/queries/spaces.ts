import { createClient } from "@/utils/supabase/server";
import type {
  Amenity,
  PublicProfile,
  Space,
  SpaceCategory,
  SpaceRatingStats,
  SpaceReview,
} from "@/types/database";

export type SpaceSort = "recent" | "price_asc" | "price_desc" | "rating";

export type SpaceFilters = {
  /** Texto libre: busca en título, descripción, ciudad y comuna. */
  q?: string;
  category?: SpaceCategory;
  /** Varias categorías (p. ej. las de un "mundo"); se combina con `category` si vienen ambas. */
  categories?: SpaceCategory[];
  city?: string;
  commune?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Devuelve espacios que tengan al menos una de estas amenities. */
  amenityIds?: number[];
  /** `YYYY-MM-DD` (hora de Chile): solo espacios con al menos `min_hours` libres ese día. */
  availableOn?: string;
  /** Orden aplicado en la base, antes de paginar. Por defecto "recent". */
  sort?: SpaceSort;
  page?: number;
  pageSize?: number;
};

type RatingFields = Pick<SpaceRatingStats, "avg_rating" | "review_count">;

export type SpaceWithAmenities = Space & RatingFields & { amenities: Amenity[] };
export type SpaceDetail = SpaceWithAmenities & { host: PublicProfile | null };

type Client = Awaited<ReturnType<typeof createClient>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Agrega `amenities` a una lista de espacios con una sola query. */
async function attachAmenities<T extends { id: string }>(
  supabase: Client,
  spaces: T[],
): Promise<(T & { amenities: Amenity[] })[]> {
  if (!spaces.length) return [];
  const { data, error } = await supabase
    .from("space_amenities")
    .select("space_id, amenity:amenities(id, name, category)")
    .in("space_id", spaces.map((s) => s.id));
  if (error) throw new Error(`Error al obtener amenities: ${error.message}`);

  const bySpace = new Map<string, Amenity[]>();
  for (const { space_id, amenity } of data ?? []) {
    if (!amenity) continue;
    bySpace.set(space_id, [...(bySpace.get(space_id) ?? []), amenity]);
  }
  return spaces.map((space) => ({ ...space, amenities: bySpace.get(space.id) ?? [] }));
}

function intersect(a: string[] | null, b: string[]) {
  return a ? a.filter((id) => b.includes(id)) : b;
}

const SEARCH_COLUMNS = ["title", "description", "city", "commune"] as const;

/**
 * Arma el filtro `.or()` de PostgREST para una búsqueda ilike en varias columnas.
 * - Escapa los comodines de LIKE (`%`, `_`, `\`) para que se busquen literalmente.
 * - Envuelve el valor entre comillas dobles, lo que neutraliza `,` y paréntesis
 *   (reservados en la sintaxis de `or`), escapando `"` y `\` dentro de ellas.
 * - Quita `*`, que PostgREST trata como alias de `%`.
 */
function buildSearchFilter(q: string) {
  const term = q.replace(/\*/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  if (!term) return null;
  const likePattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
  const quoted = `"${likePattern.replace(/["\\]/g, "\\$&")}"`;
  return SEARCH_COLUMNS.map((column) => `${column}.ilike.${quoted}`).join(",");
}

export async function listPublishedSpaces(filters: SpaceFilters = {}) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, filters.pageSize ?? 20);
  const from = (page - 1) * pageSize;
  const empty = { spaces: [] as SpaceWithAmenities[], total: 0, page, pageSize };

  const categories = [
    ...new Set([...(filters.categories ?? []), ...(filters.category ? [filters.category] : [])]),
  ];

  // Filtros que se resuelven a una lista de ids: amenities y disponibilidad.
  let spaceIds: string[] | null = null;
  if (filters.amenityIds?.length) {
    const { data: links, error } = await supabase
      .from("space_amenities")
      .select("space_id")
      .in("amenity_id", filters.amenityIds);
    if (error) throw new Error(`Error al filtrar por amenities: ${error.message}`);
    spaceIds = [...new Set((links ?? []).map((l) => l.space_id))];
    if (!spaceIds.length) return empty;
  }
  if (filters.availableOn && DATE_RE.test(filters.availableOn)) {
    const { data: available, error } = await supabase.rpc("get_available_space_ids", {
      p_date: filters.availableOn,
      p_categories: categories.length ? categories : null,
    });
    if (error) throw new Error(`Error al filtrar por disponibilidad: ${error.message}`);
    spaceIds = intersect(spaceIds, available ?? []);
    if (!spaceIds.length) return empty;
  }

  let query = supabase.from("space_cards").select("*", { count: "exact" });

  if (spaceIds) query = query.in("id", spaceIds);
  const search = filters.q ? buildSearchFilter(filters.q) : null;
  if (search) query = query.or(search);
  if (categories.length) query = query.in("category", categories);
  if (filters.city) query = query.ilike("city", filters.city);
  if (filters.commune) query = query.ilike("commune", filters.commune);
  if (filters.minPrice != null) query = query.gte("price_per_hour", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price_per_hour", filters.maxPrice);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price_per_hour", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_per_hour", { ascending: false });
      break;
    case "rating":
      query = query
        .order("avg_rating", { ascending: false, nullsFirst: false })
        .order("review_count", { ascending: false });
      break;
  }
  // Desempate estable para que la paginación no repita ni salte resultados.
  query = query.order("created_at", { ascending: false }).order("id").range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Error al listar espacios: ${error.message}`);

  return {
    spaces: await attachAmenities(supabase, data ?? []),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getSpaceById(id: string): Promise<SpaceDetail | null> {
  const supabase = await createClient();

  const { data: space, error } = await supabase
    .from("spaces")
    .select("*, amenities(id, name, category)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Error al obtener el espacio: ${error.message}`);
  if (!space) return null;

  const { data: host } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("id", space.host_id)
    .maybeSingle();

  const [withStats] = await withRatingStats([space]);
  return { ...withStats, host };
}

// Espacios del anfitrión autenticado (incluye borradores y archivados).
export async function listMySpaces(hostId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spaces")
    .select("*, amenities(id, name, category)")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Error al listar tus espacios: ${error.message}`);
  return withRatingStats(data ?? []);
}

export async function listAmenities() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("amenities").select("*").order("category").order("name");
  if (error) throw new Error(`Error al listar amenities: ${error.message}`);
  return data ?? [];
}

export async function getSpaceBusySlots(spaceId: string, from: Date, to: Date) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_space_busy_slots", {
    p_space_id: spaceId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw new Error(`Error al obtener disponibilidad: ${error.message}`);
  return data ?? [];
}

const EMPTY_STATS: RatingFields = { avg_rating: null, review_count: 0 };

/**
 * Rating promedio y cantidad de reseñas de varios espacios en una sola query
 * (para las tarjetas del listado). Siempre trae una entrada por cada id pedido.
 */
export async function getSpaceRatingStats(
  spaceIds: string[],
): Promise<Record<string, RatingFields>> {
  const ids = [...new Set(spaceIds)];
  const result: Record<string, RatingFields> = Object.fromEntries(
    ids.map((id) => [id, EMPTY_STATS]),
  );
  if (!ids.length) return result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_rating_stats")
    .select("space_id, avg_rating, review_count")
    .in("space_id", ids);
  if (error) throw new Error(`Error al obtener ratings: ${error.message}`);

  for (const { space_id, avg_rating, review_count } of data ?? []) {
    result[space_id] = { avg_rating, review_count };
  }
  return result;
}

async function withRatingStats<T extends Space & { amenities: Amenity[] }>(
  spaces: T[],
): Promise<(T & RatingFields)[]> {
  const stats = await getSpaceRatingStats(spaces.map((s) => s.id));
  return spaces.map((space) => ({ ...space, ...(stats[space.id] ?? EMPTY_STATS) }));
}

export const REVIEWS_PAGE_SIZE = 20;

/** Reseñas de un espacio publicado, paginadas (page empieza en 1). */
export async function getSpaceReviews(spaceId: string, page = 1): Promise<SpaceReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_space_reviews", {
    p_space_id: spaceId,
    p_limit: REVIEWS_PAGE_SIZE,
    p_offset: (Math.max(1, page) - 1) * REVIEWS_PAGE_SIZE,
  });
  if (error) throw new Error(`Error al obtener reseñas: ${error.message}`);
  return data ?? [];
}
