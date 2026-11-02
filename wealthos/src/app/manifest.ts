import type { MetadataRoute } from "next";

/** Installable web app (home-screen icon, standalone window). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WealthOS",
    short_name: "WealthOS",
    description: "Track every account, holding and liability; measure performance properly; plan with honest scenarios.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f3ec",
    theme_color: "#12392b",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
