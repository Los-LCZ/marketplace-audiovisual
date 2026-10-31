"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, getString, getStringList, type ActionState } from "@/lib/action-state";
import type { Booking, BookingStatus } from "@/types/database";

const HOUR_MS = 60 * 60 * 1000;

// Mensajes legibles para los errores que lanza la base de datos.
function bookingErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23P01") return "El espacio ya está reservado en ese horario";
  if (error.code === "P0001") return error.message; // raise exception de los triggers
  return `No se pudo crear la reserva: ${error.message}`;
}

/**
 * Crea una reserva. Espera `space_id`, `start_time` y `end_time` (ISO 8601) y,
 * opcionales, `project` y `message` para el anfitrión.
 * Los montos (horas, subtotal, comisión, total) y el estado los decide el trigger
 * compute_booking_amounts: `confirmed` si el cliente cumple la nota mínima del
 * anfitrión (o no hay mínimo); si no, `requested` y el anfitrión la acepta o rechaza.
 * Revisa `data.status` para saber cuál fue.
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
  const project = getString(formData, "project");
  const message = getString(formData, "message");

  if (!spaceId) return fail("Espacio inválido");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return fail("Fechas inválidas");
  if (end <= start) return fail("La hora de término debe ser posterior al inicio");
  if (start.getTime() <= Date.now()) return fail("La reserva debe comenzar en el futuro");
  if ((end.getTime() - start.getTime()) % HOUR_MS !== 0)
    return fail("La reserva debe ser por horas completas");
  if (project.length > 200) return fail("Proyecto muy largo", { project: "Máximo 200 caracteres" });
  if (message.length > 2000) return fail("Mensaje muy largo", { message: "Máximo 2000 caracteres" });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      space_id: spaceId,
      client_id: user.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      project: project || null,
      message: message || null,
    })
    .select()
    .single();

  if (error) return fail(bookingErrorMessage(error));

  revalidatePath("/mis-reservas");
  revalidatePath("/dashboard");
  revalidatePath(`/espacios/${spaceId}`);
  return {
    ok: true,
    data,
    message:
      data.status === "requested"
        ? "Solicitud enviada: el anfitrión debe aprobarla"
        : "Reserva confirmada",
  };
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

  if (error) {
    if (error.code === "23P01") return fail("Ese horario ya fue tomado por otra reserva");
    return fail(error.code === "P0001" ? error.message : `Error: ${error.message}`);
  }
  if (!data?.length) return fail("Reserva no encontrada");

  revalidatePath("/mis-reservas");
  revalidatePath("/dashboard");
  // Liberar o cerrar la reserva cambia los horarios ocupados del espacio.
  revalidatePath(`/espacios/${data[0].space_id}`);
  return { ok: true };
}

/**
 * Cancela una reserva. El cliente puede cancelar sus solicitudes y reservas; el
 * anfitrión, las reservas confirmadas (las solicitudes se rechazan con rejectBooking).
 * No recibe FormData: úsala con `useTransition` o con `.bind` en un `<form action>`.
 *
 * @example
 * const [pending, startTransition] = useTransition();
 * startTransition(async () => { const res = await cancelBooking(booking.id); });
 * // o: <form action={cancelBooking.bind(null, booking.id)}>
 */
export async function cancelBooking(bookingId: string): Promise<ActionState> {
  return setBookingStatus(bookingId, "cancelled");
}

/**
 * El anfitrión acepta una solicitud (`requested` -> `confirmed`). Falla si el
 * horario ya lo tomó otra reserva o si ya comenzó.
 * No recibe FormData: úsala con `useTransition` o con `.bind`.
 */
export async function acceptBooking(bookingId: string): Promise<ActionState> {
  return setBookingStatus(bookingId, "confirmed");
}

/**
 * El anfitrión rechaza una solicitud (`requested` -> `rejected`).
 * No recibe FormData: úsala con `useTransition` o con `.bind`.
 */
export async function rejectBooking(bookingId: string): Promise<ActionState> {
  return setBookingStatus(bookingId, "rejected");
}

/**
 * Marca una reserva como completada. Solo el anfitrión del espacio puede hacerlo y
 * solo cuando terminó el horario (lo valida guard_booking_update). Habilita que
 * ambas partes se califiquen.
 * No recibe FormData: úsala con `useTransition` o con `.bind`.
 */
export async function completeBooking(bookingId: string): Promise<ActionState> {
  return setBookingStatus(bookingId, "completed");
}

const MAX_REVIEW_TAGS = 8;

// Campos comunes de las dos reseñas: booking_id, rating (1–5), comment y tags (repetido).
function parseReviewForm(formData: FormData) {
  const bookingId = getString(formData, "booking_id");
  const rating = Number(getString(formData, "rating"));
  const comment = getString(formData, "comment");
  const tags = getStringList(formData, "tags", MAX_REVIEW_TAGS);

  if (!bookingId) return { error: fail("Reserva inválida") };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { error: fail("La calificación debe ser entre 1 y 5", { rating: "Entre 1 y 5" }) };
  if (comment.length > 2000) return { error: fail("Comentario muy largo", { comment: "Máximo 2000 caracteres" }) };
  if (tags.some((t) => t.length > 30)) return { error: fail("Etiqueta muy larga", { tags: "Máximo 30 caracteres" }) };

  return { values: { booking_id: bookingId, rating, comment: comment || null, tags } };
}

/**
 * El cliente califica el espacio/anfitrión de una reserva completada.
 * Campos: booking_id, rating, comment, tags (repetido). Es a ciegas: el anfitrión
 * la ve cuando envíe la suya o a los 14 días.
 */
export async function createReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const parsed = parseReviewForm(formData);
  if (parsed.error) return parsed.error;
  const { booking_id: bookingId } = parsed.values;

  const supabase = await createClient();
  // RLS: el usuario solo ve sus reservas (o las de sus espacios).
  const { data: booking } = await supabase
    .from("bookings")
    .select("space_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return fail("Reserva no encontrada");

  const { error } = await supabase.from("reviews").insert(parsed.values);

  if (error) {
    if (error.code === "23505") return fail("Ya dejaste una reseña para esta reserva");
    if (error.code === "42501") return fail("Solo puedes reseñar reservas completadas");
    return fail(error.message);
  }

  revalidatePath("/mis-reservas");
  revalidatePath(`/espacios/${booking.space_id}`);
  return { ok: true, message: "¡Gracias por tu reseña!" };
}

/**
 * El anfitrión califica al cliente de una reserva completada (mismos campos que
 * createReview). Es a ciegas: el cliente la ve cuando envíe la suya o a los 14 días.
 */
export async function createClientReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const parsed = parseReviewForm(formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { error } = await supabase.from("client_reviews").insert(parsed.values);

  if (error) {
    if (error.code === "23505") return fail("Ya calificaste a este cliente");
    if (error.code === "42501") return fail("Solo puedes calificar clientes de reservas completadas en tus espacios");
    return fail(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/mis-reservas");
  return { ok: true, message: "Calificación enviada" };
}
