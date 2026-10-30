"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      <input type="hidden" name="next" value={next ?? "/"} />
      <input name="email" type="email" required placeholder="Correo" className="rounded border px-3 py-2" />
      <input name="password" type="password" required placeholder="Contraseña" className="rounded border px-3 py-2" />
      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
      <p className="text-sm">
        ¿No tienes cuenta? <Link href="/registro" className="underline">Regístrate</Link>
      </p>
    </form>
  );
}
