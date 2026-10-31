"use client";

import { useState, useTransition } from "react";
import { cancelBooking, completeBooking } from "@/app/actions/bookings";
import { toast } from "@/components/ui/toaster";

/**
 * Botones de cambio de estado de una reserva. Quién puede hacer qué lo decide la
 * página (cliente: cancelar; anfitrión: cancelar o completar) y lo valida la base de datos.
 */
export function BookingActions({
  bookingId,
  canCancel,
  canComplete = false,
}: {
  bookingId: string;
  canCancel: boolean;
  canComplete?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canCancel && !canComplete) return null;

  function run(action: (id: string) => ReturnType<typeof cancelBooking>, confirmText: string, done: string) {
    if (!window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await action(bookingId);
      if (result && !result.ok) setError(result.error);
      else toast(done);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {canComplete && (
          <button
            type="button"
            className="btn btn-acc btn-sm"
            disabled={pending}
            onClick={() => run(completeBooking, "¿Marcar esta sesión como completada? El cliente podrá calificarla.", "Sesión completada")}
          >
            Marcar completada
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            className="btn btn-line btn-sm"
            disabled={pending}
            onClick={() => run(cancelBooking, "¿Seguro que quieres cancelar esta reserva? Esta acción no se puede deshacer.", "Reserva cancelada")}
          >
            {pending ? "Procesando..." : "Cancelar reserva"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
