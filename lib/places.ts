import fs from "node:fs";
import path from "node:path";

import { allCities, categories, getCategoryBySlug, getCityBySlug } from "@/lib/site";

export type PlaceReview = {
  nickname?: string;
  rating?: number;
  visitStatus?: string;
  tags?: string[];
  content?: string;
  source?: string;
};

type RawPlace = {
  id: string;
  city: string;
  name: string;
  category: string;
  area?: string;
  address?: string;
  oneLine?: string;
  koreanTip?: string;
  tags?: string[];
  hiddenGem?: boolean;
  beginnerSafe?: boolean;
  rainyDayOk?: boolean;
  bestTime?: string[];
  priceLevel?: string;
  googlePlaceId?: string;
  googleMapsUri?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
  };
  rating?: number;
  userRatingCount?: number;
  reviewCount?: number;
  koreanReviewSignal?: {
    score?: number;
    reviewCount?: number;
    positiveCount?: number;
    cautionCount?: number;
    summary?: string;
    keywords?: string[];
  };
  websiteUri?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  businessStatus?: string;
  openNow?: boolean;
  lastVerifiedAt?: string;
  latestInfoSource?: string;
  openingHoursText?: string[];
  photoName?: string;
  photoNames?: string[];
  reviews?: PlaceReview[];
};

export type Listing = RawPlace & {
  slug: string;
  citySlug: string;
  primaryCategorySlug: string;
  latitude?: number;
  longitude?: number;
  reviewTotal: number;
  photoTotal: number;
  summary: string;
  searchText: string;
};

let listingCache: Listing[] | undefined;

const HCM_FEATURED_RESTAURANT_ID = "hcm-district-1-doya-jjambbong-bui-thi-xuan";
const HCM_RESTAURANT_EXCLUDED_IDS = new Set(["bros-korea-1980s-chijj-ytx4ivdter-bo0wjunwde"]);

export function getAllListings() {
  if (listingCache) return listingCache;

  const places = readRawPlaces();
  const usedSlugs = new Map<string, number>();

  listingCache = places
    .filter((place) => place.id && place.name && place.city)
    .map((place) => {
      const baseSlug = getBaseSlug(place);
      const seen = usedSlugs.get(baseSlug) ?? 0;
      usedSlugs.set(baseSlug, seen + 1);
      const slug = seen === 0 ? baseSlug : `${baseSlug}-${seen + 1}`;
      const coordinates = normalizeCoordinates(place);
      const reviews = place.reviews ?? [];
      const reviewTotal = place.koreanReviewSignal?.reviewCount ?? reviews.length ?? place.reviewCount ?? place.userRatingCount ?? 0;
      const photoTotal = place.photoNames?.length ?? (place.photoName ? 1 : 0);
      const citySlug = cityToSlug(place.city);
      const summary = place.oneLine || `${place.city}에서 한국인이 참고하기 좋은 ${place.category}입니다.`;

      return {
        ...place,
        slug,
        citySlug,
        primaryCategorySlug: primaryCategorySlug(place),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        reviewTotal,
        photoTotal,
        summary,
        searchText: buildSearchText(place),
      };
    })
    .sort(compareListings);

  return listingCache;
}

export function getListingBySlug(slug: string) {
  return getAllListings().find((listing) => listing.slug === slug);
}

export function getListingsForRoute(citySlug: string, categorySlug: string, limit?: number) {
  const city = getCityBySlug(citySlug);
  const category = getCategoryBySlug(categorySlug);
  if (!city || !category) return [];
  if (category.supportedCitySlugs && !category.supportedCitySlugs.includes(city.slug)) return [];

  const listings = applyRouteListingOverrides(
    getAllListings().filter((listing) => listing.citySlug === city.slug && matchesCategory(listing, category.slug)),
    city.slug,
    category.slug,
  );
  return typeof limit === "number" ? listings.slice(0, limit) : listings;
}

export function getPopularListings(categorySlug = "restaurants", limit = 8) {
  return getAllListings()
    .filter((listing) => matchesCategory(listing, categorySlug))
    .filter((listing) => !isExcludedListingForPublicRestaurantSurface(listing, categorySlug))
    .slice(0, limit);
}

