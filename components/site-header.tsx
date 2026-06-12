"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, MapPin, Menu, Search } from "lucide-react";

type MegaColumn = {
  heading: string;
  links: Array<{ label: string; href: string }>;
};

type NavItem = {
  label: string;
  href: string;
  activePaths: string[];
  columns?: MegaColumn[];
};

type CityOption = {
  label: string;
  koreanLabel: string;
  slug: string;
  href: string;
};

const cityOptions: CityOption[] = [
  { label: "Ho Chi Minh", koreanLabel: "호치민", slug: "ho-chi-minh", href: "/ho-chi-minh" },
  { label: "Da Nang", koreanLabel: "다낭", slug: "da-nang", href: "/da-nang" },
  { label: "Hanoi", koreanLabel: "하노이", slug: "hanoi", href: "/hanoi" },
  { label: "Nha Trang", koreanLabel: "나트랑", slug: "nha-trang", href: "/nha-trang" },
  { label: "Phu Quoc", koreanLabel: "푸꾸옥", slug: "phu-quoc", href: "/phu-quoc" },
  { label: "Da Lat", koreanLabel: "달랏", slug: "da-lat", href: "/da-lat" },
];

const switchableCategorySlugs = new Set([
  "restaurants",
  "best-restaurants",
  "korean-restaurants",
  "cafes",
  "massage",
  "spas",
  "bars",
  "karaoke",
  "nightlife",
  "jobs",
  "used-market",
  "real-estate",
  "hospitals",
  "hair-salons",
]);

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const currentCity = getCurrentCity(pathname);
  const selectedCity = currentCity ?? cityOptions[0];
  const navItems = getMegaNavItems(selectedCity, Boolean(currentCity));

  return (
    <header data-nosnippet className="sticky top-0 z-50 bg-white text-[#171717]">
      <div className="hidden h-[70px] items-center bg-[#0068f0] px-8 text-white lg:flex">
        <Link href="/" className="flex min-w-[280px] items-center gap-3" aria-label="Mango Vietnam 홈">
          <span className="text-4xl font-black leading-none tracking-normal">MANGO VIETNAM</span>
        </Link>

        <form action="/search" className="mx-auto flex h-11 w-[520px] items-center rounded-[6px] border border-white/35 bg-white text-[#171717]">
          <input
            name="q"
            className="h-full min-w-0 flex-1 bg-transparent px-5 text-lg font-semibold outline-none"
            placeholder="호치민 맛집, 다낭 카페, 중고거래 검색"
          />
          <button className="flex h-full w-14 items-center justify-center text-[#0068f0]" aria-label="검색">
            <Search size={25} strokeWidth={2.8} />
          </button>
        </form>

        <div className="flex min-w-[280px] items-center justify-end gap-7 text-sm font-black uppercase">
          <Link href={currentCity?.href ?? "/ho-chi-minh"} className="inline-flex items-center gap-2">
            <MapPin size={17} strokeWidth={3} />
            {currentCity ? currentCity.label : "지역 선택"}
          </Link>
          <Menu size={29} strokeWidth={3} aria-hidden="true" />
        </div>
      </div>

      <div className="lg:hidden">
        <div className="flex h-[58px] items-center justify-between bg-[#0068f0] px-4 text-white">
          <Link href="/" className="text-2xl font-black leading-none tracking-normal">
            MANGO VIETNAM
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/search" aria-label="검색">
              <Search size={24} strokeWidth={2.8} />
            </Link>
            <Menu size={28} strokeWidth={3} aria-hidden="true" />
          </div>
        </div>
        <form action="/search" className="flex h-12 items-center border-b border-[#e5e5e5] bg-white px-4">
          <Search size={18} strokeWidth={2.6} className="mr-2 text-[#0068f0]" />
          <input name="q" className="min-w-0 flex-1 text-sm font-bold outline-none" placeholder="호치민 맛집, 다낭 카페 검색" />
        </form>
      </div>

      <nav className="relative hidden h-[66px] items-center border-b border-[#e5e5e5] bg-white px-8 lg:flex" aria-label="주요 메뉴">
        <div className="flex h-full items-center gap-8">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item);
            return (
              <div key={item.label} className="group flex h-full items-center">
                <Link
                  href={item.href}
                  className={`flex h-full items-center border-b-[6px] pt-[6px] text-base font-black uppercase tracking-normal ${
                    active ? "border-[#0068f0] text-[#0068f0]" : "border-transparent text-[#202020] hover:text-[#0068f0]"
                  }`}
                >
                  {item.label}
                </Link>
                {item.columns ? <MegaMenu columns={item.columns} /> : null}
              </div>
            );
          })}

          <span className="h-6 w-px bg-[#ddd]" />

          <div className="group flex h-full items-center">
            <button className="flex h-full items-center gap-2 border-b-[6px] border-transparent pt-[6px] text-base font-black uppercase text-[#0068f0]">
              {currentCity ? currentCity.label : "Change City"} <ChevronDown size={18} strokeWidth={3} />
            </button>
            <MegaMenu columns={getCityMenuColumns(pathname, currentCity)} />
          </div>
        </div>
      </nav>

      <nav className="flex w-full max-w-full gap-5 overflow-x-auto border-b border-[#e5e5e5] bg-white px-4 py-3 text-sm font-black uppercase lg:hidden" aria-label="모바일 메뉴">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} className="shrink-0 text-[#202020]">
            {item.label}
          </Link>
        ))}
        <Link href={currentCity?.href ?? "/ho-chi-minh"} className="shrink-0 text-[#0068f0]">
          {currentCity ? currentCity.label : "Change City"}
        </Link>
      </nav>
    </header>
  );
}

