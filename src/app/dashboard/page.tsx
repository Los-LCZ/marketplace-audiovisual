import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listMySpaces } from "@/lib/queries/spaces";
import { listHostBookings, listHostRequests, type HostBooking } from "@/lib/queries/bookings";
import { getHostResponseStats, getProfileRatingStats } from "@/lib/queries/profiles";
import { canCancel, canComplete, isUpcoming } from "@/lib/booking-rules";
import { loadBookingReviews } from "@/lib/booking-reviews";
import { isOpenBooking } from "@/lib/labels";
import { formatCLP, formatDate, formatRating } from "@/lib/utils";
import { addDays, currentTime, zonedTimeToUtc } from "@/lib/zoned-time";
import { BookingActions } from "@/components/bookings/booking-actions";
import { BookingCard } from "@/components/bookings/booking-card";
import { ReviewForm } from "@/components/bookings/review-form";
import { HostSpaceRow } from "@/components/dashboard/host-space-row";
import { MinRatingForm } from "@/components/dashboard/min-rating-form";
import { RequestDeck } from "@/components/deck/request-deck";
import { Avatar } from "@/components/ui/avatar";
import { RatingPill } from "@/components/ui/rating";
import type { BookingStatus } from "@/types/database";

export const metadata: Metadata = { title: "Panel de anfitrión" };

const HISTORY_LIMIT = 20;
const OCC_SEGMENTS = 16;
// Ingresos: sesiones reservadas que siguen en pie (no solicitudes, canceladas ni rechazadas).
const INCOME_STATUSES: BookingStatus[] = ["pending_payment", "confirmed", "completed"];
const HISTORY_STATUSES: BookingStatus[] = ["completed", "cancelled", "rejected", "expired"];

