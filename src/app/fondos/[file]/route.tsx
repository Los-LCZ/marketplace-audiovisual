import { readFile } from "node:fs/promises";
import path from "node:path";
import { MusicStudio } from "@/components/layout/music-studio";
import { VideoSet } from "@/components/layout/video-set";
import { svgMarkup } from "@/lib/svg-markup";
import type { World } from "@/lib/world";

// Escena de cada mundo como archivo SVG propio, generado en el build. La página lo usa de background-image
// (studio.css), así no viaja en el HTML ni en el payload de React y queda en la caché del navegador.
const SCENES: Record<string, { world: World; Scene: () => React.ReactElement }> = {
  "av.svg": { world: "av", Scene: VideoSet },
  "mu.svg": { world: "mu", Scene: MusicStudio },
};

// Dentro del SVG van los tokens y las reglas bd-*: con data-world en la raíz, los colores salen del mundo.
const STYLES = ["tokens.css", "backdrop-scene.css"];
// La fuente de la página no llega a un SVG usado como imagen; los números de la parrilla usan la del sistema.
const SVG_EXTRA_CSS = "svg { --font-body: system-ui, sans-serif; }";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SCENES).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: RouteContext<"/fondos/[file]">) {
  const { file } = await params;
  const scene = SCENES[file];
  if (!scene) return new Response("No encontrado", { status: 404 });

  const css = await Promise.all(
    STYLES.map((name) => readFile(path.join(process.cwd(), "src/styles/senal", name), "utf8")),
  );
  const markup = svgMarkup(<scene.Scene />);
  const svg = markup.replace(
    /^<svg([^>]*)>/,
    `<svg xmlns="http://www.w3.org/2000/svg" data-world="${scene.world}"$1><style><![CDATA[${css.join("\n")}\n${SVG_EXTRA_CSS}]]></style>`,
  );

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Un día en el navegador; el CDN de Vercel lo sirve estático hasta el próximo deploy.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
