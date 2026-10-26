import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=moni",
    name: "Moni",
    short_name: "Moni",
    description: "Your private space for everyday expenses.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f7fc",
    theme_color: "#5a63d8",
    lang: "en",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
