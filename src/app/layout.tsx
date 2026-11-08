import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./cliente.css";
import { ProvedorTema, scriptTema } from "@/features/tema/tema";

export const metadata: Metadata = {
  title: "PW Express · Cliente",
  description: "Peça coletas e entregas, acompanhe ao vivo e veja suas faturas.",
  appleWebApp: { capable: true, title: "PW Express", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f2e9" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>
        <ProvedorTema>{children}</ProvedorTema>
      </body>
    </html>
  );
}
