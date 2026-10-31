import { SUGGESTED_COMMUNES } from "@/lib/world";
import type { DayOption } from "./hero-types";

// Campos Comuna y Fecha compartidos por los buscadores del Visor y de la Consola.
export function SearchFields({ days }: { days: DayOption[] }) {
  return (
    <>
      <div className="field">
        <label htmlFor="f-comuna">Comuna</label>
        <select id="f-comuna" name="commune" defaultValue="">
          <option value="">Todo Santiago</option>
          {SUGGESTED_COMMUNES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-fecha">Fecha</label>
        <select id="f-fecha" name="fecha" defaultValue="">
          <option value="">Cualquier día</option>
          {days.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

// Arma la URL de /explorar con los valores del buscador, sin params vacíos.
export function exploreHref(form: HTMLFormElement, category: string | null) {
  const data = new FormData(form);
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  for (const key of ["commune", "fecha", "max"]) {
    const value = data.get(key);
    if (typeof value === "string" && value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/explorar?${qs}` : "/explorar";
}
