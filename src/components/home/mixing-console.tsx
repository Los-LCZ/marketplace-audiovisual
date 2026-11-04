"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Circle, Play, SkipBack } from "lucide-react";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { WORLDS } from "@/lib/world";
import { formatCLP } from "@/lib/utils";
import type { SpaceCategory } from "@/types/database";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toast } from "@/components/ui/toaster";
import type { DayOption, HeroSpace } from "./hero-types";
import { exploreHref, SearchFields } from "./search-fields";
import { HeroMap, MapsLink } from "./hero-map";
import { MicCursor } from "./mic-cursor";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const MAX_STRIPS = 8;

/**
 * Hero del mundo Música: una consola de mezcla donde cada canal es una sala o estudio.
 * Solo muestra un canal en la pantalla del DAW (con el mapa de su comuna), Mute lo saca, el Master fija el precio
 * máximo por hora y Play lleva la búsqueda a /explorar.
 */
export function MixingConsole({ spaces: all, days }: { spaces: HeroSpace[]; days: DayOption[] }) {
  const router = useRouter();
  const spaces = all.slice(0, MAX_STRIPS);
  const priceMax = Math.max(10000, ...spaces.map((s) => s.pricePerHour));

  const [solo, setSolo] = useState(0);
  const [muted, setMuted] = useState<boolean[]>(() => spaces.map(() => false));
  const [master, setMaster] = useState(priceMax);
  const [recording, setRecording] = useState(false);
  const [gains, setGains] = useState<number[]>(() => spaces.map((_, i) => 0.5 + i * 0.05));
  const [faders, setFaders] = useState<number[]>(() => spaces.map((_, i) => (70 - i * 4) / 100));
  const [tab, setTab] = useState<SpaceCategory>(WORLDS.mu.categories[0]);

  const conRef = useRef<HTMLDivElement>(null);
  const meterRefs = useRef<Record<string, HTMLElement | null>>({});
  // La animación lee el estado más reciente sin reiniciarse.
  const live = useRef({ solo, muted, master, recording, gains, faders });
  useEffect(() => {
    Object.assign(live.current, { solo, muted, master, recording, gains, faders });
  }, [solo, muted, master, recording, gains, faders]);

  const isOff = (i: number) => muted[i] || spaces[i].pricePerHour > master;
  const liveCount = spaces.filter((_, i) => !isOff(i)).length;
  const current = spaces[solo];

  // Medidores y timecode del canal en solo.
  useEffect(() => {
    const con = conRef.current;
    if (!con) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const levels: Record<string, number> = {};
    let beat = 0;
    let raf = 0;
    let visible = true;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const s = live.current;
      beat += dt;
      spaces.forEach((sp, i) => {
        const off = s.muted[i] || sp.pricePerHour > s.master;
        const base = off ? 0 : s.gains[i] * s.faders[i] * (i === s.solo ? 1.25 : 0.75) * (s.recording ? 1.15 : 1);
        ["a", "b"].forEach((ch, j) => {
          const k = `${i}${ch}`;
          const pulse = Math.exp(-((beat + i * 120 + j * 40) % 500) / 140);
          const target = clamp(base * (0.45 + pulse * 0.6 + Math.random() * 0.12), 0, 1);
          const prev = levels[k] ?? 0;
          levels[k] = prev + (target - prev) * (target > prev ? 0.5 : 0.12);
          meterRefs.current[k]?.style.setProperty("--lvl", `${levels[k] * 100}%`);
        });
      });
      const avg = spaces.reduce((a, _, i) => a + (levels[`${i}a`] ?? 0), 0) / Math.max(1, spaces.length);
      ["Ma", "Mb"].forEach((k, j) =>
        meterRefs.current[k]?.style.setProperty("--lvl", `${clamp(avg * 1.6 + j * 0.03, 0, 1) * 100}%`),
      );

      if (visible && !reduceMotion) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was && !reduceMotion) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(con);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // La lista de canales solo cambia al recargar la portada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces.length]);

  function setGain(i: number, g: number) {
    setGains((list) => list.map((v, j) => (j === i ? clamp(g, 0, 1) : v)));
  }

  // Perillas: arrastrar hacia arriba/abajo o flechas del teclado.
  const drag = useRef<{ startY: number; startG: number } | null>(null);
  function knobHandlers(i: number) {
    return {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startY: e.clientY, startG: gains[i] };
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        if (drag.current && e.currentTarget.hasPointerCapture(e.pointerId))
          setGain(i, drag.current.startG + (drag.current.startY - e.clientY) / 150);
      },
      onPointerUp: () => {
        drag.current = null;
      },
      onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") setGain(i, gains[i] + 0.05);
        if (e.key === "ArrowDown" || e.key === "ArrowLeft") setGain(i, gains[i] - 0.05);
      },
    };
  }

  function reset() {
    setSolo(0);
    setMuted(spaces.map(() => false));
    setMaster(priceMax);
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = exploreHref(event.currentTarget, tab);
    const sep = href.includes("?") ? "&" : "?";
    router.push(master < priceMax ? `${href}${sep}max=${master}` : href);
  }

  return (
    <div className="console" ref={conRef}>
      {/* El mapa no toma el puntero (dentro del iframe Google pone su propia mano), así el cursor es
          siempre el micrófono; para recorrer el mapa está "Abrir en Maps". */}
      <div className="daw">
        {current && <HeroMap key={current.id} place={`${current.commune}, ${current.city}`} live={false} />}
        {current && <MicCursor />}
        <div className="daw-info">
          <div>
            <div className="t">{current?.title ?? "Tu sala podría sonar aquí"}</div>
            <div className="meta">
              {current
                ? [`${current.commune}, ${current.city}`, `${formatCLP(current.pricePerHour)} por hora`, current.tags.join(", ")]
                    .filter(Boolean)
                    .join(" · ")
                : "Aún no hay estudios ni salas publicados."}
            </div>
          </div>
        </div>
        <div className="daw-actions">
          {current && <MapsLink place={`${current.commune}, ${current.city}`} />}
          <Link className="btn btn-acc btn-sm" href={current ? `/espacios/${current.id}` : "/espacios/nuevo"}>
            {current ? "Abrir ficha" : "Publicar una sala"}
          </Link>
        </div>
      </div>

      <div className="strips" role="group" aria-label="Canales: un espacio por canal">
        {spaces.map((s, i) => (
          <div
            key={s.id}
            className={`strip ${isOff(i) ? "muted" : ""} ${i === solo ? "solo" : ""}`}
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest("input, .knob, button")) setSolo(i);
            }}
          >
            <div className="scribble" title={s.title}>
              {s.title.replace(/^(Estudio|Sala|Cabina) /, "")}
            </div>
            <div
              className="knob"
              style={{ ["--rot" as string]: `${-135 + gains[i] * 270}deg` }}
              role="slider"
              tabIndex={0}
              aria-label={`Ganancia de ${s.title}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(gains[i] * 100)}
              {...knobHandlers(i)}
            />
            <span className="knob-l">Gain</span>
            <div className="fader-box">
              <div className="meter-pair">
                <div className="meter">
                  <i ref={(el) => void (meterRefs.current[`${i}a`] = el)} />
                </div>
                <div className="meter">
                  <i ref={(el) => void (meterRefs.current[`${i}b`] = el)} />
                </div>
              </div>
              <input
                className="fader"
                type="range"
                min={0}
                max={100}
                value={Math.round(faders[i] * 100)}
                aria-label={`Volumen de ${s.title}`}
                onChange={(e) => setFaders((list) => list.map((v, j) => (j === i ? Number(e.target.value) / 100 : v)))}
              />
            </div>
            <div className="strip-btns">
              <button type="button" className="s" aria-pressed={i === solo} aria-label={`Solo ${s.title}`} onClick={() => setSolo(i)}>
                S
              </button>
              <button
                type="button"
                className="m"
                aria-pressed={muted[i]}
                aria-label={`Mute ${s.title}`}
                onClick={() => setMuted((list) => list.map((v, j) => (j === i ? !v : v)))}
              >
                M
              </button>
            </div>
            <div className="strip-price">{formatCLP(s.pricePerHour)}</div>
          </div>
        ))}
        <div className="strip master">
          <div className="scribble" style={{ background: "var(--acc)", color: "var(--acc-ink)" }}>
            Master
          </div>
          <div className="knob-l mt-1.5">Precio máx.</div>
          <div className="strip-price" style={{ fontSize: 13 }}>
            {formatCLP(master)}
          </div>
          <div className="fader-box">
            <div className="meter-pair">
              <div className="meter">
                <i ref={(el) => void (meterRefs.current.Ma = el)} />
              </div>
              <div className="meter">
                <i ref={(el) => void (meterRefs.current.Mb = el)} />
              </div>
            </div>
            <input
              className="fader"
              type="range"
              min={10000}
              max={priceMax}
              step={1000}
              value={master}
              aria-label="Precio máximo por hora"
              onChange={(e) => setMaster(Number(e.target.value))}
            />
          </div>
          <div className="strip-db">
            {liveCount} {liveCount === 1 ? "canal" : "canales"}
          </div>
        </div>
      </div>

      <form className="transport" role="search" aria-label="Buscar espacios" onSubmit={onSearch}>
        <div className="seg" role="tablist" aria-label="Tipo de espacio">
          {WORLDS.mu.categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={tab === c}
              onClick={() => {
                setTab(c);
                const first = spaces.findIndex((s) => s.category === c);
                if (first >= 0) setSolo(first);
              }}
            >
              <span className="ledot" />
              <CategoryIcon category={c} />
              {SPACE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <SearchFields days={days} />
        <div className="tp-btns">
          <button type="button" onClick={reset} aria-label="Volver al inicio de la mezcla">
            <SkipBack aria-hidden />
          </button>
          <button
            type="button"
            className="recb"
            aria-pressed={recording}
            aria-label="Grabar"
            style={recording ? { background: "var(--rec)", color: "#fff" } : undefined}
            onClick={() => {
              setRecording((r) => !r);
              toast(recording ? "Grabación detenida" : "Grabando", recording ? undefined : "Los medidores suben: así suena una sala llena.");
            }}
          >
            <Circle className="fill-current" aria-hidden />
          </button>
          <button type="submit" className="play">
            <Play aria-hidden />
            Buscar
          </button>
        </div>
      </form>
    </div>
  );
}
