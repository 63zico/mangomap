import type { CuratedPlace } from "../types";
import { getMangoReviewCount } from "./placeCommunity";
import { getMangoRankBreakdown, type MangoRankOptions } from "./placeRanking";
import { getCautions, getRecommendedMenu, getStrictPlaceCategory, getVisitTips } from "./placeTrust";

export type MangoSafeChoiceProfile = {
  score: number;
  label: string;
  shortLabel: string;
  badges: string[];
  reason: string;
  caution: string;
  evidence: string[];
  checks: string[];
  reviewKeywords: string[];
  recommendedFor: string[];
  notRecommendedFor: string[];
};

export function getMangoSafeChoiceProfile(place: CuratedPlace, options: MangoRankOptions = {}): MangoSafeChoiceProfile {
  const rank = getMangoRankBreakdown(place, options);
  const category = getStrictPlaceCategory(place);
  const reviewKeywords = getReviewKeywords(place);
  const score = clamp(
    Math.round(
      52 +
        rank.koreanFitScore * 0.13 +
        rank.confidenceScore * 0.16 +
        rank.safetyScore * 0.18 +
        rank.categoryFitScore * 0.08 +
        Math.min(getMangoReviewCount(place) * 2.2, 12) -
        rank.riskPenalty * 0.14
    ),
    48,
    96
  );
  const label = getSafeLabel(place, category, score, rank.riskPenalty);
  const badges = getSafeBadges(place, score, rank.confidenceScore, reviewKeywords.length);
  const recommendedFor = getRecommendedFor(place, category);
  const notRecommendedFor = getNotRecommendedFor(place, category);
  const caution = getSafeCaution(place, category);

  return {
    score,
    label,
    shortLabel: getSafeShortLabel(label),
    badges,
    reason: getSafeReason(place, category, reviewKeywords),
    caution,
    evidence: getSafeEvidence(place, rank.confidenceScore),
    checks: getSafeChecks(place, category),
    reviewKeywords,
    recommendedFor,
    notRecommendedFor
  };
}

function getSafeShortLabel(label: string) {
  if (label === "실패 가능성 낮음") return "실패확률 낮음";
  if (label === "한국인 후기 신뢰 높음") return "후기신뢰 높음";
  if (label === "부모님 동반 무난") return "부모님 무난";
  if (label === "초행자 마사지 무난") return "마사지 무난";
  if (label === "쉬어가기 무난") return "휴식 무난";
  if (label === "저녁 식사 무난") return "저녁 무난";
  if (label === "가격 확인 필요") return "가격확인 필요";
  if (label === "초행자도 무난") return "초행자 무난";
  if (label === "방문 전 확인하면 무난") return "확인 후 무난";
  return label;
}

export function compareMangoSafeChoices(left: CuratedPlace, right: CuratedPlace, options: MangoRankOptions = {}) {
  const leftProfile = getMangoSafeChoiceProfile(left, options);
  const rightProfile = getMangoSafeChoiceProfile(right, options);
  const scoreDiff = rightProfile.score - leftProfile.score;
  if (scoreDiff !== 0) return scoreDiff;
  const leftRank = getMangoRankBreakdown(left, options);
  const rightRank = getMangoRankBreakdown(right, options);
  const confidenceDiff = rightRank.confidenceScore - leftRank.confidenceScore;
  if (confidenceDiff !== 0) return confidenceDiff;
  return String(left.name).localeCompare(String(right.name), "ko");
}

function getSafeLabel(place: CuratedPlace, category: ReturnType<typeof getStrictPlaceCategory>, score: number, riskPenalty: number) {
  if (riskPenalty >= 72) return "가격 확인 필요";
  if (category === "massage" && score >= 80) return "초행자 마사지 무난";
  if (category === "korean" && score >= 80 && hasFamilySignal(place)) return "부모님 동반 무난";
  if (category === "korean" && score >= 80) return "한국인 후기 신뢰 높음";
  if (category === "cafe" && score >= 80) return "쉬어가기 무난";
  if (category === "rooftop" && score >= 80) return "저녁 식사 무난";
  if ((place.koreanReviewSignal?.reviewCount ?? 0) >= 8 && score >= 82) return "한국인 후기 신뢰 높음";
  if (score >= 88 && riskPenalty < 55) return "실패 가능성 낮음";
  if (score >= 80) return "초행자도 무난";
  if (score >= 70) return "방문 전 확인하면 무난";
  return "검증 보강 필요";
}

function getSafeBadges(place: CuratedPlace, score: number, confidenceScore: number, keywordCount: number) {
  const badges: string[] = [];
  if (score >= 82) badges.push("망고 검증");
  if (place.beginnerSafe) badges.push("초행자 안전");
  if (keywordCount >= 2 || (place.koreanReviewSignal?.score ?? 0) >= 78) badges.push("한국인 후기 신뢰");
  if (confidenceScore >= 72 || place.lastVerifiedAt) badges.push("최근 확인");
  if (place.rainyDayOk) badges.push("비 오는 날 무난");
  if (badges.length === 0) badges.push("방문 전 확인");
  return badges.slice(0, 4);
}

function hasFamilySignal(place: CuratedPlace) {
  const text = `${place.name} ${place.oneLine} ${place.koreanTip} ${place.tags.join(" ")} ${place.koreanReviewSignal?.keywords?.join(" ") ?? ""}`.toLowerCase();
  return /부모|가족|family|parents/.test(text);
}

