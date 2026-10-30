"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/auth/actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return <p className="max-w-sm text-center">{state.message}</p>;
  }

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <input name="full_name" required placeholder="Nombre completo" className="rounded border px-3 py-2" />
      {fieldErrors?.full_name && <p className="text-sm text-red-600">{fieldErrors.full_name}</p>}
      <input name="email" type="email" required placeholder="Correo" className="rounded border px-3 py-2" />
      {fieldErrors?.email && <p className="text-sm text-red-600">{fieldErrors.email}</p>}
      <input name="phone" type="tel" placeholder="Teléfono (+56 9 ...)" className="rounded border px-3 py-2" />
      <input name="password" type="password" required minLength={8} placeholder="Contraseña" className="rounded border px-3 py-2" />
      {fieldErrors?.password && <p className="text-sm text-red-600">{fieldErrors.password}</p>}
      <fieldset className="flex gap-4">
        <label className="flex items-center gap-2">
          <input type="radio" name="role" value="client" defaultChecked /> Quiero arrendar
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="role" value="host" /> Quiero publicar mi espacio
        </label>
      </fieldset>
      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
        {pending ? "Creando cuenta..." : "Registrarme"}
      </button>
      <p className="text-sm">
        ¿Ya tienes cuenta? <Link href="/login" className="underline">Inicia sesión</Link>
      </p>
    </form>
  );
}
