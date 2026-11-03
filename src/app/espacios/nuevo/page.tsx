import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAmenities } from "@/lib/queries/spaces";
import { SpaceForm } from "@/components/forms/space-form";
import { BecomeHost } from "@/components/profile/become-host";

export const metadata: Metadata = { title: "Publicar espacio" };

export default async function NuevoEspacioPage() {
  // El proxy ya protege la ruta; esto cubre una sesión que expiró entre medio.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/espacios/nuevo");

  // Un cliente puede activarse como anfitrión aquí mismo; después ve el formulario.
  if (user.profile.role === "client") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <BecomeHost />
      </div>
    );
  }

  const amenities = await listAmenities();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="display h2">Publicar un espacio</h1>
        <p className="text-muted-foreground">Completa los datos de tu estudio, sala o locación.</p>
      </header>
      <SpaceForm amenities={amenities} />
    </div>
  );
}
