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
export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${SPACE_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

export async function removeSpaceImages(supabase: Client, urls: string[]) {
  const paths = urls.map(storagePathFromPublicUrl).filter((p): p is string => p !== null);
  if (!paths.length) return { error: null };
  return supabase.storage.from(SPACE_IMAGES_BUCKET).remove(paths);
}