function getSafeReason(place: CuratedPlace, category: ReturnType<typeof getStrictPlaceCategory>, keywords: string[]) {
  if (keywords.length > 0) {
    return `한국인 후기에서 ${keywords.slice(0, 3).join(" · ")} 신호가 반복돼요`;
  }
  if (place.koreanReviewSignal?.summary) return cleanOneLine(place.koreanReviewSignal.summary);
  if (place.koreanTip) return cleanOneLine(place.koreanTip);
  if (category === "massage") return "휴식, 강도 조절, 예약 안정성을 우선해 고른 마사지 후보예요";
  if (category === "cafe") return "더운 시간에 쉬어가기 쉽고 동선 부담이 낮은 카페 후보예요";
  if (category === "rooftop") return "밤 일정에서 분위기와 접근성을 함께 본 술집 후보예요";
  if (category === "korean") return "부모님 동반이나 한식이 필요한 날 실패 확률을 낮추는 후보예요";
  return "한국인 여행자 기준으로 가격, 동선, 후기 신호를 함께 본 후보예요";
}

function getSafeCaution(place: CuratedPlace, category: ReturnType<typeof getStrictPlaceCategory>) {
  const caution = getCautions(place)[0];
  if (caution) return `주의: ${cleanOneLine(caution)}`;
  if (category === "massage") return "주의: 추가 코스 가격을 먼저 확인하세요";
  if (category === "rooftop") return "주의: 날씨와 좌석 위치에 따라 만족도가 달라질 수 있어요";
  return "주의: 방문 전 운영시간과 가격을 다시 확인하세요";
}

function getSafeChecks(place: CuratedPlace, category: ReturnType<typeof getStrictPlaceCategory>) {
  const checks = [
    "운영시간 재확인",
    category === "massage" || category === "rooftop" ? "예약 가능 여부 확인" : "피크 시간 대기 가능성 확인",
    place.priceLevel === "프리미엄" || category === "massage" ? "추가 비용/가격표 먼저 확인" : "대표 메뉴 가격 확인",
    place.googleMapsUri ? "Google Maps 위치 저장" : "정확한 위치 재확인"
  ];
  return unique(checks).slice(0, 4);
}

function getSafeEvidence(place: CuratedPlace, confidenceScore: number) {
  const reviewCount = place.koreanReviewSignal?.reviewCount ?? getMangoReviewCount(place);
  const cautionCount = place.koreanReviewSignal?.cautionCount ?? 0;
  const evidence: string[] = [];
  evidence.push(reviewCount > 0 ? `한국인 후기 ${reviewCount}개 분석` : "참고 후기 기반 검토");
  if (place.lastVerifiedAt) evidence.push(`최근 확인 ${formatShortDate(place.lastVerifiedAt)}`);
  if (place.openingHoursText?.length) evidence.push("운영시간 데이터 있음");
  if (place.coordinates) evidence.push("지도 위치 확인됨");
  evidence.push(cautionCount > 0 ? `주의 신호 ${cautionCount}개` : "큰 주의 신호 적음");
  if (confidenceScore < 55) evidence.push("추가 확인 권장");
  return unique(evidence).slice(0, 5);
}

function getReviewKeywords(place: CuratedPlace) {
  const signalKeywords = place.koreanReviewSignal?.keywords ?? [];
  const reviewTags = (place.reviews ?? []).flatMap((review) => review.tags ?? []);
  const generated = [...signalKeywords, ...reviewTags, getRecommendedMenu(place), ...getVisitTips(place)]
    .map(cleanKeyword)
    .filter(Boolean);
  return unique(generated).slice(0, 6);
}

function getRecommendedFor(place: CuratedPlace, category: ReturnType<typeof getStrictPlaceCategory>) {
  const labels: string[] = [];
  if (place.beginnerSafe) labels.push("초행자");
  if (category === "massage") labels.push("일정 중간 휴식", "부모님 동반");
  if (category === "cafe") labels.push("더운 시간 휴식", "사진 목적");
  if (category === "rooftop") labels.push("저녁 분위기 전환", "커플·친구");
  if (category === "korean") labels.push("부모님 동반", "한식이 필요한 날");
  if (category === "tour") labels.push("첫 방문 코스", "가벼운 산책");
  if (labels.length === 0) labels.push("첫 여행자", "동선 중간 식사", "무난한 선택을 원하는 사람");
  return unique(labels).slice(0, 4);
}

function getNotRecommendedFor(place: CuratedPlace, category: ReturnType<typeof getStrictPlaceCategory>) {
  if (category === "massage") return ["초저가만 찾는 사람", "추가 비용 확인이 번거로운 사람"];
  if (category === "rooftop") return ["조용한 곳만 원하는 사람", "밤 이동이 부담되는 사람"];
  if (category === "cafe") return ["빠른 식사를 원하는 사람", "로컬 강한 분위기를 원하는 사람"];
  if (place.priceLevel === "프리미엄") return ["예산을 아주 낮게 잡은 사람", "대기와 예약 확인이 싫은 사람"];
  return ["모험적인 로컬 맛만 원하는 사람", "대기 싫어하는 사람"];
}

function cleanOneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanKeyword(value: string) {
  return cleanOneLine(value)
    .replace(/^주의:\s*/, "")
    .replace(/먼저|확인|추천|좋음|좋아요/g, "")
    .replace(/[·|]/g, " ")
    .trim()
    .slice(0, 16);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
