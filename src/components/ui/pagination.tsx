import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "./button";

// Paginación por links: `hrefForPage` arma la URL conservando el resto de los params.
export function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-3">
      {prev ? (
        <Link href={hrefForPage(prev)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
          <ChevronLeft className="size-4" aria-hidden /> Anterior
        </Link>
      ) : (
        <span className={buttonClasses({ variant: "secondary", size: "sm", className: "opacity-50" })}>
          <ChevronLeft className="size-4" aria-hidden /> Anterior
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      {next ? (
        <Link href={hrefForPage(next)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
          Siguiente <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={buttonClasses({ variant: "secondary", size: "sm", className: "opacity-50" })}>
          Siguiente <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
