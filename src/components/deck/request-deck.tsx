"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { acceptBooking, rejectBooking } from "@/app/actions/bookings";
import type { HostBooking } from "@/lib/queries/bookings";
import { formatCLP, formatDate, formatRating, formatTimeRange, pluralize } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Stars } from "@/components/ui/rating";
import { toast } from "@/components/ui/toaster";
import { SwipeDeck, type SwipeDir } from "@/components/deck/swipe-deck";

function RequestCard({ request }: { request: HostBooking }) {
  const client = request.client;
  const name = client?.full_name ?? "Cliente";
  const quote = client?.last_review;
  return (
    <div className="req">
      <span className="proj">{request.project ?? request.space?.title ?? "Solicitud"}</span>
      <div className="who">
        <Avatar name={name} src={client?.avatar_url} size="lg" verified={client?.verified} />
        <div>
          <div className="t">{name}</div>
          {client && (
            <Link href={`/u/${client.id}`} className="dim text-[13px]" onPointerDown={(e) => e.stopPropagation()}>
              Ver perfil
            </Link>
          )}
        </div>
      </div>
      <div className="score">
        <b>{client?.avg_rating != null ? formatRating(client.avg_rating) : "—"}</b>
        <div>
          {client?.avg_rating != null && <Stars rating={client.avg_rating} />}
          <br />
          <span className="dim text-xs">
            {client?.review_count
              ? `${pluralize(client.review_count, "sesión calificada", "sesiones calificadas")} como cliente`
              : "Sin calificaciones como cliente"}
          </span>
        </div>
      </div>
      {quote?.tags.length ? (
        <div className="chips">
          {quote.tags.slice(0, 3).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {quote?.comment && (
        <blockquote>
          “{quote.comment}”
          <br />
          <span className="dim text-xs">Otro anfitrión, {formatDate(quote.created_at)}</span>
        </blockquote>
      )}
      <div className="msg">{request.message ?? "Sin mensaje."}</div>
      <div className="when">
        <span>
          {formatDate(request.start_time)}, {formatTimeRange(request.start_time, request.end_time)}
        </span>
        <span className="mono acc">{formatCLP(request.subtotal)}</span>
      </div>
    </div>
  );
}

/** Solicitudes del anfitrión como mazo: derecha acepta, izquierda rechaza. */
export function RequestDeck({ requests }: { requests: HostBooking[] }) {
  async function onSwipe(request: HostBooking, dir: SwipeDir) {
    const name = request.client?.full_name ?? "el cliente";
    const result = await (dir === "right" ? acceptBooking(request.id) : rejectBooking(request.id));
    if (result && !result.ok) {
      toast("No se pudo responder", result.error, "info");
      return false;
    }
    if (dir === "right") toast(`Aceptaste a ${name}`, "El bloque quedó reservado en tu calendario.");
    else toast(`Rechazaste a ${name}`, "La verá como rechazada en sus sesiones.", "info");
    return true;
  }

  return (
    <SwipeDeck
      items={requests}
      itemKey={(r) => r.id}
      renderCard={(r) => <RequestCard request={r} />}
      stamps={{ right: "ACEPTAR", left: "RECHAZAR" }}
      labels={{ right: "Aceptar", left: "Rechazar" }}
      rightIcon="check"
      onSwipe={onSwipe}
      hint="Arrastra la tarjeta o usa las flechas ← →"
      empty={
        <div className="empty min-h-[380px] w-full max-w-[400px] content-center">
          <CircleCheck className="size-8 text-[var(--ok)]" aria-hidden />
          <b className="display h3">Bandeja al día</b>
          <p className="dim">Respondiste todas las solicitudes. Responder rápido ayuda a que te elijan.</p>
        </div>
      }
    />
  );
}