function getMegaNavItems(city: CityOption, hasCurrentCity: boolean): NavItem[] {
  const cityPrefix = `/${city.slug}`;
  const restaurantHref = hasCurrentCity ? `${cityPrefix}/restaurants` : "/category/restaurants";
  const cafeHref = hasCurrentCity ? `${cityPrefix}/cafes` : "/category/cafes";

  return [
    {
      label: "Restaurants",
      href: restaurantHref,
      activePaths: ["/category/restaurants", `${cityPrefix}/restaurants`, `${cityPrefix}/best-restaurants`, `${cityPrefix}/korean-restaurants`],
      columns: [
        {
          heading: `${city.koreanLabel} Restaurants`,
          links: [
            { label: `${city.koreanLabel} 맛집`, href: `${cityPrefix}/restaurants` },
            { label: `${city.koreanLabel} 한식당`, href: `${cityPrefix}/korean-restaurants` },
            { label: `${city.koreanLabel} 로컬 맛집`, href: `/search?q=${encodeURIComponent(`${city.koreanLabel} 로컬 맛집`)}` },
            { label: `${city.koreanLabel} 해산물`, href: getSeafoodHref(city) },
          ],
        },
        {
          heading: "Cuisines",
          links: [
            { label: "Korean", href: `${cityPrefix}/korean-restaurants` },
            { label: "Vietnamese", href: `/search?q=${encodeURIComponent(`${city.koreanLabel} 로컬 맛집`)}` },
            { label: "Japanese", href: `/search?q=${encodeURIComponent(`${city.koreanLabel} 일식 맛집`)}` },
            { label: "Chinese", href: `/search?q=${encodeURIComponent(`${city.koreanLabel} 중식 맛집`)}` },
            { label: "Western", href: `/search?q=${encodeURIComponent(`${city.koreanLabel} 양식 맛집`)}` },
            { label: "BBQ", href: `/search?q=${encodeURIComponent(`${city.koreanLabel} 고기집`)}` },
          ],
        },
        {
          heading: "Best Lists",
          links: getCityBestListLinks(city),
        },
      ],
    },
    {
      label: "Cafes",
      href: cafeHref,
      activePaths: ["/category/cafes", `${cityPrefix}/cafes`],
    },
    {
      label: "Guides",
      href: "/posts",
      activePaths: ["/posts", "/guide", "/article"],
      columns: [
        {
          heading: "Mango Guides",
          links: [
            { label: "전체 가이드", href: "/posts" },
            { label: "베트남 생활정보", href: "/topics" },
            { label: "베트남 중고거래", href: "/vietnam-used-market" },
            { label: "베트남 비자", href: "/vietnam-visa-extension" },
          ],
        },
      ],
    },
    { label: "Korean Community", href: "/topics", activePaths: ["/topics"] },
    { label: "Deals", href: "/submit", activePaths: ["/submit"] },
  ];
}

function getSeafoodHref(city: CityOption) {
  if (city.slug === "da-nang" || city.slug === "phu-quoc") return `/${city.slug}/seafood-restaurants`;
  return `/search?q=${encodeURIComponent(`${city.koreanLabel} 해산물 맛집`)}`;
}

