import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" install Sprout as its own app: full screen, with the sprout icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sprout — baby names for two",
    short_name: "Sprout",
    description: "Swipe on baby names with your partner and see where you match.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8f1",
    theme_color: "#fff8f1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
