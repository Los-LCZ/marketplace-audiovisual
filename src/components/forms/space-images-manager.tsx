"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { addSpaceImages, removeSpaceImage } from "@/app/actions/spaces";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_SPACE, validateImage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/layer";
import { toast } from "@/components/ui/toaster";
import { MAX_UPLOAD_BYTES } from "./image-picker";

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MB`;
}

/**
 * Fotos de un espacio ya creado: cada cambio se guarda al tiro (addSpaceImages /
 * removeSpaceImage), sin esperar a "Guardar cambios". Va dentro del formulario de
 * edición, así que no usa <form> propio: el <input type="file"> no tiene `name` y
 * no viaja con updateSpace.
 */
export function SpaceImagesManager({ spaceId, images }: { spaceId: string; images: string[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [removing, startRemove] = useTransition();
  const [toRemove, setToRemove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const free = MAX_IMAGES_PER_SPACE - images.length;

  function upload(list: FileList | null) {
    if (!list?.length) return;
    const files: File[] = [];
    let bytes = 0;
    let problem: string | null = null;
    for (const file of Array.from(list)) {
      const invalid = validateImage(file);
      if (invalid) problem = invalid;
      else if (files.length >= free) problem = `Máximo ${MAX_IMAGES_PER_SPACE} fotos por espacio`;
      else if (bytes + file.size > MAX_UPLOAD_BYTES)
        problem = `Las fotos no pueden sumar más de ${formatMB(MAX_UPLOAD_BYTES)} por envío`;
      else {
        files.push(file);
        bytes += file.size;
      }
    }
    if (inputRef.current) inputRef.current.value = "";
    setError(problem);
    if (!files.length) return;

    const formData = new FormData();
    for (const file of files) formData.append("images", file);
    startUpload(async () => {
      const result = await addSpaceImages(spaceId, null, formData);
      if (!result?.ok) return setError(result?.error ?? "No se pudieron subir las fotos");
      toast(files.length === 1 ? "Foto agregada" : `${files.length} fotos agregadas`, undefined, "ok");
      router.refresh();
    });
  }

  function remove(url: string) {
    startRemove(async () => {
      const result = await removeSpaceImage(spaceId, url);
      setToRemove(null);
      if (result && !result.ok) return setError(result.error);
      setError(null);
      toast("Foto eliminada", undefined, "ok");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((url, i) => (
          <li key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            <Image src={url} alt={`Foto ${i + 1}`} fill sizes="200px" className="object-cover" />
            {i === 0 && (
              <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium">
                Portada
              </span>
            )}
            <button
              type="button"
              onClick={() => setToRemove(url)}
              disabled={removing}
              aria-label={`Eliminar foto ${i + 1}`}
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-surface/90 hover:bg-surface"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}

        {free > 0 && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60",
                error ? "border-danger" : "border-border",
              )}
            >
              <ImagePlus className="size-6" aria-hidden />
              {uploading ? "Subiendo..." : "Agregar fotos"}
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={(e) => upload(e.target.files)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      <p className="text-xs text-muted-foreground">
        Se guardan al tiro, sin apretar Guardar cambios. JPG, PNG, WebP o AVIF · hasta {formatMB(MAX_IMAGE_BYTES)} cada
        una · {images.length}/{MAX_IMAGES_PER_SPACE} fotos. La primera es la portada.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}

      <ConfirmDialog
        open={!!toRemove}
        title="¿Eliminar esta foto?"
        body="Se borra del espacio y de tu almacenamiento. No se puede deshacer."
        confirmLabel="Eliminar"
        pending={removing}
        onConfirm={() => toRemove && remove(toRemove)}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}
