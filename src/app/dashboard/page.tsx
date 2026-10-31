import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listMySpaces } from "@/lib/queries/spaces";
import { listHostBookings } from "@/lib/queries/bookings";
import { canCancel, canComplete, isUpcoming } from "@/lib/booking-rules";
import { isOpenBooking } from "@/lib/labels";
import { formatCLP, formatRating } from "@/lib/utils";
import { addDays, currentTime, zonedTimeToUtc } from "@/lib/zoned-time";
import { BookingActions } from "@/components/bookings/booking-actions";
import { BookingCard } from "@/components/bookings/booking-card";
import { HostSpaceRow } from "@/components/dashboard/host-space-row";
import { Avatar } from "@/components/ui/avatar";

export const metadata: Metadata = { title: "Panel de anfitrión" };

const HISTORY_LIMIT = 20;
const OCC_SEGMENTS = 16;
// Horas reservables por día que se usan para estimar la ocupación (08:00 a 24:00).
const BOOKABLE_HOURS_PER_DAY = 16;

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="display h3">{title}</h2>
      {description && <p className="dim mt-1.5 mb-5 max-w-[56ch] text-sm">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
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

  const [spaces, bookings] = await Promise.all([listMySpaces(user.id), listHostBookings(user.id)]);
  const { now, today } = currentTime();

  // listHostBookings viene por inicio ascendente.
  const upcoming = bookings.filter((b) => isUpcoming(b, now));
  const toComplete = bookings.filter((b) => canComplete(b, now));
  const history = bookings
    .filter((b) => b.status === "completed" || b.status === "cancelled")
    .reverse()
    .slice(0, HISTORY_LIMIT);

  // Ingresos del mes (subtotal, sin tarifa de servicio) de sesiones confirmadas o completadas.
  const monthPrefix = today.slice(0, 7);
  const monthIncome = bookings
    .filter((b) => b.status !== "cancelled" && b.start_time.slice(0, 7) === monthPrefix)
    .reduce((sum, b) => sum + b.subtotal, 0);

  // Nota como anfitrión: promedio de los espacios ponderado por cantidad de reseñas.
  const reviewCount = spaces.reduce((n, s) => n + s.review_count, 0);
  const hostRating = reviewCount
    ? spaces.reduce((sum, s) => sum + (s.avg_rating ?? 0) * s.review_count, 0) / reviewCount
    : null;

  // Ocupación de los próximos 7 días sobre las horas reservables de los espacios publicados.
  const published = spaces.filter((s) => s.status === "published");
  const weekEnd = zonedTimeToUtc(addDays(today, 7), 0);
  const bookedHours = bookings
    .filter((b) => isOpenBooking(b.status) && Date.parse(b.start_time) < weekEnd && Date.parse(b.end_time) > now)
    .reduce((h, b) => h + b.total_hours, 0);
  const capacity = published.length * 7 * BOOKABLE_HOURS_PER_DAY;
  const occupancy = capacity ? Math.min(1, bookedHours / capacity) : 0;
  const lit = Math.round(occupancy * OCC_SEGMENTS);

  return (
    <div className="wrap pt-[34px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.profile.full_name ?? user.email} size="lg" />
          <div>
            <p className="mono acc">Panel de anfitrión</p>
            <h1 className="display h2 mt-1">Hola, {(user.profile.full_name ?? "").split(" ")[0] || "anfitrión"}</h1>
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
          ["Por completar", String(toComplete.length)],
          ["Tu nota como anfitrión", hostRating != null ? formatRating(hostRating) : "—"],
          ["Próximas sesiones", String(upcoming.length)],
        ].map(([label, value]) => (
          <div key={label} className="kpi panel">
            <dt>{label}</dt>
            <dd>{value}</dd>
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
          {published.length === 1 ? "espacio publicado" : "espacios publicados"}, de 08:00 a 24:00).
        </p>
      </div>

      <div className="host-grid">
        <div className="grid content-start gap-10">
          {toComplete.length > 0 && (
            <Section
              title="Por completar"
              description="Sesiones cuyo horario ya terminó. Márcalas como completadas para que el cliente pueda calificarlas."
            >
              <div className="list">
                {toComplete.map((b) => (
                  <BookingCard key={b.id} booking={b} today={today}>
                    <BookingActions bookingId={b.id} canCancel={false} canComplete />
                  </BookingCard>
                ))}
              </div>
            </Section>
          )}

          <Section title="Próximas sesiones">
            {upcoming.length ? (
              <div className="list">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} today={today}>
                    <BookingActions bookingId={b.id} canCancel={canCancel(b, now)} />
                  </BookingCard>
                ))}
              </div>
            ) : (
              <p className="dim rounded-[10px] border border-dashed border-[var(--line2)] p-3.5 text-sm">
                Las reservas de tus espacios aparecerán aquí.
              </p>
            )}
          </Section>

          {history.length > 0 && (
            <Section title="Historial" description={`Últimas ${HISTORY_LIMIT} sesiones completadas o canceladas.`}>
              <div className="list">
                {history.map((b) => (
                  <BookingCard key={b.id} booking={b} today={today} />
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
