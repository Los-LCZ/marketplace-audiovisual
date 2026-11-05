"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { EyeOff } from "lucide-react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { SpaceCategory } from "@/types/database";

/** Lo que el mapa necesita de un espacio. lat/lng ya vienen enmascarados (centro de la comuna si está oculta). */
export type MapSpot = {
  lat: number | null;
  lng: number | null;
  /** La dirección está oculta para quien mira: el punto es el centro de la comuna. */
  approximate: boolean;
  title: string;
  commune: string;
  category: SpaceCategory;
  image: string | null;
};

// OpenFreeMap: teselas vectoriales libres (uso comercial permitido, sin API key ni cookies).
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
// MapLibre arma la URL de su worker en tiempo de ejecución, así que el bundler no lo emite solo.
const WORKER_URL = new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href;
const SANTIAGO: [number, number] = [-70.6483, -33.4569];
const APPROX_RADIUS_M = 1200;
const LOCALE = {
  "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda para acercar o alejar el mapa",
  "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda para acercar o alejar el mapa",
  "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
  "AttributionControl.ToggleAttribution": "Mostrar atribución",
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
};

/** Polígono de un círculo de `radius` metros (la zona aproximada de una dirección oculta). */
function circle([lng, lat]: [number, number], radius: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const dLat = radius / 111_320;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const ring = Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)];
  });
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** Centro y zoom del mapa para un espacio (o Santiago si no tiene coordenadas). */
export function mapView(spot: MapSpot | null) {
  const has = spot?.lat != null && spot?.lng != null;
  return {
    has,
    center: (has ? [spot!.lng!, spot!.lat!] : SANTIAGO) as [number, number],
    zoom: has ? (spot!.approximate ? 12.6 : 14.6) : 10,
  };
}

/**
 * Mapa oscuro (MapLibre + OpenFreeMap) con un pin del espacio: un globo con su foto que apunta a la
 * dirección. Si la dirección está oculta, el pin cae en el centro de la comuna con una zona circular y
 * "Ubicación aproximada". Sin coordenadas, queda en Santiago sin pin. Al cambiar `spot`, vuela al nuevo.
 * `zoomBoost` suma niveles de zoom (el anillo de zoom del visor).
 */
export function SpaceMap({
  spot,
  interactive = true,
  zoomBoost = 0,
  controls = false,
  className = "",
}: {
  spot: MapSpot | null;
  interactive?: boolean;
  zoomBoost?: number;
  /** Botones + y − (en la ficha). */
  controls?: boolean;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [pinEl, setPinEl] = useState<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const { has, center, zoom } = mapView(spot);
  const [lng, lat] = center;
  const target = zoom + zoomBoost;
  const approximate = has && !!spot?.approximate;
  // La primera vista se lee en el efecto que crea el mapa, sin volver a crearlo cuando cambia.
  const initial = useRef({ center, zoom: target });

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    import("maplibre-gl")
      .then(({ Map, Marker, NavigationControl, setWorkerUrl }) => {
        if (cancelled || !boxRef.current) return;
        setWorkerUrl(WORKER_URL);
        map = new Map({
          container: boxRef.current,
          style: STYLE_URL,
          center: initial.current.center,
          zoom: initial.current.zoom,
          interactive,
          // Una rueda o un dedo siguen moviendo la página; el mapa pide Ctrl/⌘ o dos dedos.
          cooperativeGestures: interactive,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          // El doble clic del visor abre la ficha.
          doubleClickZoom: false,
          attributionControl: { compact: true },
          locale: LOCALE,
        });
        if (controls) map.addControl(new NavigationControl({ showCompass: false }), "top-right");
        const el = document.createElement("div");
        markerRef.current = new Marker({ element: el, anchor: "bottom" });
        setPinEl(el);
        map.on("load", () => {
          map!.addSource("approx", { type: "geojson", data: EMPTY });
          map!.addLayer({ id: "approx-fill", type: "fill", source: "approx", paint: { "fill-color": "#ffffff", "fill-opacity": 0.08 } });
          map!.addLayer({
            id: "approx-line",
            type: "line",
            source: "approx",
            paint: { "line-color": "#ffffff", "line-opacity": 0.5, "line-width": 1.5, "line-dasharray": [2, 2] },
          });
          mapRef.current = map;
          setLoaded(true);
        });
      })
      // Sin WebGL (o si falla la carga) queda el fondo con el aviso.
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      map?.remove();
      mapRef.current = null;
    };
  }, [interactive, controls]);

  // Pin, zona aproximada y vuelo al espacio elegido.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!loaded || !map || !marker) return;
    if (has) marker.setLngLat([lng, lat]).addTo(map);
    else marker.remove();
    (map.getSource("approx") as GeoJSONSource | undefined)?.setData(approximate ? circle([lng, lat], APPROX_RADIUS_M) : EMPTY);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) map.jumpTo({ center: [lng, lat], zoom: target });
    else map.flyTo({ center: [lng, lat], zoom: target, speed: 1.4, essential: false });
  }, [loaded, has, lng, lat, target, approximate]);

  return (
    <div className={`space-map ${loaded ? "ready" : ""} ${className}`}>
      <div ref={boxRef} className="space-map-canvas" />
      {!loaded && <span className="space-map-status">{failed ? "No se pudo cargar el mapa" : "Cargando mapa…"}</span>}
      {loaded && spot && !has && <span className="space-map-status">Ubicación no disponible en el mapa</span>}
      {pinEl &&
        spot &&
        createPortal(
          <div className={`map-pin ${approximate ? "approx" : ""}`}>
            {/* Arriba del globo: el ancla del marcador es la punta de la cola (abajo). */}
            {approximate && (
              <span className="map-pin-note">
                <EyeOff aria-hidden />
                Ubicación aproximada · {spot.commune}
              </span>
            )}
            <div className="map-pin-card">
              {spot.image ? (
                <Image src={spot.image} alt="" width={176} height={110} />
              ) : (
                <CategoryIcon category={spot.category} />
              )}
            </div>
            <span className="map-pin-tail" aria-hidden />
          </div>,
          pinEl,
        )}
    </div>
  );
}
