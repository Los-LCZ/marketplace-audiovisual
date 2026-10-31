"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { createBooking } from "@/app/actions/bookings";
import { cn, formatCLP, formatDate, formatTimeRange } from "@/lib/utils";
import { addDays, zonedTimeToUtc } from "@/lib/zoned-time";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage, Input, Label, Select } from "@/components/ui/form-controls";

const HOUR_MS = 60 * 60 * 1000;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export type BusySlot = { start_time: string; end_time: string };

type Props = {
  spaceId: string;
  pricePerHour: number;
  minHours: number;
  busySlots: BusySlot[];
  /** Fecha de hoy en Chile (YYYY-MM-DD) y "ahora", calculados en el servidor para evitar desfases de hidratación. */
  today: string;
  now: number;
  maxDaysAhead: number;
  /** null si no hay sesión: se muestra un link para iniciar sesión. */
  loginHref: string | null;
};

/**
 * Selector de fecha, duración y hora de inicio. Solo envía `space_id`, `start_time`
 * y `end_time`; los montos los calcula la base de datos y se muestran al confirmar.
 */
export function BookingWidget(props: Props) {
  const { spaceId, pricePerHour, minHours, busySlots, today, now, maxDaysAhead, loginHref } = props;
  const [state, action, pending] = useActionState(createBooking, null);
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState(minHours);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const busy = busySlots.map((s) => [Date.parse(s.start_time), Date.parse(s.end_time)] as const);
  const isFree = (start: number, end: number) => busy.every(([bs, be]) => end <= bs || start >= be);

  const slots = HOURS.map((h) => {
    const start = zonedTimeToUtc(date, h);
    const end = start + hours * HOUR_MS;
    const fitsInDay = h + hours <= 24;
    return { hour: h, start, end, available: fitsInDay && start > now && isFree(start, end) };
  });
  const selected = startHour != null ? slots[startHour] : null;
  const selectedValid = selected?.available ?? false;

  const durationOptions = Array.from({ length: Math.max(1, 13 - minHours) }, (_, i) => minHours + i).filter(
    (h) => h <= 24,
  );

  const booking = state?.ok ? state.data : undefined;
  if (booking && booking.id !== dismissedId) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-success">
          <CalendarCheck className="size-5" aria-hidden />
          <p className="font-semibold">{(state?.ok && state.message) || "Reserva confirmada"}</p>
        </div>
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Fecha</dt>
          <dd className="text-right">{formatDate(booking.start_time)}</dd>
          <dt className="text-muted-foreground">Horario</dt>
          <dd className="text-right">{formatTimeRange(booking.start_time, booking.end_time)}</dd>
          <dt className="text-muted-foreground">Subtotal ({booking.total_hours} h)</dt>
          <dd className="text-right">{formatCLP(booking.subtotal)}</dd>
          <dt className="text-muted-foreground">Comisión de servicio</dt>
          <dd className="text-right">{formatCLP(booking.platform_fee)}</dd>
          <dt className="border-t border-border pt-1 font-semibold">Total</dt>
          <dd className="border-t border-border pt-1 text-right font-semibold">{formatCLP(booking.total_amount)}</dd>
        </dl>
        <Link href="/mis-reservas" className={buttonClasses()}>
          Ver mis reservas
        </Link>
        <Button
          variant="ghost"
          onClick={() => {
            setDismissedId(booking.id);
            setStartHour(null);
          }}
        >
          Reservar otro horario
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p>
        <span className="text-2xl font-semibold">{formatCLP(pricePerHour)}</span>
        <span className="text-muted-foreground"> / hora</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="b-date">Fecha</Label>
          <Input
            id="b-date"
            type="date"
            value={date}
            min={today}
            max={addDays(today, maxDaysAhead)}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
              setStartHour(null);
            }}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="b-hours">Duración</Label>
          <Select
            id="b-hours"
            value={hours}
            onChange={(e) => {
              setHours(Number(e.target.value));
              setStartHour(null);
            }}
          >
            {durationOptions.map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? "hora" : "horas"}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Hora de inicio</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {slots.map((slot) => (
            <button
              key={slot.hour}
              type="button"
              disabled={!slot.available}
              aria-pressed={startHour === slot.hour}
              onClick={() => setStartHour(slot.hour)}
              className={cn(
                "h-9 rounded-lg border text-sm tabular-nums transition-colors",
                "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground/50 disabled:line-through",
                startHour === slot.hour
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary",
              )}
            >
              {String(slot.hour).padStart(2, "0")}:00
            </button>
          ))}
        </div>
        {slots.every((s) => !s.available) && (
          <p className="text-sm text-muted-foreground">No hay horarios disponibles ese día para {hours} h.</p>
        )}
      </fieldset>

      {minHours > 1 && <p className="text-xs text-muted-foreground">Este espacio requiere un mínimo de {minHours} horas.</p>}

      {selected && selectedValid && (
        <>
          <input type="hidden" name="space_id" value={spaceId} />
          <input type="hidden" name="start_time" value={new Date(selected.start).toISOString()} />
          <input type="hidden" name="end_time" value={new Date(selected.end).toISOString()} />
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            {formatDate(selected.start)} · {formatTimeRange(selected.start, selected.end)} ({hours} h)
          </p>
        </>
      )}

      <FormMessage state={state} />

      {loginHref ? (
        <Link href={loginHref} className={buttonClasses({ size: "lg" })}>
          Inicia sesión para reservar
        </Link>
      ) : (
        <Button type="submit" size="lg" disabled={!selectedValid || pending}>
          {pending ? "Reservando..." : "Reservar"}
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Al total se suma una comisión de servicio del 10%. Horarios en hora de Chile.
      </p>
    </form>
  );
}
