import { ImageResponse } from "next/og";
import type { World } from "@/lib/world";

export const OG_SIZE = { width: 1200, height: 630 };

// Colores de los dos mundos (tokens.css): ImageResponse no lee variables CSS.
const PALETTE: Record<World, { bg: string; s1: string; acc: string; dim: string }> = {
  av: { bg: "#090b0e", s1: "#10131a", acc: "#ff3ec8", dim: "#8b96a6" },
  mu: { bg: "#0d0906", s1: "#16100b", acc: "#ffb020", dim: "#a8977f" },
};

/**
 * Tarjeta Open Graph con el estilo Señal (fondo oscuro, un neón por mundo y
 * lectura monoespaciada). La usan la imagen por defecto y la de cada espacio sin fotos.
 */
export function ogCard({
  world,
  kicker,
  title,
  lines,
  footer,
}: {
  world: World;
  kicker: string;
  title: string;
  lines: string[];
  footer?: string;
}) {
  const c = PALETTE[world];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `linear-gradient(160deg, ${c.s1} 0%, ${c.bg} 70%)`,
          color: "#eaf0f7",
          border: `2px solid ${c.acc}33`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ff3b30", boxShadow: "0 0 18px #ff3b30" }} />
          SEÑAL
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: c.acc }}>{kicker}</div>
          <div style={{ fontSize: title.length > 40 ? 64 : 80, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            {title}
          </div>
          <div style={{ display: "flex", gap: 28, fontSize: 32, color: c.dim }}>
            {lines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: c.dim }}>
          <div>{footer ?? "Estudios, salas, sets y locaciones por hora"}</div>
          <div style={{ color: c.acc }}>● REC</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
