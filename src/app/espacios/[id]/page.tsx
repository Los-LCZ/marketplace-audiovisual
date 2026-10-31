import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BrickWall,
  ChevronLeft,
  CircleCheck,
  Clock,
  DoorOpen,
  Guitar,
  MapPin,
  ShieldCheck,
  Tag,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSpaceBusySlots, getSpaceById, getSpaceReviews, REVIEWS_PAGE_SIZE } from "@/lib/queries/spaces";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { firstParam, parseDateParam } from "@/lib/search-params";
import { formatCLP } from "@/lib/utils";
import { worldOf } from "@/lib/world";
import { addDays, currentTime, zonedTimeToUtc } from "@/lib/zoned-time";
import { Avatar } from "@/components/ui/avatar";
import { SpaceStatusBadge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Pagination } from "@/components/ui/pagination";
import { RatingPill } from "@/components/ui/rating";
import { BookingPanel } from "@/components/bookings/booking-widget";
import { GearAccordion } from "@/components/spaces/gear-accordion";
import { ReviewList } from "@/components/spaces/review-list";
import { SpaceGallery } from "@/components/spaces/space-gallery";

const BOOKING_DAYS_AHEAD = 14;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Infraestructura destacada: se deriva del equipamiento (amenities) del espacio.
const FEATURES: { label: string; match: RegExp; icon: LucideIcon }[] = [
  { label: "Backline incluido", match: /backline/i, icon: Guitar },
  { label: "Potencia trifásica", match: /trif[aá]sica/i, icon: Zap },
  { label: "Control room separado", match: /control room/i, icon: DoorOpen },
  { label: "Aislación acústica", match: /ac[uú]stic/i, icon: BrickWall },
];

// Compartido entre generateMetadata y la página dentro del mismo request.
const getSpace = cache(async (id: string) => (UUID_RE.test(id) ? getSpaceById(id) : null));

export async function generateMetadata({ params }: PageProps<"/espacios/[id]">): Promise<Metadata> {
  const space = await getSpace((await params).id);
  if (!space) return { title: "Espacio no encontrado" };
  return {
    title: space.title,
    description: space.description?.slice(0, 160) ?? `${SPACE_CATEGORY_LABELS[space.category]} en ${space.commune}`,
  };
}

