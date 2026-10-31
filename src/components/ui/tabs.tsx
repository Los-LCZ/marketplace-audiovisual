"use client";

import { useState, type ReactNode } from "react";

export type TabItem = { key: string; label: string; count?: number; alert?: boolean; content: ReactNode };

// Pestañas del sistema Señal (.tabs). El contenido de cada pestaña llega ya renderizado desde el servidor.
export function Tabs({ tabs, initial }: { tabs: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={t.key === current?.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
            {t.count ? <span className={`n ${t.alert ? "alert" : ""}`}>{t.count}</span> : null}
          </button>
        ))}
      </div>
      {current && (
        <div role="tabpanel" id={`panel-${current.key}`} aria-labelledby={`tab-${current.key}`} className="mt-[26px]">
          {current.content}
        </div>
      )}
    </>
  );
}
