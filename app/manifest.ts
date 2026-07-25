import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fluent PDF",
    short_name: "Fluent PDF",
    description:
      "A fast, private, all-in-one PDF toolkit. Merge, split, edit pages, and fill forms — entirely in your browser, nothing ever uploaded.",
    start_url: "/",
    display: "standalone",
    background_color: "#14110d",
    theme_color: "#14110d",
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
