"use client";

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Cierra con Escape y enfoca el primer control al abrir. El efecto depende solo de
// `open`: si dependiera de `onClose` (una función nueva en cada render del padre),
// cada cambio de estado dentro de la capa devolvería el foco al botón de cerrar.
function useLayer(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  });
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => onEscape(e);
    document.addEventListener("keydown", onKeyDown);
    ref.current
      ?.querySelector<HTMLElement>("button, [href], input, select, textarea")
      ?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
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

/**
 * Confirmación con el estilo Señal, en lugar de window.confirm (que bloquea la página
 * y no sigue el diseño). Queda abierta mientras `pending` para mostrar el progreso.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Volver",
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={pending ? () => {} : onClose} label={title}>
      <h2 className="display h3 px-6">{title}</h2>
      {body && <p className="dim text-sm">{body}</p>}
      <div className="mt-1 grid w-full grid-cols-2 gap-2">
        <button type="button" className="btn btn-line" disabled={pending} onClick={onClose}>
          {cancelLabel}
        </button>
        <button type="button" className="btn btn-acc" disabled={pending} onClick={onConfirm}>
          {pending ? "Procesando..." : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
