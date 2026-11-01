"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form-controls";

/** Nueva contraseña con la sesión de recuperación. Si sale bien, la action redirige a "/". */
export function NewPasswordForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState(updatePassword, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  // Sin sesión de recuperación reciente la action marca fieldErrors.link = "expired".
  const expired = fieldErrors?.link === "expired";

  return (
    <form
      action={action}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <div>
        <h1 className="display h3">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">
          {email ? (
            <>
              Elige una contraseña nueva para <b>{email}</b>.
            </>
          ) : (
            "Elige una contraseña nueva para tu cuenta."
          )}
        </p>
      </div>
      {/* Para que los gestores de contraseñas asocien la clave nueva a la cuenta. */}
      {email && <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />}
      <Field label="Nueva contraseña" htmlFor="password" error={fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus
          aria-invalid={!!fieldErrors?.password}
          aria-describedby={fieldErrors?.password ? undefined : "password-hint"}
        />
        {!fieldErrors?.password && (
          <p id="password-hint" className="text-xs text-muted-foreground">
            Mínimo 8 caracteres.
          </p>
        )}
      </Field>
      <Field label="Repetir contraseña" htmlFor="confirm_password" error={fieldErrors?.confirm_password}>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={!!fieldErrors?.confirm_password}
        />
      </Field>
      <FormMessage state={state} />
      {expired && (
        <Link href="/recuperar" className="text-center text-sm font-medium text-primary hover:underline">
          Pedir un enlace nuevo
        </Link>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar contraseña"}
      </Button>
    </form>
  );
}
