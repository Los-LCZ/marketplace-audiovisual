"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, getString, type ActionState } from "@/lib/action-state";

const MAX_TAGS = 12;

/**
 * Actualiza el perfil propio. Campos: full_name, phone, headline, bio, commune,
 * tags (repetido) y min_client_rating ("" = acepta a cualquier cliente).
 * `verified` y `role` no se pueden cambiar desde aquí.
 */
export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const fullName = getString(formData, "full_name");
  const phone = getString(formData, "phone");
  const headline = getString(formData, "headline");
  const bio = getString(formData, "bio");
  const commune = getString(formData, "commune");
  const tags = [
    ...new Set(
      formData
        .getAll("tags")
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter(Boolean),
    ),
  ];
  const minRatingRaw = getString(formData, "min_client_rating");
  const minClientRating = minRatingRaw ? Number(minRatingRaw) : null;

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2) fieldErrors.full_name = "Ingresa tu nombre";
  if (headline.length > 120) fieldErrors.headline = "Máximo 120 caracteres";
  if (bio.length > 2000) fieldErrors.bio = "Máximo 2000 caracteres";
  if (commune.length > 80) fieldErrors.commune = "Máximo 80 caracteres";
  if (tags.length > MAX_TAGS) fieldErrors.tags = `Máximo ${MAX_TAGS} etiquetas`;
  if (tags.some((t) => t.length > 30)) fieldErrors.tags = "Cada etiqueta, máximo 30 caracteres";
  if (minClientRating !== null && (!Number.isFinite(minClientRating) || minClientRating < 1 || minClientRating > 5))
    fieldErrors.min_client_rating = "Entre 1 y 5";
  if (Object.keys(fieldErrors).length) return fail("Revisa los campos marcados", fieldErrors);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      headline: headline || null,
      bio: bio || null,
      commune: commune || null,
      tags,
      min_client_rating: minClientRating === null ? null : Math.round(minClientRating * 100) / 100,
    })
    .eq("id", user.id);

  if (error) return fail(`No se pudo guardar el perfil: ${error.message}`);

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil actualizado" };
}
