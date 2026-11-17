import type { MetadataRoute } from "next";

/** Web app manifest: lets browsers install Sift to the home screen or desktop with its own icon and window. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sift: see what's in your data",
    short_name: "Sift",
    description: "Upload a CSV, Excel or JSON file and get plain-language findings and a dashboard you can filter and save.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f1f3f6",
    theme_color: "#2a78d6",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Your datasets", url: "/app", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Try without an account", short_name: "Try it", url: "/try", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
