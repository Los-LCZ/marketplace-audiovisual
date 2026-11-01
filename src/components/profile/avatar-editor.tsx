"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { removeAvatar, updateAvatar } from "@/app/actions/profile";
import { ALLOWED_AVATAR_TYPES, MAX_AVATAR_BYTES } from "@/lib/storage";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/layer";
import { toast } from "@/components/ui/toaster";

const SIDE = 512; // la foto se recorta al centro y se reduce a 512×512 antes de subirla
const QUALITY = 0.88;

/** Recorta al centro y reduce la imagen elegida a un JPEG cuadrado de SIDE px. */
async function squareJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const crop = Math.min(bitmap.width, bitmap.height);
  const side = Math.min(SIDE, crop);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite preparar la foto");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - crop) / 2, (bitmap.height - crop) / 2, crop, crop, 0, 0, side, side);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("No se pudo preparar la foto");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

/**
 * Foto de perfil: elegir con vista previa (recortada y reducida en el navegador),
 * "Guardar foto" con updateAvatar y "Quitar foto" con removeAvatar. La foto aparece en el
 * menú, el perfil público, las reseñas y las solicitudes.
 */
export function AvatarEditor({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [state, formAction, saving] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateAvatar>>, formData: FormData) => {
      const result = await updateAvatar(prev, formData);
      if (result?.ok) {
        toast("Foto actualizada", "Ya aparece en tu perfil y en el menú.", "ok");
        setPicked(null);
      }
      return result;
    },
    null,
  );
  const [removing, startRemove] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [askRemove, setAskRemove] = useState(false);

  // Libera la URL de vista previa al cambiarla o al desmontar.
  useEffect(() => () => (picked ? URL.revokeObjectURL(picked.url) : undefined), [picked]);

  async function choose(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setLocalError(null);
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) return setLocalError("Usa una imagen JPG, PNG o WebP");
    setPreparing(true);
    try {
      const square = await squareJpeg(file);
      if (square.size > MAX_AVATAR_BYTES) return setLocalError("La foto supera los 2 MB");
      setPicked({ file: square, url: URL.createObjectURL(square) });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "No se pudo leer la imagen");
    } finally {
      setPreparing(false);
    }
  }

  function save() {
    if (!picked) return;
    const fd = new FormData();
    fd.append("avatar", picked.file);
    startTransition(() => formAction(fd));
  }

  function remove() {
    startRemove(async () => {
      const result = await removeAvatar();
      setAskRemove(false);
      if (result && !result.ok) return setLocalError(result.error);
      toast("Foto eliminada", "Se muestran tus iniciales.", "ok");
    });
  }

  const serverError = state && !state.ok ? (state.fieldErrors?.avatar ?? state.error) : null;
  const error = localError ?? (picked ? null : serverError);
  const shown = picked?.url ?? avatarUrl;

  return (
    <section className="panel flex flex-wrap items-center gap-5 p-5" aria-labelledby="foto-h">
      <Avatar name={name} src={shown} size="xl" />
      <div className="flex min-w-0 grow flex-col gap-2">
        <h2 id="foto-h" className="font-semibold">
          Foto de perfil
        </h2>
        <p className="dim text-sm" id="foto-hint">
          {picked
            ? "Así se verá. Guárdala para aplicarla."
            : "JPG, PNG o WebP. La recortamos cuadrada y la reducimos antes de subirla."}
        </p>
        <input
          ref={inputRef}
          id="avatar"
          type="file"
          accept={ALLOWED_AVATAR_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          {picked ? (
            <>
              <button type="button" className="btn btn-acc btn-sm" disabled={saving} onClick={save}>
                {saving ? "Guardando..." : "Guardar foto"}
              </button>
              <button type="button" className="btn btn-line btn-sm" disabled={saving} onClick={() => setPicked(null)}>
                Descartar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                disabled={preparing}
                aria-describedby="foto-hint"
                onClick={() => inputRef.current?.click()}
              >
                <Camera aria-hidden />
                {preparing ? "Preparando..." : avatarUrl ? "Cambiar foto" : "Elegir foto"}
              </button>
              {avatarUrl && (
                <button type="button" className="btn btn-line btn-sm" disabled={removing} onClick={() => setAskRemove(true)}>
                  <Trash2 aria-hidden />
                  Quitar foto
                </button>
              )}
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={askRemove}
        title="¿Quitar tu foto?"
        body="Se borra y en su lugar se muestran tus iniciales."
        confirmLabel="Quitar foto"
        pending={removing}
        onConfirm={remove}
        onClose={() => setAskRemove(false)}
      />
    </section>
  );
}
