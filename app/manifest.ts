import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_URL } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - 베트남 한국인 생활 플랫폼`,
    short_name: SITE_NAME,
    description: "맛집, 마사지, 병원, 비자, 중고거래, 구인구직을 찾는 베트남 한국인 생활 플랫폼",
    start_url: SITE_URL,
    scope: SITE_URL,
    display: "standalone",
    background_color: "#ecc738",
    theme_color: "#0b6b43",
    lang: "ko-KR",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