export function getLatestReviewSnippets(limit = 6) {
  return getAllListings()
    .flatMap((listing) =>
      (listing.reviews ?? []).slice(0, 2).map((review, index) => ({
        id: `${listing.slug}-${index}`,
        listing,
        nickname: review.nickname || "망고 유저",
        rating: review.rating ?? listing.rating ?? 4.5,
        content: review.content || listing.summary,
        tags: review.tags ?? [],
        visitDate: "최근 방문",
        revisitIntent: /재방문|다음에도|괜찮|추천/.test(review.content ?? "") ? "재방문 의사 있음" : "후기 확인",
      })),
    )
    .slice(0, limit);
}

export function getRouteParams() {
  return allCities.flatMap((city) =>
    categories
      .filter((category) => !category.supportedCitySlugs || category.supportedCitySlugs.includes(city.slug))
      .map((category) => ({ city: city.slug, category: category.slug })),
  );
}

export function getListingParams() {
  return getAllListings().map((listing) => ({ slug: listing.slug }));
}

export function getCityStats(citySlug: string) {
  const listings = getAllListings().filter((listing) => listing.citySlug === citySlug);
  return {
    total: listings.length,
    restaurants: listings.filter((listing) => matchesCategory(listing, "restaurants")).length,
    cafes: listings.filter((listing) => matchesCategory(listing, "cafes")).length,
    massage: listings.filter((listing) => matchesCategory(listing, "massage")).length,
  };
}

export function cityToSlug(cityName: string) {
  const normalizedCityName = normalizeText(cityName);
  const configured = allCities.find((city) => normalizeText(city.name) === normalizedCityName);
  if (configured) return configured.slug;
  return slugify(cityName);
}

export function matchesCategory(listing: Listing, categorySlug: string) {
  const dataCategory = normalizeText(listing.category);
  const searchText = normalizeText(listing.searchText);
  const isRestaurant = dataCategory === "맛집";

  if (categorySlug === "restaurants") return isRestaurant;
  if (categorySlug === "best-restaurants") return isRestaurant;
  if (categorySlug === "korean-restaurants") return isRestaurant && isKoreanRestaurant(listing);
  if (categorySlug === "district-1-restaurants") return isRestaurant && matchesAny(searchText, ["1군", "district 1", "quan 1", "quận 1", "벤탄", "동코이", "응우옌후에", "부이비엔", "레탄톤"]);
  if (categorySlug === "district-2-restaurants") return isRestaurant && matchesAny(searchText, ["2군", "district 2", "quan 2", "quận 2", "타오디엔", "thao dien", "an phu", "안푸"]);
  if (categorySlug === "phu-my-hung-restaurants") return isRestaurant && matchesAny(searchText, ["푸미흥", "phu my hung", "7군", "district 7", "quan 7", "quận 7"]);
  if (categorySlug === "seafood-restaurants") return isRestaurant && matchesAny(searchText, ["해산물", "seafood", "hai san", "hải sản", "랍스터", "새우", "조개", "생선"]);
  if (categorySlug === "cafes") return dataCategory === "카페";
  if (categorySlug === "massage") return dataCategory === "마사지";
  if (categorySlug === "spas") return dataCategory === "마사지" && /스파|spa/i.test(searchText);
  if (categorySlug === "korean-massage") return dataCategory === "마사지";
  if (categorySlug === "bars") return dataCategory === "바/루프탑";
  if (categorySlug === "karaoke") return dataCategory === "가라오케";
  if (categorySlug === "korean-karaoke") return dataCategory === "가라오케" && /가라오케|karaoke|노래방|club|bar|lounge/i.test(searchText);
  if (categorySlug === "nightlife") return dataCategory === "바/루프탑" || dataCategory === "가라오케";
  return false;
}

export function categoryLabelForListing(listing: Listing) {
  return getCategoryBySlug(listing.primaryCategorySlug)?.label ?? listing.category;
}

export function isRestaurantCategorySlug(categorySlug: string) {
  return [
    "restaurants",
    "best-restaurants",
    "korean-restaurants",
    "district-1-restaurants",
    "district-2-restaurants",
    "phu-my-hung-restaurants",
    "seafood-restaurants",
  ].includes(categorySlug);
}

