import type { MapSpot } from "@/components/maps/space-map";

// Datos mínimos de un espacio para los heros interactivos de la portada (con su ubicación en el mapa).
export type HeroSpace = MapSpot & {
  id: string;
  city: string;
  pricePerHour: number;
  /** Primeros ítems de equipamiento, para la pantalla de la consola. */
  tags: string[];
};

// Próximos 14 días (en hora de Chile) para el selector de fecha del buscador.
export type DayOption = { value: string; label: string };
