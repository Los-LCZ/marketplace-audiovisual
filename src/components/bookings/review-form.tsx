"use client";

import { useActionState, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { createClientReview, createReview } from "@/app/actions/bookings";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/layer";
import { FormMessage } from "@/components/ui/form-controls";
import { toast } from "@/components/ui/toaster";

const STAR_LABELS = ["", "Muy mala", "Regular", "Buena", "Muy buena", "Excelente"];
// Elogios según a quién se califica; los problemas son comunes a ambos.
const COMPLIMENTS = {
  space: ["Equipo tal cual la ficha", "Anfitrión atento", "Gran acústica", "Excelente iluminación", "Llegada fácil", "Sonido impecable"],
  client: ["Puntual", "Cuida el equipo", "Deja la sala impecable", "Respeta el horario", "Comunicación clara", "Buena energía"],
};
const ISSUES = ["Llegó tarde", "Problemas con el equipo", "Mala comunicación", "No coincidía con lo acordado", "Se pasó del horario"];

/**
 * Botón "Calificar" que abre el diálogo del prototipo: estrellas, etiquetas (elogios
 * o problemas según la nota) y comentario. `target` decide la action:
 * - "space": el cliente califica el espacio y al anfitrión (createReview).
 * - "client": el anfitrión califica al cliente (createClientReview).
 * Es a ciegas: ninguna parte ve la nota de la otra hasta enviar la suya.
 */
export function ReviewForm({
  bookingId,
  target,
  name,
  context,
}: {
  bookingId: string;
  target: "space" | "client";
  /** A quién se califica: título del espacio o nombre del cliente. */
  name: string;
  /** Línea de contexto, p. ej. "Sesión del 12 de octubre en Estudio Matucana." */
  context?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(target === "space" ? createReview : createClientReview, null);

  useEffect(() => {
    // Al revalidar, la reserva sale de la lista "por calificar" y el diálogo se desmonta.
    if (state?.ok) toast("Calificación enviada", state.message);
  }, [state]);

  const chips = rating >= 4 ? COMPLIMENTS[target] : ISSUES;
  const who = target === "space" ? name : name.split(" ")[0];

  return (
    <>
      <button type="button" className="btn btn-acc btn-sm" onClick={() => setOpen(true)}>
        ★ Calificar
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} label={`Calificar a ${name}`}>
        <form action={action} className="grid w-full justify-items-center gap-3.5">
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="rating" value={rating || ""} />
          {picked.map((tag) => (
            <input key={tag} type="hidden" name="tags" value={tag} />
          ))}
          {target === "client" && <Avatar name={name} size="lg" />}
          <h2 className="display h3">¿Cómo estuvo {who}?</h2>
          <p className="dim text-sm">
            {target === "space"
              ? "Tu reseña ayuda a otros clientes a elegir y al anfitrión a mejorar."
              : `Califica a ${who} como cliente. Es la reputación que verán otros anfitriones.`}{" "}
            {context}
          </p>
          <div className="big-stars" role="radiogroup" aria-label="Estrellas">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={rating === v}
                aria-label={`${v} ${v === 1 ? "estrella" : "estrellas"}, ${STAR_LABELS[v]}`}
                className={v <= rating ? "on" : ""}
                onClick={() => {
                  setRating(v);
                  setPicked([]);
                }}
              >
                ★
              </button>
            ))}
          </div>
          <b className="min-h-[22px]">{STAR_LABELS[rating]}</b>
          {rating > 0 && (
            <>
              <p className="dim text-[13px]">{rating >= 4 ? "¿Qué destacarías?" : "¿Qué podría mejorar?"}</p>
              <div className="chips justify-center">
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="chip"
                    aria-pressed={picked.includes(c)}
                    onClick={() => setPicked((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]))}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label htmlFor={`rv-${bookingId}`} className="sr-only">
                Comentario
              </label>
              <textarea
                id={`rv-${bookingId}`}
                name="comment"
                value={text}
                maxLength={2000}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cuéntale a la comunidad cómo fue la sesión (opcional)"
              />
            </>
          )}
          <FormMessage state={state && !state.ok ? state : null} />
          <button type="submit" className="btn btn-acc btn-lg w-full" disabled={!rating || pending}>
            {pending ? "Enviando..." : "Enviar calificación"}
          </button>
          <p className="dim inline-flex items-center gap-1.5 text-xs">
            <Lock className="size-3" aria-hidden />
            Las dos partes califican sin ver la nota de la otra hasta enviar.
          </p>
        </form>
      </Dialog>
    </>
  );
}
