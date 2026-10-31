import type { Metadata } from "next";
import Link from "next/link";
import { listAmenities, listPublishedSpaces, type SpaceWithAmenities } from "@/lib/queries/spaces";
import { buildQueryString, parseDateParam, parseSort, parseSpaceFilters, type SortKey } from "@/lib/search-params";
import { getWorld } from "@/lib/world-server";
import { WORLDS, worldOf } from "@/lib/world";
import { currentTime } from "@/lib/zoned-time";
import { SpaceCard } from "@/components/spaces/space-card";
import { DesktopFilters, ResultsBar } from "@/components/explore/explore-controls";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "Explorar" };

// La query entrega como máximo 50 por página; el orden se aplica dentro de cada página.
const PAGE_SIZE = 50;

const SORTERS: Record<SortKey, ((a: SpaceWithAmenities, b: SpaceWithAmenities) => number) | null> = {
  relevancia: null,
  "precio-asc": (a, b) => a.price_per_hour - b.price_per_hour,
  "precio-desc": (a, b) => b.price_per_hour - a.price_per_hour,
  valoracion: (a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0) || b.review_count - a.review_count,
};

export default async function ExplorarPage({ searchParams }: PageProps<"/explorar">) {
  const params = await searchParams;
  const filters = parseSpaceFilters(params);
  const sort = parseSort(params);
  const fecha = parseDateParam(params);
  const world = await getWorld();

  const [{ spaces, total, page }, amenities] = await Promise.all([
    listPublishedSpaces({ ...filters, pageSize: PAGE_SIZE }),
    listAmenities(),
  ]);

  const sorter = SORTERS[sort];
  const sorted = sorter ? [...spaces].sort(sorter) : spaces;
  // Sin categoría elegida, primero los espacios del mundo activo.
  const results = filters.category
    ? sorted
    : [...sorted].sort((a, b) => Number(worldOf(b.category) === world) - Number(worldOf(a.category) === world));
  const cardQuery = fecha ? `?fecha=${fecha}` : undefined;

  return (
    <div className="wrap">
      <div className="pt-[34px]">
        <p className="mono acc">{world === "av" ? "Biblioteca de encuadres" : "Lista de canales"}</p>
        <h1 className="display h2 mt-2.5">Explorar espacios</h1>
        <p className="lede">
          Filtra por lo que de verdad importa en una sesión: tipo de espacio, equipamiento, comuna y precio por hora.
        </p>
      </div>
      <div className="explore">
        <DesktopFilters amenities={amenities} />
        <section aria-label="Resultados">
          <ResultsBar
            amenities={amenities}
            total={total}
            today={currentTime().today}
            summary={
              !filters.category && <span className="dim">· primero {WORLDS[world].name}</span>
            }
          />
          {fecha && (
            <p className="dim mb-4 text-sm">Elige tu horario en la ficha: el día buscado queda preseleccionado.</p>
          )}
          {results.length ? (
            <div className="grid-cards">
              {results.map((space, i) => (
                <SpaceCard key={space.id} space={space} priority={i < 3} query={cardQuery} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <b>Ningún espacio cumple todos estos filtros</b>
              <p className="dim">Quita algún equipamiento o amplía el rango de precio.</p>
              <Link className="btn btn-soft" href="/explorar">
                Limpiar filtros
              </Link>
            </div>
          )}
          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={Math.ceil(total / PAGE_SIZE)}
              hrefForPage={(p) => `/explorar${buildQueryString(params, { page: p > 1 ? String(p) : undefined })}`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
