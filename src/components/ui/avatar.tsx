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

// Avatar de iniciales con el degradado del mundo activo (clase .av del sistema Señal).
export function Avatar({
  name,
  size,
  verified = false,
  className,
}: {
  name: string | null | undefined;
  size?: "sm" | "lg" | "xl";
  verified?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("av", size, className)} aria-hidden>
      {initials(name)}
      {verified && <i className="ver" />}
    </span>
  );
}
