"use client";

import { useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import type { Amenity } from "@/types/database";
import type { SpaceFilters as Filters } from "@/lib/queries/spaces";
import { AMENITY_CATEGORY_LABELS, SPACE_CATEGORIES, SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form-controls";

/**
 * Buscador y filtros del listado. El estado vive en la URL: al enviar se navega a
 * `/?q=...` sin params vacíos (y sin `page`, que vuelve a 1). Sin JS funciona como GET.
 */
export function SpaceFilters({ filters, amenities }: { filters: Filters; amenities: Amenity[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hasAdvanced = Boolean(
    filters.city || filters.commune || filters.minPrice || filters.maxPrice || filters.amenityIds?.length,
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim()) search.append(key, value.trim());
    }
    const qs = search.toString();
    startTransition(() => router.push(qs ? `/?${qs}` : "/", { scroll: false }));
  }

  const groups = Object.entries(Object.groupBy(amenities, (a) => a.category)) as [
    Amenity["category"],
    Amenity[],
  ][];

  return (
    <form action="/" onSubmit={onSubmit} className="flex flex-col gap-3" role="search">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Busca por nombre, comuna o ciudad…"
            aria-label="Buscar espacios"
            className="h-12 pl-9 text-base"
          />
        </div>
        <Select
          name="category"
          defaultValue={filters.category ?? ""}
          aria-label="Categoría"
          className="h-12 sm:w-56"
        >
          <option value="">Todas las categorías</option>
          {SPACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {SPACE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
          Buscar
        </Button>
      </div>

      <details open={hasAdvanced} className="group rounded-xl border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
          <SlidersHorizontal className="size-4" aria-hidden />
          Más filtros
          <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Ubicación, precio, equipamiento</span>
        </summary>
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-city">Ciudad</Label>
            <Input id="f-city" name="city" defaultValue={filters.city} placeholder="Santiago" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-commune">Comuna</Label>
            <Input id="f-commune" name="commune" defaultValue={filters.commune} placeholder="Providencia" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-min">Precio mín. / hora</Label>
            <Input id="f-min" name="min" type="number" min={1} step={1} inputMode="numeric" defaultValue={filters.minPrice} placeholder="CLP" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-max">Precio máx. / hora</Label>
            <Input id="f-max" name="max" type="number" min={1} step={1} inputMode="numeric" defaultValue={filters.maxPrice} placeholder="CLP" />
          </div>

          {groups.length > 0 && (
            <fieldset className="flex flex-col gap-3 sm:col-span-2 lg:col-span-4">
              <legend className="mb-2 text-sm font-medium">
                Equipamiento <span className="font-normal text-muted-foreground">(al menos uno)</span>
              </legend>
              {groups.map(([group, items]) => (
                <div key={group} className="flex flex-wrap items-center gap-2">
                  <span className="w-16 text-xs text-muted-foreground uppercase">{AMENITY_CATEGORY_LABELS[group]}</span>
                  {items.map((amenity) => (
                    <label
                      key={amenity.id}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm has-checked:border-primary has-checked:bg-primary/10"
                    >
                      <input
                        type="checkbox"
                        name="amenity"
                        value={amenity.id}
                        defaultChecked={filters.amenityIds?.includes(amenity.id)}
                        className="accent-primary"
                      />
                      {amenity.name}
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
          )}

          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="secondary" disabled={pending}>
              Aplicar filtros
            </Button>
            <Link href="/" scroll={false} className="inline-flex h-10 items-center px-3 text-sm text-muted-foreground hover:text-foreground">
              Limpiar todo
            </Link>
          </div>
        </div>
      </details>
    </form>
  );
}
