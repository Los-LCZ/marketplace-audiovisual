// Tipo real de una imagen según sus primeros bytes ("magic numbers"), no según la
// extensión ni el `file.type` que declara el navegador (ambos los controla el usuario).

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

export const IMAGE_EXTENSIONS: Record<ImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function ascii(bytes: Uint8Array, from: number, to: number) {
  return String.fromCharCode(...bytes.slice(from, to));
}

/** Detecta JPEG, PNG, WebP o AVIF por su firma. Devuelve null si no es ninguno. */
export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  // ISO-BMFF: [tamaño de 4 bytes]"ftyp"[marca]; AVIF usa las marcas avif / avis.
  if (ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) return "image/avif";
  return null;
}

/** Lee la cabecera del archivo y devuelve su tipo real si está entre los permitidos. */
export async function sniffImage(file: Blob, allowed: readonly string[]): Promise<ImageMime | null> {
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const mime = detectImageMime(head);
  return mime && allowed.includes(mime) ? mime : null;
}
