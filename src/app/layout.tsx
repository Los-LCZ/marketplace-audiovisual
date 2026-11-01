import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Martian_Mono, Unbounded } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";
import { getWorld } from "@/lib/world-server";
import { WORLDS } from "@/lib/world";
import { BASE_OPEN_GRAPH, DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["500", "600"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Señal",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    ...BASE_OPEN_GRAPH,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
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
        <Toaster />
      </body>
    </html>
  );
}
