import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// PWA / mobile "add to home screen" metadata. Icons reference the generated
// app icon (src/app/icon.tsx). For full installability, add dedicated 192px and
// 512px icons under /public and list them here.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — AI 학습 플랫폼`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    lang: "ko",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}
