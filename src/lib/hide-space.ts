import type { SpaceStatus } from "@/types/database";

/**
 * Si pasar un espacio de `from` a `to` lo oculta (Borrador o Archivado) teniendo reservas o solicitudes
 * próximas, devuelve el aviso para confirmar antes; si no, null. Esas reservas no se cancelan solas.
 */
export function hideSpaceWarning(from: SpaceStatus, to: SpaceStatus, upcoming: number) {
  if (to === from || to === "published" || upcoming <= 0) return null;
  const n = upcoming === 1 ? "1 reserva próxima" : `${upcoming} reservas próximas`;
  return `Este espacio tiene ${n}. Seguirán vigentes aunque lo ocultes; si no puedes recibirlas, cancélalas o recházalas desde tu panel.`;
}
