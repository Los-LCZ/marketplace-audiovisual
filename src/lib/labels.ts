import type { AmenityCategory, BookingStatus, GearCategory, SpaceCategory, SpaceStatus } from "@/types/database";

export const AMENITY_CATEGORY_LABELS: Record<AmenityCategory, string> = {
  audio: "Audio",
  video: "Video",
  general: "General",
};

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  microfonos: "Micrófonos",
  consolas: "Consolas y grabación",
  amplificacion: "Amplificación y backline",
  iluminacion: "Iluminación",
};
export const GEAR_CATEGORIES = Object.keys(GEAR_CATEGORY_LABELS) as GearCategory[];

// Etiquetas en español de los enums (ver README).
export const SPACE_CATEGORY_LABELS: Record<SpaceCategory, string> = {
  recording_studio: "Estudio de grabación",
  rehearsal_room: "Sala de ensayo",
  filming_set: "Set de rodaje",
  photo_studio: "Estudio fotográfico",
  outdoor_location: "Locación exterior",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Solicitada",
  rejected: "Rechazada",
  expired: "Vencida",
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
};

export const SPACE_STATUS_LABELS: Record<SpaceStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

export const SPACE_CATEGORIES = Object.keys(SPACE_CATEGORY_LABELS) as SpaceCategory[];
export const SPACE_STATUSES = Object.keys(SPACE_STATUS_LABELS) as SpaceStatus[];

export function isSpaceCategory(value: unknown): value is SpaceCategory {
  return typeof value === "string" && value in SPACE_CATEGORY_LABELS;
}

// Reservas que todavía bloquean el horario y pueden cambiar de estado.
export function isOpenBooking(status: BookingStatus) {
  return status === "pending_payment" || status === "confirmed";
}
