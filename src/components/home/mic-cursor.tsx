"use client";

import { useEffect, useRef } from "react";
import { Mic } from "lucide-react";

const NOTES = ["♪", "♫", "♩", "♬"];
const NOTE_EVERY_MS = 130;
const NOTE_MIN_PX = 14;

/**
 * Cursor de la pantalla de la consola: un micrófono que sigue al puntero en toda la pantalla (también
 * sobre los botones) y va soltando notas que flotan y se desvanecen. Escucha a su elemento padre (la
 * pantalla del DAW). Solo con mouse, y sin estela si se prefiere menos movimiento.
 */
export function MicCursor() {
  const fxRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fx = fxRef.current;
    const cur = curRef.current;
    const host = fx?.parentElement;
    if (!fx || !cur || !host) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = { t: 0, x: -999, y: -999 };
    let n = 0;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      cur.style.translate = `${x}px ${y}px`;
      cur.classList.add("on");
      if (reduceMotion) return;
      if (e.timeStamp - last.t < NOTE_EVERY_MS || Math.hypot(x - last.x, y - last.y) < NOTE_MIN_PX) return;
      last = { t: e.timeStamp, x, y };
      const note = document.createElement("span");
      note.className = "daw-note";
      note.textContent = NOTES[n++ % NOTES.length];
      note.style.left = `${x}px`;
      note.style.top = `${y}px`;
      note.style.setProperty("--dx", `${Math.round(Math.random() * 40 - 20)}px`);
      note.style.setProperty("--rot", `${Math.round(Math.random() * 40 - 20)}deg`);
      note.addEventListener("animationend", () => note.remove(), { once: true });
      fx.append(note);
    };
    const leave = () => cur.classList.remove("on");

    host.classList.add("mic-on");
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.classList.remove("mic-on");
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      fx.querySelectorAll(".daw-note").forEach((el) => el.remove());
    };
  }, []);

  return (
    <div ref={fxRef} className="daw-fx" aria-hidden>
      <span ref={curRef} className="daw-cursor">
        <Mic />
      </span>
    </div>
  );
}
