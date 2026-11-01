import type { SpaceReview } from "@/types/database";
import { formatShortDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Stars } from "@/components/ui/rating";

export function ReviewList({ reviews }: { reviews: SpaceReview[] }) {
  return (
    <div className="reviews">
      {reviews.map((review) => (
        <article key={review.id} className="review panel">
          <div className="top">
            <Avatar name={review.author_name} src={review.author_avatar} size="sm" />
            <div className="min-w-0 flex-1">
              <b>{review.author_name ?? "Usuario"}</b>
              <br />
              <span className="dim text-xs">{formatShortDate(review.created_at)}</span>
            </div>
            <Stars rating={review.rating} />
          </div>
          {review.comment && <p className="text-sm">“{review.comment}”</p>}
        </article>
      ))}
    </div>
  );
}
