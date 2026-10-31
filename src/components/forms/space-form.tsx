"use client";

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { createSpace } from "@/app/actions/spaces";
import type { Amenity } from "@/types/database";
import { AMENITY_CATEGORY_LABELS, SPACE_CATEGORIES, SPACE_CATEGORY_LABELS } from "@/lib/labels";
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

/**
 * Formulario de creación de espacio. Se envía con onSubmit (no con `action`) para que
 * React no resetee los campos cuando la action devuelve errores de validación.
 * Si todo sale bien, createSpace redirige a la ficha del espacio.
 */
export function SpaceForm({ amenities }: { amenities: Amenity[] }) {
  const [state, formAction, pending] = useActionState(createSpace, null);
  const [images, setImages] = useState<PickedImage[]>([]);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    for (const { file } of images) formData.append("images", file);
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
            aria-invalid={!!fieldErrors?.title}
          />
        </Field>
        <Field label="Categoría" htmlFor="category" error={fieldErrors?.category}>
          <Select id="category" name="category" required defaultValue="" aria-invalid={!!fieldErrors?.category}>
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
        <Field label="Descripción (opcional)" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={5}
            maxLength={3000}
            placeholder="Dimensiones, equipamiento destacado, acceso, estacionamiento, reglas del espacio…"
          />
        </Field>
      </Section>

      <Section title="Ubicación" description="La dirección exacta se muestra en la ficha del espacio.">
        <Field label="Dirección" htmlFor="address" error={fieldErrors?.address}>
          <Input id="address" name="address" required autoComplete="street-address" placeholder="Av. Ejemplo 1234" aria-invalid={!!fieldErrors?.address} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Comuna" htmlFor="commune" error={fieldErrors?.commune}>
            <Input id="commune" name="commune" required placeholder="Providencia" aria-invalid={!!fieldErrors?.commune} />
          </Field>
          <Field label="Ciudad" htmlFor="city" error={fieldErrors?.city}>
            <Input id="city" name="city" required placeholder="Santiago" aria-invalid={!!fieldErrors?.city} />
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
              defaultValue={1}
              required
              aria-invalid={!!fieldErrors?.min_hours}
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          A los clientes se les cobra además una comisión de servicio del 10% sobre el subtotal.
        </p>
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
                    <input type="checkbox" name="amenity_ids" value={amenity.id} className="accent-primary" />
                    {amenity.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </Section>
      )}

      <Section title="Fotos" description="La primera foto es la portada. Podrás agregar más después.">
        <ImagePicker images={images} onChange={setImages} error={fieldErrors?.images} />
      </Section>

      <Section title="Publicación">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Estado inicial</legend>
          {[
            { value: "published", label: "Publicar ahora", hint: "Aparece en el listado y se puede reservar." },
            { value: "draft", label: "Guardar como borrador", hint: "Solo tú lo ves; puedes publicarlo desde tu panel." },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-checked:border-primary has-checked:bg-primary/5"
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                defaultChecked={option.value === "published"}
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
        <Link href="/dashboard" className={buttonClasses({ variant: "ghost" })}>
          Cancelar
        </Link>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (images.length ? "Subiendo fotos y creando..." : "Creando espacio...") : "Crear espacio"}
        </Button>
      </div>
    </form>
  );
}
