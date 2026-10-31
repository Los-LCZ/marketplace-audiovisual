import { Star } from "lucide-react";
import { cn, formatRating, pluralize } from "@/lib/utils";

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
    return <span className={cn("text-sm text-muted-foreground", className)}>Nuevo · sin reseñas</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-current text-amber-500" aria-hidden />
      <span className="font-medium">{formatRating(avgRating)}</span>
      <span className="text-muted-foreground">({pluralize(reviewCount, "reseña", "reseñas")})</span>
    </span>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-4", n <= rating ? "fill-amber-500 text-amber-500" : "text-border")}
        />
      ))}
    </span>
  );
}
