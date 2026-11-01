import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Rutas privadas o de flujo: no aportan a la búsqueda y piden sesión.
const PRIVATE = ["/dashboard", "/mis-reservas", "/perfil", "/descubrir", "/recuperar", "/auth", "/espacios/nuevo"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
