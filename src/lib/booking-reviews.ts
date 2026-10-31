import { BOOKINGS_REVIEWS_MAX, getBookingsReviews, type BookingWithSpace } from "@/lib/queries/bookings";
import { getPublicProfiles } from "@/lib/queries/profiles";

/** Calificación a ciegas de las reservas completadas más recientes, por id de reserva. */
export async function loadBookingReviews(bookings: BookingWithSpace[]) {
  const ids = bookings
    .filter((b) => b.status === "completed")
    .sort((a, b) => b.start_time.localeCompare(a.start_time))
    .slice(0, BOOKINGS_REVIEWS_MAX)
    .map((b) => b.id);
  return getBookingsReviews(ids);
}

/** Perfiles públicos de varios usuarios, por id (los que no existen se omiten). */
export const loadProfiles = getPublicProfiles;
