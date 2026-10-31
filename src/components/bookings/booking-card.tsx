import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { BookingWithSpace } from "@/lib/queries/bookings";
import { formatCLP, formatTimeRange } from "@/lib/utils";
import { dayLabel, dayOfMonth, zonedDateString } from "@/lib/zoned-time";
import { BookingStatusBadge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/rating";

// Fila de reserva (.li) compartida por /mis-reservas y /dashboard; `children` lleva las acciones.
export function BookingCard({
  booking,
  today,
  subtitle,
  children,
}: {
  booking: BookingWithSpace;
  today: string;
  /** Línea extra bajo el título (p. ej. el cliente en el panel del anfitrión). */
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  const { space, review } = booking;
  const date = zonedDateString(Date.parse(booking.start_time));

  return (
    <article className="panel p-3.5">
      <div className="li p-0">
        <div className="date-box">
          <span className="text-[11px]">{dayLabel(date, today)}</span>
          <b>{dayOfMonth(date)}</b>
        </div>
        <div className="thumb hidden sm:block">
          {space?.images[0] && <Image src={space.images[0]} alt="" width={64} height={64} />}
        </div>
        <div className="grow">
          {space ? (
            <Link href={`/espacios/${space.id}`} className="font-bold no-underline hover:underline">
              {space.title}
            </Link>
          ) : (
            <b>Espacio no disponible</b>
          )}
          <span className="dim block text-[13px]">
            {formatTimeRange(booking.start_time, booking.end_time)} · {booking.total_hours} h
            {space && ` · ${space.commune}`}
          </span>
          {subtitle}
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <BookingStatusBadge status={booking.status} />
          <span className="mono">{formatCLP(booking.total_amount)}</span>
        </div>
      </div>

      {review && (
        <div className="reveal">
          <span className="dim text-xs">Tu calificación </span>
          <Stars rating={review.rating} />
          {review.comment && <p className="mt-1">“{review.comment}”</p>}
        </div>
      )}

      {children && <div className="mt-3 flex flex-wrap items-start gap-2">{children}</div>}
    </article>
  );
}
