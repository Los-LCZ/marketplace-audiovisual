"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { becomeHost } from "@/app/actions/profile";
import { ConfirmDialog } from "@/components/ui/layer";
import { toast } from "@/components/ui/toaster";

/**
 * Pasa una cuenta de cliente a anfitrión (becomeHost) y deja al usuario en /espacios/nuevo con el
 * formulario. El cambio no se puede deshacer desde la app, así que pide confirmación antes.
 */
export function BecomeHost() {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await becomeHost();
      setAsking(false);
      if (result && !result.ok) return setError(result.error);
      setError(null);
      if (result?.message) toast("Cuenta de anfitrión activada", result.message, "ok");
      // La action revalida el layout y /dashboard; esto trae el formulario a esta misma página.
      router.replace("/espacios/nuevo");
      router.refresh();
    });
  }

  return (
    <div className="panel mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <Store className="size-10 text-[var(--acc)]" aria-hidden />
      <h1 className="display h3">Publica tu espacio en Señal</h1>
      <p className="dim">
        Tu cuenta es de cliente. Actívala como anfitrión para publicar estudios, salas, sets o locaciones y recibir
        reservas. Vas a poder seguir reservando espacios igual que ahora.
      </p>
      <button type="button" className="btn btn-acc btn-lg" onClick={() => setAsking(true)} disabled={pending}>
        {pending ? "Activando..." : "Quiero ser anfitrión"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={asking}
        title="¿Activar tu cuenta de anfitrión?"
        body="Tu cuenta pasará a ser de anfitrión. Podrás seguir reservando espacios igual que ahora. Este cambio no se puede deshacer desde la app."
        confirmLabel="Activar"
        pending={pending}
        onConfirm={confirm}
        onClose={() => setAsking(false)}
      />
    </div>
  );
}
