"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, CircleCheck, Hourglass, Lock, Minus, Plus } from "lucide-react";
import { createBooking } from "@/app/actions/bookings";
import { formatCLP, formatDate, formatRating, formatTimeRange } from "@/lib/utils";
import { addDays, dayLabel, dayMonth, dayOfMonth, zonedTimeToUtc } from "@/lib/zoned-time";
import { FormMessage, Input, Textarea } from "@/components/ui/form-controls";
import { RatingPill } from "@/components/ui/rating";
import { Sheet } from "@/components/ui/layer";
import { toast } from "@/components/ui/toaster";

const HOUR_MS = 60 * 60 * 1000;
const DAYS_SHOWN = 14;
// Comisión de la plataforma (trigger compute_booking_amounts: round(subtotal * 0.10)).
const PLATFORM_FEE_RATE = 0.1;

export type BusySlot = { start_time: string; end_time: string };

type Props = {
  spaceTitle: string;
  spaceId: string;
  pricePerHour: number;
  minHours: number;
  /** Horario del espacio en hora de Chile (open_hour 0–23, close_hour 1–24). */
  openHour: number;
  closeHour: number;
  avgRating: number | null;
  reviewCount: number;
  busySlots: BusySlot[];
  /** Fecha de hoy en Chile y "ahora", calculados en el servidor para evitar desfases de hidratación. */
  today: string;
  now: number;
  /** Día preseleccionado (p. ej. el buscado en /explorar). */
  initialDate?: string;
  /** null si no hay sesión: se muestra un link para iniciar sesión. */
  loginHref: string | null;
  /**
   * Nota mínima que pide el anfitrión y la del usuario como cliente. Si no la cumple,
   * la reserva se envía como solicitud (lo decide la base de datos).
   */
  hostMinRating: number | null;
  myClientRating: number | null;
};

const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;

/**
 * Reserva en línea de tiempo (escritorio a la derecha, hoja inferior en móvil).
 * Envía `space_id`, `start_time`, `end_time` y, opcionales, `project` y `message`;
 * los montos y si queda confirmada o como solicitud los decide la base de datos.
 */
