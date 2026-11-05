import { createClient } from "@/utils/supabase/server";
import { getSpaceLocations, HIDDEN_LOCATION } from "@/lib/queries/locations";
import type { Booking, BookingReviews, ClientSummaryRow, Review, Space, SpaceLocation } from "@/types/database";

export type BookingWithSpace = Booking & {
  /**
   * La ubicación sigue las reglas de space_locations: el cliente ve `address` si el espacio
   * no la oculta o si su reserva (esta u otra) está confirmada o completada; el anfitrión siempre.
   */
  space:
    | (Pick<
        Space,
        "id" | "title" | "city" | "commune" | "images" | "host_id" | "price_per_hour" | "category" | "hide_address"
      > &
        SpaceLocation)
    | null;
  /** null si la reserva aún no tiene reseña (reviews.booking_id es único). */
  review: Pick<Review, "id" | "rating" | "comment" | "created_at"> | null;
};

/** Quien reservó, visto por el anfitrión (sin teléfono). */
export type ClientSummary = Omit<ClientSummaryRow, "client_id"> & { id: string };

/** Reserva o solicitud recibida por un anfitrión, con el resumen del cliente. */
export type HostBooking = BookingWithSpace & { client: ClientSummary | null };

type Client = Awaited<ReturnType<typeof createClient>>;

type BookingRow = Omit<BookingWithSpace, "space"> & {
  space: Omit<NonNullable<BookingWithSpace["space"]>, keyof SpaceLocation> | null;
};

/** Agrega la ubicación (enmascarada por la base) al espacio de cada reserva. */
async function attachSpaceLocations(supabase: Client, bookings: BookingRow[]): Promise<BookingWithSpace[]> {
  const byId = await getSpaceLocations(
    supabase,
    bookings.flatMap((b) => (b.space ? [b.space.id] : [])),
  );
  return bookings.map((b) => ({
    ...b,
    space: b.space ? { ...b.space, ...(byId.get(b.space.id) ?? HIDDEN_LOCATION) } : null,
  }));
}

async function attachClients(supabase: Client, bookings: BookingWithSpace[]): Promise<HostBooking[]> {
  if (!bookings.length) return [];
  const { data, error } = await supabase.rpc("get_client_summaries", {
    p_client_ids: [...new Set(bookings.map((b) => b.client_id))],
  });
  if (error) throw new Error(`Error al obtener clientes: ${error.message}`);

  const byId = new Map((data ?? []).map(({ client_id, ...rest }) => [client_id, { id: client_id, ...rest }]));
  return bookings.map((b) => ({ ...b, client: byId.get(b.client_id) ?? null }));
}

const SPACE_FIELDS = "id, title, city, commune, images, host_id, price_per_hour, category, hide_address";
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
  return attachSpaceLocations(supabase, (data ?? []) satisfies BookingRow[]);
}

/**
 * Reservas recibidas en los espacios del anfitrión autenticado, con nombre, avatar
 * y nota como cliente de quien reservó (`client`).
 */
export async function listHostBookings(hostId: string): Promise<HostBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(HOST_BOOKING_SELECT)
    .eq("space.host_id", hostId)
    .order("start_time", { ascending: true });

  if (error) throw new Error(`Error al listar reservas recibidas: ${error.message}`);
  return attachClients(supabase, await attachSpaceLocations(supabase, (data ?? []) satisfies BookingRow[]));
}

/**
 * Solicitudes pendientes (`requested`) en los espacios del anfitrión, por fecha.
 * Incluye el perfil público del cliente, su nota y cantidad de reseñas como
 * cliente y su última reseña recibida.
 */
export async function listHostRequests(hostId: string): Promise<HostBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(HOST_BOOKING_SELECT)
    .eq("space.host_id", hostId)
    .eq("status", "requested")
    .order("start_time", { ascending: true });

  if (error) throw new Error(`Error al listar solicitudes: ${error.message}`);
  return attachClients(supabase, await attachSpaceLocations(supabase, (data ?? []) satisfies BookingRow[]));
}

/**
 * Las dos reseñas de una reserva según lo que el usuario actual puede ver
 * (calificación a ciegas). null si no participa en la reserva.
 */
export async function getBookingReviews(bookingId: string): Promise<BookingReviews | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_booking_reviews", { p_booking_id: bookingId });
  if (error) throw new Error(`Error al obtener reseñas de la reserva: ${error.message}`);
  return data;
}

/** Máximo de reservas por llamada a getBookingsReviews. */
export const BOOKINGS_REVIEWS_MAX = 100;

/**
 * Reseñas de varias reservas en una sola llamada, con las mismas reglas que
 * getBookingReviews. Solo trae las reservas en que participa el usuario
 * (las demás no aparecen en el Map). Máximo BOOKINGS_REVIEWS_MAX ids.
 */
export async function getBookingsReviews(bookingIds: string[]): Promise<Map<string, BookingReviews>> {
  const ids = [...new Set(bookingIds)].slice(0, BOOKINGS_REVIEWS_MAX);
  if (!ids.length) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_bookings_reviews", { p_booking_ids: ids });
  if (error) throw new Error(`Error al obtener reseñas de las reservas: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.booking_id, row.reviews]));
}

/**
 * Reservas y solicitudes vigentes que aún no empiezan en un espacio propio
 * (requested, pending_payment o confirmed). Para avisar antes de pasarlo a Borrador
 * o Archivado: esas reservas no se cancelan solas. 0 si el espacio no es del usuario (RLS).
 */
export async function countUpcomingBookings(spaceId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("space_id", spaceId)
    .in("status", ["requested", "pending_payment", "confirmed"])
    .gt("start_time", new Date().toISOString());
  if (error) throw new Error(`Error al contar reservas: ${error.message}`);
  return count ?? 0;
}
