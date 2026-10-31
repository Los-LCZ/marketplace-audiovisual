"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { likeSpace, undoReaction } from "@/app/actions/reactions";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/**
 * Corazón de "me gusta" sobre la foto de una tarjeta. `liked` null = sin sesión:
 * lleva a iniciar sesión. El estado cambia al tiro y se revierte si la action falla.
 */
export function LikeButton({ spaceId, title, liked }: { spaceId: string; title: string; liked: boolean | null }) {
  const [on, setOn] = useState(Boolean(liked));
  const [pending, startTransition] = useTransition();

  if (liked === null) {
    return (
      <Link className="like" href={`/login?next=${encodeURIComponent("/explorar")}`} aria-label={`Inicia sesión para guardar ${title}`}>
        <Heart aria-hidden />
      </Link>
    );
  }

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const result = await (next ? likeSpace(spaceId) : undoReaction(spaceId));
      if (result && !result.ok) {
        setOn(!next);
        toast("No se pudo guardar", result.error, "info");
      } else if (next) toast("Guardado en tus me gusta", title);
    });
  }

  return (
    <button
      type="button"
      className={cn("like", on && "on")}
      aria-pressed={on}
      aria-label={on ? `Quitar ${title} de tus me gusta` : `Me gusta ${title}`}
      disabled={pending}
      onClick={toggle}
    >
      <Heart aria-hidden />
    </button>
  );
}
