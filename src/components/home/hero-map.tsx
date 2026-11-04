"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

// Ventana para que el doble clic del visor alcance a abrir la ficha antes de que el mapa tome el puntero.
const DOUBLE_CLICK_MS = 450;

const query = (place: string) => encodeURIComponent(`${place}, Chile`);

/**
 * Mapa de Google (embed sin API key) centrado en la comuna, en modo noche y teñido con los tokens del
 * mundo activo. `live` decide si recibe el puntero: el visor lo activa solo con el foco fijado; la
 * consola lo deja siempre activo.
 */
export function HeroMap({ place, live }: { place: string; live: boolean }) {
  const [ready, setReady] = useState(false);
  // Se activa un poco después de `live`, para que el doble clic del visor siga abriendo la ficha.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!live) return;
    const t = window.setTimeout(() => setArmed(true), DOUBLE_CLICK_MS);
    return () => {
      window.clearTimeout(t);
      setArmed(false);
    };
  }, [live]);
  const active = live && armed;

  return (
    <div className={`hero-map ${ready ? "ready" : ""} ${active ? "live" : ""}`}>
      <iframe
        src={`https://maps.google.com/maps?q=${query(place)}&z=14&hl=es&output=embed`}
        title={`Mapa de ${place}`}
        tabIndex={active ? 0 : -1}
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setReady(true)}
      />
      {!ready && <span className="hero-map-status">Cargando mapa…</span>}
    </div>
  );
}

/** "Abrir en Maps" propio: el botón del embed queda recortado fuera del cuadro. */
export function MapsLink({ place, className = "" }: { place: string; className?: string }) {
  return (
    <a
      className={`btn btn-line btn-sm map-link ${className}`}
      href={`https://www.google.com/maps/search/?api=1&query=${query(place)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MapPin aria-hidden />
      Abrir en Maps
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}
