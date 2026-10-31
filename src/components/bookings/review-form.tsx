"use client";

import { useActionState, useEffect, useState } from "react";
import { createReview } from "@/app/actions/bookings";
import { Dialog } from "@/components/ui/layer";
import { FormMessage } from "@/components/ui/form-controls";
import { toast } from "@/components/ui/toaster";

const STAR_LABELS = ["", "Muy mala", "Regular", "Buena", "Muy buena", "Excelente"];
const COMPLIMENTS = [
  "Equipo tal cual la ficha",
  "Anfitrión atento",
  "Gran acústica",
  "Excelente iluminación",
  "Llegada fácil",
  "Sonido impecable",
];
const ISSUES = ["Llegó tarde", "Problemas con el equipo", "Mala comunicación", "No coincidía con lo acordado", "Se pasó del horario"];

/**
 * Botón "Calificar" que abre el diálogo de reseña del prototipo: estrellas, etiquetas
 * (elogios o problemas según la nota) y comentario. Las etiquetas se guardan al inicio
 * del comentario. Al guardar, la página se revalida y la reserva muestra la reseña.
 */
export function ReviewForm({ bookingId, spaceTitle }: { bookingId: string; spaceTitle: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(createReview, null);

  useEffect(() => {
    if (state?.ok) toast("Calificación enviada", state.message);
  }, [state]);

  const chips = rating >= 4 ? COMPLIMENTS : ISSUES;
  const comment = [picked.length ? `${picked.join(" · ")}.` : "", text.trim()].filter(Boolean).join(" ");

  return (
    <>
      <button type="button" className="btn btn-acc btn-sm" onClick={() => setOpen(true)}>
        ★ Calificar
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} label={`Calificar ${spaceTitle}`}>
        <form action={action} className="grid w-full justify-items-center gap-3.5">
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="rating" value={rating || ""} />
          <input type="hidden" name="comment" value={comment} />
          <h2 className="display h3">¿Cómo estuvo {spaceTitle}?</h2>
          <p className="dim text-sm">Tu reseña ayuda a otros clientes a elegir y al anfitrión a mejorar.</p>
          <div className="big-stars" role="radiogroup" aria-label="Estrellas">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={rating === v}
                aria-label={`${v} ${v === 1 ? "estrella" : "estrellas"}`}
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
                value={text}
                maxLength={900}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cuéntale a la comunidad cómo fue la sesión (opcional)"
              />
            </>
          )}
          <FormMessage state={state && !state.ok ? state : null} />
          <button type="submit" className="btn btn-acc btn-lg w-full" disabled={!rating || pending}>
            {pending ? "Enviando..." : "Enviar calificación"}
          </button>
        </form>
      </Dialog>
    </>
  );
}
