import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Martian_Mono, Unbounded } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getWorld } from "@/lib/world-server";
import { WORLDS } from "@/lib/world";
import "./globals.css";

const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["500", "600"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: {
    default: "Señal · Estudios, salas, sets y locaciones por hora",
    template: "%s · Señal",
  },
  description:
    "Marketplace de estudios de grabación, salas de ensayo, sets de filmación y locaciones por hora en Santiago, con ficha técnica completa antes de reservar.",
};

export async function generateViewport(): Promise<Viewport> {
  const world = await getWorld();
  return { themeColor: WORLDS[world].themeColor, viewportFit: "cover", colorScheme: "dark" };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const world = await getWorld();

  return (
    <html
      lang="es-CL"
      data-world={world}
      className={`${unbounded.variable} ${hanken.variable} ${martian.variable}`}
    >
      <body>
        <Navbar world={world} />
        <main id="app">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
