import { getEditorialSeoListings, getEditorialSeoPageBySlug } from "@/lib/editorial-seo";
import { getPlacePhotoSrc } from "@/lib/place-photos";
import { getListingsForRoute, getPopularListings, type Listing } from "@/lib/places";

export type MangoGuidePost = {
  category: string;
  title: string;
  description: string;
  href: string;
  date: string;
  author: string;
  imageSource?: {
    seoSlug?: string;
    citySlug?: string;
    categorySlug?: string;
  };
};

export const mangoGuidePosts: MangoGuidePost[] = [
  {
    category: "Mango Picks",
    title: "호치민 한국인 맛집 TOP 20",
    description: "실제 한국인 거주자들이 자주 방문하는 호치민 대표 맛집만 모았습니다.",
    href: "/ho-chi-minh-best-restaurants",
    date: "2026-06-12",
    author: "Mango Vietnam Editors",
    imageSource: { seoSlug: "ho-chi-minh-best-restaurants", citySlug: "ho-chi-minh", categorySlug: "restaurants" },
  },
  {
    category: "Editor's Choice",
    title: "호치민 데이트 맛집 추천",
    description: "분위기, 맛, 서비스까지 모두 만족할 수 있는 데이트 맛집을 소개합니다.",
    href: "/ho-chi-minh/date-restaurants",
    date: "2026-06-12",
    author: "Mango Vietnam Editors",
    imageSource: { citySlug: "ho-chi-minh", categorySlug: "restaurants" },
  },
  {
    category: "Korean Favorites",
    title: "호치민 혼밥 맛집 BEST 15",
    description: "혼자 들어가기 편하고 메뉴 선택이 쉬운 식당을 한국인 기준으로 정리했습니다.",
    href: "/ho-chi-minh/solo-dining",
    date: "2026-06-12",
    author: "Mango Vietnam Editors",
    imageSource: { seoSlug: "ho-chi-minh-solo-dining", citySlug: "ho-chi-minh", categorySlug: "restaurants" },
  },
  {
    category: "Local Favorites",
    title: "다낭 오션뷰 카페 추천",
    description: "여행 중 한 번쯤 들르기 좋은 다낭의 감성 카페를 정리했습니다.",
    href: "/da-nang/cafes",
    date: "2026-06-12",
    author: "Mango Vietnam Editors",
    imageSource: { citySlug: "da-nang", categorySlug: "cafes" },
  },
  {
    category: "Hidden Gems",
    title: "푸꾸옥 해산물 맛집 BEST 10",
    description: "관광객보다 현지 거주자들이 더 자주 찾는 해산물 맛집입니다.",
    href: "/phu-quoc/seafood-restaurants",
    date: "2026-06-12",
    author: "Mango Vietnam Editors",
    imageSource: { citySlug: "phu-quoc", categorySlug: "restaurants" },
  },
  {
    category: "Mango Picks",
    title: "호치민 짬뽕 맛집 가이드",
    description: "해장, 매운 국물, 한국식 중화요리가 필요할 때 먼저 볼 만한 곳을 정리했습니다.",
    href: "/ho-chi-minh-jjamppong",
    date: "2026-06-12",
    author: "Mango Vietnam Editors",
    imageSource: { seoSlug: "ho-chi-minh-jjamppong", citySlug: "ho-chi-minh", categorySlug: "korean-restaurants" },
  },
];

export function getMangoGuidePostImage(post: MangoGuidePost, size: { width?: number; height?: number } = {}) {
  const listing = resolvePostListing(post);
  return listing ? getPlacePhotoSrc(listing, 0, { width: size.width ?? 1100, height: size.height ?? 780 }) ?? "/mango-vietnam-og.png" : "/mango-vietnam-og.png";
}

function resolvePostListing(post: MangoGuidePost): Listing | undefined {
  const seoPage = post.imageSource?.seoSlug ? getEditorialSeoPageBySlug(post.imageSource.seoSlug) : undefined;
  const seoListing = seoPage ? getEditorialSeoListings(seoPage, 1)[0] : undefined;
  if (seoListing) return seoListing;

  const routedListing =
    post.imageSource?.citySlug && post.imageSource.categorySlug
      ? getListingsForRoute(post.imageSource.citySlug, post.imageSource.categorySlug, 1)[0]
      : undefined;
  if (routedListing) return routedListing;

  return getPopularListings("restaurants", 1)[0];
}
