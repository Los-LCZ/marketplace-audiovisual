"use client";

import { useState, useTransition } from "react";
import { acceptBooking, cancelBooking, completeBooking, rejectBooking } from "@/app/actions/bookings";
import { ConfirmDialog } from "@/components/ui/layer";
import { toast } from "@/components/ui/toaster";

type BookingAction = (id: string) => ReturnType<typeof cancelBooking>;
type Step = { action: BookingAction; done: string; text?: string };
type Ask = Step & { title: string; body?: string; confirmLabel: string };

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
  const [ask, setAsk] = useState<Ask | null>(null);

  if (!canCancel && !canComplete && !canDecide) return null;

  function run({ action, done, text }: Step) {
    setError(null);
    startTransition(async () => {
      const result = await action(bookingId);
      setAsk(null);
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
              onClick={() => run({ action: acceptBooking, done: "Solicitud aceptada", text: "El bloque quedó reservado en tu calendario." })}
            >
              Aceptar
            </button>
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={pending}
              onClick={() =>
                setAsk({
                  action: rejectBooking,
                  done: "Solicitud rechazada",
                  title: "¿Rechazar esta solicitud?",
                  body: "El cliente verá la solicitud como rechazada y el horario queda libre.",
                  confirmLabel: "Rechazar",
                })
              }
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
            onClick={() =>
              setAsk({
                action: completeBooking,
                done: "Sesión completada",
                title: "¿Marcar la sesión como completada?",
                body: "Ambos podrán calificarse a ciegas: nadie ve la nota del otro hasta enviar la suya.",
                confirmLabel: "Marcar completada",
              })
            }
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
              setAsk(
                isRequest
                  ? {
                      action: cancelBooking,
                      done: "Solicitud retirada",
                      title: "¿Retirar esta solicitud?",
                      body: "El anfitrión ya no la verá.",
                      confirmLabel: "Retirar solicitud",
                    }
                  : {
                      action: cancelBooking,
                      done: "Reserva cancelada",
                      title: "¿Cancelar esta reserva?",
                      body: "El horario queda libre. Esta acción no se puede deshacer.",
                      confirmLabel: "Cancelar reserva",
                    },
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
      <ConfirmDialog
        open={!!ask}
        title={ask?.title ?? ""}
        body={ask?.body}
        confirmLabel={ask?.confirmLabel ?? ""}
        pending={pending}
        onConfirm={() => ask && run(ask)}
        onClose={() => setAsk(null)}
      />
    </div>
  );
}
