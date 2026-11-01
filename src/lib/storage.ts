import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Funciona tanto con el cliente de navegador como con el de servidor.
type Client = SupabaseClient<Database>;

export const SPACE_IMAGES_BUCKET = "space-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_SPACE = 10;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return `${file.name}: formato no permitido`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: supera los 5 MB`;
  return null;
}

/**
 * Sube fotos a space-images/{userId}/{spaceId}/ y devuelve sus URLs públicas.
 * La política de Storage exige que la primera carpeta sea el uid del usuario.
 */
export async function uploadSpaceImages(
  supabase: Client,
  userId: string,
  spaceId: string,
  files: File[],
): Promise<{ urls: string[]; error?: string }> {
  const urls: string[] = [];

  for (const file of files) {
    const invalid = validateImage(file);
    if (invalid) return { urls, error: invalid };

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${spaceId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(SPACE_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });

    if (error) return { urls, error: `No se pudo subir ${file.name}: ${error.message}` };

    urls.push(supabase.storage.from(SPACE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl);
  }

  return { urls };
}

// Convierte una URL pública en la ruta del objeto dentro del bucket.
export function storagePathFromPublicUrl(url: string, bucket = SPACE_IMAGES_BUCKET): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

export async function removeSpaceImages(supabase: Client, urls: string[]) {
  const paths = urls.map((url) => storagePathFromPublicUrl(url)).filter((p): p is string => p !== null);
  if (!paths.length) return { error: null };
  return supabase.storage.from(SPACE_IMAGES_BUCKET).remove(paths);
}

// -----------------------------------------------------------------------------
// Foto de perfil: avatars/{userId}/{archivo}
// -----------------------------------------------------------------------------
export const AVATARS_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateAvatar(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) return "Usa una imagen JPG, PNG o WebP";
  if (file.size > MAX_AVATAR_BYTES) return "La foto supera los 2 MB";
  return null;
}

/** Sube la foto con un nombre nuevo (evita la caché del CDN) y devuelve su URL pública. */
export async function uploadAvatar(
  supabase: Client,
  userId: string,
  file: File,
): Promise<{ url?: string; error?: string }> {
  const invalid = validateAvatar(file);
  if (invalid) return { error: invalid };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return { error: `No se pudo subir la foto: ${error.message}` };

  return { url: supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl };
}

/** Borra una foto de perfil a partir de su URL pública (ignora URLs de otros buckets). */
export async function removeAvatarFile(supabase: Client, url: string | null | undefined) {
  const path = url ? storagePathFromPublicUrl(url, AVATARS_BUCKET) : null;
  if (!path) return { error: null };
  return supabase.storage.from(AVATARS_BUCKET).remove([path]);
}
