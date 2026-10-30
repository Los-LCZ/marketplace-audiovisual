import { createClient } from "@/utils/supabase/server";
import type { Booking, Space } from "@/types/database";

export type BookingWithSpace = Booking & {
  space: Pick<Space, "id" | "title" | "city" | "commune" | "images" | "host_id"> | null;
};

const BOOKING_SELECT = "*, space:spaces(id, title, city, commune, images, host_id)";

// Reservas hechas por el cliente autenticado.
export async function listMyBookings(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("client_id", clientId)
    .order("start_time", { ascending: false });

  if (error) throw new Error(`Error al listar reservas: ${error.message}`);
  return (data ?? []) as BookingWithSpace[];
}

// Reservas recibidas en los espacios del anfitrión autenticado.
export async function listHostBookings(hostId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, space:spaces!inner(id, title, city, commune, images, host_id)")
    .eq("space.host_id", hostId)
    .order("start_time", { ascending: true });

  if (error) throw new Error(`Error al listar reservas recibidas: ${error.message}`);
  return (data ?? []) as BookingWithSpace[];
}
