import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ClipboardCheck, Clapperboard, History, Store } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listMySpaces } from "@/lib/queries/spaces";
import { listHostBookings } from "@/lib/queries/bookings";
import { canCancel, canComplete, isUpcoming } from "@/lib/booking-rules";
import { formatCLP } from "@/lib/utils";
import { currentTime } from "@/lib/zoned-time";
import { BookingActions } from "@/components/bookings/booking-actions";
import { BookingCard } from "@/components/bookings/booking-card";
import { HostSpaceRow } from "@/components/dashboard/host-space-row";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Panel de anfitrión" };

const HISTORY_LIMIT = 20;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  if (user.profile.role === "client") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <EmptyState
          icon={Store}
          title="Tu cuenta es de cliente"
          description="El panel de anfitrión es para quienes publican espacios. Puedes revisar tus reservas en Mis reservas."
          action={
            <Link href="/mis-reservas" className={buttonClasses()}>
              Ir a mis reservas
            </Link>
          }
        />
      </main>
    );
  }

  const [spaces, bookings] = await Promise.all([listMySpaces(user.id), listHostBookings(user.id)]);
  const { now } = currentTime();

  // listHostBookings viene ordenada por inicio ascendente.
  const upcoming = bookings.filter((b) => isUpcoming(b, now));
  const toComplete = bookings.filter((b) => canComplete(b, now));
  const history = bookings
    .filter((b) => b.status === "completed" || b.status === "cancelled")
    .reverse()
    .slice(0, HISTORY_LIMIT);

  const completedRevenue = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.subtotal, 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Panel de anfitrión</h1>
        <p className="text-muted-foreground">Hola, {user.profile.full_name ?? "anfitrión"}. Gestiona tus espacios y reservas.</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Espacios publicados" value={spaces.filter((s) => s.status === "published").length} />
        <Stat label="Reservas próximas" value={upcoming.length} />
        <Stat label="Por completar" value={toComplete.length} />
        <Stat label="Ingresos completados" value={formatCLP(completedRevenue)} hint="Subtotal sin comisión" />
      </dl>

      <Section icon={Clapperboard} title="Mis espacios">
        {spaces.length ? (
          <ul className="flex flex-col gap-3">
            {spaces.map((space) => (
              <HostSpaceRow key={space.id} space={space} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={Store} title="Aún no tienes espacios" description="Cuando publiques un espacio aparecerá aquí." />
        )}
      </Section>

      {toComplete.length > 0 && (
        <Section icon={ClipboardCheck} title="Por completar" description="Reservas cuyo horario ya terminó. Márcalas como completadas para que el cliente pueda reseñarlas.">
          {toComplete.map((booking) => (
            <BookingCard key={booking.id} booking={booking}>
              <BookingActions bookingId={booking.id} canCancel={false} canComplete />
            </BookingCard>
          ))}
        </Section>
      )}

      <Section icon={CalendarClock} title="Reservas próximas">
        {upcoming.length ? (
          upcoming.map((booking) => (
            <BookingCard key={booking.id} booking={booking}>
              <BookingActions bookingId={booking.id} canCancel={canCancel(booking, now)} />
            </BookingCard>
          ))
        ) : (
          <EmptyState icon={CalendarClock} title="No tienes reservas próximas" />
        )}
      </Section>

      {history.length > 0 && (
        <Section icon={History} title="Historial" description={`Últimas ${HISTORY_LIMIT} reservas completadas o canceladas.`}>
          {history.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </Section>
      )}
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof History;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Icon className="size-5 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
