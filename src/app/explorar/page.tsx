import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAmenities, listCommunes, listLikedSpaces, listPublishedSpaces, type SpaceSort } from "@/lib/queries/spaces";
import { buildQueryString, parseDateParam, parseSort, parseSpaceFilters, type SortKey } from "@/lib/search-params";
import { getWorld } from "@/lib/world-server";
import { SUGGESTED_COMMUNES, WORLDS } from "@/lib/world";
import { currentTime } from "@/lib/zoned-time";
import { SpaceCard } from "@/components/spaces/space-card";
import { DesktopFilters, ResultsBar } from "@/components/explore/explore-controls";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "Explorar" };

const PAGE_SIZE = 24;
const MAX_COMMUNES = 10;

/** Qué soltar para encontrar resultados, según los filtros que hay puestos. */
function emptyHints(filters: ReturnType<typeof parseSpaceFilters>, fecha: string | undefined) {
  const hints: string[] = [];
  if (fecha) hints.push("prueba otro día");
  if (filters.q) hints.push("busca con otras palabras");
  if (filters.category) hints.push("quita el tipo de espacio");
  if (filters.commune || filters.city) hints.push("prueba otra comuna");
  if (filters.amenityIds?.length) hints.push("quita algún equipamiento");
  if (filters.minPrice || filters.maxPrice) hints.push("amplía el rango de precio");
  if (!hints.length) return null;
  const text = hints.length === 1 ? hints[0] : `${hints.slice(0, -1).join(", ")} o ${hints.at(-1)}`;
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

// Orden de la URL (en español) al orden de la base, que se aplica antes de paginar.
const SORT_MAP: Record<SortKey, SpaceSort> = {
  relevancia: "relevance",
  recientes: "recent",
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
  const recommended = sort === "relevancia" && !filters.category;

  const user = await getCurrentUser();
  const [{ spaces, total, page }, amenities, communes, liked] = await Promise.all([
    listPublishedSpaces({
      ...filters,
      sort: SORT_MAP[sort],
      // Recomendados sin categoría: el mundo activo primero, ordenado en la base antes de paginar.
      world: recommended ? world : undefined,
      availableOn: fecha,
      pageSize: PAGE_SIZE,
    }),
    listAmenities(),
    listCommunes(),
    user ? listLikedSpaces(user.id) : null,
  ]);
  // Página fuera de rango (p. ej. ?page=9 con 13 resultados): ir a la última, sin perder los filtros.
  const lastPage = Math.ceil(total / PAGE_SIZE);
  if (total > 0 && page > lastPage) {
    redirect(`/explorar${buildQueryString(params, { page: lastPage > 1 ? String(lastPage) : undefined })}`);
  }

  const likedIds = liked ? new Set(liked.map((s) => s.id)) : null;
  const communeNames = communes.length ? communes.slice(0, MAX_COMMUNES).map((c) => c.commune) : SUGGESTED_COMMUNES;

  const cardQuery = fecha ? `?fecha=${fecha}` : undefined;
  const today = currentTime().today;
  const hints = emptyHints(filters, fecha);

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
        <DesktopFilters amenities={amenities} communes={communeNames} today={today} />
        <section aria-label="Resultados">
          <ResultsBar
            amenities={amenities}
            communes={communeNames}
            total={total}
            today={today}
            summary={
              recommended && <span className="dim">· primero {WORLDS[world].name}</span>
            }
          />
          {fecha && (
            <p className="dim mb-4 text-sm">
              Espacios con horario libre ese día. Elige tu bloque en la ficha: el día buscado queda preseleccionado.
            </p>
          )}
          {world === "mu" && spaces.length > 0 && (
            <p className="dim mb-4 text-xs">
              El medidor bajo cada foto sube con la nota del espacio: apagado bajo 4,5 y al máximo en 5,0.
            </p>
          )}
          {spaces.length ? (
            <div className="grid-cards">
              {spaces.map((space, i) => (
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
              {hints ? (
                <>
                  <b>Ningún espacio cumple todos estos filtros</b>
                  <p className="dim">{hints}</p>
                  <Link className="btn btn-soft" href="/explorar">
                    Limpiar filtros
                  </Link>
                </>
              ) : (
                <>
                  <b>Todavía no hay espacios publicados</b>
                  <p className="dim">Vuelve pronto: los anfitriones están sumando salas, estudios y sets.</p>
                </>
              )}
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