export function getKoreanFitScore(listing: Listing) {
  const ratingScore = Math.round(((listing.rating ?? 0) / 5) * 24);
  const koreanSignal = Math.round((listing.koreanReviewSignal?.score ?? 0) * 0.36);
  const reviewScore = Math.min(16, Math.round(Math.log10((listing.reviewTotal || listing.userRatingCount || 0) + 1) * 8));
  const photoScore = Math.min(12, listing.photoTotal * 2);
  const infoScore = [listing.priceLevel, listing.address, listing.openingHoursText?.length, listing.googleMapsUri].filter(Boolean).length * 3;
  return Math.min(98, Math.max(55, ratingScore + koreanSignal + reviewScore + photoScore + infoScore));
}

export function getRestaurantDecisionTags(listing: Listing) {
  const text = normalizeText(listing.searchText);
  const tags = new Set<string>();

  if (isKoreanRestaurant(listing)) tags.add("한식 필요할 때");
  if (matchesAny(text, ["해산물", "seafood", "hải sản", "hai san"])) tags.add("해산물");
  if (matchesAny(text, ["가족", "아이", "family", "넓", "단체"])) tags.add("가족식사");
  if (matchesAny(text, ["혼밥", "쌀국수", "반미", "분식", "국밥"])) tags.add("혼밥");
  if (matchesAny(text, ["데이트", "루프탑", "와인", "분위기", "야경"])) tags.add("데이트");
  if (matchesAny(text, ["로컬", "현지", "쌀국수", "반미", "분짜", "반쎄오"])) tags.add("로컬 입문");
  if (listing.beginnerSafe) tags.add("처음 방문 추천");
  if (listing.rainyDayOk) tags.add("비오는 날");
  if (listing.openNow) tags.add("지금 영업 중");
  if (listing.priceLevel) tags.add(listing.priceLevel);

  for (const tag of listing.tags ?? []) {
    if (!/지도추천|지역대표|망고단추천|고평점/.test(tag)) tags.add(tag);
  }

  return Array.from(tags).slice(0, 6);
}

export function getListingDecisionReason(listing: Listing) {
  const areaText = listing.area ? `${listing.area} 근처에서 ` : "";
  if (listing.summary) return listing.summary;
  if (isKoreanRestaurant(listing)) return `${areaText}한식이나 익숙한 메뉴가 필요할 때 비교하기 좋은 곳입니다.`;
  if (matchesAny(normalizeText(listing.searchText), ["해산물", "seafood", "hải sản", "hai san"])) {
    return `${areaText}여럿이 나눠 먹기 좋은 해산물 후보입니다.`;
  }
  return `${areaText}사진, 후기, 위치를 함께 보고 방문 후보로 비교할 수 있습니다.`;
}

export function getRelatedListings(listing: Listing, limit = 6) {
  return getAllListings()
    .filter((candidate) => candidate.slug !== listing.slug && candidate.citySlug === listing.citySlug)
    .filter((candidate) => candidate.primaryCategorySlug === listing.primaryCategorySlug || ["restaurants", "cafes", "massage"].includes(candidate.primaryCategorySlug))
    .filter((candidate) => !isExcludedListingForPublicRestaurantSurface(candidate, candidate.primaryCategorySlug))
    .slice(0, limit);
}

function readRawPlaces(): RawPlace[] {
  const placesFile = path.join(process.cwd(), "src", "data", "places.ts");
  const source = fs.readFileSync(placesFile, "utf8");
  const match = source.match(/const curatedPlacesJson = "([\s\S]*?)";/);
  if (!match) return [];
  const json = JSON.parse(`"${match[1]}"`) as string;
  return JSON.parse(json) as RawPlace[];
}

function primaryCategorySlug(place: RawPlace) {
  const placeCategory = normalizeText(place.category);
  const homepageCategory = categories.find((candidate) => candidate.dataCategory && normalizeText(candidate.dataCategory) === placeCategory && candidate.homepage);
  if (homepageCategory) return homepageCategory.slug;
  const category = categories.find((candidate) => candidate.dataCategory && normalizeText(candidate.dataCategory) === placeCategory);
  return category?.slug ?? "restaurants";
}

