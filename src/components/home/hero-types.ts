import type { SpaceCategory } from "@/types/database";

// Datos mínimos de un espacio para los heros interactivos de la portada.
export type HeroSpace = {
  id: string;
  title: string;
  category: SpaceCategory;
  commune: string;
  city: string;
  pricePerHour: number;
  image: string | null;
  /** Primeros ítems de equipamiento, para la pantalla de la consola. */
  tags: string[];
};

// Próximos 14 días (en hora de Chile) para el selector de fecha del buscador.
export type DayOption = { value: string; label: string };
