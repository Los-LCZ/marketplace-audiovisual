import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { BookingWithSpace } from "@/lib/queries/bookings";
import { formatCLP, formatDate, formatTimeRange } from "@/lib/utils";
import { BookingStatusBadge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/rating";
import { SpaceImage } from "@/components/spaces/space-image";

// Tarjeta de reserva compartida por /mis-reservas y /dashboard; `children` lleva las acciones.
export function BookingCard({ booking, children }: { booking: BookingWithSpace; children?: ReactNode }) {
  const { space, review } = booking;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface sm:flex-row">
      <SpaceImage
        src={space?.images[0]}
        alt={space?.title ?? "Espacio"}
        sizes="(min-width: 640px) 224px, 100vw"
        className="sm:w-56 sm:shrink-0"
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {space ? (
              <Link href={`/espacios/${space.id}`} className="font-semibold hover:underline">
                {space.title}
              </Link>
            ) : (
              <p className="font-semibold">Espacio no disponible</p>
            )}
            {space && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden />
                {space.commune}, {space.city}
              </p>
            )}
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
            <span className="capitalize">{formatDate(booking.start_time)}</span>
            <span className="text-muted-foreground">· {formatTimeRange(booking.start_time, booking.end_time)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{booking.total_hours} h · Total </span>
            <span className="font-semibold">{formatCLP(booking.total_amount)}</span>
          </p>
        </div>

        {review && (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Reseña</span>
              <Stars rating={review.rating} />
            </div>
            {review.comment && <p className="mt-1 text-muted-foreground">{review.comment}</p>}
          </div>
        )}

        {children && <div className="mt-auto flex flex-wrap items-start gap-2 pt-1">{children}</div>}
      </div>
    </article>
  );
}
