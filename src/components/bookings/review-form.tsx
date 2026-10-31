"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { createReview } from "@/app/actions/bookings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormMessage, Label, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";

// Botón "Reseñar" que despliega el formulario. Al guardar, la página se revalida
// y la reserva pasa a mostrar la reseña en vez de este formulario.
export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [state, action] = useActionState(createReview, null);

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Star className="size-4" aria-hidden /> Reseñar
      </Button>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-xl border border-border p-4">
      <input type="hidden" name="booking_id" value={bookingId} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">¿Cómo fue tu experiencia?</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                required
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <Star
                aria-hidden
                className={cn(
                  "size-7 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-primary",
                  n <= rating ? "fill-amber-500 text-amber-500" : "text-border hover:text-amber-500",
                )}
              />
              <span className="sr-only">
                {n} {n === 1 ? "estrella" : "estrellas"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`comment-${bookingId}`}>Comentario (opcional)</Label>
        <Textarea
          id={`comment-${bookingId}`}
          name="comment"
          maxLength={1000}
          placeholder="Cuéntale a otros cómo estuvo el espacio, el equipamiento y el anfitrión."
        />
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton size="sm" disabled={!rating} pendingText="Enviando...">
          Publicar reseña
        </SubmitButton>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
