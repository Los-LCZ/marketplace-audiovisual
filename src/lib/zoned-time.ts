import { TIME_ZONE } from "./utils";

// Conversión entre fecha/hora "de pared" en Chile y timestamps UTC, sin depender
// de la zona horaria del navegador ni del servidor.

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zonedParts(ms: number) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// Diferencia (ms) entre la hora de Chile y UTC en un instante dado.
function offsetAt(ms: number) {
  const p = zonedParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
}

/** Fecha `YYYY-MM-DD` en Chile para un instante. */
export function zonedDateString(ms: number) {
  const p = zonedParts(ms);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Suma días a una fecha `YYYY-MM-DD` (calendario, sin zonas horarias). */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Timestamp UTC de `date` (YYYY-MM-DD) a las `hour`:00 en hora de Chile. */
export function zonedTimeToUtc(date: string, hour: number) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  // Dos pasadas para cubrir los cambios de horario de verano.
  const first = guess - offsetAt(guess);
  return guess - offsetAt(first);
}

const weekdayFormatter = new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", weekday: "short" });
const dayMonthFormatter = new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", day: "numeric", month: "short" });

function fromDateString(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Hoy", "Mañana" o el día de la semana abreviado ("Lun") para `date` respecto de `today`. */
export function dayLabel(date: string, today: string) {
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  return capitalize(weekdayFormatter.format(fromDateString(date)).replace(".", ""));
}

/** "31 oct" para una fecha `YYYY-MM-DD`. */
export function dayMonth(date: string) {
  return dayMonthFormatter.format(fromDateString(date)).replace(".", "");
}

/** Día del mes (número) de una fecha `YYYY-MM-DD`. */
export function dayOfMonth(date: string) {
  return Number(date.slice(8, 10));
}

/** Próximos `count` días desde `today`, con etiqueta para selectores ("Hoy 31 oct"). */
export function nextDays(today: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const value = addDays(today, i);
    return { value, label: `${dayLabel(value, today)} ${dayMonth(value)}` };
  });
}

/**
 * Instante actual y fecha de hoy en Chile. Se calcula fuera de los componentes
 * (en el servidor) y se pasa como prop para no romper la pureza del render.
 */
export function currentTime() {
  const now = Date.now();
  return { now, today: zonedDateString(now) };
}
