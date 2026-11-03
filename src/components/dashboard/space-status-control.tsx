"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateSpaceStatus } from "@/app/actions/spaces";
import { hideSpaceWarning } from "@/lib/hide-space";
import { SPACE_STATUSES, SPACE_STATUS_LABELS } from "@/lib/labels";
import type { SpaceStatus } from "@/types/database";
import { Select } from "@/components/ui/form-controls";
import { ConfirmDialog } from "@/components/ui/layer";
import { toast } from "@/components/ui/toaster";

// Confirmación del cambio, con la misma explicación de cada estado que el formulario del espacio.
const STATUS_TOASTS: Record<SpaceStatus, [string, string]> = {
  published: ["Espacio publicado", "Aparece en el listado y se puede reservar."],
  draft: ["Espacio en borrador", "Solo tú lo ves; puedes publicarlo desde tu panel."],
  archived: ["Espacio archivado", "Fuera del listado; las reservas pasadas se conservan."],
};

// Cambia el estado de un espacio propio (publicado / borrador / archivado).
export function SpaceStatusControl({
  spaceId,
  status,
  upcomingBookings,
}: {
  spaceId: string;
  status: SpaceStatus;
  /** Reservas y solicitudes próximas (countUpcomingBookings): pide confirmar antes de ocultarlo. */
  upcomingBookings: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Muestra el nuevo estado mientras guarda; si falla, vuelve al valor real del servidor.
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [ask, setAsk] = useState<{ next: SpaceStatus; warning: string } | null>(null);

  function onSelect(next: SpaceStatus) {
    const warning = hideSpaceWarning(status, next, upcomingBookings);
    if (warning) setAsk({ next, warning });
    else onChange(next);
  }

  function onChange(next: SpaceStatus) {
    setAsk(null);
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await updateSpaceStatus(spaceId, next);
      if (result && !result.ok) return setError(result.error);
      toast(...STATUS_TOASTS[next], "ok");
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Select
          aria-label="Estado del espacio"
          value={optimisticStatus}
          disabled={pending}
          onChange={(e) => onSelect(e.target.value as SpaceStatus)}
          className="h-9 w-36"
        >
          {SPACE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SPACE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Guardando" />}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={!!ask}
        title={`¿Pasar a ${ask ? SPACE_STATUS_LABELS[ask.next].toLowerCase() : ""}?`}
        body={ask?.warning}
        confirmLabel="Sí, cambiar"
        onConfirm={() => ask && onChange(ask.next)}
        onClose={() => setAsk(null)}
      />
    </div>
  );
}
