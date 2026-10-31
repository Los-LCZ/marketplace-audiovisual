"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateSpaceStatus } from "@/app/actions/spaces";
import { SPACE_STATUSES, SPACE_STATUS_LABELS } from "@/lib/labels";
import type { SpaceStatus } from "@/types/database";
import { Select } from "@/components/ui/form-controls";

// Cambia el estado de un espacio propio (publicado / borrador / archivado).
export function SpaceStatusControl({ spaceId, status }: { spaceId: string; status: SpaceStatus }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Muestra el nuevo estado mientras guarda; si falla, vuelve al valor real del servidor.
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);

  function onChange(next: SpaceStatus) {
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await updateSpaceStatus(spaceId, next);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Select
          aria-label="Estado del espacio"
          value={optimisticStatus}
          disabled={pending}
          onChange={(e) => onChange(e.target.value as SpaceStatus)}
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
    </div>
  );
}
