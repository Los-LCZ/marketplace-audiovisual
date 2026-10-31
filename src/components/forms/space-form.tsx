"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSpace, updateSpace } from "@/app/actions/spaces";
import type { Amenity, Space } from "@/types/database";
import {
  AMENITY_CATEGORY_LABELS,
  GEAR_CATEGORIES,
  GEAR_CATEGORY_LABELS,
  SPACE_CATEGORIES,
  SPACE_CATEGORY_LABELS,
} from "@/lib/labels";
import { toast } from "@/components/ui/toaster";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form-controls";
import { ImagePicker, type PickedImage } from "./image-picker";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-border pb-8 md:grid-cols-[220px_1fr] md:gap-8">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

const HOURS = Array.from({ length: 25 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
// Una línea por elemento (reglas y equipamiento).
const lines = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.split("\n").map((l) => l.trim()).filter(Boolean) : [];

type EditableSpace = Space & { amenities: Amenity[] };

/**
 * Formulario de espacio para crear o, con `space`, editar. Se envía con onSubmit (no con
 * `action`) para que React no resetee los campos cuando la action devuelve errores, y
 * para armar `rules` (repetido) y `gear` (JSON) a partir de los textos de una línea por elemento.
 * Al crear, createSpace redirige a la ficha; al editar se vuelve a la ficha.
 */
export function SpaceForm({ amenities, space }: { amenities: Amenity[]; space?: EditableSpace }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(space ? updateSpace.bind(null, space.id) : createSpace, null);
  const [images, setImages] = useState<PickedImage[]>([]);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const selected = new Set(space?.amenities.map((a) => a.id));

  useEffect(() => {
    if (!space || !state?.ok) return;
    toast("Cambios guardados", space.title);
    router.push(`/espacios/${space.id}`);
  }, [state, space, router]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    for (const { file } of images) formData.append("images", file);
    for (const rule of lines(formData.get("rules_text"))) formData.append("rules", rule);
    const gear = GEAR_CATEGORIES.map((category) => ({ category, items: lines(formData.get(`gear_${category}`)) })).filter(
      (g) => g.items.length,
    );
    formData.set("gear", JSON.stringify(gear));
    startTransition(() => formAction(formData));
  }

  const groups = (["audio", "video", "general"] as const)
    .map((group) => [group, amenities.filter((a) => a.category === group)] as const)
    .filter(([, items]) => items.length);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <Section title="Información básica" description="Lo primero que verán quienes buscan un espacio.">
        <Field label="Título" htmlFor="title" error={fieldErrors?.title}>
          <Input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={120}
            placeholder="Ej: Estudio de grabación con control room en Providencia"
            defaultValue={space?.title}
            aria-invalid={!!fieldErrors?.title}
          />
        </Field>
        <Field label="Categoría" htmlFor="category" error={fieldErrors?.category}>
          <Select
            id="category"
            name="category"
            required
            defaultValue={space?.category ?? ""}
            aria-invalid={!!fieldErrors?.category}
          >
            <option value="" disabled>
              Selecciona una categoría
            </option>
            {SPACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SPACE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Resumen (opcional)" htmlFor="summary" error={fieldErrors?.summary}>
          <Input
            id="summary"
            name="summary"
            maxLength={280}
            placeholder="Una línea que aparece bajo el título. Ej: Casona de 1920 con sala de toma de 40 m²"
            defaultValue={space?.summary ?? ""}
            aria-invalid={!!fieldErrors?.summary}
          />
        </Field>
        <Field label="Descripción (opcional)" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={5}
            maxLength={3000}
            placeholder="Acústica, acceso, estacionamiento, qué tipo de proyectos recibes… Separa los párrafos con una línea en blanco."
            defaultValue={space?.description ?? ""}
          />
        </Field>
      </Section>

      <Section title="Ubicación" description="La dirección exacta se muestra en la ficha del espacio.">
        <Field label="Dirección" htmlFor="address" error={fieldErrors?.address}>
          <Input
            id="address"
            name="address"
            required
            autoComplete="street-address"
            placeholder="Av. Ejemplo 1234"
            defaultValue={space?.address}
            aria-invalid={!!fieldErrors?.address}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Barrio (opcional)" htmlFor="neighborhood" error={fieldErrors?.neighborhood}>
            <Input
              id="neighborhood"
              name="neighborhood"
              maxLength={80}
              placeholder="Barrio Italia"
              defaultValue={space?.neighborhood ?? ""}
              aria-invalid={!!fieldErrors?.neighborhood}
            />
          </Field>
          <Field label="Comuna" htmlFor="commune" error={fieldErrors?.commune}>
            <Input
              id="commune"
              name="commune"
              required
              placeholder="Providencia"
              defaultValue={space?.commune}
              aria-invalid={!!fieldErrors?.commune}
            />
          </Field>
          <Field label="Ciudad" htmlFor="city" error={fieldErrors?.city}>
            <Input id="city" name="city" required placeholder="Santiago" defaultValue={space?.city} aria-invalid={!!fieldErrors?.city} />
          </Field>
        </div>
      </Section>

      <Section title="Precio y condiciones" description="Las reservas son por horas completas.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio por hora (CLP)" htmlFor="price_per_hour" error={fieldErrors?.price_per_hour}>
            <Input
              id="price_per_hour"
              name="price_per_hour"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              placeholder="25000"
              defaultValue={space?.price_per_hour}
              aria-invalid={!!fieldErrors?.price_per_hour}
            />
          </Field>
          <Field label="Mínimo de horas por reserva" htmlFor="min_hours" error={fieldErrors?.min_hours}>
            <Input
              id="min_hours"
              name="min_hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={24}
              step={1}
              defaultValue={space?.min_hours ?? 1}
              required
              aria-invalid={!!fieldErrors?.min_hours}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Abre a las" htmlFor="open_hour" error={fieldErrors?.open_hour}>
            <Select id="open_hour" name="open_hour" defaultValue={space?.open_hour ?? 8} aria-invalid={!!fieldErrors?.open_hour}>
              {HOURS.slice(0, 24).map((h) => (
                <option key={h} value={h}>
                  {hh(h)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cierra a las" htmlFor="close_hour" error={fieldErrors?.close_hour}>
            <Select id="close_hour" name="close_hour" defaultValue={space?.close_hour ?? 24} aria-invalid={!!fieldErrors?.close_hour}>
              {HOURS.slice(1).map((h) => (
                <option key={h} value={h}>
                  {h === 24 ? "24:00 (medianoche)" : hh(h)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Horario en hora de Chile: solo se puede reservar dentro de él. A los clientes se les cobra además una comisión
          de servicio del 10% sobre el subtotal.
        </p>
      </Section>

      <Section title="El espacio" description="Datos que se muestran en la ficha. Todos son opcionales.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Superficie (m²)" htmlFor="size_m2" error={fieldErrors?.size_m2}>
            <Input
              id="size_m2"
              name="size_m2"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="85"
              defaultValue={space?.size_m2 ?? ""}
              aria-invalid={!!fieldErrors?.size_m2}
            />
          </Field>
          <Field label="Capacidad (personas)" htmlFor="capacity" error={fieldErrors?.capacity}>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="8"
              defaultValue={space?.capacity ?? ""}
              aria-invalid={!!fieldErrors?.capacity}
            />
          </Field>
        </div>
        <Field label="Reglas del espacio" htmlFor="rules_text" error={fieldErrors?.rules}>
          <Textarea
            id="rules_text"
            name="rules_text"
            rows={4}
            placeholder={"Una por línea. Ej:\nNo se permite fumar\nMáximo 8 personas en la sala de toma"}
            defaultValue={space?.rules.join("\n")}
          />
        </Field>
      </Section>

      <Section title="Equipamiento detallado" description="Una línea por equipo. Aparece agrupado en la ficha.">
        {GEAR_CATEGORIES.map((category) => (
          <Field key={category} label={GEAR_CATEGORY_LABELS[category]} htmlFor={`gear_${category}`}>
            <Textarea
              id={`gear_${category}`}
              name={`gear_${category}`}
              rows={3}
              placeholder={category === "microfonos" ? "Neumann U87 Ai (x2)\nShure SM57 (x6)" : undefined}
              defaultValue={space?.gear.find((g) => g.category === category)?.items.join("\n")}
            />
          </Field>
        ))}
        {fieldErrors?.gear && <p className="text-sm text-danger">{fieldErrors.gear}</p>}
      </Section>

      {groups.length > 0 && (
        <Section title="Equipamiento" description="Marca todo lo que incluye el arriendo.">
          {groups.map(([group, items]) => (
            <fieldset key={group} className="flex flex-col gap-2">
              <legend className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                {AMENITY_CATEGORY_LABELS[group]}
              </legend>
              <div className="flex flex-wrap gap-2">
                {items.map((amenity) => (
                  <label
                    key={amenity.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/10"
                  >
                    <input
                      type="checkbox"
                      name="amenity_ids"
                      value={amenity.id}
                      defaultChecked={selected.has(amenity.id)}
                      className="accent-primary"
                    />
                    {amenity.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </Section>
      )}

      {!space && (
        <Section title="Fotos" description="La primera foto es la portada. Podrás agregar más después.">
          <ImagePicker images={images} onChange={setImages} error={fieldErrors?.images} />
        </Section>
      )}

      <Section title="Publicación">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Estado</legend>
          {[
            { value: "published", label: space ? "Publicado" : "Publicar ahora", hint: "Aparece en el listado y se puede reservar." },
            { value: "draft", label: space ? "Borrador" : "Guardar como borrador", hint: "Solo tú lo ves; puedes publicarlo desde tu panel." },
            ...(space ? [{ value: "archived", label: "Archivado", hint: "Fuera del listado; las reservas pasadas se conservan." }] : []),
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-checked:border-primary has-checked:bg-primary/5"
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                defaultChecked={option.value === (space?.status ?? "published")}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-sm text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Section>

      <FormMessage state={state} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={space ? `/espacios/${space.id}` : "/dashboard"} className={buttonClasses({ variant: "ghost" })}>
          Cancelar
        </Link>
        <Button type="submit" size="lg" disabled={pending}>
          {space
            ? pending
              ? "Guardando..."
              : "Guardar cambios"
            : pending
              ? images.length
                ? "Subiendo fotos y creando..."
                : "Creando espacio..."
              : "Crear espacio"}
        </Button>
      </div>
    </form>
  );
}
