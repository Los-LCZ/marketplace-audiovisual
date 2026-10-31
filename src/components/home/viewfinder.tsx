"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { CategoryIcon } from "@/components/ui/category-icon";
import { WORLDS } from "@/lib/world";
import { formatCLP } from "@/lib/utils";
import type { SpaceCategory } from "@/types/database";
import type { DayOption, HeroSpace } from "./hero-types";
import { exploreHref, SearchFields } from "./search-fields";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const AUTO_ADVANCE_MS = 7000;

/**
 * Hero del mundo Audiovisual: un visor de cámara. Mover el puntero enfoca, clic fija el
 * foco, doble clic (o Enter) abre la ficha, flechas cambian de encuadre. Sin interacción,
 * pasa solo al siguiente espacio cada 7 s. Abajo, el "menú de cámara" busca espacios.
 */
export function Viewfinder({ spaces, days }: { spaces: HeroSpace[]; days: DayOption[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [locked, setLocked] = useState(false);
  const [focusing, setFocusing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<SpaceCategory>(WORLDS.av.categories[0]);
  const [flashKey, setFlashKey] = useState(0);

  const vfRef = useRef<HTMLDivElement>(null);
  const afRef = useRef<HTMLDivElement>(null);
  const peakRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  // Estado de la animación fuera de React (se actualiza ~60 veces por segundo).
  const anim = useRef({ target: { x: 0.5, y: 0.5 }, pos: { x: 0.5, y: 0.5 }, frames: 0, lastInteraction: 0, cycle: 0 });
  const zoomRef = useRef(zoom);
  const idxRef = useRef(idx);

  const space = spaces[idx];

  function frame(i: number) {
    if (!spaces.length) return;
    const next = (i + spaces.length) % spaces.length;
    setFocusing(true);
    setLocked(false);
    window.setTimeout(() => {
      setIdx(next);
      window.setTimeout(() => setFocusing(false), 260);
    }, 220);
  }

  function lock() {
    setLocked(true);
    setFlashKey((k) => k + 1);
  }

  const touch = () => {
    anim.current.lastInteraction = performance.now();
  };

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  // Bucle de animación: timecode, foco que sigue al puntero, zoom y avance automático.
  useEffect(() => {
    const vf = vfRef.current;
    if (!vf) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    const a = anim.current;

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      a.frames += (dt / 1000) * 24;
      const f = Math.floor(a.frames);
      const ss = Math.floor(f / 24);
      if (tcRef.current)
        tcRef.current.textContent = `00:${String(Math.floor(ss / 60) % 60).padStart(2, "0")}:${String(ss % 60).padStart(2, "0")}:${String(f % 24).padStart(2, "0")}`;
      a.pos.x += (a.target.x - a.pos.x) * 0.14;
      a.pos.y += (a.target.y - a.pos.y) * 0.14;
      const px = `${a.pos.x * 100}%`;
      const py = `${a.pos.y * 100}%`;
      if (afRef.current) Object.assign(afRef.current.style, { left: px, top: py });
      peakRef.current?.style.setProperty("--px", px);
      peakRef.current?.style.setProperty("--py", py);
      if (imgRef.current) {
        imgRef.current.style.transformOrigin = `${px} ${py}`;
        imgRef.current.style.transform = `scale(${zoomRef.current})`;
      }
      a.cycle += dt;
      if (now - a.lastInteraction > AUTO_ADVANCE_MS && a.cycle > AUTO_ADVANCE_MS) {
        a.cycle = 0;
        frame(idxRef.current + 1);
      }
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
    io.observe(vf);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // frame() solo usa setters estables y la lista de espacios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces.length]);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFlashKey((k) => k + 1);
    const href = exploreHref(event.currentTarget, tab);
    window.setTimeout(() => router.push(href), 260);
  }

  const mm = Math.round(24 + (zoom - 1) * 66);
  const fstop = (2.8 + (zoom - 1) * 2).toFixed(1);

  return (
    <>
      <div
        ref={vfRef}
        className={`vf ${focusing ? "focusing" : ""} ${locked ? "focused" : ""}`}
        tabIndex={0}
        aria-label="Visor de cámara. Mueve el puntero para enfocar, haz clic para fijar el foco y doble clic para abrir el espacio."
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          anim.current.target = {
            x: clamp((e.clientX - r.left) / r.width, 0.08, 0.92),
            y: clamp((e.clientY - r.top) / r.height, 0.12, 0.85),
          };
          if (locked) setLocked(false);
          touch();
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, a, input")) return;
          touch();
          lock();
        }}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest("button, a, input") || !space) return;
          router.push(`/espacios/${space.id}`);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") frame(idx + 1);
          if (e.key === "ArrowLeft") frame(idx - 1);
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" && space) router.push(`/espacios/${space.id}`);
          if (e.key === " ") {
            e.preventDefault();
            lock();
          }
        }}
      >
        <div ref={imgRef} className="vf-img">
          {space?.image && (
            <Image src={space.image} alt={space.title} fill priority sizes="(min-width: 1240px) 1184px, 100vw" className="object-cover" />
          )}
        </div>
        <div ref={peakRef} className="vf-peak" />
        <div className="vf-shade" />
        <div className="vf-grid" />
        <div className="vf-corners">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div ref={afRef} className={`vf-af ${locked ? "locked" : ""}`}>
          <span>{locked ? "AF ✓ ENFOCADO" : "AF-C"}</span>
        </div>
        <div key={flashKey} className={`vf-flash ${flashKey ? "go" : ""}`} />
        <div className="vf-hud top">
          <span className="rec">
            <i />
            REC
          </span>
          <span ref={tcRef}>00:00:00:00</span>
          <span className="sp" />
          <span>4K 24P</span>
          <span>ISO 800</span>
          <span>f/{fstop}</span>
          <span>1/50</span>
          <span>5600K</span>
          <span className="batt" aria-label="Batería">
            <b />
            <b />
            <b />
            <b className="off" />
          </span>
        </div>
        <div className="vf-zoom">
          <span>{mm}MM</span>
          <input
            type="range"
            className="range"
            min={100}
            max={170}
            value={zoom * 100}
            aria-label="Zoom"
            onChange={(e) => {
              setZoom(Number(e.target.value) / 100);
              touch();
            }}
          />
          <span>70MM</span>
        </div>
        <div className="vf-hud bottom">
          <div className="vf-clip">
            <div>A001 C{String(idx + 1).padStart(3, "0")}</div>
            <div className="t">{space?.title ?? "Tu set podría estar aquí"}</div>
            <div className="mt-1.5 font-sans text-[13px] tracking-normal normal-case">
              {space
                ? `${space.commune}, ${space.city} · ${formatCLP(space.pricePerHour)} por hora`
                : "Aún no hay sets ni locaciones publicados."}
            </div>
            {spaces.length > 1 && (
              <div className="vf-thumbs" role="group" aria-label="Espacios para encuadrar">
                {spaces.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={i === idx}
                    aria-label={`Encuadrar ${s.title}`}
                    onClick={() => {
                      touch();
                      frame(i);
                    }}
                  >
                    {s.image && <Image src={s.image} alt="" width={92} height={54} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="sp" />
          <Link
            className="btn btn-acc btn-sm pointer-events-auto"
            href={space ? `/espacios/${space.id}` : "/espacios/nuevo"}
          >
            {space ? "Abrir ficha" : "Publicar un set"}
          </Link>
        </div>
      </div>

      <form className="cam-menu panel" role="search" aria-label="Buscar espacios" onSubmit={onSearch}>
        <div className="seg" role="tablist" aria-label="Tipo de espacio">
          {WORLDS.av.categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={tab === c}
              onClick={() => {
                setTab(c);
                const first = spaces.findIndex((s) => s.category === c);
                if (first >= 0) frame(first);
              }}
            >
              <span className="ledot" />
              <CategoryIcon category={c} />
              {SPACE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <SearchFields days={days} />
        <div className="shutter-wrap">
          <button className="shutter" type="submit" aria-label="Buscar espacios" />
          <span className="mono">Buscar</span>
        </div>
      </form>
    </>
  );
}
