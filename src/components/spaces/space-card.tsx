import Image from "next/image";
import Link from "next/link";
import { ImageOff, MapPin } from "lucide-react";
import type { SpaceWithAmenities } from "@/lib/queries/spaces";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { formatCLP } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui/category-icon";
import { RatingPill } from "@/components/ui/rating";
import { LikeButton } from "@/components/spaces/like-button";

const MAX_TAGS = 3;

// Medidor de nivel bajo la foto (mundo Música): más nota, más nivel.
function LevelBars({ rating }: { rating: number | null }) {
  const lit = rating == null ? 0 : Math.round(((rating - 4.5) / 0.5) * 12);
  return (
    <div className="lvl" aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <b key={i} className={`${i < lit ? "on" : ""} ${i >= 10 ? "h" : ""} ${i >= 13 ? "p" : ""}`} />
      ))}
    </div>
  );
}

/**
 * Tarjeta de espacio del sistema Señal. `query` se agrega al link (p. ej. la fecha
 * buscada). Con `liked` (true/false con sesión, null sin sesión) muestra el corazón.
 */
export function SpaceCard({
  space,
  priority,
  query,
  liked,
}: {
  space: SpaceWithAmenities;
  priority?: boolean;
  query?: string;
  liked?: boolean | null;
}) {
  return (
    <article className="scard">
      <div className="ph">
        {space.images[0] ? (
          <Image
            src={space.images[0]}
            alt={space.title}
            fill
            priority={priority}
            sizes="(min-width: 1100px) 400px, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="dim flex size-full items-center justify-center">
            <ImageOff className="size-8" aria-hidden />
            <span className="sr-only">Sin fotos</span>
          </div>
        )}
        <span className="badge-cat">
          <CategoryIcon category={space.category} />
          {SPACE_CATEGORY_LABELS[space.category]}
        </span>
        <span className="focus-tag">AF ✓</span>
        {liked !== undefined && <LikeButton spaceId={space.id} title={space.title} liked={liked} />}
      </div>
      <LevelBars rating={space.avg_rating} />
      <div className="row">
        <div className="min-w-0">
          <h3>
            <Link className="stretch" href={`/espacios/${space.id}${query ?? ""}`}>
              {space.title}
            </Link>
          </h3>
          <p className="loc">
            <MapPin aria-hidden />
            {space.neighborhood ? `${space.neighborhood}, ${space.commune}` : `${space.commune}, ${space.city}`}
          </p>
        </div>
        <RatingPill rating={space.avg_rating} />
      </div>
      {space.amenities.length > 0 && (
        <div className="tags">
          {space.amenities.slice(0, MAX_TAGS).map((a) => (
            <span key={a.id} className="tag">
              {a.name}
            </span>
          ))}
        </div>
      )}
      <p className="price">
        <span>
          <b>{formatCLP(space.price_per_hour)}</b> <span className="dim">por hora</span>
        </span>
        <span className="dim">Mínimo {space.min_hours} h</span>
      </p>
    </article>
  );
}
