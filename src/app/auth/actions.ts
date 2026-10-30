"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { fail, getString, type ActionState } from "@/lib/action-state";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Solo se permiten redirecciones internas (evita open redirects).
function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = safeNext(getString(formData, "next"));

  if (!EMAIL_RE.test(email) || !password) {
    return fail("Ingresa un correo y contraseña válidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return fail(
      error.code === "email_not_confirmed"
        ? "Debes confirmar tu correo antes de ingresar"
        : "Correo o contraseña incorrectos",
    );
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const fullName = getString(formData, "full_name");
  const phone = getString(formData, "phone");
  const role = getString(formData, "role") === "host" ? "host" : "client";

  const fieldErrors: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Correo inválido";
  if (password.length < 8) fieldErrors.password = "Mínimo 8 caracteres";
  if (fullName.length < 2) fieldErrors.full_name = "Ingresa tu nombre";
  if (Object.keys(fieldErrors).length) return fail("Revisa los campos marcados", fieldErrors);

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();

  // handle_new_user copia estos metadatos a public.profiles.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone || null, role },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return fail(
      error.code === "user_already_exists" ? "Este correo ya está registrado" : error.message,
    );
  }

  // Sin sesión => el proyecto exige confirmación por correo.
  if (!data.session) {
    return { ok: true, message: "Te enviamos un correo para confirmar tu cuenta" };
  }

  revalidatePath("/", "layout");
  redirect(role === "host" ? "/dashboard" : "/");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
