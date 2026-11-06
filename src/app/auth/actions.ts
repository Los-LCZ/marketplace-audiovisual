"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { fail, getString, type ActionState } from "@/lib/action-state";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { RATE_LIMITS, rateLimiter, tooManyAttemptsMessage } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";
import { fingerprint, logSecurityEvent } from "@/lib/security-log";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
// bcrypt (Supabase Auth) solo usa los primeros 72 bytes; más largo no aporta y permite abuso.
const MAX_PASSWORD_LENGTH = 72;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(email);
}

/**
 * URL base para los enlaces de los correos (confirmación y recuperación). Se prefiere la
 * configurada (NEXT_PUBLIC_SITE_URL): el header Origin lo envía el navegador y no debe
 * decidir a qué dominio apunta un enlace de autenticación. En los previews de Vercel, sin
 * esa variable, se usa el Origin (las Server Actions ya exigen que coincida con el Host).
 */
async function authRedirectBase() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  return (await headers()).get("origin") ?? "";
}

/** Aplica un límite y deja registro si se excede. Devuelve el mensaje de error o null. */
function limitOrNull(key: string, rule: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS], action: string, ip: string) {
  const result = rateLimiter.hit(key, rule);
  if (result.ok) return null;
  logSecurityEvent("rate_limited", { action, ip: fingerprint(ip) });
  return tooManyAttemptsMessage(result.retryAfterSeconds);
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(getString(formData, "email"));
  const password = getString(formData, "password");
  // Solo redirecciones internas (evita open redirects, ver src/lib/safe-redirect.ts).
  const next = safeRedirectPath(getString(formData, "next"));

  if (!isValidEmail(email) || !password || password.length > MAX_PASSWORD_LENGTH) {
    return fail("Ingresa un correo y contraseña válidos");
  }

  // Fuerza bruta: límite por IP (muchas cuentas) y por cuenta (muchas IPs).
  const ip = await clientIp();
  const limited =
    limitOrNull(`login:ip:${ip}`, RATE_LIMITS.loginByIp, "login", ip) ??
    limitOrNull(`login:email:${email}`, RATE_LIMITS.loginByEmail, "login", ip);
  if (limited) return fail(limited);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logSecurityEvent("login_failed", { email: fingerprint(email), ip: fingerprint(ip), reason: error.code ?? "unknown" });
    return fail(
      error.code === "email_not_confirmed"
        ? "Debes confirmar tu correo antes de ingresar"
        : "Correo o contraseña incorrectos",
    );
  }

  rateLimiter.reset(`login:email:${email}`);
  logSecurityEvent("login_succeeded", { email: fingerprint(email), ip: fingerprint(ip) });
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(getString(formData, "email"));
  const password = getString(formData, "password");
  const fullName = getString(formData, "full_name");
  const phone = getString(formData, "phone");
  const role = getString(formData, "role") === "host" ? "host" : "client";

  const fieldErrors: Record<string, string> = {};
  if (!isValidEmail(email)) fieldErrors.email = "Correo inválido";
  if (password.length < MIN_PASSWORD_LENGTH) fieldErrors.password = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
  if (password.length > MAX_PASSWORD_LENGTH) fieldErrors.password = `Máximo ${MAX_PASSWORD_LENGTH} caracteres`;
  if (fullName.length < 2) fieldErrors.full_name = "Ingresa tu nombre";
  if (fullName.length > 100) fieldErrors.full_name = "Máximo 100 caracteres";
  if (phone && !/^\+?[0-9 ()-]{6,20}$/.test(phone)) fieldErrors.phone = "Ingresa un teléfono válido";
  if (Object.keys(fieldErrors).length) return fail("Revisa los campos marcados", fieldErrors);

  const ip = await clientIp();
  const limited = limitOrNull(`signup:ip:${ip}`, RATE_LIMITS.signupByIp, "signup", ip);
  if (limited) return fail(limited);

  const supabase = await createClient();

  // handle_new_user copia estos metadatos a public.profiles.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone || null, role },
      emailRedirectTo: `${await authRedirectBase()}/auth/callback`,
    },
  });

  if (error) {
    logSecurityEvent("signup_failed", { email: fingerprint(email), ip: fingerprint(ip), reason: error.code ?? "unknown" });
    if (error.code === "user_already_exists") return fail("Este correo ya está registrado");
    if (error.code === "weak_password") return fail("La contraseña es muy débil", { password: "Usa una contraseña más segura" });
    return fail("No se pudo crear la cuenta. Intenta de nuevo en unos minutos.");
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
// El enlace en sí es de un solo uso y su caducidad la define Supabase Auth (OTP expiry).
const RECOVERY_WINDOW_SECONDS = 15 * 60;

/**
 * Envía el correo de recuperación. Campo: email. Para no revelar qué correos existen,
 * SIEMPRE responde ok con el mismo mensaje si el formato es válido (también si se
 * excede el límite de intentos).
 */
export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = normalizeEmail(getString(formData, "email"));
  if (!isValidEmail(email)) return fail("Ingresa un correo válido", { email: "Correo inválido" });

  const ip = await clientIp();
  const limited =
    limitOrNull(`reset:ip:${ip}`, RATE_LIMITS.passwordResetByIp, "requestPasswordReset", ip) ??
    limitOrNull(`reset:email:${email}`, RATE_LIMITS.passwordResetByEmail, "requestPasswordReset", ip);
  if (limited) return { ok: true, message: RESET_SENT_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await authRedirectBase()}/auth/callback?next=/recuperar/nueva`,
  });
  // No se revela al usuario (incluido el límite de correos), pero queda en los logs.
  logSecurityEvent(error ? "password_reset_failed" : "password_reset_requested", {
    email: fingerprint(email),
    ip: fingerprint(ip),
    reason: error?.code,
  });

  return { ok: true, message: RESET_SENT_MESSAGE };
}

// ¿La sesión viene de un enlace de recuperación abierto hace poco?
function isRecentRecovery(amr: unknown) {
  if (!Array.isArray(amr)) return false;
  const now = Date.now() / 1000;
  return amr.some(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      entry.method === "recovery" &&
      now - Number(entry.timestamp) <= RECOVERY_WINDOW_SECONDS,
  );
}

/**
 * Cambia la contraseña del usuario que abrió un enlace de recuperación (en los últimos
 * 15 minutos). Campos: password, confirm_password. Al terminar redirige a "/" con la
 * sesión iniciada. Una sesión normal NO puede usarla: cambiar la contraseña sin la actual
 * solo se permite desde el enlace del correo.
 */
export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirm_password");

  if (password.length < MIN_PASSWORD_LENGTH)
    return fail(`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`, { password: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres` });
  if (password.length > MAX_PASSWORD_LENGTH)
    return fail(`Máximo ${MAX_PASSWORD_LENGTH} caracteres`, { password: `Máximo ${MAX_PASSWORD_LENGTH} caracteres` });
  if (password !== confirmPassword)
    return fail("Las contraseñas no coinciden", { confirm_password: "Las contraseñas no coinciden" });

  const ip = await clientIp();
  const limited = limitOrNull(`password:ip:${ip}`, RATE_LIMITS.passwordUpdateByIp, "updatePassword", ip);
  if (limited) return fail(limited);

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
    logSecurityEvent("server_error", { context: "updatePassword", errorCode: error.code ?? "unknown" });
    return fail("No se pudo cambiar la contraseña. Intenta de nuevo.");
  }

  // Cierra las demás sesiones abiertas: quien tenía la contraseña anterior queda fuera.
  await supabase.auth.signOut({ scope: "others" });
  logSecurityEvent("password_updated", { user: fingerprint(data.claims.sub), ip: fingerprint(ip) });
  revalidatePath("/", "layout");
  redirect("/");
}
