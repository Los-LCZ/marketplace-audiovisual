"use client";

import { useEffect, useEffectEvent, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Check, Heart, Music, Undo2, X, Zap } from "lucide-react";

export type SwipeDir = "left" | "right" | "up";

const THRESH = 110;
const FLY_MS = 360;
const ICONS = { heart: Heart, music: Music, check: Check } as const;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type Props<T> = {
  items: T[];
  itemKey: (item: T) => string;
  /** Contenido de la tarjeta; `photo` es la foto activa de la tarjeta superior. */
  renderCard: (item: T, photo: number) => ReactNode;
  /** Cantidad de fotos de una tarjeta: tocar a la izquierda o derecha las recorre. */
  photoCount?: (item: T) => number;
  /** Sellos que aparecen al arrastrar; `up` habilita deslizar hacia arriba. */
  stamps: { right: string; left: string; up?: string };
  labels: { right: string; left: string; up?: string };
  rightIcon?: keyof typeof ICONS;
  /** Devuelve false si la acción falló: la tarjeta vuelve al mazo. */
  onSwipe: (item: T, dir: SwipeDir) => Promise<boolean>;
  onUndo?: (item: T) => Promise<boolean>;
  empty: ReactNode;
  hint?: string;
};

/**
 * Mazo para deslizar del prototipo Señal (.deck/.card): arrastre con puntero,
 * sellos, botones y flechas del teclado. Lo usan Descubrir (me gusta / descarte)
 * y el panel del anfitrión (aceptar / rechazar solicitudes).
 */
