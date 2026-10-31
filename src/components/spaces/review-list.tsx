import type { SpaceReview } from "@/types/database";
import { formatShortDate } from "@/lib/utils";
import { Stars } from "@/components/ui/rating";

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function ReviewList({ reviews }: { reviews: SpaceReview[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {reviews.map((review) => (
        <li key={review.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium"
            >
              {initials(review.author_name)}
            </span>
            <div>
              <p className="text-sm font-medium">{review.author_name ?? "Usuario"}</p>
              <p className="text-xs text-muted-foreground">{formatShortDate(review.created_at)}</p>
            </div>
          </div>
          <Stars rating={review.rating} />
          {review.comment && <p className="text-sm leading-relaxed">{review.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
