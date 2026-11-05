import type { createClient } from "@/utils/supabase/server";
import type { SpaceLocation } from "@/types/database";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Lo que se muestra si la base no devuelve ubicación para un espacio: todo oculto. */
export const HIDDEN_LOCATION: SpaceLocation = { address: null, map_lat: null, map_lng: null, address_hidden: true };

/**
 * Ubicación de varios espacios según quién mira, en una sola query (vista space_locations).
 * La base decide si entrega la dirección y el punto exacto (ver la migración space_location).
 */
export async function getSpaceLocations(supabase: Client, spaceIds: string[]): Promise<Map<string, SpaceLocation>> {
  const ids = [...new Set(spaceIds)];
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from("space_locations")
    .select("space_id, address, map_lat, map_lng, address_hidden")
    .in("space_id", ids);
  if (error) throw new Error(`Error al obtener ubicaciones: ${error.message}`);
  return new Map((data ?? []).map(({ space_id, ...location }) => [space_id, location]));
}

/** Agrega address, map_lat, map_lng y address_hidden a cada espacio. */
export async function attachLocations<T extends { id: string }>(
  supabase: Client,
  spaces: T[],
): Promise<(T & SpaceLocation)[]> {
  const byId = await getSpaceLocations(supabase, spaces.map((s) => s.id));
  return spaces.map((space) => ({ ...space, ...(byId.get(space.id) ?? HIDDEN_LOCATION) }));
}