export function SwipeDeck<T>(props: Props<T>) {
  const { items, itemKey, renderCard, photoCount, stamps, labels, rightIcon = "heart", onSwipe, onUndo, empty, hint } = props;
  const [gone, setGone] = useState<string[]>([]);
  const [photo, setPhoto] = useState(0);
  const [last, setLast] = useState<T | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const flying = useRef(false);
  const drag = useRef({ down: false, moved: false, sx: 0, sy: 0, dx: 0, dy: 0, t0: 0 });

  const visible = items.filter((item) => !gone.includes(itemKey(item))).slice(0, 3);
  const top = visible[0];
  const RightIcon = ICONS[rightIcon];

  const topCard = () => deckRef.current?.querySelector<HTMLElement>('[data-depth="0"]') ?? null;

  function setStamps(card: HTMLElement, x: number, y: number) {
    const r = clamp(x / THRESH, 0, 1);
    const l = clamp(-x / THRESH, 0, 1);
    const u = stamps.up ? clamp(-y / THRESH, 0, 1) * (1 - Math.max(r, l)) : 0;
    for (const [k, v] of [["r", r], ["l", l], ["u", u]] as const) {
      const s = card.querySelector<HTMLElement>(`[data-stamp="${k}"]`);
      if (s) {
        s.style.opacity = String(v);
        s.style.scale = String(0.8 + v * 0.2);
      }
    }
    const second = deckRef.current?.querySelector<HTMLElement>('[data-depth="1"]');
    const p = Math.min(1, Math.max(Math.abs(x), Math.abs(y)) / THRESH);
    if (second) second.style.transform = `translateY(${14 - p * 14}px) scale(${0.95 + p * 0.05})`;
  }

  function commit(dir: SwipeDir) {
    const card = topCard();
    if (!card || !top || flying.current) return;
    if (dir === "up" && !stamps.up) return;
    flying.current = true;
    const x = dir === "right" ? 900 : dir === "left" ? -900 : 0;
    const y = dir === "up" ? -1100 : 0;
    card.style.transition = `transform ${FLY_MS}ms cubic-bezier(.2,.8,.3,1)`;
    card.style.transform = `translate(${x}px, ${y}px) rotate(${x / 18}deg)`;
    setStamps(card, x ? Math.sign(x) * THRESH : 0, y ? -THRESH : 0);
    const key = itemKey(top);
    window.setTimeout(async () => {
      flying.current = false;
      setGone((g) => [...g, key]);
      setLast(top);
      setPhoto(0);
      const ok = await onSwipe(top, dir);
      if (!ok) {
        setGone((g) => g.filter((k) => k !== key));
        setLast(null);
      }
    }, FLY_MS);
  }

  async function undo() {
    if (!last || !onUndo) return;
    const key = itemKey(last);
    setLast(null);
    setGone((g) => g.filter((k) => k !== key));
    setPhoto(0);
    const ok = await onUndo(last);
    if (!ok) setGone((g) => [...g, key]);
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [role=dialog]")) return;
    if (e.key === "ArrowRight") commit("right");
    else if (e.key === "ArrowLeft") commit("left");
    else if (e.key === "ArrowUp" && stamps.up) {
      e.preventDefault();
      commit("up");
    }
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (flying.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { down: true, moved: false, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, t0: e.timeStamp };
    e.currentTarget.style.transition = "none";
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d.down) return;
    d.dx = e.clientX - d.sx;
    d.dy = e.clientY - d.sy;
    if (Math.abs(d.dx) + Math.abs(d.dy) > 6) d.moved = true;
    e.currentTarget.style.transform = `translate(${d.dx}px, ${d.dy}px) rotate(${d.dx / 18}deg)`;
    setStamps(e.currentTarget, d.dx, d.dy);
  }
  function onPointerEnd(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    const card = e.currentTarget;
    if (!d.moved) {
      const n = top && photoCount ? photoCount(top) : 1;
      if (n > 1) {
        const rect = card.getBoundingClientRect();
        const right = e.clientX - rect.left > rect.width / 2;
        setPhoto((p) => clamp(p + (right ? 1 : -1), 0, n - 1));
      }
      return;
    }
    const v = Math.abs(d.dx) / Math.max(1, e.timeStamp - d.t0);
    if (stamps.up && d.dy < -THRESH && Math.abs(d.dx) < THRESH) return commit("up");
    if (d.dx > THRESH || (v > 0.6 && d.dx > 40)) return commit("right");
    if (d.dx < -THRESH || (v > 0.6 && d.dx < -40)) return commit("left");
    card.style.transition = "transform .28s cubic-bezier(.2,.8,.3,1)";
    card.style.transform = "";
    setStamps(card, 0, 0);
  }

  if (!top)
    return (
      <div className="deck-wrap">
        {empty}
        {/* La última tarjeta se puede recuperar aunque el mazo quede vacío. */}
        {onUndo && last && (
          <div className="deck-btns">
            <button type="button" className="dbtn" aria-label="Deshacer" title="Deshacer" onClick={undo}>
              <Undo2 aria-hidden />
            </button>
          </div>
        )}
      </div>
    );

  return (
    <div className="deck-wrap">
      <div className="deck" ref={deckRef}>
        {visible.map((item, i) => (
          <div
            key={itemKey(item)}
            className={`card ${i === 0 ? "top" : ""}`}
            data-depth={i}
            aria-hidden={i > 0 || undefined}
            style={{ zIndex: 10 - i, transform: `translateY(${i * 14}px) scale(${1 - i * 0.05})` }}
            {...(i === 0 ? { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd } : {})}
          >
            {renderCard(item, i === 0 ? photo : 0)}
            {i === 0 && (
              <>
                <span className="stamp r" data-stamp="r">
                  {stamps.right}
                </span>
                <span className="stamp l" data-stamp="l">
                  {stamps.left}
                </span>
                {stamps.up && (
                  <span className="stamp u" data-stamp="u">
                    {stamps.up}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="deck-btns">
        {onUndo && (
          <button type="button" className="dbtn" aria-label="Deshacer" disabled={!last} onClick={undo}>
            <Undo2 aria-hidden />
          </button>
        )}
        <button type="button" className="dbtn big no" aria-label={labels.left} title={labels.left} onClick={() => commit("left")}>
          <X aria-hidden />
        </button>
        {stamps.up && (
          <button type="button" className="dbtn zap" aria-label={labels.up} title={labels.up} onClick={() => commit("up")}>
            <Zap aria-hidden />
          </button>
        )}
        <button type="button" className="dbtn big yes" aria-label={labels.right} title={labels.right} onClick={() => commit("right")}>
          <RightIcon aria-hidden />
        </button>
      </div>
      <p className="deck-hint">{hint ?? `Arrastra la tarjeta o usa las flechas ← →${stamps.up ? " ↑" : ""}`}</p>
    </div>
  );
}
