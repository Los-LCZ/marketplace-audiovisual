import type { BookingWithSpace } from "@/lib/queries/bookings";
import { isOpenBooking } from "@/lib/labels";

// Qué acciones ofrece la UI para cada reserva. La base de datos (guard_booking_update
// y RLS) vuelve a validar todo; esto solo evita mostrar botones que fallarían o no aplican.

/** Cliente o anfitrión: solo reservas abiertas que aún no comienzan. */
export function canCancel(booking: BookingWithSpace, now: number) {
  return isOpenBooking(booking.status) && Date.parse(booking.start_time) > now;
}

/** Solo el anfitrión, y una vez terminado el horario reservado. */
export function canComplete(booking: BookingWithSpace, now: number) {
  return isOpenBooking(booking.status) && Date.parse(booking.end_time) <= now;
}

/** Solo el cliente, con la reserva completada y sin reseña previa. */
export function canReview(booking: BookingWithSpace) {
  return booking.status === "completed" && booking.review === null;
}

/** Próximas o en curso: abiertas y sin terminar. */
export function isUpcoming(booking: BookingWithSpace, now: number) {
  return isOpenBooking(booking.status) && Date.parse(booking.end_time) > now;
}
