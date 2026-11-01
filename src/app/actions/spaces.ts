"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, getString, getStringList, type ActionState } from "@/lib/action-state";
import { MAX_IMAGES_PER_SPACE, removeSpaceImages, uploadSpaceImages } from "@/lib/storage";
import { isValidIsoDate } from "@/lib/iso-date";
import type { GearCategory, GearGroup, SpaceCategory, SpaceStatus } from "@/types/database";

const CATEGORIES: SpaceCategory[] = [
  "recording_studio",
  "rehearsal_room",
  "filming_set",
  "photo_studio",
  "outdoor_location",
];
const STATUSES: SpaceStatus[] = ["draft", "published", "archived"];
const GEAR_CATEGORIES: GearCategory[] = ["microfonos", "consolas", "amplificacion", "iluminacion"];
const MAX_RULES = 20;
const MAX_GEAR_ITEMS = 50;

// Entero opcional: "" => null; no entero => undefined (inválido).
function optionalInt(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : undefined;
}

/** `gear` llega como JSON: `[{ "category": "microfonos", "items": ["SM7B"] }]`. */
function parseGear(raw: string): GearGroup[] | null {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    const groups: GearGroup[] = [];
    for (const group of value) {
      const category = group?.category;
      const items: unknown = group?.items;
      if (!GEAR_CATEGORIES.includes(category) || !Array.isArray(items)) return null;
      if (!items.every((item) => typeof item === "string")) return null;
      const clean = (items as string[]).map((i) => i.trim()).filter(Boolean).slice(0, MAX_GEAR_ITEMS);
      if (clean.length) groups.push({ category, items: clean });
    }
    return groups;
  } catch {
    return null;
  }
}

/**
 * Campos del formulario de espacio (crear y editar):
 * title, category, description, summary, address, city, commune, neighborhood,
 * price_per_hour, min_hours, size_m2, capacity, open_hour, close_hour, status,
 * rules (repetido), amenity_ids (repetido), gear (JSON) e images (solo al crear).
 */
function parseSpaceForm(formData: FormData) {
  const title = getString(formData, "title");
  const category = getString(formData, "category") as SpaceCategory;
  const description = getString(formData, "description");
  const summary = getString(formData, "summary");
  const address = getString(formData, "address");
  const city = getString(formData, "city");
  const commune = getString(formData, "commune");
  const neighborhood = getString(formData, "neighborhood");
  const pricePerHour = Number(getString(formData, "price_per_hour"));
  const minHours = Number(getString(formData, "min_hours") || 1);
  const sizeM2 = optionalInt(formData, "size_m2");
  const capacity = optionalInt(formData, "capacity");
  const openHour = Number(getString(formData, "open_hour") || 8);
  const closeHour = Number(getString(formData, "close_hour") || 24);
  const status = (getString(formData, "status") || "published") as SpaceStatus;
  const rules = getStringList(formData, "rules", MAX_RULES);
  const gear = parseGear(getString(formData, "gear"));
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
  if (summary.length > 280) fieldErrors.summary = "Máximo 280 caracteres";
  if (!address) fieldErrors.address = "Requerido";
  if (!city) fieldErrors.city = "Requerido";
  if (!commune) fieldErrors.commune = "Requerido";
  if (neighborhood.length > 80) fieldErrors.neighborhood = "Máximo 80 caracteres";
  if (!Number.isInteger(pricePerHour) || pricePerHour <= 0)
    fieldErrors.price_per_hour = "Ingresa un precio en CLP (entero)";
  if (!Number.isInteger(minHours) || minHours < 1) fieldErrors.min_hours = "Mínimo 1 hora";
  if (sizeM2 === undefined || (sizeM2 !== null && sizeM2 <= 0)) fieldErrors.size_m2 = "Metros cuadrados inválidos";
  if (capacity === undefined || (capacity !== null && capacity <= 0)) fieldErrors.capacity = "Aforo inválido";
  if (!Number.isInteger(openHour) || openHour < 0 || openHour > 23)
    fieldErrors.open_hour = "Hora de apertura entre 0 y 23";
  if (!Number.isInteger(closeHour) || closeHour < 1 || closeHour > 24)
    fieldErrors.close_hour = "Hora de cierre entre 1 y 24";
  else if (closeHour <= openHour) fieldErrors.close_hour = "Debe ser posterior a la apertura";
  else if (Number.isInteger(minHours) && closeHour - openHour < minHours)
    fieldErrors.min_hours = "El mínimo de horas no cabe en el horario";
  if (!STATUSES.includes(status)) fieldErrors.status = "Estado inválido";
  if (gear === null) fieldErrors.gear = "Equipamiento inválido";
  if (images.length > MAX_IMAGES_PER_SPACE)
    fieldErrors.images = `Máximo ${MAX_IMAGES_PER_SPACE} fotos`;

  return {
    fieldErrors,
    values: {
      title,
      category,
      description: description || null,
      summary: summary || null,
      address,
      city,
      commune,
      neighborhood: neighborhood || null,
      price_per_hour: pricePerHour,
      min_hours: minHours,
      size_m2: sizeM2 ?? null,
      capacity: capacity ?? null,
      open_hour: openHour,
      close_hour: closeHour,
      status,
      rules,
      gear: gear ?? [],
    },
    amenityIds,
    images,
  };
}

