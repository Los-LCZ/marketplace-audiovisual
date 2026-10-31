import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listAmenities } from "@/lib/queries/spaces";
import { SpaceForm } from "@/components/forms/space-form";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Publicar espacio" };

export default async function NuevoEspacioPage() {
  // El proxy ya protege la ruta; esto cubre una sesión que expiró entre medio.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/espacios/nuevo");

  if (user.profile.role === "client") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <EmptyState
          icon={Store}
          title="Solo los anfitriones pueden publicar espacios"
          description="Tu cuenta es de cliente. Para publicar un espacio necesitas una cuenta de anfitrión."
          action={
            <Link href="/" className={buttonClasses({ variant: "secondary" })}>
              Explorar espacios
            </Link>
          }
        />
      </main>
    );
  }

  const amenities = await listAmenities();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Publicar un espacio</h1>
        <p className="text-muted-foreground">Completa los datos de tu estudio, sala o locación.</p>
      </header>
      <SpaceForm amenities={amenities} />
    </main>
  );
}
