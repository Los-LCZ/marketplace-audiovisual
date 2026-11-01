"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, getString, getStringList, type ActionState } from "@/lib/action-state";
import { removeAvatarFile, uploadAvatar } from "@/lib/storage";

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
  const tags = getStringList(formData, "tags", MAX_TAGS + 1);
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

function revalidateProfile(userId: string) {
  revalidatePath("/perfil");
  revalidatePath(`/u/${userId}`);
  revalidatePath("/", "layout");
}

/**
 * Sube o reemplaza la foto de perfil. Campo: `avatar` (JPG, PNG o WebP, máx. 2 MB).
 * Borra la foto anterior. Con useActionState: `useActionState(updateAvatar, null)`.
 */
export async function updateAvatar(_prev: ActionState<{ url: string }>, formData: FormData): Promise<ActionState<{ url: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return fail("Elige una foto", { avatar: "Elige una foto" });

  const supabase = await createClient();
  const upload = await uploadAvatar(supabase, user.id, file);
  if (!upload.url) return fail(upload.error ?? "No se pudo subir la foto", { avatar: upload.error ?? "Error" });

  const { error } = await supabase.from("profiles").update({ avatar_url: upload.url }).eq("id", user.id);
  if (error) {
    await removeAvatarFile(supabase, upload.url);
    return fail(`No se pudo guardar la foto: ${error.message}`);
  }

  await removeAvatarFile(supabase, user.profile.avatar_url);
  revalidateProfile(user.id);
  return { ok: true, data: { url: upload.url }, message: "Foto actualizada" };
}

/**
 * Quita la foto de perfil (y borra el archivo).
 * No recibe FormData: úsala con `useTransition` o con `.bind`.
 */
export async function removeAvatar(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");
  if (!user.profile.avatar_url) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) return fail(`No se pudo quitar la foto: ${error.message}`);

  await removeAvatarFile(supabase, user.profile.avatar_url);
  revalidateProfile(user.id);
  return { ok: true, message: "Foto eliminada" };
}
