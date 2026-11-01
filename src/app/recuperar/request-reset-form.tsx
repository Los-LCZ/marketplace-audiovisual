"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form-controls";

const CARD = "flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm";

/** Pide el correo de recuperación. La action responde igual exista o no la cuenta. */
export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  // Controlado: React reinicia el formulario después de cada envío y se perdería el correo.
  const [email, setEmail] = useState("");
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <div className={`${CARD} items-center text-center`} role="status">
        <MailCheck className="size-10 text-primary" aria-hidden />
        <p>{state.message}</p>
        <p className="text-sm text-muted-foreground">Si no llega en unos minutos, revisa la carpeta de spam.</p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className={CARD}>
      <div>
        <h1 className="display h3">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva.
        </p>
      </div>
      <Field label="Correo" htmlFor="email" error={fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!fieldErrors?.email}
        />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar enlace"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿La recordaste?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
