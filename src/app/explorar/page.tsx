import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listAmenities, listCommunes, listLikedSpaces, listPublishedSpaces, type SpaceSort } from "@/lib/queries/spaces";
import { buildQueryString, parseDateParam, parseSort, parseSpaceFilters, type SortKey } from "@/lib/search-params";
import { getWorld } from "@/lib/world-server";
import { SUGGESTED_COMMUNES, WORLDS, worldOf } from "@/lib/world";
import { currentTime } from "@/lib/zoned-time";
import { SpaceCard } from "@/components/spaces/space-card";
import { DesktopFilters, ResultsBar } from "@/components/explore/explore-controls";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "Explorar" };

const PAGE_SIZE = 24;
const MAX_COMMUNES = 10;

// Orden de la URL (en español) al orden de la base, que se aplica antes de paginar.
const SORT_MAP: Record<SortKey, SpaceSort> = {
  relevancia: "recent",
  "precio-asc": "price_asc",
  "precio-desc": "price_desc",
  valoracion: "rating",
};

export default async function ExplorarPage({ searchParams }: PageProps<"/explorar">) {
  const params = await searchParams;
  const filters = parseSpaceFilters(params);
  const sort = parseSort(params);
  const fecha = parseDateParam(params);
  const world = await getWorld();

  const user = await getCurrentUser();
  const [{ spaces, total, page }, amenities, communes, liked] = await Promise.all([
    listPublishedSpaces({ ...filters, sort: SORT_MAP[sort], availableOn: fecha, pageSize: PAGE_SIZE }),
    listAmenities(),
    listCommunes(),
    user ? listLikedSpaces(user.id) : null,
  ]);
  const likedIds = liked ? new Set(liked.map((s) => s.id)) : null;
  const communeNames = communes.length ? communes.slice(0, MAX_COMMUNES).map((c) => c.commune) : SUGGESTED_COMMUNES;

  // Con el orden por defecto y sin categoría, primero los espacios del mundo activo (dentro de la página;
  // sort es estable, así que cada grupo conserva el orden de la base).
  const results =
    filters.category || sort !== "relevancia"
      ? spaces
      : [...spaces].sort((a, b) => Number(worldOf(b.category) === world) - Number(worldOf(a.category) === world));
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
        <DesktopFilters amenities={amenities} communes={communeNames} />
        <section aria-label="Resultados">
          <ResultsBar
            amenities={amenities}
            communes={communeNames}
            total={total}
            today={currentTime().today}
            summary={
              !filters.category && sort === "relevancia" && <span className="dim">· primero {WORLDS[world].name}</span>
            }
          />
          {fecha && (
            <p className="dim mb-4 text-sm">
              Espacios con horario libre ese día. Elige tu bloque en la ficha: el día buscado queda preseleccionado.
            </p>
          )}
          {results.length ? (
            <div className="grid-cards">
              {results.map((space, i) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  priority={i < 3}
                  query={cardQuery}
                  liked={likedIds ? likedIds.has(space.id) : null}
                />
              ))}
            </div>
          ) : (
            <div className="empty">
              <b>Ningún espacio cumple todos estos filtros</b>
              <p className="dim">
                {fecha ? "Prueba otro día, quita" : "Quita"} algún equipamiento o amplía el rango de precio.
              </p>
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
