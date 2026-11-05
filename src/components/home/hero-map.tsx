"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { MapPin } from "lucide-react";

// Ventana para que el doble clic del visor alcance a abrir la ficha antes de que el mapa tome el puntero.
const DOUBLE_CLICK_MS = 450;
// El iframe mide MAP_SPAN veces el cuadro: lo que sobra a cada lado es el margen para desplazarse.
const MAP_SPAN = 3;
const RIGHT_BUTTON = 2;

/** Lugar del mapa cuando aún no hay espacios publicados en el mundo. */
export const DEFAULT_PLACE = "Santiago";

const query = (place: string) => encodeURIComponent(`${place}, Chile`);

/**
 * Mapa de Google (embed sin API key) centrado en la comuna, en modo noche y teñido con los tokens del
 * mundo activo. Con clic derecho sostenido se desplaza libremente: el iframe es más grande que el cuadro y
 * se mueve dentro de él, así el cursor sigue siendo el del mundo (el embed no se puede manejar desde fuera).
 * `live` decide si el iframe recibe el puntero (en el visor, con el foco fijado).
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

  const panRef = useRef<HTMLDivElement>(null);
  const pan = useRef({ x: 0, y: 0, drag: null as null | { x: number; y: number; px: number; py: number } });

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== RIGHT_BUTTON) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pan.current.drag = { x: e.clientX, y: e.clientY, px: pan.current.x, py: pan.current.y };
    e.currentTarget.classList.add("panning");
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = pan.current;
    const box = e.currentTarget;
    if (!p.drag || !panRef.current) return;
    // Dentro del visor el mapa puede estar escalado por el zoom: se lleva el movimiento a px locales.
    const scale = box.getBoundingClientRect().width / box.offsetWidth || 1;
    const maxX = ((MAP_SPAN - 1) / 2) * box.offsetWidth;
    const maxY = ((MAP_SPAN - 1) / 2) * box.offsetHeight;
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
    p.x = clamp(p.drag.px + (e.clientX - p.drag.x) / scale, maxX);
    p.y = clamp(p.drag.py + (e.clientY - p.drag.y) / scale, maxY);
    panRef.current.style.translate = `${p.x}px ${p.y}px`;
  }
  function endPan(e: PointerEvent<HTMLDivElement>) {
    pan.current.drag = null;
    e.currentTarget.classList.remove("panning");
  }

  return (
    <div
      className={`hero-map ${ready ? "ready" : ""} ${active ? "live" : ""}`}
      style={{ ["--map-span" as string]: MAP_SPAN }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      // El clic derecho mueve el mapa en vez de abrir el menú del navegador.
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={panRef} className="hero-map-pan">
        <iframe
          src={`https://maps.google.com/maps?q=${query(place)}&z=14&hl=es&output=embed`}
          title={`Mapa de ${place}`}
          tabIndex={active ? 0 : -1}
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setReady(true)}
        />
      </div>
      {!ready && <span className="hero-map-status">Cargando mapa…</span>}
      <span className="hero-map-credit">Datos del mapa © Google</span>
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
