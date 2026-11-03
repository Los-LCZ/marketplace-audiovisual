"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_SPACE, validateImage } from "@/lib/storage";
import { cn } from "@/lib/utils";

// next.config.ts limita el cuerpo de las Server Actions a 10 MB (fotos + campos del formulario).
export const MAX_UPLOAD_BYTES = 9.5 * 1024 * 1024;

export type PickedImage = { file: File; url: string };

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MB`;
}

/** Motivo por el que una foto elegida no entró: formato, peso, tope de fotos o tope por envío. */
export function rejectReason(file: File, count: number, bytes: number): string | null {
  const invalid = validateImage(file);
  if (invalid) return invalid;
  if (count >= MAX_IMAGES_PER_SPACE) return `${file.name}: ya hay ${MAX_IMAGES_PER_SPACE} fotos, el máximo`;
  if (bytes + file.size > MAX_UPLOAD_BYTES)
    return `${file.name}: las fotos no pueden sumar más de ${formatMB(MAX_UPLOAD_BYTES)} por envío`;
  return null;
}

/** Todas las fotos rechazadas en el último intento (antes solo se veía la última), o el error del servidor. */
export function RejectedFiles({ problems, error }: { problems: string[]; error?: string | null }) {
  if (!problems.length) {
    return error ? (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    ) : null;
  }
  return (
    <div role="alert" className="text-sm text-danger">
      {problems.length === 1 ? (
        <p>{problems[0]}</p>
      ) : (
        <>
          <p>{problems.length} fotos no se agregaron:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Selector de fotos con vista previa. Las fotos viven en el estado del padre (no en el
 * <input>), que las agrega al FormData al enviar. La primera foto es la portada.
 */
export function ImagePicker({
  images,
  onChange,
  error,
}: {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const totalBytes = images.reduce((sum, i) => sum + i.file.size, 0);

  // Libera las URLs de vista previa al desmontar.
  const latest = useRef(images);
  useEffect(() => {
    latest.current = images;
  }, [images]);
  useEffect(() => () => latest.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = [...images];
    let bytes = totalBytes;
    const problems: string[] = [];

    for (const file of Array.from(files)) {
      const problem = rejectReason(file, next.length, bytes);
      if (problem) problems.push(problem);
      else {
        next.push({ file, url: URL.createObjectURL(file) });
        bytes += file.size;
      }
    }

    setRejected(problems);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number) {
    URL.revokeObjectURL(images[index].url);
    setRejected([]);
    onChange(images.filter((_, i) => i !== index));
  }

  function makeCover(index: number) {
    onChange([images[index], ...images.filter((_, i) => i !== index)]);
  }

  const shownError = rejected.length > 0 || !!error;

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((image, i) => (
          <li key={image.url} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            <Image
              src={image.url}
              alt={`Foto ${i + 1} de ${images.length}${i === 0 ? " (portada)" : ""}: ${image.file.name}`}
              fill
              unoptimized
              className="object-cover"
            />
            {i === 0 ? (
              <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium">
                Portada
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(i)}
                aria-label={`Usar la foto ${i + 1} de portada`}
                className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                Usar de portada
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Quitar foto ${i + 1}`}
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-surface/90 hover:bg-surface"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}

        {images.length < MAX_IMAGES_PER_SPACE && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary",
                shownError ? "border-danger" : "border-border",
              )}
            >
              <ImagePlus className="size-6" aria-hidden />
              Agregar fotos
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={(e) => addFiles(e.target.files)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      <p className="text-xs text-muted-foreground">
        JPG, PNG, WebP o AVIF · hasta {formatMB(MAX_IMAGE_BYTES)} cada una · {images.length}/{MAX_IMAGES_PER_SPACE} fotos ·{" "}
        {formatMB(totalBytes)} de {formatMB(MAX_UPLOAD_BYTES)}
      </p>
      <RejectedFiles problems={rejected} error={error} />
    </div>
  );
}
