"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form-controls";

export function LoginForm({ next, callbackError }: { next?: string; callbackError?: boolean }) {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form
      action={action}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <div>
        <h1 className="display h3">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">Ingresa para reservar o gestionar tus espacios.</p>
      </div>
      {callbackError && !state && (
        <FormMessage state={{ ok: false, error: "El enlace de confirmación no es válido o expiró" }} />
      )}
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Correo" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Ingresando..." : "Ingresar"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
