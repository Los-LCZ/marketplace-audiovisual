// Estado estándar devuelto por las Server Actions (compatible con useActionState).
export type ActionState<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

export function fail(error: string, fieldErrors?: Record<string, string>) {
  return { ok: false as const, error, fieldErrors };
}

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Valores repetidos de un campo (p. ej. `tags`), sin vacíos ni duplicados. */
export function getStringList(formData: FormData, key: string, max: number) {
  const values = formData
    .getAll(key)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return [...new Set(values)].slice(0, max);
}
