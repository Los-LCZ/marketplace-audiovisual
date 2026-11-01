import type { MetadataRoute } from "next";
import { listPublishedSpaces } from "@/lib/queries/spaces";
import { SITE_URL } from "@/lib/site";

const PAGE_SIZE = 50; // máximo que acepta listPublishedSpaces
// Tope de seguridad: 100 páginas = 5.000 espacios. Más allá conviene una query liviana (ids y fechas).
const MAX_PAGES = 100;

const STATIC_ROUTES: { path: string; changeFrequency: "daily" | "weekly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/explorar", changeFrequency: "daily", priority: 0.9 },
  { path: "/terminos", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cancelaciones", changeFrequency: "yearly", priority: 0.2 },
];

/** Rutas públicas y cada espacio publicado, recorriendo listPublishedSpaces página a página. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { spaces, total } = await listPublishedSpaces({ page, pageSize: PAGE_SIZE });
    for (const space of spaces) {
      entries.push({
        url: `${SITE_URL}/espacios/${space.id}`,
        lastModified: space.created_at,
        changeFrequency: "weekly",
        priority: 0.8,
        ...(space.images[0] ? { images: [space.images[0]] } : {}),
      });
    }
    if (page * PAGE_SIZE >= total || spaces.length === 0) break;
  }

  return entries;
}
