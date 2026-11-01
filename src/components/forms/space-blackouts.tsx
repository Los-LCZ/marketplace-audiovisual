"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarOff, ChevronLeft, ChevronRight, X } from "lucide-react";
import { addSpaceBlackouts, removeSpaceBlackout } from "@/app/actions/spaces";
import type { SpaceBlackout } from "@/types/database";
import { addDays } from "@/lib/zoned-time";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/layer";
import { toast } from "@/components/ui/toaster";

const MAX_PER_CALL = 62; // tope de addSpaceBlackouts
const DAYS_AHEAD = 365; // la base no acepta días a más de un año
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const monthFormatter = new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", month: "long", year: "numeric" });
const longFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const toUtc = (date: string) => new Date(`${date}T12:00:00Z`);
const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
function addMonths(month: string, n: number) {
  const d = toUtc(month);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)).toISOString().slice(0, 10);
}

/** Celdas del mes (lunes primero): null para los huecos antes del día 1. */
function monthCells(month: string) {
  const first = toUtc(month);
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => addDays(month, i))];
}

/**
 * Días cerrados de un espacio propio: calendario para elegir días y cerrarlos con una nota
 * privada opcional, y lista de los días cerrados desde hoy para reabrirlos. Cada cambio se
 * guarda al tiro (addSpaceBlackouts / removeSpaceBlackout); la ficha pública los muestra
 * como ocupados.
 */
export function SpaceBlackouts({
  spaceId,
  blackouts,
  today,
}: {
  spaceId: string;
  blackouts: SpaceBlackout[];
  /** Hoy en Chile (YYYY-MM-DD), calculado en el servidor. */
  today: string;
}) {
  const [month, setMonth] = useState(() => monthStart(today));
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toReopen, setToReopen] = useState<SpaceBlackout | null>(null);
  const [saving, startSave] = useTransition();
  const [reopening, startReopen] = useTransition();

  const last = addDays(today, DAYS_AHEAD);
  const closed = useMemo(() => new Map(blackouts.map((b) => [b.date, b])), [blackouts]);
  const cells = monthCells(month);
  const canPrev = month > monthStart(today);
  const canNext = addMonths(month, 1) <= last;

  function toggle(date: string) {
    if (selected.includes(date)) {
      setError(null);
      return setSelected(selected.filter((d) => d !== date));
    }
    if (selected.length >= MAX_PER_CALL) return setError(`Puedes cerrar hasta ${MAX_PER_CALL} días a la vez`);
    setError(null);
    setSelected([...selected, date].sort());
  }

  function close() {
    startSave(async () => {
      const result = await addSpaceBlackouts(spaceId, selected, reason);
      if (!result) return;
      if (!result.ok) return setError(result.error);
      setError(null);
      setSelected([]);
      setReason("");
      const n = result.data?.count ?? 0;
      toast(n === 1 ? "Día cerrado" : `${n} días cerrados`, "Ya no se pueden reservar.", "ok");
    });
  }

  function reopen(b: SpaceBlackout) {
    startReopen(async () => {
      const result = await removeSpaceBlackout(spaceId, b.date);
      setToReopen(null);
      if (result && !result.ok) return setError(result.error);
      toast("Día reabierto", shortFormatter.format(toUtc(b.date)), "ok");
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            disabled={!canPrev}
            aria-label="Mes anterior"
          >
            <ChevronLeft aria-hidden />
          </button>
          <b className="capitalize" aria-live="polite">
            {monthFormatter.format(toUtc(month))}
          </b>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={!canNext}
            aria-label="Mes siguiente"
          >
            <ChevronRight aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label="Elige los días que quieres cerrar">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="dim pb-1 text-xs" aria-hidden>
              {d}
            </span>
          ))}
          {cells.map((date, i) => {
            if (!date) return <span key={`gap-${i}`} aria-hidden />;
            const isClosed = closed.has(date);
            const isPicked = selected.includes(date);
            const outOfRange = date < today || date > last;
            return (
              <button
                key={date}
                type="button"
                disabled={outOfRange || isClosed}
                aria-pressed={isClosed ? undefined : isPicked}
                aria-label={`${longFormatter.format(toUtc(date))}${isClosed ? ", cerrado" : ""}`}
                title={isClosed ? (closed.get(date)?.reason ?? "Cerrado") : undefined}
                onClick={() => toggle(date)}
                className={cn(
                  "aspect-square rounded-lg border text-sm font-medium transition-colors",
                  isPicked
                    ? "border-primary bg-primary text-[var(--acc-ink)]"
                    : isClosed
                      ? "border-dashed border-[var(--rec)] text-[var(--rec)] line-through"
                      : "border-border hover:border-primary",
                  outOfRange && "border-transparent opacity-30",
                  date === today && !isPicked && "ring-1 ring-[var(--line2)]",
                )}
              >
                {Number(date.slice(8))}
              </button>
            );
          })}
        </div>
        <p className="dim mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            <span className="text-[var(--rec)] line-through">12</span> cerrado
          </span>
          <span>Toca un día para elegirlo; vuelve a tocarlo para soltarlo.</span>
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {selected.length > 0 ? (
          <div className="panel flex flex-col gap-3 p-4">
            <b>
              {selected.length === 1 ? "1 día elegido" : `${selected.length} días elegidos`}:{" "}
              <span className="dim font-normal">
                {selected.map((d) => shortFormatter.format(toUtc(d))).join(", ")}
              </span>
            </b>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Nota privada (opcional)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={120}
                placeholder="Ej.: mantención del aire acondicionado"
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm font-normal focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              <span className="dim text-xs font-normal">Solo tú la ves. Los clientes ven el día como ocupado.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-acc btn-sm" disabled={saving} onClick={close}>
                <CalendarOff aria-hidden />
                {saving ? "Cerrando..." : selected.length === 1 ? "Cerrar día" : `Cerrar ${selected.length} días`}
              </button>
              <button type="button" className="btn btn-line btn-sm" disabled={saving} onClick={() => setSelected([])}>
                Soltar
              </button>
            </div>
          </div>
        ) : (
          <p className="dim text-sm">
            Cierra los días en que el espacio no está disponible (feriados, mantenciones, uso propio). No puedes cerrar un
            día que ya tiene reservas o solicitudes: cancélalas o recházalas antes.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div>
          <b className="text-sm">Días cerrados desde hoy</b>
          {blackouts.length ? (
            <ul className="mt-2 grid gap-2">
              {blackouts.map((b) => (
                <li key={b.id} className="panel flex items-center gap-3 px-3 py-2">
                  <CalendarOff className="size-4 flex-none text-[var(--rec)]" aria-hidden />
                  <div className="min-w-0 grow">
                    <span className="block text-sm font-medium capitalize">{longFormatter.format(toUtc(b.date))}</span>
                    {b.reason && <span className="dim block truncate text-xs">{b.reason}</span>}
                  </div>
                  <button
                    type="button"
                    className="btn btn-line btn-sm"
                    disabled={reopening}
                    onClick={() => setToReopen(b)}
                    aria-label={`Reabrir ${longFormatter.format(toUtc(b.date))}`}
                  >
                    <X aria-hidden />
                    Reabrir
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dim mt-2 text-sm">No tienes días cerrados.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!toReopen}
        title="¿Reabrir este día?"
        body={toReopen ? `${longFormatter.format(toUtc(toReopen.date))} vuelve a estar disponible para reservas.` : undefined}
        confirmLabel="Reabrir"
        pending={reopening}
        onConfirm={() => toReopen && reopen(toReopen)}
        onClose={() => setToReopen(null)}
      />
    </div>
  );
}
