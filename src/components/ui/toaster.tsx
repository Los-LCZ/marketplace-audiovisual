"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Eye } from "lucide-react";

type Toast = { id: number; title: string; text?: string; tone: "ok" | "info" };

const EVENT = "senal:toast";
let nextId = 1;

/** Muestra un aviso breve (.toast) desde cualquier Client Component. */
export function toast(title: string, text?: string, tone: Toast["tone"] = "ok") {
  window.dispatchEvent(new CustomEvent<Toast>(EVENT, { detail: { id: nextId++, title, text, tone } }));
}

// Contenedor de avisos; se monta una vez en el layout.
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const t = (event as CustomEvent<Toast>).detail;
      setToasts((list) => [...list, t]);
      window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), 4200);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone === "info" ? "info" : ""}`}>
          {t.tone === "info" ? <Eye aria-hidden /> : <CircleCheck aria-hidden />}
          <div>
            <b>{t.title}</b>
            {t.text && <span>{t.text}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
