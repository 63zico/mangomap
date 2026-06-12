import type { CuratedPlace } from "../types";
import { getMangoRecommendationCount, getMangoReviewCount } from "./placeCommunity";

export type MangoRankSurface = "home" | "explore" | "map";

export type MangoRankOptions = {
  categoryId?: string;
  currentDate?: Date;
  surface?: MangoRankSurface;
};

export type MangoRankBreakdown = {
  total: number;
  koreanFitScore: number;
  qualityScore: number;
  confidenceScore: number;
  popularityScore: number;
  trendScore: number;
  categoryFitScore: number;
  safetyScore: number;
  riskPenalty: number;
};

const surfaceWeights: Record<MangoRankSurface, Omit<MangoRankBreakdown, "total">> = {
  home: {
    koreanFitScore: 1.15,
    qualityScore: 0.85,
    confidenceScore: 0.9,
    popularityScore: 0.9,
    trendScore: 1.1,
    categoryFitScore: 0.8,
    safetyScore: 0.75,
    riskPenalty: 1.15
  },
  explore: {
    koreanFitScore: 1,
    qualityScore: 1,
    confidenceScore: 0.95,
    popularityScore: 0.85,
    trendScore: 0.8,
    categoryFitScore: 0.9,
    safetyScore: 0.8,
    riskPenalty: 1
  },
  map: {
    koreanFitScore: 0.95,
    qualityScore: 0.75,
    confidenceScore: 0.95,
    popularityScore: 0.65,
    trendScore: 0.7,
    categoryFitScore: 1.25,
    safetyScore: 1,
    riskPenalty: 1.25
  }
};

export function getMangoRankBreakdown(place: CuratedPlace, options: MangoRankOptions = {}): MangoRankBreakdown {
  const currentDate = options.currentDate ?? new Date();
  const koreanFitScore = getKoreanFitScore(place);
  const qualityScore = getQualityScore(place);
  const confidenceScore = getConfidenceScore(place, currentDate);
  const popularityScore = getPopularityScore(place);
  const trendScore = getTrendScore(place, currentDate);
  const categoryFitScore = getCategoryFitScore(place, options.categoryId);
  const safetyScore = getSafetyScore(place);
  const riskPenalty = getRiskPenalty(place, options.surface ?? "explore", currentDate);
  const weights = surfaceWeights[options.surface ?? "explore"];
  const total =
    koreanFitScore * weights.koreanFitScore +
    qualityScore * weights.qualityScore +
    confidenceScore * weights.confidenceScore +
    popularityScore * weights.popularityScore +
    trendScore * weights.trendScore +
    categoryFitScore * weights.categoryFitScore +
    safetyScore * weights.safetyScore -
    riskPenalty * weights.riskPenalty;

  return {
    total: Math.round(total),
    koreanFitScore,
    qualityScore,
    confidenceScore,
    popularityScore,
    trendScore,
    categoryFitScore,
    safetyScore,
    riskPenalty
  };
}

export function getMangoRankScore(place: CuratedPlace, options: MangoRankOptions = {}) {
  return getMangoRankBreakdown(place, options).total;
}

export function compareMangoRankedPlaces(left: CuratedPlace, right: CuratedPlace, options: MangoRankOptions = {}) {
  const leftRank = getMangoRankBreakdown(left, options);
  const rightRank = getMangoRankBreakdown(right, options);
  const totalDiff = rightRank.total - leftRank.total;
  if (totalDiff !== 0) return totalDiff;
  const confidenceDiff = rightRank.confidenceScore - leftRank.confidenceScore;
  if (confidenceDiff !== 0) return confidenceDiff;
  const reviewDiff = getExternalReviewCount(right) - getExternalReviewCount(left);
  if (reviewDiff !== 0) return reviewDiff;
  return String(left.name).localeCompare(String(right.name), "ko");
}

export function getMangoRankBadges(place: CuratedPlace, options: MangoRankOptions & { limit?: number } = {}) {
  const rank = getMangoRankBreakdown(place, options);
  const badges: string[] = [];
  if (rank.koreanFitScore >= 118 && rank.riskPenalty < 80) badges.push("한국인 인기");
  if (rank.trendScore >= 38 && rank.confidenceScore >= 50 && rank.riskPenalty < 60) badges.push("최근 급상승");
  if (rank.confidenceScore >= 78 && rank.riskPenalty < 50) badges.push("검증 높음");
  if (place.beginnerSafe && rank.safetyScore >= 28) badges.push("초행자 추천");
  if (badges.length === 0 && rank.koreanFitScore >= 92) badges.push("한국인 추천");
  return badges.slice(0, options.limit ?? 3);
}

