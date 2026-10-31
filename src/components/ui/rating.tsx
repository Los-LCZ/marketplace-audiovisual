import { cn, formatRating, pluralize } from "@/lib/utils";

/** Píldora "★ 4,96 (128)" del sistema Señal. Sin reseñas muestra "Nuevo". */
export function RatingPill({ rating, count, label }: { rating: number | null; count?: number; label?: string }) {
  if (rating == null) return <span className="pill dim">Nuevo</span>;
  return (
    <span className="pill">
      <span className="star">★</span>
      {formatRating(rating)}
      {count != null && <span className="dim">({count})</span>}
      {label && <span className="dim">{label}</span>}
    </span>
  );
}

// Resumen "★ 4,7 (12 reseñas)". Sin reseñas muestra "Nuevo".
export function RatingSummary({
  avgRating,
  reviewCount,
  className,
}: {
  avgRating: number | null;
  reviewCount: number;
  className?: string;
}) {
  if (avgRating == null || reviewCount === 0) {
    return <span className={cn("dim text-sm", className)}>Nuevo · sin reseñas</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <span className="acc">★</span>
      <span className="font-semibold">{formatRating(avgRating)}</span>
      <span className="dim">({pluralize(reviewCount, "reseña", "reseñas")})</span>
    </span>
  );
}

// Estrellas del sistema Señal (.stars): llenas en el color del mundo activo.
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("stars", className)} aria-label={`${formatRating(rating)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={rating >= n - 0.25 ? "" : "off"}>
          ★
        </span>
      ))}
    </span>
  );
}
