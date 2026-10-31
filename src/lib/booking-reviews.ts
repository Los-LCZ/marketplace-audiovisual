import { getBookingReviews, type BookingWithSpace } from "@/lib/queries/bookings";
import { getPublicProfile } from "@/lib/queries/profiles";
import type { BookingReviews, PublicProfile } from "@/types/database";

// Tope de reservas completadas por página para las que se pide la calificación a ciegas
// (una RPC por reserva).
const MAX_REVIEW_LOOKUPS = 30;

/** Calificación a ciegas de las reservas completadas más recientes, por id de reserva. */
export async function loadBookingReviews(bookings: BookingWithSpace[]) {
  const completed = bookings
    .filter((b) => b.status === "completed")
    .sort((a, b) => b.start_time.localeCompare(a.start_time))
    .slice(0, MAX_REVIEW_LOOKUPS);
  const entries = await Promise.all(completed.map(async (b) => [b.id, await getBookingReviews(b.id)] as const));
  return new Map(entries.filter((e): e is readonly [string, BookingReviews] => e[1] !== null));
}

/** Perfiles públicos de varios usuarios, por id (los que no existen se omiten). */
export async function loadProfiles(ids: string[]) {
  const unique = [...new Set(ids)];
  const profiles = await Promise.all(unique.map((id) => getPublicProfile(id)));
  return new Map(profiles.filter((p): p is PublicProfile => p !== null).map((p) => [p.id, p]));
}
