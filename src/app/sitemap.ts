import type { MetadataRoute } from "next";
import { listPublishedSpaceIds } from "@/lib/queries/spaces";
import { SITE_URL } from "@/lib/site";

const STATIC_ROUTES: { path: string; changeFrequency: "daily" | "weekly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/explorar", changeFrequency: "daily", priority: 0.9 },
  { path: "/terminos", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cancelaciones", changeFrequency: "yearly", priority: 0.2 },
];

/** Rutas públicas y cada espacio publicado, con su última modificación real (`updated_at`). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  for (const space of await listPublishedSpaceIds()) {
    entries.push({
      url: `${SITE_URL}/espacios/${space.id}`,
      lastModified: space.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
      ...(space.image ? { images: [space.image] } : {}),
    });
  }

  return entries;
}
