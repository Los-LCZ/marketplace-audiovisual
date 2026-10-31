"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import type { Amenity } from "@/types/database";
import { SPACE_CATEGORIES, SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { SORTS, type SortKey } from "@/lib/search-params";
import { formatCLP } from "@/lib/utils";
import { SUGGESTED_COMMUNES } from "@/lib/world";
import { dayLabel, dayMonth } from "@/lib/zoned-time";
import { AmenityIcon } from "@/components/ui/amenity-icon";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Sheet } from "@/components/ui/layer";

export const PRICE_MIN = 5000;
export const PRICE_MAX = 100000;
const PRICE_STEP = 1000;

type Updates = Record<string, string | string[] | undefined>;

// Los filtros viven en la URL: cada cambio reemplaza los search params y vuelve a la página 1.
function useFilterUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(updates: Updates) {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      next.delete(key);
      for (const v of Array.isArray(value) ? value : value ? [value] : []) next.append(key, v);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return { params, update, pending };
}

/** Panel de filtros (escritorio y hoja móvil): tipo, comuna, precio y equipamiento. */
function FilterPanel({ amenities }: { amenities: Amenity[] }) {
  const { params, update } = useFilterUrl();
  const category = params.get("category");
  const commune = params.get("commune");
  const selectedAmenities = params.getAll("amenity");
  const min = Number(params.get("min")) || PRICE_MIN;
  const max = Number(params.get("max")) || PRICE_MAX;

  // El rango de precio se mueve en local y se aplica 400 ms después del último cambio.
  const [range, setRange] = useState<[number, number]>([min, max]);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function onRange(lo: number, hi: number, moving: "lo" | "hi") {
    if (lo > hi - PRICE_STEP) {
      if (moving === "lo") lo = hi - PRICE_STEP;
      else hi = lo + PRICE_STEP;
    }
    setRange([lo, hi]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () =>
        update({
          min: lo > PRICE_MIN ? String(lo) : undefined,
          max: hi < PRICE_MAX ? String(hi) : undefined,
        }),
      400,
    );
  }
  const pct = (v: number) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <>
      <div className="fgroup">
        <h4>Tipo de espacio</h4>
        <div className="tgrid">
          {SPACE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="tbtn"
              aria-pressed={category === c}
              onClick={() => update({ category: category === c ? undefined : c })}
            >
              <CategoryIcon category={c} />
              {SPACE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="fgroup">
        <h4>Comuna</h4>
        <div className="chips">
          {SUGGESTED_COMMUNES.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={commune === c}
              onClick={() => update({ commune: commune === c ? undefined : c })}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="fgroup">
        <h4>
          Precio por hora{" "}
          <span>
            {formatCLP(range[0])} a {formatCLP(range[1])}
            {range[1] >= PRICE_MAX && "+"}
          </span>
        </h4>
        <div className="dual">
          <div className="track" />
          <div className="fill" style={{ left: `${pct(range[0])}%`, right: `${100 - pct(range[1])}%` }} />
          <input
            type="range"
            className="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={range[0]}
            aria-label="Precio mínimo"
            onChange={(e) => onRange(Number(e.target.value), range[1], "lo")}
          />
          <input
            type="range"
            className="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={range[1]}
            aria-label="Precio máximo"
            onChange={(e) => onRange(range[0], Number(e.target.value), "hi")}
          />
        </div>
      </div>

      {amenities.length > 0 && (
        <div className="fgroup">
          <h4>
            Equipamiento <span>al menos uno</span>
          </h4>
          <div className="checks">
            {amenities.map((a) => {
              const id = String(a.id);
              const checked = selectedAmenities.includes(id);
              return (
                <label key={a.id} className="check">
                  <span>
                    <AmenityIcon category={a.category} />
                    {a.name}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      update({
                        amenity: checked ? selectedAmenities.filter((x) => x !== id) : [...selectedAmenities, id],
                      })
                    }
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/** Columna de filtros de escritorio (oculta bajo 1000 px). */
export function DesktopFilters({ amenities }: { amenities: Amenity[] }) {
  const params = useSearchParams();
  return (
    <aside className="filters panel desk" aria-label="Filtros">
      {/* key: reinicia el rango de precio si los filtros cambian desde fuera (chips, limpiar) */}
      <FilterPanel key={`${params.get("min")}-${params.get("max")}`} amenities={amenities} />
    </aside>
  );
}

/** Barra de resultados: buscador de texto, botón de filtros móvil, orden y chips activos. */
export function ResultsBar({
  amenities,
  total,
  today,
  summary,
}: {
  amenities: Amenity[];
  total: number;
  today: string;
  summary: ReactNode;
}) {
  const { params, update, pending } = useFilterUrl();
  const [sheetOpen, setSheetOpen] = useState(false);
  const q = params.get("q") ?? "";
  const sort = (params.get("sort") as SortKey | null) ?? "relevancia";

  const chips: { label: string; clear: Updates }[] = [];
  const fecha = params.get("fecha");
  if (fecha) chips.push({ label: `${dayLabel(fecha, today)} ${dayMonth(fecha)}`, clear: { fecha: undefined } });
  if (q) chips.push({ label: `“${q}”`, clear: { q: undefined } });
  const category = params.get("category");
  if (category && category in SPACE_CATEGORY_LABELS)
    chips.push({ label: SPACE_CATEGORY_LABELS[category as keyof typeof SPACE_CATEGORY_LABELS], clear: { category: undefined } });
  const commune = params.get("commune");
  if (commune) chips.push({ label: commune, clear: { commune: undefined } });
  const min = params.get("min");
  const max = params.get("max");
  if (min || max)
    chips.push({
      label: `${formatCLP(Number(min) || PRICE_MIN)} a ${max ? formatCLP(Number(max)) : `${formatCLP(PRICE_MAX)}+`}`,
      clear: { min: undefined, max: undefined },
    });
  for (const id of params.getAll("amenity")) {
    const amenity = amenities.find((a) => String(a.id) === id);
    if (amenity)
      chips.push({ label: amenity.name, clear: { amenity: params.getAll("amenity").filter((x) => x !== id) } });
  }
  const clearAll: Updates = Object.fromEntries(
    ["q", "category", "commune", "min", "max", "amenity", "fecha", "city"].map((k) => [k, undefined]),
  );

  return (
    <>
      <form
        className="mb-4 flex gap-2"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          update({ q: typeof value === "string" && value.trim() ? value.trim() : undefined });
        }}
      >
        <div className="field flex-1 !flex-row items-center gap-2">
          <Search className="dim size-4 shrink-0" aria-hidden />
          <input
            key={q}
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Busca por nombre, comuna o ciudad…"
            aria-label="Buscar espacios"
            className="w-full bg-transparent py-1.5 outline-none"
          />
        </div>
        <button type="submit" className="btn btn-acc">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : "Buscar"}
        </button>
      </form>

      <div className="res-bar">
        <p aria-live="polite">
          <b>{total}</b> <span className="dim">{total === 1 ? "espacio disponible" : "espacios disponibles"}</span>{" "}
          {summary}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-line btn-sm mobile-only" onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal aria-hidden />
            Filtros
          </button>
          <label className="sr-only" htmlFor="sort">
            Ordenar
          </label>
          <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value === "relevancia" ? undefined : e.target.value })}>
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="active-chips">
          {chips.map((chip) => (
            <button key={chip.label} type="button" className="chip" aria-label={`Quitar ${chip.label}`} onClick={() => update(chip.clear)}>
              {chip.label} <X className="size-3.5" aria-hidden />
            </button>
          ))}
          <button type="button" className="chip" onClick={() => update(clearAll)}>
            Limpiar todo
          </button>
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filtros">
        <div className="filters" style={{ position: "static", padding: 0 }}>
          <FilterPanel key={`${min}-${max}`} amenities={amenities} />
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn btn-soft flex-1" onClick={() => update(clearAll)}>
            Limpiar
          </button>
          <button type="button" className="btn btn-acc flex-1" onClick={() => setSheetOpen(false)}>
            Ver {total} {total === 1 ? "resultado" : "resultados"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
