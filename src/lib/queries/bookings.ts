import { createClient } from "@/utils/supabase/server";
import type { Booking, Review, Space } from "@/types/database";

export type BookingWithSpace = Booking & {
  space: Pick<
    Space,
    "id" | "title" | "city" | "commune" | "images" | "host_id" | "price_per_hour" | "category"
  > | null;
  /** null si la reserva aún no tiene reseña (reviews.booking_id es único). */
  review: Pick<Review, "id" | "rating" | "comment" | "created_at"> | null;
};

const SPACE_FIELDS = "id, title, city, commune, images, host_id, price_per_hour, category";
const REVIEW_SELECT = "review:reviews(id, rating, comment, created_at)";
const BOOKING_SELECT = `*, space:spaces(${SPACE_FIELDS}), ${REVIEW_SELECT}` as const;
const HOST_BOOKING_SELECT = `*, space:spaces!inner(${SPACE_FIELDS}), ${REVIEW_SELECT}` as const;

// Reservas hechas por el cliente autenticado.
export async function listMyBookings(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("client_id", clientId)
    .order("start_time", { ascending: false });

  if (error) throw new Error(`Error al listar reservas: ${error.message}`);
  return (data ?? []) satisfies BookingWithSpace[];
}

// Reservas recibidas en los espacios del anfitrión autenticado.
export async function listHostBookings(hostId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(HOST_BOOKING_SELECT)
    .eq("space.host_id", hostId)
    .order("start_time", { ascending: true });

  if (error) throw new Error(`Error al listar reservas recibidas: ${error.message}`);
  return (data ?? []) satisfies BookingWithSpace[];
}