export function isMangoRecentlyRisingPlace(place: CuratedPlace, options: MangoRankOptions = {}) {
  return getMangoRankBadges(place, options).includes("최근 급상승");
}

export function getMangoRankShortLabel(place: CuratedPlace, options: MangoRankOptions = {}) {
  const badge = getMangoRankBadges(place, { ...options, limit: 1 })[0];
  return badge ?? "망고 추천";
}

function getKoreanFitScore(place: CuratedPlace) {
  const signal = place.koreanReviewSignal;
  const signalScore = signal?.score ?? (hasAny(place, ["한국", "korean", "한식", "교민", "망고단추천"]) ? 72 : 48);
  const reviewCount = signal?.reviewCount ?? 0;
  const positiveCount = signal?.positiveCount ?? 0;
  const cautionCount = signal?.cautionCount ?? 0;
  const keywordBonus = Math.min((signal?.keywords?.length ?? 0) * 3, 15);
  const tagBonus = hasAny(place, ["망고단추천", "한국인", "교민", "초행자추천"]) ? 16 : 0;
  return clamp(signalScore * 1.05 + Math.min(reviewCount * 8, 28) + positiveCount * 3 + keywordBonus + tagBonus - cautionCount * 12, 0, 155);
}

function getQualityScore(place: CuratedPlace) {
  const rating = place.rating ?? 4.3;
  const reviewCount = getExternalReviewCount(place);
  const priorRating = 4.35;
  const priorWeight = 45;
  const bayesianRating = (rating * reviewCount + priorRating * priorWeight) / Math.max(1, reviewCount + priorWeight);
  const ratingScore = clamp((bayesianRating - 3.6) * 82, 0, 120);
  const volumeConfidence = clamp(Math.log10(reviewCount + 1) * 18, 0, 46);
  return clamp(ratingScore + volumeConfidence, 0, 150);
}

function getConfidenceScore(place: CuratedPlace, currentDate: Date) {
  const externalReviews = getExternalReviewCount(place);
  const mangoReviews = getMangoReviewCount(place);
  const verifiedDays = getDaysSince(place.lastVerifiedAt, currentDate);
  const verificationScore =
    verifiedDays === undefined ? 4 : verifiedDays <= 14 ? 24 : verifiedDays <= 45 ? 18 : verifiedDays <= 90 ? 11 : 4;
  const sourceScore = place.latestInfoSource === "Google Places API" ? 12 : place.latestInfoSource ? 7 : 0;
  const dataCompleteness =
    (hasCoordinates(place) ? 10 : 0) +
    (place.photoName || place.photoNames?.length ? 8 : 0) +
    (place.openingHoursText?.length ? 7 : 0) +
    (place.address ? 5 : 0);
  return clamp(Math.log10(externalReviews + 1) * 20 + Math.min(mangoReviews * 9, 34) + verificationScore + sourceScore + dataCompleteness, 0, 120);
}

function getPopularityScore(place: CuratedPlace) {
  const recommendationScore = Math.min(getMangoRecommendationCount(place) * 1.25, 96);
  const externalVolume = clamp(Math.log10(getExternalReviewCount(place) + 1) * 14, 0, 44);
  const tagScore =
    (hasAny(place, ["망고단추천"]) ? 16 : 0) +
    (hasAny(place, ["지도추천"]) ? 12 : 0) +
    (hasAny(place, ["지역대표"]) ? 10 : 0) +
    (hasAny(place, ["리뷰500+", "고평점"]) ? 6 : 0);
  return clamp(recommendationScore + externalVolume + tagScore, 0, 150);
}

function getTrendScore(place: CuratedPlace, currentDate: Date) {
  const days = getDaysSince(place.lastVerifiedAt, currentDate);
  const recency = days === undefined ? 0 : days <= 7 ? 24 : days <= 21 ? 18 : days <= 45 ? 10 : 0;
  const koreanMomentum = (place.koreanReviewSignal?.score ?? 0) >= 88 ? 12 : (place.koreanReviewSignal?.score ?? 0) >= 78 ? 7 : 0;
  const localReviewMomentum = Math.min(getMangoReviewCount(place) * 3, 12);
  const qualityMomentum = (place.rating ?? 0) >= 4.8 && getExternalReviewCount(place) >= 20 ? 8 : 0;
  const discoveryMomentum = place.hiddenGem ? 8 : hasAny(place, ["지역대표", "지도추천"]) ? 5 : 0;
  return clamp(recency + koreanMomentum + localReviewMomentum + qualityMomentum + discoveryMomentum, 0, 64);
}

