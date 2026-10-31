import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, MapPin, MessageSquare, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSpaceBusySlots, getSpaceById, getSpaceReviews, REVIEWS_PAGE_SIZE } from "@/lib/queries/spaces";
import { AMENITY_CATEGORY_LABELS, SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { firstParam } from "@/lib/search-params";
import { formatShortDate } from "@/lib/utils";
import { addDays, currentTime, zonedTimeToUtc } from "@/lib/zoned-time";
import { Badge, SpaceStatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { RatingSummary } from "@/components/ui/rating";
import { BookingWidget } from "@/components/bookings/booking-widget";
import { ReviewList } from "@/components/spaces/review-list";
import { SpaceGallery } from "@/components/spaces/space-gallery";

const BOOKING_DAYS_AHEAD = 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const reviewsPage = Math.max(1, Number(firstParam((await searchParams).resenas)) || 1);

  const [space, user] = await Promise.all([getSpace(id), getCurrentUser()]);
  if (!space) notFound();

  const isOwner = user?.id === space.host_id;
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
  const reviewPages = Math.ceil(space.review_count / REVIEWS_PAGE_SIZE);

  const amenityGroups = Object.groupBy(space.amenities, (a) => a.category);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      {space.status !== "published" && (
        <p className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          Este espacio no está publicado ({space.status === "draft" ? "borrador" : "archivado"}): solo tú puedes verlo.
        </p>
      )}

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{SPACE_CATEGORY_LABELS[space.category]}</Badge>
          {isOwner && <SpaceStatusBadge status={space.status} />}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{space.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <RatingSummary avgRating={space.avg_rating} reviewCount={space.review_count} />
          <span className="flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            {space.address}, {space.commune}, {space.city}
          </span>
        </div>
      </header>

      <SpaceGallery images={space.images} title={space.title} />

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-8">
          <section className="flex items-center gap-3 border-b border-border pb-6">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-medium">Anfitrión: {space.host?.full_name ?? "Anfitrión"}</p>
              {space.host && (
                <p className="text-sm text-muted-foreground">En la plataforma desde {formatShortDate(space.host.created_at)}</p>
              )}
            </div>
          </section>

          {space.description && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Sobre este espacio</h2>
              <p className="leading-relaxed whitespace-pre-line">{space.description}</p>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Condiciones</h2>
            <p className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground" aria-hidden />
              Reserva por horas completas, mínimo {space.min_hours} {space.min_hours === 1 ? "hora" : "horas"}.
            </p>
          </section>

          {space.amenities.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Equipamiento</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["audio", "video", "general"] as const).map((group) =>
                  amenityGroups[group]?.length ? (
                    <div key={group}>
                      <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                        {AMENITY_CATEGORY_LABELS[group]}
                      </h3>
                      <ul className="flex flex-col gap-1.5">
                        {amenityGroups[group].map((a) => (
                          <li key={a.id} className="flex items-center gap-2 text-sm">
                            <Check className="size-4 text-success" aria-hidden />
                            {a.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          )}

          <section id="resenas" className="flex scroll-mt-24 flex-col gap-4 border-t border-border pt-8">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Reseñas</h2>
              <RatingSummary avgRating={space.avg_rating} reviewCount={space.review_count} />
            </div>
            {reviews.length ? (
              <>
                <ReviewList reviews={reviews} />
                <Pagination
                  page={reviewsPage}
                  totalPages={reviewPages}
                  hrefForPage={(p) => `/espacios/${space.id}${p > 1 ? `?resenas=${p}` : ""}#resenas`}
                />
              </>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title={space.review_count ? "No hay más reseñas" : "Todavía no hay reseñas"}
                description={space.review_count ? undefined : "Reserva y sé el primero en contar tu experiencia."}
              />
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            {isOwner ? (
              <div className="flex flex-col gap-3">
                <p className="font-semibold">Este es tu espacio</p>
                <p className="text-sm text-muted-foreground">
                  Gestiona su estado y revisa las reservas recibidas desde tu panel.
                </p>
                <Link href="/dashboard" className={buttonClasses()}>
                  Ir al panel de anfitrión
                </Link>
              </div>
            ) : space.status === "published" ? (
              <BookingWidget
                spaceId={space.id}
                pricePerHour={space.price_per_hour}
                minHours={space.min_hours}
                busySlots={busySlots}
                today={today}
                now={now}
                maxDaysAhead={BOOKING_DAYS_AHEAD}
                loginHref={user ? null : `/login?next=${encodeURIComponent(`/espacios/${space.id}`)}`}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Este espacio no está disponible para reservas.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
