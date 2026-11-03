// Palabras que van en minúscula dentro de un nombre de lugar ("San Pedro de la Paz").
const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y"]);

/**
 * Normaliza un nombre de comuna o ciudad: sin espacios sobrantes y con mayúscula
 * inicial en cada palabra, salvo artículos y preposiciones que no van al inicio.
 * "  providencia " → "Providencia", "SAN JOSÉ DE MAIPO" → "San José de Maipo".
 */
export function normalizePlaceName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => {
      const lower = word.toLocaleLowerCase("es-CL");
      if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase("es-CL") + lower.slice(1);
    })
    .join(" ");
}
