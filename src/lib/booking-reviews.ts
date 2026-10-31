import { getBookingsReviews, type BookingWithSpace } from "@/lib/queries/bookings";
import { getPublicProfiles } from "@/lib/queries/profiles";

// Tope de reservas completadas por página para las que se pide la calificación a ciegas
// (getBookingsReviews acepta hasta 100 en una llamada).
const MAX_REVIEW_LOOKUPS = 100;

/** Calificación a ciegas de las reservas completadas más recientes, por id de reserva. */
export async function loadBookingReviews(bookings: BookingWithSpace[]) {
  const ids = bookings
    .filter((b) => b.status === "completed")
    .sort((a, b) => b.start_time.localeCompare(a.start_time))
    .slice(0, MAX_REVIEW_LOOKUPS)
    .map((b) => b.id);
  return getBookingsReviews(ids);
}

/** Perfiles públicos de varios usuarios, por id (los que no existen se omiten). */
export const loadProfiles = getPublicProfiles;
