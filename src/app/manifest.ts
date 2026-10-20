import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reading Tracker",
    short_name: "Reading Tracker",
    description: "Личный учёт чтения книг",
    start_url: "/",
    display: "standalone",
    background_color: "#e6d8bd", // --bg, light theme
    theme_color: "#a2461f", // --accent, light theme
    lang: "ru",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
