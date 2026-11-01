import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/profile-form";
import { AvatarEditor } from "@/components/profile/avatar-editor";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function PerfilPage() {
  // El proxy ya protege la ruta; esto cubre una sesión que expiró entre medio.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/perfil");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display h2">Tu perfil</h1>
          <p className="dim mt-1">Es lo que ven anfitriones y clientes antes de reservar o aceptarte. El teléfono no se muestra.</p>
        </div>
        <Link className="btn btn-line btn-sm" href={`/u/${user.id}`}>
          Ver perfil público
        </Link>
      </header>
      <AvatarEditor name={user.profile.full_name ?? user.email ?? "Tú"} avatarUrl={user.profile.avatar_url} />
      <ProfileForm profile={user.profile} />
    </div>
  );
}
