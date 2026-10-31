"use client";

import { useRouter } from "next/navigation";
import { Camera, Music } from "lucide-react";
import { WORLDS, WORLD_COOKIE, type World } from "@/lib/world";

const ICONS = { av: Camera, mu: Music } as const;

// Aplica el mundo en el documento y lo recuerda por un año.
export function applyWorld(world: World) {
  document.documentElement.dataset.world = world;
  document.cookie = `${WORLD_COOKIE}=${world}; path=/; max-age=31536000; samesite=lax`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", WORLDS[world].themeColor);
}

/**
 * Interruptor Audiovisual / Música. Cambia de mundo con un "iris de cámara" que se
 * abre desde el botón tocado (View Transitions) y re-renderiza las partes del servidor
 * que dependen del mundo (por ejemplo, el hero de la portada).
 */
export function WorldSwitch({ world }: { world: World }) {
  const router = useRouter();

  function select(next: World, origin: HTMLElement) {
    if (next === world) return;
    const run = () => {
      applyWorld(next);
      router.refresh();
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) return run();
    const rect = origin.getBoundingClientRect();
    document.documentElement.style.setProperty("--ix", `${rect.left + rect.width / 2}px`);
    document.documentElement.style.setProperty("--iy", `${rect.top + rect.height / 2}px`);
    document.startViewTransition(run);
  }

  return (
    <div className="worlds" role="radiogroup" aria-label="Mundo">
      {(["av", "mu"] as const).map((w) => {
        const Icon = ICONS[w];
        return (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={world === w}
            title={WORLDS[w].name}
            onClick={(e) => select(w, e.currentTarget)}
          >
            <Icon aria-hidden />
            <span className="w-label">{WORLDS[w].name}</span>
          </button>
        );
      })}
    </div>
  );
}
