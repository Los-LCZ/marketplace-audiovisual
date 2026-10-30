"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, getString, type ActionState } from "@/lib/action-state";
import { MAX_IMAGES_PER_SPACE, removeSpaceImages, uploadSpaceImages } from "@/lib/storage";
import type { SpaceCategory, SpaceStatus } from "@/types/database";

const CATEGORIES: SpaceCategory[] = [
  "recording_studio",
  "rehearsal_room",
  "filming_set",
  "photo_studio",
  "outdoor_location",
];
const STATUSES: SpaceStatus[] = ["draft", "published", "archived"];

function parseSpaceForm(formData: FormData) {
  const title = getString(formData, "title");
  const category = getString(formData, "category") as SpaceCategory;
  const description = getString(formData, "description");
  const address = getString(formData, "address");
  const city = getString(formData, "city");
  const commune = getString(formData, "commune");
  const pricePerHour = Number(getString(formData, "price_per_hour"));
  const minHours = Number(getString(formData, "min_hours") || 1);
  const status = (getString(formData, "status") || "published") as SpaceStatus;
  const amenityIds = formData
    .getAll("amenity_ids")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const fieldErrors: Record<string, string> = {};
  if (title.length < 3 || title.length > 120) fieldErrors.title = "Entre 3 y 120 caracteres";
  if (!CATEGORIES.includes(category)) fieldErrors.category = "Categoría inválida";
  if (!address) fieldErrors.address = "Requerido";
  if (!city) fieldErrors.city = "Requerido";
  if (!commune) fieldErrors.commune = "Requerido";
  if (!Number.isInteger(pricePerHour) || pricePerHour <= 0)
    fieldErrors.price_per_hour = "Ingresa un precio en CLP (entero)";
  if (!Number.isInteger(minHours) || minHours < 1) fieldErrors.min_hours = "Mínimo 1 hora";
  if (!STATUSES.includes(status)) fieldErrors.status = "Estado inválido";
  if (images.length > MAX_IMAGES_PER_SPACE)
    fieldErrors.images = `Máximo ${MAX_IMAGES_PER_SPACE} fotos`;

  return {
    fieldErrors,
    values: {
      title,
      category,
      description: description || null,
      address,
      city,
      commune,
      price_per_hour: pricePerHour,
      min_hours: minHours,
      status,
    },
    amenityIds,
    images,
  };
}

export async function createSpace(
  _prev: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");
  if (user.profile.role === "client") return fail("Solo los anfitriones pueden publicar espacios");

  const { fieldErrors, values, amenityIds, images } = parseSpaceForm(formData);
  if (Object.keys(fieldErrors).length) return fail("Revisa los campos marcados", fieldErrors);

  const supabase = await createClient();
  const spaceId = crypto.randomUUID();

  const upload = await uploadSpaceImages(supabase, user.id, spaceId, images);
  if (upload.error) {
    await removeSpaceImages(supabase, upload.urls);
    return fail(upload.error, { images: upload.error });
  }

  const { error } = await supabase
    .from("spaces")
    .insert({ id: spaceId, host_id: user.id, images: upload.urls, ...values });

  if (error) {
    await removeSpaceImages(supabase, upload.urls);
    return fail(`No se pudo crear el espacio: ${error.message}`);
  }

  if (amenityIds.length) {
    const { error: amenitiesError } = await supabase
      .from("space_amenities")
      .insert(amenityIds.map((amenity_id) => ({ space_id: spaceId, amenity_id })));
    if (amenitiesError) return fail(`Espacio creado, pero falló al guardar amenities: ${amenitiesError.message}`);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/espacios/${spaceId}`);
}

export async function updateSpaceStatus(spaceId: string, status: SpaceStatus): Promise<ActionState> {
  if (!STATUSES.includes(status)) return fail("Estado inválido");
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const supabase = await createClient();
  // RLS garantiza que solo el dueño puede modificarlo; .select() detecta 0 filas afectadas.
  const { data, error } = await supabase
    .from("spaces")
    .update({ status })
    .eq("id", spaceId)
    .select("id");

  if (error) return fail(error.message);
  if (!data?.length) return fail("Espacio no encontrado");

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/espacios/${spaceId}`);
  return { ok: true };
}

// Agrega fotos a un espacio existente.
export async function addSpaceImages(
  spaceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const supabase = await createClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("images, host_id")
    .eq("id", spaceId)
    .maybeSingle();
  if (!space || space.host_id !== user.id) return fail("Espacio no encontrado");

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return fail("Selecciona al menos una foto");
  if (space.images.length + files.length > MAX_IMAGES_PER_SPACE)
    return fail(`Máximo ${MAX_IMAGES_PER_SPACE} fotos por espacio`);

  const upload = await uploadSpaceImages(supabase, user.id, spaceId, files);
  if (upload.error) {
    await removeSpaceImages(supabase, upload.urls);
    return fail(upload.error);
  }

  const { error } = await supabase
    .from("spaces")
    .update({ images: [...space.images, ...upload.urls] })
    .eq("id", spaceId);
  if (error) {
    await removeSpaceImages(supabase, upload.urls);
    return fail(error.message);
  }

  revalidatePath(`/espacios/${spaceId}`);
  return { ok: true };
}

export async function removeSpaceImage(spaceId: string, imageUrl: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const supabase = await createClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("images, host_id")
    .eq("id", spaceId)
    .maybeSingle();
  if (!space || space.host_id !== user.id) return fail("Espacio no encontrado");
  if (!space.images.includes(imageUrl)) return fail("La foto no pertenece a este espacio");

  const { error } = await supabase
    .from("spaces")
    .update({ images: space.images.filter((url) => url !== imageUrl) })
    .eq("id", spaceId);
  if (error) return fail(error.message);

  await removeSpaceImages(supabase, [imageUrl]);
  revalidatePath(`/espacios/${spaceId}`);
  return { ok: true };
}
