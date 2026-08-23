import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Project Atlas",
    short_name: "Atlas",
    description:
      "Your private personal operating system for money, work, goals, and weekly direction.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#0f766e",
    orientation: "portrait-primary",
    categories: ["finance", "productivity", "lifestyle"],
    icons: [
      {
        src: "/icons/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", url: "/dashboard" },
      { name: "Tasks", short_name: "Tasks", url: "/tasks" },
      { name: "Money", short_name: "Money", url: "/money/accounts" },
    ],
  };
}
