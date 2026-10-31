"use client";

import { useState, useTransition } from "react";
import { acceptBooking, cancelBooking, completeBooking, rejectBooking } from "@/app/actions/bookings";
import { toast } from "@/components/ui/toaster";

type BookingAction = (id: string) => ReturnType<typeof cancelBooking>;

/**
 * Botones de cambio de estado de una reserva. Quién puede hacer qué lo decide la
 * página (cliente: cancelar; anfitrión: aceptar, rechazar, cancelar o completar)
 * y lo valida la base de datos.
 */
export function BookingActions({
  bookingId,
  canCancel,
  canComplete = false,
  canDecide = false,
  isRequest = false,
}: {
  bookingId: string;
  canCancel: boolean;
  canComplete?: boolean;
  /** Anfitrión frente a una solicitud: aceptar o rechazar. */
  canDecide?: boolean;
  /** La reserva es una solicitud: cambia el texto de cancelar. */
  isRequest?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canCancel && !canComplete && !canDecide) return null;

  function run(action: BookingAction, confirmText: string | null, done: string, text?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await action(bookingId);
      if (result && !result.ok) setError(result.error);
      else toast(done, text, "ok");
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {canDecide && (
          <>
            <button
              type="button"
              className="btn btn-acc btn-sm"
              disabled={pending}
              onClick={() => run(acceptBooking, null, "Solicitud aceptada", "El bloque quedó reservado en tu calendario.")}
            >
              Aceptar
            </button>
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={pending}
              onClick={() => run(rejectBooking, "¿Rechazar esta solicitud?", "Solicitud rechazada")}
            >
              Rechazar
            </button>
          </>
        )}
        {canComplete && (
          <button
            type="button"
            className="btn btn-acc btn-sm"
            disabled={pending}
            onClick={() => run(completeBooking, "¿Marcar esta sesión como completada? Ambos podrán calificarse.", "Sesión completada")}
          >
            Marcar completada
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            className="btn btn-line btn-sm"
            disabled={pending}
            onClick={() =>
              run(
                cancelBooking,
                isRequest
                  ? "¿Retirar esta solicitud?"
                  : "¿Seguro que quieres cancelar esta reserva? Esta acción no se puede deshacer.",
                isRequest ? "Solicitud retirada" : "Reserva cancelada",
              )
            }
          >
            {pending ? "Procesando..." : isRequest ? "Retirar solicitud" : "Cancelar reserva"}
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
