import { MapPin } from "lucide-react";
import type { MapSpot } from "./space-map";

/**
 * "Abrir en Maps": el punto exacto si la dirección es visible; si está oculta (o no hay coordenadas), la
 * comuna, así el enlace no revela más que el mapa.
 */
export function MapsLink({ spot, city, className = "" }: { spot: MapSpot; city: string; className?: string }) {
  const exact = !spot.approximate && spot.lat != null && spot.lng != null;
  const query = exact ? `${spot.lat},${spot.lng}` : `${spot.commune}, ${city}, Chile`;
  return (
    <a
      className={`btn btn-line btn-sm map-link ${className}`}
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MapPin aria-hidden />
      Abrir en Maps
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}
