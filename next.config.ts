import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const isDev = process.env.NODE_ENV === "development";
// Vercel sirve todo por HTTPS (VERCEL=1 en el build); FORCE_HTTPS=1 para otro hosting con TLS.
const httpsOnly = process.env.VERCEL === "1" || process.env.FORCE_HTTPS === "1";

const nextConfig: NextConfig = {
  // No anunciar "X-Powered-By: Next.js".
  poweredByHeader: false,
  // Sin source maps del cliente en producción (no exponer el código fuente).
  productionBrowserSourceMaps: false,
  experimental: {
    // Permite subir fotos de locaciones vía Server Actions (default: 1MB).
    serverActions: { bodySizeLimit: "10mb" },
    proxyClientMaxBodySize: "10mb",
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(isDev, httpsOnly) }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
