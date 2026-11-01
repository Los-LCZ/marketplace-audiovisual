import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSpaceById, listAmenities, listSpaceBlackouts } from "@/lib/queries/spaces";
import { currentTime } from "@/lib/zoned-time";
import { SpaceForm } from "@/components/forms/space-form";
import { SpaceBlackouts } from "@/components/forms/space-blackouts";

export const metadata: Metadata = { title: "Editar espacio" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarEspacioPage({ params }: PageProps<"/espacios/[id]/editar">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/espacios/${id}/editar`)}`);

  const space = UUID_RE.test(id) ? await getSpaceById(id) : null;
  // Solo el dueño edita; para el resto la ruta no existe.
  if (!space || space.host_id !== user.id) notFound();

  const [amenities, blackouts] = await Promise.all([listAmenities(), listSpaceBlackouts(space.id)]);
  const { today } = currentTime();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="display h2">Editar {space.title}</h1>
        <p className="text-muted-foreground">
          Los cambios se aplican al guardar. El equipamiento y las amenities reemplazan a los actuales.
        </p>
      </header>
      <SpaceForm amenities={amenities} space={space} />
      {/* Fuera del formulario: cada cierre o reapertura se guarda al tiro, sin "Guardar cambios". */}
      <section
        id="dias-cerrados"
        aria-labelledby="dias-cerrados-h"
        className="grid gap-4 border-b border-border pb-8 md:grid-cols-[220px_1fr] md:gap-8"
      >
        <div>
          <h2 id="dias-cerrados-h" className="font-semibold">
            Días cerrados
          </h2>
          <p className="text-sm text-muted-foreground">
            Bloquea días completos. Se guardan al instante y la ficha los muestra como ocupados.
          </p>
        </div>
        <SpaceBlackouts spaceId={space.id} blackouts={blackouts} today={today} />
      </section>
    </div>
  );
}
