import type { MetadataRoute } from "next";

/** "Adicionar à tela inicial": a área do cliente abre como app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PW Express · Cliente",
    short_name: "PW Express",
    description: "Peça coletas e entregas e acompanhe ao vivo",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#08080a",
    theme_color: "#08080a",
    icons: [
      { src: "/marca/logo-192.png", sizes: "192x192", type: "image/png" },
      { src: "/marca/logo-512.png", sizes: "512x512", type: "image/png" },
      { src: "/marca/logo-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
