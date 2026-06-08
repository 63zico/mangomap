import type { CuratedPlace } from "../types";

export function getMangoRecommendationCount(place: CuratedPlace) {
  const signalScore = place.koreanReviewSignal?.score ?? 64;
  const reviewBonus = Math.min(getMangoReviewCount(place) * 3, 18);
  const ratingBonus = (place.rating ?? 0) >= 4.8 ? 8 : (place.rating ?? 0) >= 4.5 ? 5 : 2;
  const tagBonus = place.tags.includes("망고단추천") ? 10 : place.beginnerSafe ? 5 : 0;
  const stableBonus = getStableCommunityNumber(`${place.id}:mango`, 7);

  return Math.max(8, Math.min(99, Math.round(signalScore / 4) + reviewBonus + ratingBonus + tagBonus + stableBonus));
}

export function getMangoCommentCount(place: CuratedPlace) {
  return getMangoReviewCount(place);
}

export function getMangoReviewCount(place: CuratedPlace) {
  const referenceReviewCount = place.reviews?.length ?? 0;
  const koreanSignalCount = place.koreanReviewSignal?.reviewCount ?? 0;

  return Math.max(referenceReviewCount, koreanSignalCount);
}

export function formatMangoRecommendationChip(place: CuratedPlace) {
  return `망고단 추천 ${getMangoRecommendationCount(place)}`;
}

export function formatMangoCommentChip(place: CuratedPlace) {
  return `댓글 ${getMangoCommentCount(place)}`;
}

function getStableCommunityNumber(value: string, modulo: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}