// Portada y catálogo, panel del anfitrión, ficha y edición.
function revalidateSpace(spaceId: string) {
  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/dashboard");
  revalidatePath(`/espacios/${spaceId}`);
  revalidatePath(`/espacios/${spaceId}/editar`);
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
    const { error: amenitiesError } = await supabase.rpc("set_space_amenities", {
      p_space_id: spaceId,
      p_amenity_ids: amenityIds,
    });
    if (amenitiesError) return fail(`Espacio creado, pero falló al guardar amenities: ${amenitiesError.message}`);
  }

  revalidateSpace(spaceId);
  redirect(`/espacios/${spaceId}`);
}

/**
 * Edita un espacio propio. Recibe el formulario completo (mismos campos que
 * createSpace, sin `images`): las amenities y el equipamiento enviados reemplazan
 * a los actuales. Las fotos se manejan con addSpaceImages / removeSpaceImage.
 * Con useActionState: `useActionState(updateSpace.bind(null, space.id), null)`.
 */
export async function updateSpace(
  spaceId: string,
  _prev: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const { fieldErrors, values, amenityIds } = parseSpaceForm(formData);
  delete fieldErrors.images;
  if (Object.keys(fieldErrors).length) return fail("Revisa los campos marcados", fieldErrors);

  const supabase = await createClient();
  // RLS: solo el dueño puede actualizarlo; .select() detecta 0 filas afectadas.
  const { data, error } = await supabase
    .from("spaces")
    .update(values)
    .eq("id", spaceId)
    .eq("host_id", user.id)
    .select("id");

  if (error) return fail(`No se pudo guardar: ${error.message}`);
  if (!data?.length) return fail("Espacio no encontrado");

  const { error: amenitiesError } = await supabase.rpc("set_space_amenities", {
    p_space_id: spaceId,
    p_amenity_ids: amenityIds,
  });
  if (amenitiesError) return fail(`Cambios guardados, pero falló al guardar amenities: ${amenitiesError.message}`);

  revalidateSpace(spaceId);
  return { ok: true, data: { id: spaceId }, message: "Cambios guardados" };
}

/**
 * Publica, archiva o pasa a borrador un espacio propio.
 * No recibe FormData: úsala con `useTransition` o con `.bind` en un `<form action>`.
 *
 * @example
 * startTransition(async () => { const res = await updateSpaceStatus(space.id, "archived"); });
 * // o: <form action={updateSpaceStatus.bind(null, space.id, "published")}>
 */
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

  revalidateSpace(spaceId);
  return { ok: true };
}

