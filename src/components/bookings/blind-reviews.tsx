import { Eye, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Stars } from "@/components/ui/rating";
import type { BookingReviewEntry, BookingReviews } from "@/types/database";

function Entry({ label, review }: { label: string; review: BookingReviewEntry }) {
  return (
    <div>
      <span className="dim text-xs">{label} </span>
      <Stars rating={review.rating} />
      {review.tags.length > 0 && (
        <div className="chips mt-1.5">
          {review.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
      {review.comment && <p className="mt-1">“{review.comment}”</p>}
    </div>
  );
}

/**
 * Calificación a ciegas de una reserva completada (get_booking_reviews): la reseña
 * propia, la de la contraparte si ya se reveló, o cuándo se revela.
 * `viewer` indica desde qué lado se mira; `counterpart` es el nombre de la otra parte.
 */
export function BlindReviews({
  reviews,
  viewer,
  counterpart,
}: {
  reviews: BookingReviews;
  viewer: "client" | "host";
  counterpart: string;
}) {
  const mine = viewer === "client" ? reviews.space_review : reviews.client_review;
  const theirs = viewer === "client" ? reviews.client_review : reviews.space_review;
  const theySubmitted = viewer === "client" ? reviews.client_review_submitted : reviews.space_review_submitted;
  const first = counterpart.split(" ")[0];

  if (!mine && !theirs && !theySubmitted) return null;

  return (
    <div className="reveal grid gap-3">
      {mine && <Entry label="Tu calificación" review={mine} />}
      {theirs ? (
        <div>
          <p className="mono acc mb-1 inline-flex items-center gap-1.5">
            <Eye className="size-3" aria-hidden /> {first} {viewer === "client" ? "te calificó como cliente" : "calificó tu espacio"}
          </p>
          <Entry label="" review={theirs} />
        </div>
      ) : (
        <p className="dim inline-flex items-center gap-1.5 text-xs">
          <Lock className="size-3" aria-hidden />
          {theySubmitted
            ? mine
              ? `${first} ya te calificó. Se revela el ${formatDate(reviews.reveal_at ?? "")}.`
              : `${first} ya te calificó. Lo verás cuando envíes tu calificación.`
            : `${first} aún no califica. Verás su reseña cuando la envíe${reviews.reveal_at ? ` o el ${formatDate(reviews.reveal_at)}` : ""}.`}
        </p>
      )}
    </div>
  );
}
