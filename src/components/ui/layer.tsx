"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Cierra con Escape y enfoca el primer control al abrir.
function useLayer(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    ref.current
      ?.querySelector<HTMLElement>("button, [href], input, select, textarea")
      ?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  return ref;
}

/** Hoja inferior (.sheet) para móvil: filtros, reserva, etc. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useLayer(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className="sheet-bg" onClick={onClose} />
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="h3">{title}</h2>
          <button type="button" className="close" style={{ position: "static" }} onClick={onClose} aria-label="Cerrar">
            <X aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}

/** Diálogo centrado (.overlay + .dialog), p. ej. para calificar. */
export function Dialog({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const ref = useLayer(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="dialog panel" role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
          <X aria-hidden />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
