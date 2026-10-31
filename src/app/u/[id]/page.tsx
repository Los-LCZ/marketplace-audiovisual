import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Pencil, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getProfileRatingStats, getProfileReviews, getPublicProfile } from "@/lib/queries/profiles";
import { listHostPublicSpaces } from "@/lib/queries/spaces";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { SpaceCard } from "@/components/spaces/space-card";
import { RatingCard } from "@/components/profile/rating-card";
import { ProfileReviewList } from "@/components/profile/profile-review-list";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Compartido entre generateMetadata y la página dentro del mismo request.
const getProfile = cache(async (id: string) => (UUID_RE.test(id) ? getPublicProfile(id) : null));

export async function generateMetadata({ params }: PageProps<"/u/[id]">): Promise<Metadata> {
  const profile = await getProfile((await params).id);
  if (!profile) return { title: "Perfil no encontrado" };
  return { title: profile.full_name ?? "Perfil", description: profile.headline ?? undefined };
}

/** Perfil público con calificación de ida y vuelta: como cliente y como anfitrión. */
export default async function PerfilPublicoPage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const isHost = profile.role === "host" || profile.role === "admin";
  const [viewer, stats, hostReviews, clientReviews, spaces] = await Promise.all([
    getCurrentUser(),
    getProfileRatingStats(profile.id),
    getProfileReviews(profile.id, "host"),
    getProfileReviews(profile.id, "client"),
    isHost ? listHostPublicSpaces(profile.id) : [],
  ]);
  const isMe = viewer?.id === profile.id;
  const name = profile.full_name ?? "Usuario";
  const first = name.split(" ")[0];

  const reviewTabs = [
    { key: "clientes", label: "De clientes", reviews: hostReviews },
    { key: "anfitriones", label: "De anfitriones", reviews: clientReviews },
  ].filter((t) => t.reviews.length);

  return (
    <>
      <div className="cover" aria-hidden />
      <div className="wrap">
        <div className="prof-head">
          <div className="who">
            <Avatar name={name} size="xl" verified={profile.verified} />
            <div>
              <h1 className="display h2">{name}</h1>
              {profile.headline && <p className="dim mt-1.5">{profile.headline}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <p className="dim flex flex-wrap gap-4 text-sm">
              {profile.commune && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {profile.commune}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden /> Desde {new Date(profile.created_at).getFullYear()}
              </span>
              {profile.verified && (
                <span className="inline-flex items-center gap-1 text-[var(--ok)]">
                  <ShieldCheck className="size-3.5" aria-hidden /> Identidad verificada
                </span>
              )}
            </p>
            {isMe && (
              <Link className="btn btn-soft btn-sm" href="/perfil">
                <Pencil aria-hidden />
                Editar perfil
              </Link>
            )}
          </div>
        </div>

        {profile.bio && <p className="mt-[22px] max-w-[65ch] whitespace-pre-line">{profile.bio}</p>}
        {profile.tags.length > 0 && (
          <div className="chips mt-3">
            {profile.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="rcards">
          <RatingCard
            title="Como cliente"
            subtitle="Lo califican los anfitriones después de cada sesión"
            summary={stats.as_client}
            emptyText={`${first} todavía no tiene calificaciones como cliente.`}
            emptyHref="/explorar"
            emptyLabel="Explorar espacios"
          />
          <RatingCard
            title="Como anfitrión"
            subtitle="Lo califican los clientes que usaron su espacio"
            summary={stats.as_host}
            emptyText={isHost ? `${first} todavía no tiene reseñas como anfitrión.` : `${first} todavía no publica un espacio.`}
            emptyHref={isHost ? "/explorar" : "/espacios/nuevo"}
            emptyLabel={isHost ? "Explorar espacios" : "Publicar un espacio"}
          />
        </div>

        <section className="mt-[50px]">
          <h2 className="display h3">Reseñas</h2>
          {reviewTabs.length ? (
            <div className="mt-4">
              <Tabs
                tabs={reviewTabs.map((t) => ({
                  key: t.key,
                  label: t.label,
                  count: t.reviews.length,
                  content: <ProfileReviewList reviews={t.reviews} />,
                }))}
              />
            </div>
          ) : (
            <p className="dim mt-3 text-sm">Todavía no hay reseñas reveladas para {first}.</p>
          )}
        </section>

        {spaces.length > 0 && (
          <section className="mt-[50px]">
            <h2 className="display h3">Espacios de {first}</h2>
            <div className="grid-cards mt-5">
              {spaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
