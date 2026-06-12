import Link from "next/link";
import { ArrowRight, Bookmark, Navigation } from "lucide-react";

import { getMangoGuidePostImage, mangoGuidePosts, type MangoGuidePost } from "@/lib/mango-guide-posts";
import { getPlacePhotoSrc } from "@/lib/place-photos";
import { getAllListings, getKoreanFitScore, getListingsForRoute, getPopularListings, type Listing } from "@/lib/places";

type ImagePost = MangoGuidePost & { image: string };

type FeaturedStory = {
  key: string;
  category: string;
  title: string;
  description: string;
  href: string;
  image: string;
  imageAlt: string;
};

export default function HomePage() {
  const posts = mangoGuidePosts.map((post) => ({
    ...post,
    image: getMangoGuidePostImage(post, { width: 1300, height: 900 }),
  }));
  const allListings = getAllListings();
  const restaurants = getPopularListings("restaurants", 14).filter((listing) => !isDoyaListing(listing)).slice(0, 8);
  const heroRestaurant = restaurants[0];
  const heroImage = heroRestaurant ? getListingImage(heroRestaurant, { width: 1400, height: 940 }) : posts[0]?.image;
  const [, , , , , sixthPost] = posts;
  const doya =
    allListings.find((listing) => listing.id === "hcm-district-1-doya-jjambbong-bui-thi-xuan") ??
    allListings.find((listing) => listing.slug === "doya-jjambbong") ??
    getListingsForRoute("ho-chi-minh", "korean-restaurants", 1)[0];
  const danangCafe =
    pickListing(getListingsForRoute("da-nang", "cafes"), ["cafe", "coffee", "brunch"]) ??
    pickListing(allListings.filter((listing) => listing.citySlug === "da-nang"), ["cafe", "coffee", "brunch", "rooftop"]);
  const localFavorite = pickListing(allListings.filter((listing) => listing.citySlug === "ho-chi-minh"), [
    "hoang",
    "propaganda",
    "ben nghe",
    "secret",
    "banh",
  ]);
  const newSpot = pickListing(allListings, ["soko", "gypsy", "rooftop", "brunch", "bakery"]);
  const phuQuocSeafood = pickListing(allListings.filter((listing) => listing.citySlug === "phu-quoc"), [
    "seafood",
    "lobster",
    "hai san",
    "hải",
    "crab",
  ]);
  const featuredStories = [
    createFeaturedStory({
      key: "doya",
      listing: doya,
      fallbackPost: posts[0],
      category: "Mango Picks",
      title: "호치민 1군에서 꼭 가봐야 할 한식당",
      description: "매운 국물과 한국식 중화요리가 필요할 때 먼저 저장할 만한 호치민 1군 맛집입니다.",
    }),
    createFeaturedStory({
      key: "danang-cafe",
      listing: danangCafe,
      fallbackPost: posts[3],
      category: "Editor's Choice",
      title: "다낭 여행자가 저장한 카페",
      description: "미케비치와 시내 동선에서 쉬어가기 좋은 카페 후보를 사진 중심으로 골랐습니다.",
      href: "/da-nang/cafes",
    }),
    createFeaturedStory({
      key: "local-favorite",
      listing: localFavorite,
      fallbackPost: posts[2],
      category: "Korean Favorites",
      title: "베트남 거주자가 추천하는 로컬 맛집",
      description: "처음 가도 실패 확률이 낮은 로컬 음식점과 한국인이 이해하기 쉬운 메뉴를 중심으로 봅니다.",
    }),
    createFeaturedStory({
      key: "new-spot",
      listing: newSpot,
      fallbackPost: posts[1],
      category: "Local Favorites",
      title: "이번 주 뜨는 신규 맛집",
      description: "브런치, 루프탑, 감성 공간처럼 저장해두기 좋은 신규·인기 업소를 먼저 보여줍니다.",
    }),
    createFeaturedStory({
      key: "phu-quoc-seafood",
      listing: phuQuocSeafood,
      fallbackPost: posts[4],
      category: "Hidden Gems",
      title: "푸꾸옥에서 해산물 먹을 곳",
      description: "리조트 동선에서 부담 없이 비교할 수 있는 푸꾸옥 해산물 후보를 정리했습니다.",
      href: "/phu-quoc/seafood-restaurants",
    }),
  ];
  const [leadStory, secondStory, thirdStory, fourthStory, fifthStory] = featuredStories;

  return (
    <main className="bg-white text-[#171717]">
      <section className="mx-auto max-w-[1600px] px-4 pb-10 pt-5 md:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <Link href="/ho-chi-minh/restaurants" className="group block overflow-hidden bg-[#e7e8ec]">
            {heroImage ? (
              <img
                src={heroImage}
                alt="Mango Vietnam 대표 맛집 사진"
                className="aspect-[16/11] w-full object-cover transition duration-500 group-hover:scale-[1.025] lg:aspect-[16/10]"
                loading="eager"
                fetchPriority="high"
              />
            ) : null}
          </Link>

          <div className="max-w-2xl lg:pl-4">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[#ff9f00]">Mango Feature</p>
            <h1 className="mt-4 break-keep text-5xl font-black leading-[0.92] tracking-normal sm:text-6xl md:text-7xl xl:text-[6.9rem]">
              한국인이 진짜 가는{" "}
              <span className="block">베트남 맛집</span>
            </h1>
            <p className="mt-7 max-w-xl text-xl font-semibold leading-8 text-[#252525]">
              호치민, 다낭, 하노이의 맛집·카페·생활정보를 한 곳에서. 한국인 기준으로 실패 확률을 줄이는 베트남 가이드입니다.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/ho-chi-minh/restaurants" className="inline-flex h-14 items-center justify-center gap-3 bg-[#0068f0] px-7 text-sm font-black uppercase text-white">
                호치민 맛집 보기 <ArrowRight size={21} strokeWidth={3} />
              </Link>
              <Link href="/search?q=내 주변 맛집" className="inline-flex h-14 items-center justify-center gap-3 border-2 border-[#171717] bg-white px-7 text-sm font-black uppercase text-[#171717]">
                내 주변 검색 <Navigation size={19} strokeWidth={3} />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-black uppercase">
              {["Ho Chi Minh", "Da Nang", "Hanoi", "Nha Trang", "Phu Quoc"].map((city) => (
                <Link key={city} href={cityLink(city)} className="border border-[#d9d9d9] px-3 py-2 hover:border-[#0068f0] hover:text-[#0068f0]">
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] border-t border-[#d0d0d0] px-4 py-12 md:px-8 lg:px-12">
        <SectionKicker eyebrow="Featured Grid" title="이번 주 Mango Guide" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <FeaturedLargeCard story={leadStory} />
          <div className="grid gap-7 md:grid-cols-2">
            <FeaturedSmallCard story={secondStory} />
            <FeaturedSmallCard story={thirdStory} />
            <FeaturedSmallCard story={fourthStory} />
            <FeaturedSmallCard story={fifthStory} />
          </div>
        </div>
      </section>

      <ExploreDirectory />

      <section className="border-y border-[#d9d9d9] bg-[#e7e8ec] px-4 py-14 md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1500px]">
          <SectionKicker eyebrow="Guide List" title="한국인이 저장하는 베트남 가이드" />
          <div className="space-y-7">
            {posts.slice(0, 5).map((post, index) => (
              <GuideListItem key={post.href} post={post} priority={index < 2} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-14 md:px-8 lg:px-12">
        <div className="mb-10 flex items-end justify-between gap-6">
          <SectionKicker eyebrow="Restaurant Cards" title="Mango가 먼저 보는 맛집" />
          <Link href="/ho-chi-minh/restaurants" className="hidden items-center gap-2 text-lg font-black uppercase text-[#0068f0] md:inline-flex">
            View all <ArrowRight size={22} strokeWidth={3} />
          </Link>
        </div>
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {restaurants.slice(0, 8).map((listing, index) => (
            <RestaurantMagazineCard key={listing.id} listing={listing} priority={index < 2} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] border-t border-[#d0d0d0] px-4 py-12 md:px-8 lg:px-0">
        <Link href={sixthPost?.href ?? "/posts"} className="group grid gap-8 md:grid-cols-[1.08fr_0.92fr] md:items-center">
          <div className="overflow-hidden bg-[#e7e8ec]">
            {sixthPost ? (
              <img src={sixthPost.image} alt={`${sixthPost.title} 대표 이미지`} className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.025]" loading="lazy" />
            ) : null}
          </div>
          <div>
            <h2 className="max-w-xl text-5xl font-black leading-[0.95] tracking-normal transition group-hover:text-[#0068f0] md:text-6xl">
              베트남 생활정보도 맛집처럼 쉽게 고르기
            </h2>
            <p className="mt-6 max-w-xl text-xl font-medium leading-8">
              중고거래, 병원, 마사지, 비자 정보까지 검색 의도별로 연결해 한국인이 다시 찾는 디렉토리로 확장합니다.
            </p>
            <span className="mt-10 inline-flex h-16 items-center gap-5 bg-[#0068f0] px-8 text-base font-black uppercase text-white">
              Guides 보기 <ArrowRight size={25} strokeWidth={3} />
            </span>
          </div>
        </Link>
      </section>
    </main>
  );
}

function SectionKicker({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-9">
      <p className="text-3xl font-black uppercase leading-none text-[#747474]">{eyebrow}</p>
      <div className="mt-3 h-[6px] w-28 bg-[#0068f0]" />
      <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-normal md:text-5xl">{title}</h2>
    </div>
  );
}

function FeaturedLargeCard({ story }: { story?: FeaturedStory }) {
  if (!story) return null;
  return (
    <Link href={story.href} data-featured-story={story.key} className="group block">
      <div className="overflow-hidden bg-[#e7e8ec]">
        <img src={story.image} alt={story.imageAlt} className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.025]" loading="lazy" />
      </div>
      <p className="mt-6 text-sm font-black uppercase tracking-[0.12em] text-[#ff9f00]">{story.category}</p>
      <h3 className="mt-3 max-w-4xl text-5xl font-black leading-[0.92] tracking-normal transition group-hover:text-[#0068f0] md:text-6xl">
        {story.title}
      </h3>
      <p className="mt-5 max-w-2xl text-xl font-medium leading-8">{story.description}</p>
    </Link>
  );
}

function FeaturedSmallCard({ story }: { story?: FeaturedStory }) {
  if (!story) return null;
  return (
    <Link href={story.href} data-featured-story={story.key} className="group block">
      <div className="overflow-hidden bg-[#e7e8ec]">
        <img src={story.image} alt={story.imageAlt} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.025]" loading="lazy" />
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-[#ff9f00]">{story.category}</p>
      <h3 className="mt-2 break-keep text-3xl font-black leading-[0.95] tracking-normal transition group-hover:text-[#0068f0]">{story.title}</h3>
      <p className="mt-3 line-clamp-2 text-base font-medium leading-7 text-[#202020]">{story.description}</p>
    </Link>
  );
}

function ExploreDirectory() {
  const columns = [
    {
      heading: "Neighborhoods",
      links: ["1군", "2군", "7군", "빈탄", "푸미흥", "타오디엔"].map((label) => ({ label, href: `/search?q=호치민 ${label} 맛집` })),
    },
    {
      heading: "Perfect For",
      links: [
        { label: "혼밥", href: "/ho-chi-minh/solo-dining" },
        { label: "데이트", href: "/ho-chi-minh/date-restaurants" },
        { label: "회식", href: "/search?q=호치민 회식 맛집" },
        { label: "가족식사", href: "/search?q=호치민 가족식사 맛집" },
        { label: "해장", href: "/ho-chi-minh-hangover-food" },
        { label: "야식", href: "/search?q=호치민 야식" },
        { label: "비 오는 날", href: "/ho-chi-minh-jjamppong" },
      ],
    },
    {
      heading: "Cuisines",
      links: ["Korean", "Vietnamese", "Japanese", "Chinese", "Western", "Cafe", "BBQ", "Noodles"].map((label) => ({
        label,
        href: `/search?q=${encodeURIComponent(`베트남 ${label} 맛집`)}`,
      })),
    },
    {
      heading: "Guides",
      links: [
        { label: "호치민 맛집", href: "/ho-chi-minh/restaurants" },
        { label: "다낭 맛집", href: "/da-nang/restaurants" },
        { label: "하노이 맛집", href: "/hanoi/restaurants" },
        { label: "베트남 중고거래", href: "/vietnam-used-market" },
        { label: "베트남 생활정보", href: "/topics" },
      ],
    },
  ];

  return (
    <section className="border-y border-[#d9d9d9] bg-white px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-[1500px]">
        <SectionKicker eyebrow="Browse Vietnam" title="지역·목적·음식종류별로 찾기" />
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <div key={column.heading} className="border-t border-[#d0d0d0] pt-5">
              <p className="inline-block border-b-[5px] border-[#0068f0] pb-2 text-base font-black uppercase">{column.heading}</p>
              <div className="mt-7 grid gap-4">
                {column.links.map((link) => (
                  <Link key={`${column.heading}-${link.label}`} href={link.href} className="text-2xl font-black leading-none hover:text-[#0068f0]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GuideListItem({ post, priority = false }: { post: MangoGuidePost & { image: string }; priority?: boolean }) {
  return (
    <Link href={post.href} className="group block">
      <article className="grid bg-white p-3 transition hover:bg-[#fbfbfb] md:grid-cols-[380px_1fr] md:p-0">
        <div className="relative overflow-hidden bg-[#ddd]">
          <img
            src={post.image}
            alt={`${post.title} 대표 이미지`}
            className="aspect-[16/10] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] md:aspect-[4/3]"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />
          <div className="absolute left-0 top-0 h-[6px] w-24 bg-[#0068f0]" />
        </div>
        <div className="flex min-h-[270px] flex-col justify-center px-3 py-7 md:px-8 lg:px-10">
          <p className="text-sm font-black uppercase tracking-normal text-[#0068f0]">{post.category}</p>
          <h3 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal transition group-hover:text-[#0068f0] md:text-5xl">
            {post.title}
          </h3>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-[#111]">{post.description}</p>
          <div className="mt-7 flex items-center gap-3 text-sm font-black uppercase">
            <span>Mango Vietnam Editors</span>
            <span className="h-5 w-px bg-[#d0d0d0]" />
            <span>2026.06.12</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function RestaurantMagazineCard({ listing, priority = false }: { listing: Listing; priority?: boolean }) {
  const image = getListingImage(listing, { width: 900, height: 620 });
  const score = getDisplayScore(listing);
  const tags = [listing.category, listing.area || listing.city, ...(listing.tags ?? [])].filter(Boolean).slice(0, 3);

  return (
    <Link href={`/listing/${listing.slug}`} className="group block">
      <article className="bg-white">
        <div className="relative overflow-hidden bg-[#e7e8ec]">
          <img
            src={image}
            alt={`${listing.name} 대표 사진`}
            className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.035]"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />
          <div className="absolute right-3 top-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe14a] text-2xl font-black text-black shadow-[0_4px_14px_rgba(0,0,0,0.14)]">
            {score}
          </div>
          <Bookmark className="absolute bottom-4 right-4 text-white drop-shadow" size={25} strokeWidth={2.4} aria-hidden="true" />
        </div>
        <div className="pt-5">
          <h3 className="text-3xl font-black leading-[0.96] tracking-normal transition group-hover:text-[#0068f0] md:text-4xl">{listing.name}</h3>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-black uppercase">
            {tags.map((tag, index) => (
              <span key={`${listing.id}-${tag}`} className="inline-flex items-center gap-3">
                {index > 0 ? <span className="h-5 w-px bg-[#cfcfcf]" /> : null}
                {tag}
              </span>
            ))}
          </p>
          <p className="mt-4 line-clamp-2 text-base font-medium leading-7 text-[#202020]">{listing.summary}</p>
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase text-[#0068f0]">
            상세 보기 <ArrowRight size={18} strokeWidth={3} />
          </p>
        </div>
      </article>
    </Link>
  );
}

function createFeaturedStory({
  key,
  listing,
  fallbackPost,
  category,
  title,
  description,
  href,
}: {
  key: string;
  listing?: Listing;
  fallbackPost?: ImagePost;
  category: string;
  title: string;
  description: string;
  href?: string;
}): FeaturedStory {
  return {
    key,
    category,
    title,
    description,
    href: href ?? (listing ? `/listing/${listing.slug}` : fallbackPost?.href ?? "/posts"),
    image: listing ? getListingImage(listing, { width: 1300, height: 900 }) : fallbackPost?.image ?? "/mango-vietnam-og.png",
    imageAlt: listing ? `${listing.name} 대표 사진` : `${title} 대표 이미지`,
  };
}

function pickListing(listings: Listing[], keywords: string[] = []) {
  const photoReadyListings = listings.filter((listing) => listing.photoTotal > 0 && !isDoyaListing(listing));
  if (photoReadyListings.length === 0) return undefined;
  if (keywords.length === 0) return photoReadyListings[0];

  return photoReadyListings.find((listing) => matchesListingKeyword(listing, keywords)) ?? photoReadyListings[0];
}

function matchesListingKeyword(listing: Listing, keywords: string[]) {
  const haystack = normalizeFeaturedText(`${listing.name} ${listing.slug} ${listing.searchText}`);
  return keywords.some((keyword) => haystack.includes(normalizeFeaturedText(keyword)));
}

function isDoyaListing(listing: Listing) {
  const text = normalizeFeaturedText(`${listing.id} ${listing.slug} ${listing.name}`);
  return text.includes("doya") || text.includes("jjambbong") || text.includes("도야");
}

function normalizeFeaturedText(value: string) {
  return value.normalize("NFC").toLowerCase();
}

function getListingImage(listing: Listing, size: { width: number; height: number }) {
  return getPlacePhotoSrc(listing, 0, size) ?? "/mango-vietnam-og.png";
}

function getDisplayScore(listing: Listing) {
  const rating = listing.rating ? Math.round(listing.rating * 20) / 10 : Math.round(getKoreanFitScore(listing) / 10);
  return rating.toFixed(1);
}

function cityLink(city: string) {
  const slug = city.toLowerCase().replace(/\s+/g, "-");
  if (slug === "ho-chi-minh") return "/ho-chi-minh";
  if (slug === "da-nang") return "/da-nang";
  if (slug === "nha-trang") return "/nha-trang";
  if (slug === "phu-quoc") return "/phu-quoc";
  return `/${slug}`;
}
