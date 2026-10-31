import Link from "next/link";
import type { ProfileReview } from "@/types/database";
import { formatShortDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Stars } from "@/components/ui/rating";

/** Reseñas recibidas por un perfil, con autor (link a su perfil), espacio y etiquetas. */
export function ProfileReviewList({ reviews }: { reviews: ProfileReview[] }) {
  return (
    <div className="reviews">
      {reviews.map((review) => (
        <article key={review.id} className="review panel">
          <div className="top">
            <Avatar name={review.author_name} size="sm" />
            <div className="min-w-0 flex-1">
              <Link href={`/u/${review.author_id}`}>{review.author_name ?? "Usuario"}</Link>
              <br />
              <span className="dim text-xs">
                {formatShortDate(review.created_at)},{" "}
                <Link href={`/espacios/${review.space_id}`} className="dim">
                  {review.space_title}
                </Link>
              </span>
            </div>
            <Stars rating={review.rating} />
          </div>
          {review.tags.length > 0 && (
            <div className="chips">
              {review.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}
          {review.comment && <p className="text-sm">“{review.comment}”</p>}
        </article>
      ))}
    </div>
  );
}
