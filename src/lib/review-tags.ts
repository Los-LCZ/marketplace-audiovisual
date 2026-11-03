// Vocabulario único de etiquetas de reseña: lo usan el formulario y la validación de
// createReview/createClientReview, para que las estadísticas del perfil no se separen.

/** Elogios según a quién se califica. */
export const REVIEW_COMPLIMENTS = {
  /** El cliente califica el espacio y al anfitrión (createReview). */
  space: ["Equipo tal cual la ficha", "Anfitrión atento", "Gran acústica", "Excelente iluminación", "Llegada fácil", "Sonido impecable"],
  /** El anfitrión califica al cliente (createClientReview). */
  client: ["Puntual", "Cuida el equipo", "Deja la sala impecable", "Respeta el horario", "Comunicación clara", "Buena energía"],
} as const;

/** Problemas, comunes a las dos reseñas. */
export const REVIEW_ISSUES = [
  "Llegó tarde",
  "Problemas con el equipo",
  "Mala comunicación",
  "No coincidía con lo acordado",
  "Se pasó del horario",
] as const;

export type ReviewTarget = keyof typeof REVIEW_COMPLIMENTS;

/** Todas las etiquetas válidas para una reseña de ese tipo. */
export function reviewTagsFor(target: ReviewTarget): readonly string[] {
  return [...REVIEW_COMPLIMENTS[target], ...REVIEW_ISSUES];
}

export function isReviewTag(target: ReviewTarget, tag: string): boolean {
  return reviewTagsFor(target).includes(tag);
}
