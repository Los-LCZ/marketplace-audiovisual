import { ogCard } from "@/lib/og-card";

// Imagen por defecto al compartir cualquier página de Señal.
export function GET() {
  return ogCard({
    world: "av",
    kicker: "Marketplace audiovisual y musical",
    title: "Estudios, salas, sets y locaciones por hora",
    lines: ["Santiago de Chile", "Ficha técnica completa"],
    footer: "Reserva directa o por solicitud · Calificaciones a ciegas",
  });
}
