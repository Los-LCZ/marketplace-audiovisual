"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { formatRating } from "@/lib/utils";
import { FormMessage } from "@/components/ui/form-controls";
import { toast } from "@/components/ui/toaster";
import type { Profile } from "@/types/database";

const MIN = 3;
const MAX = 5;
const STEP = 0.05;

/**
 * Nota mínima para reserva directa. updateProfile recibe el perfil completo, así que
 * se reenvían los demás campos sin cambios.
 */
export function MinRatingForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const [enabled, setEnabled] = useState(profile.min_client_rating != null);
  const [value, setValue] = useState(profile.min_client_rating ?? 4.5);

  useEffect(() => {
    if (state?.ok) toast("Reserva directa actualizada");
  }, [state]);

  return (
    <form action={action} className="panel grid gap-2.5 p-[18px]">
      <input type="hidden" name="full_name" value={profile.full_name ?? ""} />
      <input type="hidden" name="phone" value={profile.phone ?? ""} />
      <input type="hidden" name="headline" value={profile.headline ?? ""} />
      <input type="hidden" name="bio" value={profile.bio ?? ""} />
      <input type="hidden" name="commune" value={profile.commune ?? ""} />
      {profile.tags.map((t) => (
        <input key={t} type="hidden" name="tags" value={t} />
      ))}
      <input type="hidden" name="min_client_rating" value={enabled ? value.toFixed(2) : ""} />

      <div className="flex items-center justify-between gap-3">
        <b>Reserva directa</b>
        <span className="toggle">
          <span id="min-toggle-label">{enabled ? "Con nota mínima" : "Cualquier cliente"}</span>
          <button
            type="button"
            className="sw"
            role="switch"
            aria-checked={enabled}
            aria-labelledby="min-toggle-label"
            onClick={() => setEnabled((on) => !on)}
          />
        </span>
      </div>
      <p className="dim text-[13px]">
        {enabled
          ? "Clientes con esta nota o más reservan al tiro. El resto te envía una solicitud que puedes aceptar o rechazar."
          : "Todas las reservas se confirman al tiro, sin pedirte aprobación."}
      </p>
      {enabled && (
        <>
          <b className="mono acc text-[28px]">{formatRating(value)}</b>
          <input
            type="range"
            className="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label="Nota mínima para reserva directa"
          />
          <p className="dim text-xs">Un cliente nuevo, sin calificaciones, siempre envía solicitud.</p>
        </>
      )}
      <FormMessage state={state && !state.ok ? state : null} />
      <button type="submit" className="btn btn-soft btn-sm" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
