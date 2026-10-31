import Link from "next/link";
import { formatRating, pluralize } from "@/lib/utils";
import { Stars } from "@/components/ui/rating";
import type { RatingSummary } from "@/types/database";

/** Tarjeta de calificación de un rol (.rcard): promedio, distribución 5..1 y etiquetas más repetidas. */
export function RatingCard({
  title,
  subtitle,
  summary,
  emptyText,
  emptyHref,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  summary: RatingSummary;
  emptyText: string;
  emptyHref: string;
  emptyLabel: string;
}) {
  if (summary.avg == null || !summary.count) {
    return (
      <section className="rcard panel content-center border-dashed">
        <b>{title}</b>
        <p className="dim text-sm">{emptyText}</p>
        <Link className="acc text-sm font-bold" href={emptyHref}>
          {emptyLabel}
        </Link>
      </section>
    );
  }

  const max = Math.max(...summary.distribution, 1);
  return (
    <section className="rcard panel">
      <div className="flex justify-between gap-2.5">
        <div>
          <b>{title}</b>
          <p className="dim text-xs">{subtitle}</p>
        </div>
        <span className="pill">{pluralize(summary.count, "reseña", "reseñas")}</span>
      </div>
      <div className="flex items-end gap-[22px]">
        <div>
          <div className="num">{formatRating(summary.avg)}</div>
          <div className="mt-1.5 text-lg">
            <Stars rating={summary.avg} />
          </div>
        </div>
        <div className="dist" aria-label="Distribución de estrellas">
          {summary.distribution.map((n, i) => (
            <div key={i}>
              <span>{5 - i}</span>
              <span className="bar">
                <i style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className="sr-only">{pluralize(n, "reseña", "reseñas")}</span>
            </div>
          ))}
        </div>
      </div>
      {summary.top_tags.length > 0 && (
        <div className="chips">
          {summary.top_tags.map((t) => (
            <span key={t.label} className="chip" style={{ color: "var(--fg)" }}>
              {t.label} <b className="acc">{t.count}</b>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
