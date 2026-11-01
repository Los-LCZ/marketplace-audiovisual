import { Children, cloneElement, isValidElement, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground " +
  "placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " +
  "disabled:opacity-50 aria-invalid:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(CONTROL, "h-10 pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-24 py-2", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="text-sm text-danger">
      {children}
    </p>
  );
}

type ControlProps = { id?: string; "aria-invalid"?: unknown; "aria-describedby"?: string };

/**
 * Etiqueta + control + error de un campo de formulario. Al control con id `htmlFor`
 * le agrega aria-invalid y le enlaza el error con aria-describedby, para que el lector
 * de pantalla lea el motivo al enfocarlo.
 */
export function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const errorId = `${htmlFor}-error`;
  const linked = error
    ? Children.map(children, (child) => {
        if (!isValidElement<ControlProps>(child) || child.props.id !== htmlFor) return child;
        const describedBy = [child.props["aria-describedby"], errorId].filter(Boolean).join(" ");
        return cloneElement(child, { "aria-invalid": true, "aria-describedby": describedBy });
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {linked}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; error?: string; message?: string } | null }) {
  if (!state) return null;
  if (!state.ok) {
    return (
      <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (!state.message) return null;
  return (
    <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
      {state.message}
    </p>
  );
}
