import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

/**
 * Destino del enlace de recuperación (/auth/callback?next=/recuperar/nueva): el callback ya
 * inició la sesión. Sin sesión, el enlace se abrió en otro navegador o la sesión se cerró.
 */
export default async function NuevaContrasenaPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex items-center justify-center px-4 py-12">
      {user ? (
        <NewPasswordForm email={user.email} />
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
          <h1 className="display h3">El enlace expiró</h1>
          <p className="text-sm text-muted-foreground">
            El enlace para cambiar tu contraseña ya se usó o venció. Ábrelo en el mismo navegador donde lo pediste o pide
            uno nuevo.
          </p>
          <Link href="/recuperar" className="text-sm font-medium text-primary hover:underline">
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </div>
  );
}
