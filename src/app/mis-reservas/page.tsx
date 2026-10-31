import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listMyBookings } from "@/lib/queries/bookings";
import { canCancel, canReview, isUpcoming } from "@/lib/booking-rules";
import { currentTime } from "@/lib/zoned-time";
import { BookingCard } from "@/components/bookings/booking-card";
import { BookingActions } from "@/components/bookings/booking-actions";
import { ReviewForm } from "@/components/bookings/review-form";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Mis sesiones" };

function Empty({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="empty">
      <b>{title}</b>
      <p className="dim">{text}</p>
      <Link className="btn btn-soft" href={href}>
        {cta}
      </Link>
    </div>
  );
}

export default async function MisReservasPage() {
  // El proxy ya protege la ruta; esto cubre una sesión que expiró entre medio.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mis-reservas");

  const bookings = await listMyBookings(user.id);
  const { now, today } = currentTime();

  // listMyBookings viene por inicio descendente: las próximas, de la más cercana a la más lejana.
  const upcoming = bookings.filter((b) => isUpcoming(b, now)).reverse();
  const toRate = bookings.filter(canReview);
  const history = bookings.filter((b) => !isUpcoming(b, now) && !canReview(b));
  const firstName = (user.profile.full_name ?? "").split(" ")[0] || "de nuevo";

  return (
    <div className="wrap pt-[34px]">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.profile.full_name ?? user.email} size="lg" />
          <div>
            <h1 className="display h2">Hola, {firstName}</h1>
            <span className="dim text-sm">{user.email}</span>
          </div>
        </div>
        <Link className="btn btn-acc" href="/explorar">
          <Search aria-hidden />
          Buscar otro espacio
        </Link>
      </div>

      <div className="mt-[34px]">
        <Tabs
          initial={toRate.length && !upcoming.length ? "calificar" : "sesiones"}
          tabs={[
            {
              key: "sesiones",
              label: "Próximas sesiones",
              count: upcoming.length,
              content: upcoming.length ? (
                <div className="list">
                  {upcoming.map((b) => (
                    <BookingCard key={b.id} booking={b} today={today}>
                      <BookingActions bookingId={b.id} canCancel={canCancel(b, now)} />
                    </BookingCard>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No tienes sesiones reservadas"
                  text="Cuando reserves un bloque en la ficha de un espacio, lo verás aquí."
                  href="/explorar"
                  cta="Explorar espacios"
                />
              ),
            },
            {
              key: "calificar",
              label: "Por calificar",
              count: toRate.length,
              alert: true,
              content: toRate.length ? (
                <div className="list">
                  {toRate.map((b) => (
                    <BookingCard key={b.id} booking={b} today={today}>
                      <ReviewForm bookingId={b.id} spaceTitle={b.space?.title ?? "el espacio"} />
                    </BookingCard>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Nada por calificar"
                  text="Cuando el anfitrión marque una sesión como completada, podrás calificarla aquí."
                  href="/explorar"
                  cta="Explorar espacios"
                />
              ),
            },
            {
              key: "historial",
              label: "Historial",
              count: history.length,
              content: history.length ? (
                <div className="list">
                  {history.map((b) => (
                    <BookingCard key={b.id} booking={b} today={today}>
                      {b.status === "confirmed" || b.status === "pending_payment" ? (
                        <p className="dim text-sm">Podrás calificarla cuando el anfitrión la marque como completada.</p>
                      ) : null}
                    </BookingCard>
                  ))}
                </div>
              ) : (
                <Empty title="Sin historial todavía" text="Tus sesiones pasadas y canceladas aparecerán aquí." href="/explorar" cta="Explorar espacios" />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
