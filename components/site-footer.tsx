import Link from "next/link";

import { categories, CONTACT_EMAIL, primaryCities, SITE_NAME } from "@/lib/site";

const seoLinks = [
  { label: "검색어 지도", href: "/topics" },
  { label: "맛집 허브", href: "/category/restaurants" },
  { label: "마사지 허브", href: "/category/massage" },
  { label: "비자 정보", href: "/vietnam-visa-extension" },
  { label: "병원 정보", href: "/vietnam-hospitals" },
  { label: "중고거래", href: "/vietnam-used-market" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#e7eadf] bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
        <div>
          <p className="text-lg font-extrabold text-[#16231d]">{SITE_NAME}</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#647067]">
            베트남에 사는 한국인이 매일 다시 찾는 생활 검색 플랫폼으로 전환 중입니다.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold text-[#16231d]">지역</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-[#647067]">
            {primaryCities.map((city) => (
              <Link key={city.slug} href={`/${city.slug}`} className="hover:text-[#0b6b43]">
                {city.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold text-[#16231d]">카테고리</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-[#647067]">
            {categories
              .filter((category) => category.homepage)
              .map((category) => (
                <Link key={category.slug} href={`/ho-chi-minh/${category.slug}`} className="hover:text-[#0b6b43]">
                  {category.label}
                </Link>
              ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold text-[#16231d]">검색 허브</p>
          <div className="grid gap-2 text-sm text-[#647067]">
            {seoLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-[#0b6b43]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold text-[#16231d]">운영</p>
          <div className="grid gap-2 text-sm text-[#647067]">
            <Link href="/posts" className="hover:text-[#0b6b43]">
              최근 등록글
            </Link>
            <Link href="/submit" className="hover:text-[#0b6b43]">
              정보 제보하기
            </Link>
            <Link href={`mailto:${CONTACT_EMAIL}`} className="break-words hover:text-[#0b6b43]">
              {CONTACT_EMAIL}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
