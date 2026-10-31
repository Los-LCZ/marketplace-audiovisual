"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, getString, type ActionState } from "@/lib/action-state";
import type { Booking, BookingStatus } from "@/types/database";

const HOUR_MS = 60 * 60 * 1000;

// Mensajes legibles para los errores que lanza la base de datos.
function bookingErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23P01") return "El espacio ya está reservado en ese horario";
  if (error.code === "P0001") return error.message; // raise exception de los triggers
  return `No se pudo crear la reserva: ${error.message}`;
}

/**
 * Crea una reserva. Espera `space_id`, `start_time` y `end_time` (ISO 8601).
 * Los montos (horas, subtotal, comisión, total) los calcula el trigger
 * compute_booking_amounts en la base de datos.
 */
export async function createBooking(
  _prev: ActionState<Booking>,
  formData: FormData,
): Promise<ActionState<Booking>> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión para reservar");

  const spaceId = getString(formData, "space_id");
  const start = new Date(getString(formData, "start_time"));
  const end = new Date(getString(formData, "end_time"));

  if (!spaceId) return fail("Espacio inválido");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return fail("Fechas inválidas");
  if (end <= start) return fail("La hora de término debe ser posterior al inicio");
  if (start.getTime() <= Date.now()) return fail("La reserva debe comenzar en el futuro");
  if ((end.getTime() - start.getTime()) % HOUR_MS !== 0)
    return fail("La reserva debe ser por horas completas");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      space_id: spaceId,
      client_id: user.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    .select()
    .single();

  if (error) return fail(bookingErrorMessage(error));

  revalidatePath("/mis-reservas");
  revalidatePath(`/espacios/${spaceId}`);
  return { ok: true, data, message: "Reserva confirmada" };
}

async function setBookingStatus(bookingId: string, status: BookingStatus): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const supabase = await createClient();
  // RLS + trigger guard_booking_update validan quién puede hacer cada transición.
  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .select("id, space_id");

  if (error) return fail(error.code === "P0001" ? error.message : `Error: ${error.message}`);
  if (!data?.length) return fail("Reserva no encontrada");

  revalidatePath("/mis-reservas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cancelBooking(bookingId: string) {
  return setBookingStatus(bookingId, "cancelled");
}

// Solo el anfitrión del espacio puede marcar una reserva como completada.
export async function completeBooking(bookingId: string) {
  return setBookingStatus(bookingId, "completed");
}

export async function createReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const bookingId = getString(formData, "booking_id");
  const rating = Number(getString(formData, "rating"));
  const comment = getString(formData, "comment");

  if (!bookingId) return fail("Reserva inválida");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return fail("La calificación debe ser entre 1 y 5", { rating: "Entre 1 y 5" });

  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .insert({ booking_id: bookingId, rating, comment: comment || null });

  if (error) {
    if (error.code === "23505") return fail("Ya dejaste una reseña para esta reserva");
    if (error.code === "42501") return fail("Solo puedes reseñar reservas completadas");
    return fail(error.message);
  }

  revalidatePath("/mis-reservas");
  return { ok: true, message: "¡Gracias por tu reseña!" };
}
