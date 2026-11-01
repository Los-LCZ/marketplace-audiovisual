"use client";

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Capa modal: cierra con Escape, enfoca el primer control al abrir, mantiene el Tab
// dentro de la capa y al cerrar devuelve el foco a lo que la abrió. El efecto depende
// solo de `open`: si dependiera de `onClose` (una función nueva en cada render del
// padre), cada cambio de estado dentro de la capa devolvería el foco al botón de cerrar.
export function useLayer(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") return onClose();
    if (e.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !ref.current.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !ref.current.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => onKey(e);
    document.addEventListener("keydown", onKeyDown);
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Si el que abrió la capa sigue en la página (no se desmontó al revalidar), recupera el foco.
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
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
