import type { SpaceCategory } from "@/types/database";

/**
 * Señal separa el catálogo en dos "mundos" con identidad visual propia:
 * Audiovisual (Visor, magenta) y Música (Consola, ámbar). El mundo activo se guarda
 * en una cookie y se aplica como <html data-world="av|mu">.
 */
export type World = "av" | "mu";

export const WORLD_COOKIE = "senal-world";
export const DEFAULT_WORLD: World = "av";

export function isWorld(value: unknown): value is World {
  return value === "av" || value === "mu";
}

export const WORLDS: Record<
  World,
  { name: string; device: string; categories: SpaceCategory[]; themeColor: string }
> = {
  av: {
    name: "Audiovisual",
    device: "Visor",
    categories: ["filming_set", "photo_studio", "outdoor_location"],
    themeColor: "#090b0e",
  },
  mu: {
    name: "Música",
    device: "Consola",
    categories: ["recording_studio", "rehearsal_room"],
    themeColor: "#0d0906",
  },
};

export function worldOf(category: SpaceCategory): World {
  return WORLDS.mu.categories.includes(category) ? "mu" : "av";
}

// Texto de apoyo y "modo" de cada categoría (como los diales de una cámara o los canales de una consola).
export const CATEGORY_META: Record<SpaceCategory, { mode: string; blurb: string }> = {
  filming_set: { mode: "S", blurb: "Ciclorama, parrilla y potencia trifásica" },
  photo_studio: { mode: "A", blurb: "Fondos, flashes y luz controlada" },
  outdoor_location: { mode: "M", blurb: "Luz natural y espacios para rodar en exterior" },
  recording_studio: { mode: "CH1", blurb: "Control room, sala de toma e ingeniero" },
  rehearsal_room: { mode: "CH2", blurb: "Backline listo para enchufar y tocar" },
};

// Comunas sugeridas en buscadores y filtros (la búsqueda acepta cualquier comuna).
export const SUGGESTED_COMMUNES = [
  "Providencia",
  "Ñuñoa",
  "Santiago Centro",
  "Recoleta",
  "Macul",
  "Las Condes",
  "Vitacura",
];
