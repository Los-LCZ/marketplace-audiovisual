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

const RESET_SENT_MESSAGE =
  "Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña";
// El frontend compara este texto exacto (o fieldErrors.link === "expired").
const RESET_LINK_EXPIRED = "El enlace expiró o ya se usó: pide uno nuevo";
// Ventana para cambiar la contraseña después de abrir el enlace de recuperación.
const RECOVERY_WINDOW_SECONDS = 60 * 60;

/**
 * Envía el correo de recuperación. Campo: email. Para no revelar qué correos existen,
 * SIEMPRE responde ok con el mismo mensaje si el formato es válido.
 */
export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = getString(formData, "email");
  if (!EMAIL_RE.test(email)) return fail("Ingresa un correo válido", { email: "Correo inválido" });

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/recuperar/nueva`,
  });
  // No se revela al usuario (incluido el límite de correos), pero queda en los logs.
  if (error) console.error(`requestPasswordReset: ${error.code ?? "error"}: ${error.message}`);

  return { ok: true, message: RESET_SENT_MESSAGE };
}

// ¿La sesión viene de un enlace de recuperación abierto hace poco?
function isRecentRecovery(amr: unknown) {
  if (!Array.isArray(amr)) return false;
  const now = Date.now() / 1000;
  return amr.some((entry) =>
    typeof entry === "string"
      ? entry === "recovery"
      : entry?.method === "recovery" && now - Number(entry.timestamp) <= RECOVERY_WINDOW_SECONDS,
  );
}

/**
 * Cambia la contraseña del usuario que abrió un enlace de recuperación (en la última
 * hora). Campos: password, confirm_password. Al terminar redirige a "/" con la sesión
 * iniciada. Una sesión normal NO puede usarla: cambiar la contraseña sin la actual
 * solo se permite desde el enlace del correo.
 */
export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirm_password");

  if (password.length < 8) return fail("Mínimo 8 caracteres", { password: "Mínimo 8 caracteres" });
  if (password !== confirmPassword)
    return fail("Las contraseñas no coinciden", { confirm_password: "Las contraseñas no coinciden" });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub || !isRecentRecovery(data.claims.amr)) {
    return fail(RESET_LINK_EXPIRED, { link: "expired" });
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password")
      return fail("Debe ser distinta de tu contraseña anterior", { password: "Debe ser distinta de la anterior" });
    if (error.code === "weak_password")
      return fail("La contraseña es muy débil", { password: "Usa una contraseña más segura" });
    if (error.code === "session_not_found" || error.status === 401) return fail(RESET_LINK_EXPIRED, { link: "expired" });
    return fail(`No se pudo cambiar la contraseña: ${error.message}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
