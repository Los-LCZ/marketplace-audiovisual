import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listMyBookings, type BookingWithSpace } from "@/lib/queries/bookings";
import { getProfileRatingStats } from "@/lib/queries/profiles";
import { listLikedSpaces } from "@/lib/queries/spaces";
import { canCancel, canReview, isUpcoming } from "@/lib/booking-rules";
import { loadBookingReviews, loadProfiles } from "@/lib/booking-reviews";
import { formatCLP, formatDate } from "@/lib/utils";
import { currentTime } from "@/lib/zoned-time";
import { BookingCard } from "@/components/bookings/booking-card";
import { BookingActions } from "@/components/bookings/booking-actions";
import { ReviewForm } from "@/components/bookings/review-form";
import { Avatar } from "@/components/ui/avatar";
import { RatingPill } from "@/components/ui/rating";
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

  const [bookings, liked, stats] = await Promise.all([
    listMyBookings(user.id),
    listLikedSpaces(user.id),
    getProfileRatingStats(user.id),
  ]);
  const { now, today } = currentTime();
  const myRating = stats.as_client.avg;

  const [reviews, hosts] = await Promise.all([
    loadBookingReviews(bookings),
    loadProfiles([
      ...liked.map((s) => s.host_id),
      ...bookings.filter((b) => b.status === "completed" && b.space).map((b) => b.space!.host_id),
    ]),
  ]);
  const hostName = (b: BookingWithSpace) => (b.space && hosts.get(b.space.host_id)?.full_name) || "El anfitrión";
  const blind = (b: BookingWithSpace) => {
    const data = reviews.get(b.id);
    return data ? { data, viewer: "client" as const, counterpart: hostName(b) } : null;
  };

  // listMyBookings viene por inicio descendente: las próximas, de la más cercana a la más lejana.
  const upcoming = bookings.filter((b) => isUpcoming(b, now)).reverse();
  const toRate = bookings.filter(canReview);
  const history = bookings.filter((b) => !isUpcoming(b, now) && !canReview(b));
  const firstName = (user.profile.full_name ?? "").split(" ")[0] || "de nuevo";

  return (
    <div className="wrap pt-[34px]">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.profile.full_name ?? user.email} size="lg" verified={user.profile.verified} />
          <div>
            <h1 className="display h2">Hola, {firstName}</h1>
            <Link
              href={`/u/${user.id}`}
              className="dim mt-1 inline-flex items-center gap-2 text-sm no-underline hover:underline"
            >
              <RatingPill rating={myRating} count={stats.as_client.count || undefined} /> Tu nota como cliente
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link className="btn btn-soft" href="/explorar">
            <Search aria-hidden />
            Buscar otro espacio
          </Link>
          <Link className="btn btn-acc" href="/descubrir">
            <Heart aria-hidden />
            Seguir descubriendo
          </Link>
        </div>
      </div>

      <div className="mt-[34px]">
        <Tabs
          initial={toRate.length && !upcoming.length ? "calificar" : upcoming.length || !liked.length ? "sesiones" : "matches"}
          tabs={[
            {
              key: "matches",
              label: "Matches",
              count: liked.length,
              content: liked.length ? (
                <div className="grid-cards">
                  {liked.map((space) => {
                    const host = hosts.get(space.host_id);
                    const min = host?.min_client_rating ?? null;
                    const match = min == null || (myRating != null && myRating >= min);
                    return (
                      <article key={space.id} className="panel overflow-hidden">
                        <div className="relative aspect-[16/10] bg-[var(--s2)]">
                          {space.images[0] && (
                            <Image src={space.images[0]} alt="" fill sizes="(min-width: 1100px) 400px, 100vw" className="object-cover" />
                          )}
                          <span
                            className="pill absolute top-3 left-3 border-0"
                            style={match ? { background: "var(--ok)", color: "#000" } : { background: "rgba(0,0,0,.6)", color: "#fff" }}
                          >
                            {match ? "Match" : "Irá como solicitud"}
                          </span>
                        </div>
                        <div className="grid gap-2.5 p-4">
                          <b>{space.title}</b>
                          <span className="dim text-[13px]">
                            {space.commune}, {formatCLP(space.price_per_hour)} por hora
                          </span>
                          {host && (
                            <Link href={`/u/${host.id}`} className="inline-flex items-center gap-2 text-[13px] no-underline">
                              <Avatar name={host.full_name} size="sm" verified={host.verified} />
                              {host.full_name}
                            </Link>
                          )}
                          <Link className={`btn btn-sm ${match ? "btn-acc" : "btn-soft"}`} href={`/espacios/${space.id}`}>
                            {match ? "Elegir horario" : "Ver ficha"}
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  title="Todavía no tienes matches"
                  text="Desliza espacios en Descubrir o toca el corazón en Explorar. Los que te gusten aparecen aquí."
                  href="/descubrir"
                  cta="Ir a Descubrir"
                />
              ),
            },
            {
              key: "sesiones",
              label: "Próximas sesiones",
              count: upcoming.length,
              content: upcoming.length ? (
                <div className="list">
                  {upcoming.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      today={today}
                      subtitle={
                        b.status === "requested" ? (
                          <span className="block text-[13px] text-warning">Esperando que el anfitrión acepte</span>
                        ) : null
                      }
                    >
                      <BookingActions bookingId={b.id} canCancel={canCancel(b, now)} isRequest={b.status === "requested"} />
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
                    <BookingCard key={b.id} booking={b} today={today} reviews={blind(b)}>
                      <ReviewForm
                        bookingId={b.id}
                        target="space"
                        name={b.space?.title ?? "el espacio"}
                        context={`Sesión del ${formatDate(b.start_time)}.`}
                      />
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
                    <BookingCard key={b.id} booking={b} today={today} reviews={blind(b)}>
                      {b.status === "confirmed" || b.status === "pending_payment" ? (
                        <p className="dim text-sm">Podrás calificarla cuando el anfitrión la marque como completada.</p>
                      ) : b.status === "rejected" ? (
                        <Link className="btn btn-soft btn-sm" href="/explorar">
                          Buscar otro espacio
                        </Link>
                      ) : null}
                    </BookingCard>
                  ))}
                </div>
              ) : (
                <Empty title="Sin historial todavía" text="Tus sesiones pasadas, canceladas y rechazadas aparecerán aquí." href="/explorar" cta="Explorar espacios" />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
