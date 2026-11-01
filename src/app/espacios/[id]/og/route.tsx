import { getSpaceById } from "@/lib/queries/spaces";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { ogCard } from "@/lib/og-card";
import { formatCLP } from "@/lib/utils";
import { worldOf } from "@/lib/world";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Imagen al compartir un espacio sin fotos. No es un `opengraph-image`: ese archivo
 * tendría prioridad sobre generateMetadata y taparía la primera foto de los espacios que sí tienen.
 */
export async function GET(_request: Request, { params }: RouteContext<"/espacios/[id]/og">) {
  const { id } = await params;
  const space = UUID_RE.test(id) ? await getSpaceById(id) : null;
  if (!space || space.status !== "published") return new Response("No encontrado", { status: 404 });

  return ogCard({
    world: worldOf(space.category),
    kicker: SPACE_CATEGORY_LABELS[space.category],
    title: space.title,
    lines: [space.commune, `${formatCLP(space.price_per_hour)} por hora`],
  });
}
