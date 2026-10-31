"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { signup } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form-controls";

const CARD = "flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <div className={`${CARD} items-center text-center`}>
        <MailCheck className="size-10 text-primary" aria-hidden />
        <p>{state.message}</p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className={CARD}>
      <div>
        <h1 className="display h3">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">Arrienda espacios o publica el tuyo.</p>
      </div>
      <Field label="Nombre completo" htmlFor="full_name" error={fieldErrors?.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" required aria-invalid={!!fieldErrors?.full_name} />
      </Field>
      <Field label="Correo" htmlFor="email" error={fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fieldErrors?.email} />
      </Field>
      <Field label="Teléfono (opcional)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+56 9 ..." />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={!!fieldErrors?.password}
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">¿Qué quieres hacer?</legend>
        {[
          { value: "client", label: "Quiero arrendar espacios" },
          { value: "host", label: "Quiero publicar mi espacio" },
        ].map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5"
          >
            <input
              type="radio"
              name="role"
              value={option.value}
              defaultChecked={option.value === "client"}
              className="accent-primary"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creando cuenta..." : "Registrarme"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