export function BookingPanel(props: Props) {
  const { spaceId, spaceTitle, pricePerHour, minHours, openHour, closeHour, busySlots, today, now, loginHref } = props;
  const { hostMinRating, myClientRating } = props;
  // Cliente sin nota no cumple ningún mínimo (misma regla que la base de datos).
  const direct = hostMinRating == null || (myClientRating != null && myClientRating >= hostMinRating);
  const [state, action, pending] = useActionState(createBooking, null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const busy = busySlots.map((s) => [Date.parse(s.start_time), Date.parse(s.end_time)] as const);
  const hourStart = (date: string, h: number) => zonedTimeToUtc(date, h);
  const isBusy = (date: string, h: number) => {
    const start = hourStart(date, h);
    return busy.some(([bs, be]) => start < be && start + HOUR_MS > bs);
  };
  const isPast = (date: string, h: number) => hourStart(date, h) <= now;
  // Horas libres consecutivas desde `h` (hasta el cierre).
  const freeRun = (date: string, h: number) => {
    let run = 0;
    for (let x = h; x < closeHour && !isBusy(date, x) && !isPast(date, x); x++) run++;
    return run;
  };
  const firstAvailableDay = () => {
    for (let i = 0; i < DAYS_SHOWN; i++) {
      const d = addDays(today, i);
      for (let h = openHour; h < closeHour; h++) if (freeRun(d, h) >= minHours) return d;
    }
    return today;
  };

  const validInitial = props.initialDate && props.initialDate >= today && props.initialDate < addDays(today, DAYS_SHOWN);
  const [date, setDate] = useState(() => (validInitial ? props.initialDate! : firstAvailableDay()));
  const [start, setStart] = useState<number | null>(null);
  const [dur, setDur] = useState(minHours);

  const booking = state?.ok ? state.data : undefined;
  const done = booking && booking.id !== dismissedId;
  const requested = booking?.status === "requested";
  useEffect(() => {
    if (!state?.ok || !state.data) return;
    const when = `${spaceTitle}, ${formatTimeRange(state.data.start_time, state.data.end_time)}.`;
    if (state.data.status === "requested") toast("Solicitud enviada", `${when} El anfitrión debe aprobarla.`, "info");
    else toast("Sesión reservada", when);
  }, [state, spaceTitle]);

  const hours = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i);
  // Estimación con la misma fórmula del trigger compute_booking_amounts; el monto final lo fija la base.
  const subtotal = pricePerHour * dur;
  const fee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const maxDur = start != null ? freeRun(date, start) : minHours;
  const startMs = start != null ? hourStart(date, start) : null;

  function pickDay(d: string) {
    setDate(d);
    setStart(null);
    setDur(minHours);
  }
  function pickStart(h: number) {
    setStart(h);
    setDur((d) => Math.min(Math.max(d, minHours), freeRun(date, h)));
  }

  const content = done ? (
    <div className="grid gap-3.5">
      <span className="btn btn-acc pointer-events-none size-12 rounded-full p-0">
        {requested ? <Hourglass aria-hidden /> : <Check aria-hidden />}
      </span>
      <h3 className="display h3">{requested ? "Solicitud enviada" : "Sesión reservada"}</h3>
      <p className="dim">
        {spaceTitle}, {formatDate(booking.start_time)}, {formatTimeRange(booking.start_time, booking.end_time)}.
        {requested && " El anfitrión revisará tu solicitud; mientras tanto el horario sigue abierto para otros."}
      </p>
      <div className="totals">
        <div>
          <span className="dim">
            {formatCLP(pricePerHour)} × {booking.total_hours} h
          </span>
          <span>{formatCLP(booking.subtotal)}</span>
        </div>
        <div>
          <span className="dim">Tarifa de servicio</span>
          <span>{formatCLP(booking.platform_fee)}</span>
        </div>
        <div className="tot">
          <span>Total</span>
          <span>{formatCLP(booking.total_amount)}</span>
        </div>
      </div>
      <Link className="btn btn-acc" href="/mis-reservas">
        Ver mis sesiones
      </Link>
      <button
        type="button"
        className="btn btn-soft"
        onClick={() => {
          setDismissedId(booking.id);
          setStart(null);
        }}
      >
        Hacer otra reserva
      </button>
    </div>
  ) : (
    <form action={action} className="grid gap-[18px]">
      <div className="price-top">
        <span>
          <b>{formatCLP(pricePerHour)}</b> <span className="dim">por hora</span>
        </span>
        <RatingPill rating={props.avgRating} count={props.reviewCount} />
      </div>

      <div>
        <p className="mono dim mb-2">Día</p>
        <div className="days" role="radiogroup" aria-label="Día">
          {Array.from({ length: DAYS_SHOWN }, (_, i) => {
            const d = addDays(today, i);
            return (
              <button key={d} type="button" role="radio" aria-checked={d === date} aria-label={`${dayLabel(d, today)} ${dayMonth(d)}`} onClick={() => pickDay(d)}>
                <span>{dayLabel(d, today)}</span>
                <b>{dayOfMonth(d)}</b>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="mono dim">Hora de inicio</p>
          <span className="legend">
            <span>
              <i style={{ background: "var(--acc)" }} />
              Tu bloque
            </span>
            <span>
              <i
                style={{
                  background: "repeating-linear-gradient(135deg,var(--s3) 0 2px,transparent 2px 4px)",
                  boxShadow: "inset 0 0 0 1px var(--line2)",
                }}
              />
              Ocupado
            </span>
          </span>
        </div>
        <div className="slots" style={{ gridTemplateColumns: `repeat(${hours.length},minmax(0,1fr))` }} role="group" aria-label="Bloques horarios">
          {hours.map((h) => {
            const busyHour = isBusy(date, h);
            const past = isPast(date, h);
            const inSel = start != null && h >= start && h < start + dur;
            const can = !busyHour && !past && freeRun(date, h) >= minHours;
            const status = busyHour ? "ocupado" : past ? "ya pasó" : can ? "disponible" : `no caben ${minHours} h`;
            return (
              <button
                key={h}
                type="button"
                className={`${busyHour ? "busy" : ""} ${inSel ? "sel" : ""} ${start === h ? "start" : ""}`}
                disabled={!can && !inSel}
                aria-label={`${hh(h)}, ${status}`}
                title={`${hh(h)}, ${status}`}
                onClick={() => pickStart(h)}
              />
            );
          })}
        </div>
        <div className="ticks" style={{ gridTemplateColumns: `repeat(${hours.length},minmax(0,1fr))` }} aria-hidden>
          {hours.map((h, i) => (
            <span key={h}>{i % 3 === 0 ? hh(h) : ""}</span>
          ))}
        </div>
      </div>

      <div className="stepper">
        <span>
          <b>Duración</b>
          <br />
          <span className="dim text-xs">Mínimo {minHours} h</span>
        </span>
        <span className="ctr">
          <button type="button" disabled={dur <= minHours} aria-label="Quitar una hora" onClick={() => setDur((d) => d - 1)}>
            <Minus aria-hidden />
          </button>
          <b className="mono text-sm" aria-live="polite">
            {dur} h
          </b>
          <button type="button" disabled={start == null || dur >= maxDur} aria-label="Agregar una hora" onClick={() => setDur((d) => d + 1)}>
            <Plus aria-hidden />
          </button>
        </span>
      </div>

      <div className="totals">
        <p className="dim min-h-5">
          {start != null
            ? `${dayLabel(date, today)} ${dayMonth(date)}, de ${hh(start)} a ${hh(start + dur)}`
            : "Elige una hora de inicio en la línea de tiempo."}
        </p>
        <div>
          <span className="dim">
            {formatCLP(pricePerHour)} × {dur} h
          </span>
          <span>{formatCLP(subtotal)}</span>
        </div>
        <div>
          <span className="dim">Tarifa de servicio</span>
          <span>{formatCLP(fee)}</span>
        </div>
        <div className="tot">
          <span>Total</span>
          <span>{formatCLP(subtotal + fee)}</span>
        </div>
      </div>

      {!loginHref && (
        <details>
          <summary className="cursor-pointer text-sm font-bold">Cuéntale al anfitrión (opcional)</summary>
          {/* Sin ids: este contenido se monta dos veces (panel de escritorio y hoja móvil). */}
          <label className="mt-2.5 grid gap-1">
            <span className="mono dim">Proyecto</span>
            <Input name="project" maxLength={200} placeholder="Ej.: grabación de EP, sesión de fotos de producto" />
          </label>
          <label className="mt-2.5 grid gap-1">
            <span className="mono dim">Mensaje</span>
            <Textarea name="message" maxLength={2000} placeholder="Qué necesitas, cuántas personas vienen, equipo que traes..." />
          </label>
        </details>
      )}

      {!loginHref && (
        <p className={`rule text-[13px] ${direct ? "ok" : ""}`}>
          {direct ? <CircleCheck aria-hidden /> : <Lock aria-hidden />}
          {direct
            ? hostMinRating != null
              ? `Reserva directa: el anfitrión pide nota ${formatRating(hostMinRating)} y tú tienes ${formatRating(myClientRating ?? 0)}.`
              : "Reserva directa: tu sesión queda confirmada al tiro."
            : `El anfitrión pide nota ${formatRating(hostMinRating ?? 0)} como cliente: tu reserva irá como solicitud.`}
        </p>
      )}

      {startMs != null && (
        <>
          <input type="hidden" name="space_id" value={spaceId} />
          <input type="hidden" name="start_time" value={new Date(startMs).toISOString()} />
          <input type="hidden" name="end_time" value={new Date(startMs + dur * HOUR_MS).toISOString()} />
        </>
      )}

      <FormMessage state={state && !state.ok ? state : null} />

      {loginHref ? (
        <Link className="btn btn-acc btn-lg" href={loginHref}>
          Inicia sesión para reservar
        </Link>
      ) : (
        <button type="submit" className="btn btn-acc btn-lg" disabled={start == null || pending}>
          <Circle className="size-3 fill-[var(--rec)] text-[var(--rec)]" aria-hidden />
          {pending ? "Enviando..." : direct ? "Reservar sesión" : "Enviar solicitud"}
        </button>
      )}
      <p className="dim -mt-2 text-center text-xs">
        Horario del espacio: {hh(openHour)} a {hh(closeHour)}, hora de Chile. Puedes cancelar antes del inicio.
      </p>
    </form>
  );

  return (
    <>
      <div className="book panel desk">{content}</div>
      <div className="mbar">
        <span>
          <b>{formatCLP(pricePerHour)}</b> <span className="dim">por hora</span>
        </span>
        <button type="button" className="btn btn-acc" onClick={() => setSheetOpen(true)}>
          Elegir horario
        </button>
      </div>
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`Reservar ${spaceTitle}`}>
        <div className="book" style={{ position: "static", padding: 0 }}>
          {content}
        </div>
      </Sheet>
    </>
  );
}
