"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, Minus, Plus } from "lucide-react";
import { createBooking } from "@/app/actions/bookings";
import { formatCLP, formatDate, formatTimeRange } from "@/lib/utils";
import { addDays, dayLabel, dayMonth, dayOfMonth, zonedTimeToUtc } from "@/lib/zoned-time";
import { FormMessage } from "@/components/ui/form-controls";
import { RatingPill } from "@/components/ui/rating";
import { Sheet } from "@/components/ui/layer";
import { toast } from "@/components/ui/toaster";

const HOUR_MS = 60 * 60 * 1000;
const DAYS_SHOWN = 14;
// Horario de reserva mostrado mientras los espacios no tengan horario propio (open/close).
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 24;

export type BusySlot = { start_time: string; end_time: string };

type Props = {
  spaceTitle: string;
  spaceId: string;
  pricePerHour: number;
  minHours: number;
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
};

const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;

/**
 * Reserva en línea de tiempo (escritorio a la derecha, hoja inferior en móvil).
 * Solo envía `space_id`, `start_time` y `end_time`; los montos los calcula la base
 * de datos y se muestran al confirmar.
 */
export function BookingPanel(props: Props) {
  const { spaceId, spaceTitle, pricePerHour, minHours, busySlots, today, now, loginHref } = props;
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
    for (let x = h; x < CLOSE_HOUR && !isBusy(date, x) && !isPast(date, x); x++) run++;
    return run;
  };
  const firstAvailableDay = () => {
    for (let i = 0; i < DAYS_SHOWN; i++) {
      const d = addDays(today, i);
      for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) if (freeRun(d, h) >= minHours) return d;
    }
    return today;
  };

  const validInitial = props.initialDate && props.initialDate >= today && props.initialDate < addDays(today, DAYS_SHOWN);
  const [date, setDate] = useState(() => (validInitial ? props.initialDate! : firstAvailableDay()));
  const [start, setStart] = useState<number | null>(null);
  const [dur, setDur] = useState(minHours);

  const booking = state?.ok ? state.data : undefined;
  const done = booking && booking.id !== dismissedId;
  useEffect(() => {
    if (state?.ok && state.data)
      toast("Sesión reservada", `${spaceTitle}, ${formatTimeRange(state.data.start_time, state.data.end_time)}.`);
  }, [state, spaceTitle]);

  const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
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
        <Check aria-hidden />
      </span>
      <h3 className="display h3">Sesión reservada</h3>
      <p className="dim">
        {spaceTitle}, {formatDate(booking.start_time)}, {formatTimeRange(booking.start_time, booking.end_time)}.
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
        </div>
        <div>
          <span className="dim">Tarifa de servicio</span>
          <span className="dim">10% del subtotal</span>
        </div>
        <div className="tot">
          <span>Total</span>
          <span className="dim text-sm font-normal">Se calcula al confirmar</span>
        </div>
      </div>

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
          {pending ? "Reservando..." : "Reservar sesión"}
        </button>
      )}
      <p className="dim -mt-2 text-center text-xs">Horarios en hora de Chile. Puedes cancelar antes del inicio.</p>
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
