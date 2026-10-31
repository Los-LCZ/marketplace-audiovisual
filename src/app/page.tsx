import Link from "next/link";
import { Clapperboard, SearchX } from "lucide-react";
import { listAmenities, listPublishedSpaces } from "@/lib/queries/spaces";
import { buildQueryString, parseSpaceFilters } from "@/lib/search-params";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { pluralize } from "@/lib/utils";
import { SpaceCard } from "@/components/spaces/space-card";
import { SpaceFilters } from "@/components/spaces/space-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClasses } from "@/components/ui/button";

const PAGE_SIZE = 12;

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const filters = parseSpaceFilters(params);

  const [{ spaces, total, page }, amenities] = await Promise.all([
    listPublishedSpaces({ ...filters, pageSize: PAGE_SIZE }),
    listAmenities(),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const heading = filters.q
    ? `Resultados para “${filters.q}”`
    : filters.category
      ? SPACE_CATEGORY_LABELS[filters.category]
      : "Espacios disponibles";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Encuentra tu próximo set, estudio o locación
        </h1>
        <p className="text-muted-foreground">
          Arrienda por hora espacios equipados para grabar, ensayar, fotografiar y filmar.
        </p>
      </section>

      {/* key: re-monta el formulario cuando cambian los params para refrescar los defaultValue */}
      <SpaceFilters key={buildQueryString(params, { page: undefined })} filters={filters} amenities={amenities} />

      <section className="flex flex-col gap-4" aria-labelledby="results-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="results-heading" className="text-xl font-semibold">
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground">{pluralize(total, "espacio", "espacios")}</p>
        </div>

        {spaces.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space, i) => (
              <li key={space.id} className="flex">
                <SpaceCard space={space} priority={i < 3} />
              </li>
            ))}
          </ul>
        ) : !buildQueryString(params, { page: undefined }) ? (
          <EmptyState
            icon={Clapperboard}
            title="Aún no hay espacios publicados"
            description="Pronto verás aquí estudios, salas y locaciones para arrendar."
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="No encontramos espacios con esos filtros"
            description="Prueba con otra búsqueda o quita algunos filtros."
            action={
              <Link href="/" className={buttonClasses({ variant: "secondary" })}>
                Ver todos los espacios
              </Link>
            }
          />
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          hrefForPage={(p) => `/${buildQueryString(params, { page: p > 1 ? String(p) : undefined })}`}
        />
      </section>
    </main>
  );
}