function buildSearchText(place: RawPlace) {
  return [
    place.name,
    place.city,
    place.category,
    place.area,
    place.address,
    place.priceLevel,
    ...(place.tags ?? []),
    ...(place.bestTime ?? []),
    ...(place.koreanReviewSignal?.keywords ?? []),
    place.koreanReviewSignal?.summary,
    ...(place.reviews ?? []).flatMap((review) => review.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFC")
    .toLowerCase();
}

function normalizeText(value: string) {
  return value.normalize("NFC");
}

function normalizeCoordinates(place: RawPlace) {
  return {
    latitude: place.coordinates?.latitude ?? place.coordinates?.lat,
    longitude: place.coordinates?.longitude ?? place.coordinates?.lng,
  };
}

function compareListings(left: Listing, right: Listing) {
  return scoreListing(right) - scoreListing(left);
}

function applyRouteListingOverrides(listings: Listing[], citySlug: string, categorySlug: string) {
  if (citySlug !== "ho-chi-minh" || !isRestaurantCategorySlug(categorySlug)) return listings;

  const filtered = listings.filter((listing) => !HCM_RESTAURANT_EXCLUDED_IDS.has(listing.id));
  const featured = filtered.find((listing) => listing.id === HCM_FEATURED_RESTAURANT_ID);
  if (!featured) return filtered;

  return [featured, ...filtered.filter((listing) => listing.id !== featured.id)];
}

function isExcludedListingForPublicRestaurantSurface(listing: Listing, categorySlug: string) {
  return listing.citySlug === "ho-chi-minh" && isRestaurantCategorySlug(categorySlug) && HCM_RESTAURANT_EXCLUDED_IDS.has(listing.id);
}

function scoreListing(listing: Listing) {
  const ratingScore = (listing.rating ?? 0) * 24;
  const reviewScore = Math.log10((listing.userRatingCount ?? listing.reviewCount ?? 0) + 1) * 16;
  const koreanSignal = listing.koreanReviewSignal?.score ?? 0;
  const photoScore = Math.min(listing.photoTotal, 8) * 2;
  return ratingScore + reviewScore + koreanSignal + photoScore;
}

function isKoreanRestaurant(listing: Listing) {
  return /한식|한국|korea|korean|고기|삼겹|갈비|김치|국밥|분식|짜장|짬뽕|치킨|보쌈|족발|곱창|bbq/i.test(getTrustedListingText(listing));
}

function getTrustedListingText(listing: Listing) {
  return normalizeText([listing.name, listing.city, listing.area, listing.address, listing.category, ...(listing.tags ?? [])].filter(Boolean).join(" ")).toLowerCase();
}

function matchesAny(text: string, keywords: string[]) {
  const normalized = normalizeText(text).toLowerCase();
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword).toLowerCase()));
}

function getBaseSlug(place: RawPlace) {
  if (/도야/.test(place.name) && /짬뽕/.test(place.name)) return "doya-jjambbong";
  const readable = slugify(place.name);
  if (readable.length >= 3) return readable;
  return slugify(`${place.city}-${place.category}-${place.googlePlaceId ?? place.id}`);
}

export function slugify(input: string) {
  const romanized = romanizeHangul(input.normalize("NFKC"));
  return romanized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function romanizeHangul(input: string) {
  return Array.from(input)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 0xac00 || code > 0xd7a3) return char;
      const index = code - 0xac00;
      const cho = Math.floor(index / 588);
      const jung = Math.floor((index % 588) / 28);
      const jong = index % 28;
      return `${CHO[cho]}${JUNG[jung]}${JONG[jong]}`;
    })
    .join("");
}

const CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const JUNG = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];
const JONG = [
  "",
  "g",
  "kk",
  "gs",
  "n",
  "nj",
  "nh",
  "d",
  "l",
  "lg",
  "lm",
  "lb",
  "ls",
  "lt",
  "lp",
  "lh",
  "m",
  "b",
  "bs",
  "s",
  "ss",
  "ng",
  "j",
  "ch",
  "k",
  "t",
  "p",
  "h",
];