function getCategoryFitScore(place: CuratedPlace, categoryId?: string) {
  if (!categoryId || categoryId === "all") return 18;
  const text = getSearchText(place);
  const exact = getCategoryAliases(categoryId).some((alias) => text.includes(alias));
  if (exact) return 40;
  if (categoryId === "food" && hasAny(place, ["맛집", "식당", "restaurant", "음식", "한식", "중식", "일식"])) return 32;
  return 6;
}

function getSafetyScore(place: CuratedPlace) {
  const businessScore = place.businessStatus === "OPERATIONAL" ? 12 : place.businessStatus ? 2 : 5;
  const openScore = place.openNow === true ? 7 : 0;
  const beginnerScore = place.beginnerSafe ? 18 : 0;
  const practicalScore = (place.googleMapsUri ? 4 : 0) + (hasCoordinates(place) ? 6 : 0) + (place.internationalPhoneNumber || place.nationalPhoneNumber ? 4 : 0);
  const contextScore = place.rainyDayOk ? 4 : 0;
  return clamp(businessScore + openScore + beginnerScore + practicalScore + contextScore, 0, 58);
}

function getRiskPenalty(place: CuratedPlace, surface: MangoRankSurface, currentDate: Date) {
  const days = getDaysSince(place.lastVerifiedAt, currentDate);
  const closedPenalty = place.businessStatus === "CLOSED_PERMANENTLY" ? 260 : place.businessStatus === "CLOSED_TEMPORARILY" ? 120 : 0;
  const stalePenalty = days === undefined ? 12 : days > 180 ? 36 : days > 90 ? 20 : 0;
  const lowRatingPenalty = (place.rating ?? 5) < 4.2 && getExternalReviewCount(place) >= 30 ? 36 : 0;
  const cautionPenalty = (place.koreanReviewSignal?.cautionCount ?? 0) * 14;
  const thinDataPenalty = getExternalReviewCount(place) <= 3 && getMangoReviewCount(place) <= 1 ? 18 : 0;
  const mapPenalty = surface === "map" && !hasCoordinates(place) ? 60 : 0;
  return clamp(closedPenalty + stalePenalty + lowRatingPenalty + cautionPenalty + thinDataPenalty + mapPenalty, 0, 320);
}

function getExternalReviewCount(place: CuratedPlace) {
  return Math.max(place.userRatingCount ?? 0, (place as CuratedPlace & { reviewCount?: number }).reviewCount ?? 0, getMangoReviewCount(place));
}

function getDaysSince(value: string | undefined, currentDate: Date) {
  if (!value) return undefined;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.max(0, Math.floor((currentDate.getTime() - date.getTime()) / 86400000));
}

function hasCoordinates(place: CuratedPlace) {
  const coordinates = place.coordinates as (CuratedPlace["coordinates"] & { lat?: number; lng?: number }) | undefined;
  return Boolean(coordinates && (typeof coordinates.latitude === "number" || typeof coordinates.lat === "number") && (typeof coordinates.longitude === "number" || typeof coordinates.lng === "number"));
}

function getCategoryAliases(categoryId: string) {
  const aliases: Record<string, string[]> = {
    food: ["맛집", "식당", "restaurant", "food", "로컬", "베트남음식"],
    cafe: ["카페", "cafe", "coffee", "커피"],
    massage: ["마사지", "massage", "spa", "스파"],
    rooftop: ["루프탑", "바", "bar", "rooftop", "cocktail", "술집"],
    korean: ["한식", "한국", "korean", "bbq", "삼겹", "갈비"],
    chinese: ["중식", "중국", "chinese", "짜장", "짬뽕", "딤섬"],
    japanese: ["일식", "일본", "japanese", "스시", "라멘", "이자카야"],
    photo: ["사진", "관광", "tour", "명소"],
    tour: ["사진", "관광", "tour", "명소"],
    shopping: ["쇼핑", "시장", "market"],
    exchange: ["환전", "exchange"]
  };
  return aliases[categoryId] ?? [categoryId];
}

function getSearchText(place: CuratedPlace) {
  return [
    place.name,
    place.category,
    place.area,
    place.address,
    place.oneLine,
    place.koreanTip,
    place.tags.join(" "),
    place.koreanReviewSignal?.summary,
    place.koreanReviewSignal?.keywords?.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAny(place: CuratedPlace, needles: string[]) {
  const text = getSearchText(place);
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
