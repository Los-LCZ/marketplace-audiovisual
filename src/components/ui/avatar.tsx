/* eslint-disable @next/next/no-img-element -- foto chica y ya recortada a 512 px; next/image no aporta aquí */
import { cn } from "@/lib/utils";

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

// Avatar con la foto de perfil o, sin foto, las iniciales con el degradado del mundo activo
// (clase .av del sistema Señal). Es decorativo: el nombre siempre está al lado.
export function Avatar({
  name,
  src,
  size,
  verified = false,
  className,
}: {
  name: string | null | undefined;
  /** avatar_url del perfil; sin foto se muestran las iniciales. */
  src?: string | null;
  size?: "sm" | "lg" | "xl";
  verified?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("av", size, src && "has-img", className)} aria-hidden>
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : initials(name)}
      {verified && <i className="ver" />}
    </span>
  );
}
