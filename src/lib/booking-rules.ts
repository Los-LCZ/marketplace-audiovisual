import type { BookingWithSpace } from "@/lib/queries/bookings";
import { isOpenBooking } from "@/lib/labels";
import type { BookingStatus } from "@/types/database";

// Qué acciones ofrece la UI para cada reserva. La base de datos (guard_booking_update
// y RLS) vuelve a validar todo; esto solo evita mostrar botones que fallarían o no aplican.

/** Reservas vigentes: las que bloquean el horario más las solicitudes por aprobar. */
export function isActiveBooking(status: BookingStatus) {
  return status === "requested" || isOpenBooking(status);
}

/**
 * Cliente: reservas y solicitudes que aún no comienzan. Anfitrión: solo reservas
 * (las solicitudes se rechazan con canDecide).
 */
export function canCancel(booking: BookingWithSpace, now: number) {
  return isActiveBooking(booking.status) && Date.parse(booking.start_time) > now;
}

/** Solo el anfitrión: aceptar o rechazar una solicitud que aún no comienza. */
export function canDecide(booking: BookingWithSpace, now: number) {
  return booking.status === "requested" && Date.parse(booking.start_time) > now;
}

/** Solo el anfitrión, y una vez terminado el horario reservado. */
export function canComplete(booking: BookingWithSpace, now: number) {
  return isOpenBooking(booking.status) && Date.parse(booking.end_time) <= now;
}

/** Solo el cliente, con la reserva completada y sin reseña previa. */
export function canReview(booking: BookingWithSpace) {
  return booking.status === "completed" && booking.review === null;
}

/** Próximas o en curso: vigentes y sin terminar (incluye solicitudes). */
export function isUpcoming(booking: BookingWithSpace, now: number) {
  return isActiveBooking(booking.status) && Date.parse(booking.end_time) > now;
}