function getCityBestListLinks(city: CityOption) {
  if (city.slug === "ho-chi-minh") {
    return [
      { label: "호치민 맛집 TOP 20", href: "/ho-chi-minh-best-restaurants" },
      { label: "호치민 1군 맛집", href: "/ho-chi-minh/district-1-restaurants" },
      { label: "호치민 한식당", href: "/ho-chi-minh/korean-restaurants" },
      { label: "호치민 짬뽕", href: "/ho-chi-minh-jjamppong" },
    ];
  }

  if (city.slug === "da-nang") {
    return [
      { label: "다낭 맛집", href: "/da-nang/restaurants" },
      { label: "다낭 오션뷰 카페", href: "/da-nang/cafes" },
      { label: "다낭 해산물", href: "/da-nang/seafood-restaurants" },
      { label: "다낭 마사지", href: "/da-nang/massage" },
    ];
  }

  if (city.slug === "phu-quoc") {
    return [
      { label: "푸꾸옥 맛집", href: "/phu-quoc/restaurants" },
      { label: "푸꾸옥 해산물", href: "/phu-quoc/seafood-restaurants" },
      { label: "푸꾸옥 카페", href: "/phu-quoc/cafes" },
      { label: "푸꾸옥 마사지", href: "/phu-quoc/massage" },
    ];
  }

  return [
    { label: `${city.koreanLabel} 맛집`, href: `/${city.slug}/restaurants` },
    { label: `${city.koreanLabel} 카페`, href: `/${city.slug}/cafes` },
    { label: `${city.koreanLabel} 마사지`, href: `/${city.slug}/massage` },
    { label: `${city.koreanLabel} 생활정보`, href: `/${city.slug}` },
  ];
}

function getCityMenuColumns(pathname: string, currentCity?: CityOption): MegaColumn[] {
  const quickLinks = currentCity
    ? [
        { label: `${currentCity.koreanLabel} 맛집`, href: `/${currentCity.slug}/restaurants` },
        { label: `${currentCity.koreanLabel} 카페`, href: `/${currentCity.slug}/cafes` },
        { label: `${currentCity.koreanLabel} 마사지`, href: `/${currentCity.slug}/massage` },
        { label: `${currentCity.koreanLabel} 생활정보`, href: `/${currentCity.slug}` },
      ]
    : [
        { label: "호치민 맛집", href: "/ho-chi-minh/restaurants" },
        { label: "다낭 카페", href: "/da-nang/cafes" },
        { label: "하노이 맛집", href: "/hanoi/restaurants" },
        { label: "푸꾸옥 해산물", href: "/phu-quoc/seafood-restaurants" },
      ];

  return [
    {
      heading: "Vietnam Cities",
      links: cityOptions.map((city) => ({
        label: city.label,
        href: getCitySwitchHref(pathname, city),
      })),
    },
    {
      heading: currentCity ? `${currentCity.label} Quick Links` : "Trending Guides",
      links: quickLinks,
    },
  ];
}

function getCitySwitchHref(pathname: string, city: CityOption) {
  const segments = pathname.split("/").filter(Boolean);
  const currentCityIndex = segments.findIndex((segment) => cityOptions.some((option) => option.slug === segment));
  if (currentCityIndex >= 0) {
    const nextSegment = segments[currentCityIndex + 1];
    if (nextSegment && switchableCategorySlugs.has(nextSegment)) return `/${city.slug}/${nextSegment}`;
    return `/${city.slug}`;
  }

  return city.href;
}

function getCurrentCity(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const segmentMatch = cityOptions.find((city) => segments.includes(city.slug));
  if (segmentMatch) return segmentMatch;

  return cityOptions.find((city) => pathname.startsWith(`/${city.slug}-`));
}

function isNavActive(pathname: string, item: NavItem) {
  return item.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function MegaMenu({ columns }: { columns: MegaColumn[] }) {
  return (
    <div className="invisible absolute left-0 right-0 top-[66px] z-40 border-b border-[#e5e5e5] bg-white opacity-0 shadow-[0_22px_35px_rgba(0,0,0,0.06)] transition group-hover:visible group-hover:opacity-100">
      <div className="mx-auto grid max-w-[1500px] gap-14 px-10 py-9" style={{ gridTemplateColumns: `repeat(${Math.min(columns.length, 4)}, minmax(0, 1fr))` }}>
        {columns.map((column) => (
          <div key={column.heading} className="border-r border-[#ececec] pr-10 last:border-r-0">
            <p className="inline-block border-b-[5px] border-[#0068f0] pb-2 text-base font-black uppercase">{column.heading}</p>
            <div className="mt-7 grid gap-5">
              {column.links.map((link) => (
                <Link key={`${column.heading}-${link.href}-${link.label}`} href={link.href} className="text-2xl font-black leading-none hover:text-[#0068f0]">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
