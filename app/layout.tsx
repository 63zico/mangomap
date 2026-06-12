import type { Metadata } from "next";

import "./globals.css";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const logoUrl = `${SITE_URL}/mango-vietnam-logo.png`;
const ogImageUrl = `${SITE_URL}/mango-vietnam-og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mango Vietnam | 한국인이 믿고 보는 베트남 맛집·여행 가이드",
    template: `%s | ${SITE_NAME}`,
  },
  description: "호치민, 다낭, 하노이, 푸꾸옥의 맛집, 카페, 마사지, 병원, 여행지와 생활정보를 한국인 기준으로 큐레이션하는 베트남 가이드입니다.",
  icons: {
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.png"],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Mango Vietnam",
    description: "한국인을 위한 베트남 맛집·여행·생활 가이드.",
    locale: "ko_KR",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Mango Vietnam logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mango Vietnam",
    description: "한국인을 위한 베트남 맛집·여행·생활 가이드.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    other: {
      "naver-site-verification": "1195048c7e2d84db4c400a0a2e52e2a56ff92da4",
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: SITE_NAME,
                url: SITE_URL,
                email: "hello@mango-vietnam.com",
                description: "베트남에 사는 한국인과 여행자를 위한 맛집, 여행, 생활정보 큐레이션 플랫폼.",
                logo: {
                  "@type": "ImageObject",
                  url: logoUrl,
                  width: 512,
                  height: 512,
                },
                image: logoUrl,
              },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                name: SITE_NAME,
                url: SITE_URL,
                inLanguage: "ko-KR",
                publisher: { "@id": `${SITE_URL}/#organization` },
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${SITE_URL}/search?q={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              },
            ],
          }}
        />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
