import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarX2, History } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listMyBookings } from "@/lib/queries/bookings";
import { canCancel, canReview, isUpcoming } from "@/lib/booking-rules";
import { currentTime } from "@/lib/zoned-time";
import { BookingCard } from "@/components/bookings/booking-card";
import { BookingActions } from "@/components/bookings/booking-actions";
import { ReviewForm } from "@/components/bookings/review-form";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mis reservas" };

export default async function MisReservasPage() {
  // El proxy ya protege la ruta; esto cubre una sesión que expiró entre medio.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mis-reservas");

  const bookings = await listMyBookings(user.id);
  const { now } = currentTime();

  // listMyBookings viene ordenada por inicio descendente: las próximas se muestran de la más cercana a la más lejana.
  const upcoming = bookings.filter((b) => isUpcoming(b, now)).reverse();
  const past = bookings.filter((b) => !isUpcoming(b, now));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Mis reservas</h1>

      <section className="flex flex-col gap-4" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="text-xl font-semibold">
          Próximas
        </h2>
        {upcoming.length ? (
          upcoming.map((booking) => (
            <BookingCard key={booking.id} booking={booking}>
              <BookingActions bookingId={booking.id} canCancel={canCancel(booking, now)} />
            </BookingCard>
          ))
        ) : (
          <EmptyState
            icon={CalendarX2}
            title="No tienes reservas próximas"
            description="Encuentra un estudio, sala o locación y reserva por hora."
            action={
              <Link href="/" className={buttonClasses()}>
                Explorar espacios
              </Link>
            }
          />
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="past-heading">
          <h2 id="past-heading" className="flex items-center gap-2 text-xl font-semibold">
            <History className="size-5 text-muted-foreground" aria-hidden />
            Historial
          </h2>
          {past.map((booking) => (
            <BookingCard key={booking.id} booking={booking}>
              {canReview(booking) && <ReviewForm bookingId={booking.id} />}
              {booking.status !== "completed" && booking.status !== "cancelled" && (
                <p className="text-sm text-muted-foreground">
                  Podrás reseñarla cuando el anfitrión la marque como completada.
                </p>
              )}
            </BookingCard>
          ))}
        </section>
      )}
    </main>
  );
}
