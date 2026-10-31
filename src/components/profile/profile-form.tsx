"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form-controls";
import { toast } from "@/components/ui/toaster";
import type { Profile } from "@/types/database";

const MAX_TAGS = 12;

/**
 * Edición del perfil propio. Se envía con onSubmit para no perder lo escrito si hay
 * errores y para mandar `tags` repetido. `min_client_rating` se edita en el panel
 * de anfitrión; aquí se reenvía sin cambios.
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, null);
  const [tags, setTags] = useState(profile.tags);
  const [draft, setDraft] = useState("");
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) toast("Perfil actualizado");
  }, [state]);

  function addTag() {
    const tag = draft.trim().slice(0, 30);
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) setTags([...tags, tag]);
    setDraft("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    for (const tag of tags) formData.append("tags", tag);
    formData.set("min_client_rating", profile.min_client_rating == null ? "" : String(profile.min_client_rating));
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel grid gap-5 p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="full_name" error={errors?.full_name}>
          <Input id="full_name" name="full_name" required defaultValue={profile.full_name ?? ""} autoComplete="name" />
        </Field>
        <Field label="Teléfono (privado)" htmlFor="phone" error={errors?.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" />
        </Field>
      </div>
      <Field label="Titular" htmlFor="headline" error={errors?.headline}>
        <Input
          id="headline"
          name="headline"
          maxLength={120}
          defaultValue={profile.headline ?? ""}
          placeholder="Ej.: Productora audiovisual independiente · Banda de post-punk"
        />
      </Field>
      <Field label="Comuna" htmlFor="commune" error={errors?.commune}>
        <Input id="commune" name="commune" maxLength={80} defaultValue={profile.commune ?? ""} placeholder="Ñuñoa" />
      </Field>
      <Field label="Sobre ti" htmlFor="bio" error={errors?.bio}>
        <Textarea
          id="bio"
          name="bio"
          rows={5}
          maxLength={2000}
          defaultValue={profile.bio ?? ""}
          placeholder="Qué haces, en qué proyectos trabajas, qué buscas en un espacio."
        />
      </Field>
      <Field label={`Etiquetas (${tags.length}/${MAX_TAGS})`} htmlFor="tag-draft" error={errors?.tags}>
        <div className="flex gap-2">
          <Input
            id="tag-draft"
            value={draft}
            maxLength={30}
            placeholder="Ej.: Rock, Publicidad, Fotografía de producto"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <button type="button" className="btn btn-soft" onClick={addTag} disabled={!draft.trim() || tags.length >= MAX_TAGS}>
            Agregar
          </button>
        </div>
        {tags.length > 0 && (
          <div className="chips mt-1">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                aria-label={`Quitar ${t}`}
                onClick={() => setTags(tags.filter((x) => x !== t))}
              >
                {t} <X className="size-3" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </Field>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-acc justify-self-end" disabled={pending}>
        {pending ? "Guardando..." : "Guardar perfil"}
      </button>
    </form>
  );
}
