import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { logSecurityEvent } from "@/lib/security-log";

// Destino del enlace de confirmación de correo y de recuperación (flujo PKCE: ?code=...).
// El code es de un solo uso: Supabase lo canjea una vez y exige el code_verifier que
// quedó en la cookie del navegador que pidió el enlace.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    logSecurityEvent("auth_callback_failed", { reason: error.code ?? "unknown" });
  } else {
    logSecurityEvent("auth_callback_failed", { reason: "missing_code" });
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