/** Mediana de respuesta legible: "25 min", "3 h", "2 d". */
function formatMinutes(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 60 / 24)} d`;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="display h3">{title}</h2>
      {description && <p className="dim mt-1.5 mb-5 max-w-[56ch] text-sm">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

// Quién reservó, con su nota como cliente y link a su perfil.
function ClientLine({ booking }: { booking: HostBooking }) {
  const client = booking.client;
  if (!client) return null;
  return (
    <Link href={`/u/${client.id}`} className="mt-1 flex items-center gap-2 text-[13px] no-underline hover:underline">
      <Avatar name={client.full_name} size="sm" verified={client.verified} />
      {client.full_name ?? "Cliente"}
      <RatingPill rating={client.avg_rating} count={client.review_count || undefined} />
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  if (user.profile.role === "client") {
    return (
      <div className="wrap pt-[34px]">
        <div className="empty">
          <b>Tu cuenta es de cliente</b>
          <p className="dim">El panel de anfitrión es para quienes publican espacios. Revisa tus reservas en Mis sesiones.</p>
          <Link className="btn btn-soft" href="/mis-reservas">
            Ir a mis sesiones
          </Link>
        </div>
      </div>
    );
  }

  const [spaces, bookings, requests, stats, response] = await Promise.all([
    listMySpaces(user.id),
    listHostBookings(user.id),
    listHostRequests(user.id),
    getProfileRatingStats(user.id),
    getHostResponseStats(user.id),
  ]);
  const { now, today } = currentTime();
  const reviews = await loadBookingReviews(bookings);
  const blind = (b: HostBooking) => {
    const data = reviews.get(b.id);
    return data ? { data, viewer: "host" as const, counterpart: b.client?.full_name ?? "El cliente" } : null;
  };

  // listHostBookings viene por inicio ascendente. Las solicitudes van en su propio mazo.
  const openRequests = requests.filter((r) => Date.parse(r.start_time) > now);
  const upcoming = bookings.filter((b) => b.status !== "requested" && isUpcoming(b, now));
  const toComplete = bookings.filter((b) => canComplete(b, now));
  const toRateClients = bookings.filter(
    (b) => b.status === "completed" && reviews.get(b.id)?.client_review_submitted === false,
  );
  const history = bookings
    .filter((b) => HISTORY_STATUSES.includes(b.status) && !toRateClients.includes(b))
    .reverse()
    .slice(0, HISTORY_LIMIT);

  // Ingresos del mes (subtotal, sin tarifa de servicio).
  const monthPrefix = today.slice(0, 7);
  const monthIncome = bookings
    .filter((b) => INCOME_STATUSES.includes(b.status) && b.start_time.slice(0, 7) === monthPrefix)
    .reduce((sum, b) => sum + b.subtotal, 0);

  const hostRating = stats.as_host.avg;

  // Ocupación de los próximos 7 días sobre el horario de los espacios publicados.
  const published = spaces.filter((s) => s.status === "published");
  const weekEnd = zonedTimeToUtc(addDays(today, 7), 0);
  const bookedHours = bookings
    .filter((b) => isOpenBooking(b.status) && Date.parse(b.start_time) < weekEnd && Date.parse(b.end_time) > now)
    .reduce((h, b) => h + b.total_hours, 0);
  const capacity = published.reduce((h, s) => h + 7 * (s.close_hour - s.open_hour), 0);
  const occupancy = capacity ? Math.min(1, bookedHours / capacity) : 0;
  const lit = Math.round(occupancy * OCC_SEGMENTS);

  return (
    <div className="wrap pt-[34px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.profile.full_name ?? user.email} size="lg" verified={user.profile.verified} />
          <div>
            <p className="mono acc">Panel de anfitrión</p>
            <h1 className="display h2 mt-1">Hola, {(user.profile.full_name ?? "").split(" ")[0] || "anfitrión"}</h1>
            <Link
              href={`/u/${user.id}`}
              className="dim mt-1.5 inline-flex items-center gap-2 text-sm no-underline hover:underline"
            >
              <RatingPill rating={hostRating} count={stats.as_host.count || undefined} /> Ver tu perfil público
            </Link>
          </div>
        </div>
        <Link className="btn btn-acc" href="/espacios/nuevo">
          <Plus aria-hidden />
          Publicar espacio
        </Link>
      </div>

      <dl className="kpis mt-7">
        {[
          ["Ingresos del mes", formatCLP(monthIncome)],
          ["Solicitudes por revisar", String(openRequests.length), `${toComplete.length} por completar`],
          ["Tu nota como anfitrión", hostRating != null ? formatRating(hostRating) : "—"],
          [
            "Tiempo de respuesta",
            response.median_response_minutes != null ? formatMinutes(response.median_response_minutes) : "Sin datos",
            response.response_rate != null
              ? `Respondes el ${Math.round(response.response_rate * 100)}% a tiempo`
              : response.request_count
                ? "Aún no decides ninguna solicitud"
                : "Aún no recibes solicitudes",
          ],
        ].map(([label, value, hint]) => (
          <div key={label} className="kpi panel">
            <dt>{label}</dt>
            <dd>{value}</dd>
            {hint && <p className="dim mt-1 text-xs">{hint}</p>}
          </div>
        ))}
      </dl>

      <div className="panel mt-3 p-4">
        <div className="flex justify-between text-sm">
          <b>Ocupación de los próximos 7 días</b>
          <span className="mono">{Math.round(occupancy * 100)}%</span>
        </div>
        <div className="vu-row" aria-hidden>
          {Array.from({ length: OCC_SEGMENTS }, (_, i) => (
            <b key={i} className={`${i < lit ? "on" : ""} ${i >= 11 ? "h" : ""} ${i >= 14 ? "p" : ""}`} />
          ))}
        </div>
        <p className="dim mt-2 text-xs">
          {bookedHours} h reservadas sobre {capacity} h disponibles ({published.length}{" "}
          {published.length === 1 ? "espacio publicado" : "espacios publicados"}, según su horario).
        </p>
      </div>

      <div className="host-grid">
        <div className="grid content-start gap-10">
          <section aria-labelledby="sol-t">
            <h2 className="display h3" id="sol-t">
              Solicitudes
            </h2>
            <p className="dim mt-1.5 mb-5 max-w-[56ch] text-sm">
              Clientes que no alcanzan tu nota mínima. Revisa su nota y la última reseña que les dejó otro anfitrión.
              Desliza a la derecha para aceptar.
            </p>
            <RequestDeck requests={openRequests} />
          </section>

          {toComplete.length > 0 && (
            <Section
              title="Por completar"
              description="Sesiones cuyo horario ya terminó. Márcalas como completadas para que ambos puedan calificarse."
            >
              <div className="list">
                {toComplete.map((b) => (
                  <BookingCard key={b.id} booking={b} today={today} subtitle={<ClientLine booking={b} />}>
                    <BookingActions bookingId={b.id} canCancel={false} canComplete />
                  </BookingCard>
                ))}
              </div>
            </Section>
          )}

          {toRateClients.length > 0 && (
            <Section
              title="Califica a tus clientes"
              description="Tu nota es la reputación que ven los demás anfitriones. El cliente no la ve hasta calificarte o pasados 14 días."
            >
              <div className="list">
                {toRateClients.map((b) => (
                  <BookingCard key={b.id} booking={b} today={today} subtitle={<ClientLine booking={b} />} reviews={blind(b)}>
                    <ReviewForm
                      bookingId={b.id}
                      target="client"
                      name={b.client?.full_name ?? "el cliente"}
                      context={`Sesión del ${formatDate(b.start_time)}${b.space ? ` en ${b.space.title}` : ""}.`}
                    />
                  </BookingCard>
                ))}
              </div>
            </Section>
          )}

          <Section title="Próximas sesiones">
            {upcoming.length ? (
              <div className="list">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} today={today} subtitle={<ClientLine booking={b} />}>
                    <BookingActions bookingId={b.id} canCancel={canCancel(b, now)} />
                  </BookingCard>
                ))}
              </div>
            ) : (
              <p className="dim rounded-[10px] border border-dashed border-[var(--line2)] p-3.5 text-sm">
                Las reservas y solicitudes que aceptes aparecerán aquí.
              </p>
            )}
          </Section>

          {history.length > 0 && (
            <Section title="Historial" description={`Últimas ${HISTORY_LIMIT} sesiones completadas, canceladas, rechazadas o vencidas.`}>
              <div className="list">
                {history.map((b) => (
                  <BookingCard key={b.id} booking={b} today={today} subtitle={<ClientLine booking={b} />} reviews={blind(b)} />
                ))}
              </div>
            </Section>
          )}
        </div>

        <aside className="grid content-start gap-[34px]">
          <section>
            <b>{spaces.length === 1 ? "Tu espacio" : "Tus espacios"}</b>
            {spaces.length ? (
              <ul className="mt-2.5 grid gap-3">
                {spaces.map((space) => (
                  <HostSpaceRow key={space.id} space={space} />
                ))}
              </ul>
            ) : (
              <div className="empty mt-2.5">
                <b>Aún no tienes espacios</b>
                <p className="dim text-sm">Publica tu estudio, sala o locación para empezar a recibir reservas.</p>
                <Link className="btn btn-acc" href="/espacios/nuevo">
                  Publicar mi primer espacio
                </Link>
              </div>
            )}
          </section>
          <MinRatingForm profile={user.profile} />
          <section className="panel grid gap-2.5 p-[18px]">
            <b>Pausar reservas</b>
            <p className="dim text-[13px]">
              Pasa un espacio a Borrador para sacarlo de las búsquedas sin perder su ficha. Vuelve a Publicado cuando
              quieras recibir reservas otra vez.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