export default async function SpacePage({ params, searchParams }: PageProps<"/espacios/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const reviewsPage = Math.max(1, Number(firstParam(query.resenas)) || 1);

  const [space, user] = await Promise.all([getSpace(id), getCurrentUser()]);
  if (!space) notFound();

  const isOwner = user?.id === space.host_id;
  const world = worldOf(space.category);
  const { now, today } = currentTime();

  const [reviews, busySlots] = await Promise.all([
    space.review_count ? getSpaceReviews(space.id, reviewsPage) : [],
    space.status === "published"
      ? getSpaceBusySlots(
          space.id,
          new Date(zonedTimeToUtc(today, 0)),
          new Date(zonedTimeToUtc(addDays(today, BOOKING_DAYS_AHEAD + 1), 0)),
        )
      : [],
  ]);
  const amenityNames = space.amenities.map((a) => a.name);
  const paragraphs = space.description?.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) ?? [];
  const hostName = space.host?.full_name ?? "Anfitrión";

  return (
    // data-world: cada espacio se ve en su propio mundo, sin importar el mundo activo.
    <div className="wrap" data-world={world}>
      <Link className="back" href="/explorar">
        <ChevronLeft aria-hidden />
        Volver a explorar
      </Link>

      {space.status !== "published" && (
        <p className="panel mb-4 px-4 py-3 text-sm text-warning">
          Este espacio no está publicado ({space.status === "draft" ? "borrador" : "archivado"}): solo tú puedes verlo.
        </p>
      )}

      <p className="mono acc inline-flex items-center gap-1.5">
        <CategoryIcon category={space.category} className="size-3.5" />
        {SPACE_CATEGORY_LABELS[space.category]}
        {isOwner && <SpaceStatusBadge status={space.status} />}
      </p>
      <h1 className="display h2 mt-2">{space.title}</h1>
      <p className="dim mt-2 flex flex-wrap items-center gap-4">
        <RatingPill rating={space.avg_rating} count={space.review_count} label="reseñas" />
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden />
          {space.address}, {space.commune}, {space.city}
        </span>
      </p>

      <div className="detail">
        <div className="grid min-w-0 gap-10">
          <SpaceGallery images={space.images} title={space.title} world={world} />

          <dl className="specs">
            {[
              ["Precio", `${formatCLP(space.price_per_hour)} / h`, Tag],
              ["Mínimo", `${space.min_hours} ${space.min_hours === 1 ? "hora" : "horas"}`, Clock],
              ["Comuna", space.commune, MapPin],
            ].map(([label, value, Icon]) => {
              const I = Icon as LucideIcon;
              return (
                <div key={label as string} className="spec panel">
                  <dt>
                    <I className="inline size-3 align-[-1px]" aria-hidden /> {label as string}
                  </dt>
                  <dd>{value as string}</dd>
                </div>
              );
            })}
          </dl>

          <section className="host-card panel" aria-label="Anfitrión">
            <div className="host-top">
              <span className="flex min-w-[220px] flex-1 items-center gap-3.5">
                <Avatar name={hostName} size="lg" />
                <span>
                  <b>Anfitrión: {hostName}</b>
                  <br />
                  {space.host && (
                    <span className="dim text-sm">En Señal desde {new Date(space.host.created_at).getFullYear()}</span>
                  )}
                </span>
              </span>
            </div>
            <p className="rule">
              <ShieldCheck aria-hidden />
              Reserva directa: eliges tu bloque y la sesión queda confirmada al tiro. Puedes cancelarla desde Mis sesiones
              antes de que comience.
            </p>
          </section>

          {paragraphs.length > 0 && (
            <section>
              <h2 className="display h3">Sobre el espacio</h2>
              <div className="dim mt-3.5 grid max-w-[65ch] gap-3.5">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="display h3">Infraestructura</h2>
            <div className="feats mt-3.5">
              {FEATURES.map((f) => {
                const has = amenityNames.some((n) => f.match.test(n));
                const Icon = has ? CircleCheck : f.icon;
                return (
                  <div key={f.label} className={`feat ${has ? "" : "no"}`}>
                    <Icon aria-hidden />
                    {f.label}
                    <span className="sr-only">{has ? "disponible" : "no disponible"}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {space.amenities.length > 0 && (
            <section>
              <h2 className="display h3">Equipamiento técnico</h2>
              <p className="dim mt-1 text-sm">Todo lo listado está incluido en el precio por hora.</p>
              <div className="mt-3.5">
                <GearAccordion amenities={space.amenities} />
              </div>
            </section>
          )}

          <section>
            <h2 className="display h3">Antes de reservar</h2>
            <ul className="rules mt-3.5">
              <li>
                Reservas por horas completas, con un mínimo de {space.min_hours} {space.min_hours === 1 ? "hora" : "horas"}.
              </li>
              <li>Al precio por hora se suma una tarifa de servicio de 10%.</li>
              <li>Puedes cancelar desde Mis sesiones mientras la reserva no haya comenzado.</li>
              <li>Después de la sesión, el anfitrión la marca como completada y puedes dejar tu reseña.</li>
            </ul>
          </section>

          <section id="resenas" className="scroll-mt-24">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="display h3">Reseñas</h2>
              <RatingPill rating={space.avg_rating} count={space.review_count} />
            </div>
            {reviews.length ? (
              <>
                <ReviewList reviews={reviews} />
                <div className="mt-6">
                  <Pagination
                    page={reviewsPage}
                    totalPages={Math.ceil(space.review_count / REVIEWS_PAGE_SIZE)}
                    hrefForPage={(p) => `/espacios/${space.id}${p > 1 ? `?resenas=${p}` : ""}#resenas`}
                  />
                </div>
              </>
            ) : (
              <p className="dim mt-3 text-sm">
                {space.review_count ? "No hay más reseñas." : "Todavía no hay reseñas. Reserva y sé el primero en contar tu experiencia."}
              </p>
            )}
          </section>
        </div>

        <aside aria-label="Reserva">
          {isOwner ? (
            <div className="book panel">
              <b>Este es tu espacio</b>
              <p className="dim text-sm">Gestiona su estado y revisa las reservas recibidas desde tu panel.</p>
              <Link className="btn btn-acc" href="/dashboard">
                Ir al panel de anfitrión
              </Link>
            </div>
          ) : space.status === "published" ? (
            <BookingPanel
              spaceId={space.id}
              spaceTitle={space.title}
              pricePerHour={space.price_per_hour}
              minHours={space.min_hours}
              avgRating={space.avg_rating}
              reviewCount={space.review_count}
              busySlots={busySlots}
              today={today}
              now={now}
              initialDate={parseDateParam(query)}
              loginHref={user ? null : `/login?next=${encodeURIComponent(`/espacios/${space.id}`)}`}
            />
          ) : (
            <div className="book panel">
              <p className="dim text-sm">Este espacio no está disponible para reservas.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