/**
 * Agrega fotos (campo `images`) a un espacio existente. Compatible con
 * useActionState vía `.bind`: `useActionState(addSpaceImages.bind(null, space.id), null)`.
 */
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

  revalidateSpace(spaceId);
  return { ok: true };
}

/**
 * Quita una foto del espacio y la borra de Storage. `imageUrl` debe ser una de
 * las URLs de `space.images`.
 * No recibe FormData: úsala con `useTransition` o con `.bind`.
 */
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
  revalidateSpace(spaceId);
  return { ok: true };
}

/**
 * Cambia el orden de las fotos de un espacio propio; la primera es la portada.
 * `urls` debe ser exactamente las mismas URLs de `space.images`, en otro orden.
 * No recibe FormData: úsala con `useTransition` o con `.bind`.
 */
export async function reorderSpaceImages(spaceId: string, urls: string[]): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");
  if (!Array.isArray(urls) || !urls.every((u) => typeof u === "string")) return fail("Orden inválido");

  const supabase = await createClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("images, host_id")
    .eq("id", spaceId)
    .maybeSingle();
  if (!space || space.host_id !== user.id) return fail("Espacio no encontrado");

  // Permutación exacta: mismo largo, sin repetidas y las mismas URLs.
  const current = new Set(space.images);
  const isPermutation =
    urls.length === space.images.length && new Set(urls).size === urls.length && urls.every((u) => current.has(u));
  if (!isPermutation) return fail("Las fotos cambiaron mientras ordenabas; recarga e inténtalo de nuevo");

  const { error } = await supabase
    .from("spaces")
    .update({ images: urls })
    .eq("id", spaceId)
    .eq("host_id", user.id);
  if (error) return fail(error.message);

  revalidateSpace(spaceId);
  return { ok: true };
}

const MAX_BLACKOUTS_PER_CALL = 62;

/**
 * Cierra días de un espacio propio (hora de Chile). Todos o ninguno: si un día ya pasó,
 * está a más de un año o tiene reservas/solicitudes activas, no se cierra ninguno y se
 * devuelve el motivo. Los días ya cerrados se ignoran. `reason` es una nota privada.
 * No recibe FormData: úsala con `useTransition` o con `.bind`.
 */
export async function addSpaceBlackouts(
  spaceId: string,
  dates: string[],
  reason?: string,
): Promise<ActionState<{ count: number }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");

  const unique = [...new Set(Array.isArray(dates) ? dates : [])];
  if (!unique.length) return fail("Elige al menos un día");
  if (unique.length > MAX_BLACKOUTS_PER_CALL) return fail(`Máximo ${MAX_BLACKOUTS_PER_CALL} días a la vez`);
  if (!unique.every((d) => isValidIsoDate(d))) return fail("Hay una fecha inválida");
  const note = typeof reason === "string" ? reason.trim().slice(0, 120) : "";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_blackouts")
    .upsert(
      unique.map((date) => ({ space_id: spaceId, date, reason: note || null })),
      { onConflict: "space_id,date", ignoreDuplicates: true },
    )
    .select("id");

  if (error) {
    if (error.code === "P0001") return fail(error.message);
    if (error.code === "42501") return fail("Espacio no encontrado");
    return fail(`No se pudieron cerrar los días: ${error.message}`);
  }

  revalidateSpace(spaceId);
  return { ok: true, data: { count: data?.length ?? 0 } };
}

/**
 * Reabre un día cerrado de un espacio propio (`date` en YYYY-MM-DD).
 * No recibe FormData: úsala con `useTransition` o con `.bind`.
 */
export async function removeSpaceBlackout(spaceId: string, date: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");
  if (!isValidIsoDate(date)) return fail("Fecha inválida");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_blackouts")
    .delete()
    .eq("space_id", spaceId)
    .eq("date", date)
    .select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("Ese día no estaba cerrado");

  revalidateSpace(spaceId);
  return { ok: true };
}
