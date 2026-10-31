import { createClient } from "@/utils/supabase/server";
import type { Amenity, PublicProfile, Space, SpaceCategory } from "@/types/database";

export type SpaceFilters = {
  /** Texto libre: busca en título, descripción, ciudad y comuna. */
  q?: string;
  category?: SpaceCategory;
  city?: string;
  commune?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Devuelve espacios que tengan al menos una de estas amenities. */
  amenityIds?: number[];
  page?: number;
  pageSize?: number;
};

export type SpaceWithAmenities = Space & { amenities: Amenity[] };
export type SpaceDetail = SpaceWithAmenities & { host: PublicProfile | null };

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

  // Filtro por amenities: primero se resuelven los espacios que tienen alguna.
  let spaceIds: string[] | null = null;
  if (filters.amenityIds?.length) {
    const { data: links, error } = await supabase
      .from("space_amenities")
      .select("space_id")
      .in("amenity_id", filters.amenityIds);
    if (error) throw new Error(`Error al filtrar por amenities: ${error.message}`);
    spaceIds = [...new Set((links ?? []).map((l) => l.space_id))];
    if (!spaceIds.length) return { spaces: [], total: 0, page, pageSize };
  }

  let query = supabase
    .from("spaces")
    .select("*, amenities(id, name, category)", { count: "exact" })
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (spaceIds) query = query.in("id", spaceIds);
  const search = filters.q ? buildSearchFilter(filters.q) : null;
  if (search) query = query.or(search);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.city) query = query.ilike("city", filters.city);
  if (filters.commune) query = query.ilike("commune", filters.commune);
  if (filters.minPrice != null) query = query.gte("price_per_hour", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price_per_hour", filters.maxPrice);

  const { data, error, count } = await query;
  if (error) throw new Error(`Error al listar espacios: ${error.message}`);

  return {
    spaces: (data ?? []) as SpaceWithAmenities[],
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

  return { ...(space as SpaceWithAmenities), host };
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
  return (data ?? []) as SpaceWithAmenities[];
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
