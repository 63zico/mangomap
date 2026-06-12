import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "../components/BrandLogo";
import { curatedPlaces } from "../data/places";
import { isSupabaseConfigured, supabaseSelect } from "../services/supabaseClient";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";
import type { CuratedPlace, Destination, GooglePlacesState, Itinerary, LiveTravelInfo, PlaceReport, PlannerInput } from "../types";
import { trackEvent } from "../utils/analytics";
import { getMangoCommentCount, getMangoRecommendationCount } from "../utils/placeCommunity";
import { compareMangoSafeChoices, getMangoSafeChoiceProfile } from "../utils/mangoSafeChoice";
import { getMangoRankScore, isMangoRecentlyRisingPlace } from "../utils/placeRanking";
import { getRealisticPlaceReviews, getStrictPlaceCategory, matchesStrictCategory } from "../utils/placeTrust";

type HomeScreenProps = {
  input: PlannerInput;
  itinerary: Itinerary;
  liveInfo: LiveTravelInfo;
  googlePlaces: GooglePlacesState;
  selectedDay: number;
  visitedPlaceIds: string[];
  focusedPlace?: CuratedPlace;
  onStartPlanner: (destination?: Destination) => void;
  onOpenPlan: () => void;
  onOpenPlaces: (filterId?: string, destination?: Destination) => void;
  onOpenTravel: () => void;
  onOpenMarketplace: () => void;
  onOpenReport: () => void;
  onOpenSavedPlaces?: () => void;
  savedPlaceIds?: string[];
  onToggleSavedPlace?: (placeId: string) => void;
  onSubmitPlaceReport: (report: PlaceReport) => void | Promise<void>;
  memberId?: string;
  onRequireAuth?: () => void;
};

type QualityRequestType = "partner" | "correction";

type QualityRequestConfig = {
  eyebrow: string;
  title: string;
  copy: string;
  nameLabel: string;
  namePlaceholder: string;
  detailLabel: string;
  detailPlaceholder: string;
  presets: string[];
  reportNamePrefix: string;
  reportCategory: PlaceReport["category"];
};

type QualityRequestForm = {
  name: string;
  area: string;
  googleMapsUri: string;
  detail: string;
};

type MapCategory = {
  id: string;
  filterId: string;
  label: string;
  dot: string;
  icon: string;
  copy: string;
};

type HomeActivityItem = {
  id: string;
  type: "meetup" | "market" | "talk" | "report";
  title: string;
  meta: string;
};

type HomeActivitySnapshot = {
  meetupCount: number;
  marketCount: number;
  talkCount: number;
  reportCount: number;
  latestItems: HomeActivityItem[];
  loaded: boolean;
};

type HomeReviewItem = {
  id: string;
  place: CuratedPlace;
  nickname: string;
  rating: number;
  content: string;
  tags: string[];
};

type HomeMeetupRow = {
  id: string;
  title: string;
  category?: string;
  city: string;
  status: string;
  created_at: string;
};

type HomeMarketRow = {
  id: string;
  title: string;
  price_label?: string;
  city: string;
  status: string;
  created_at: string;
};

type HomeCommunityPostRow = {
  id: string;
  title: string;
  category?: string;
  city: string;
  comments_count?: number;
  created_at: string;
};

type HomePlaceReportRow = {
  id: string;
  name: string;
  category?: string;
  city: string;
  status?: string;
  created_at: string;
};

const emptyHomeActivity: HomeActivitySnapshot = {
  meetupCount: 0,
  marketCount: 0,
  talkCount: 0,
  reportCount: 0,
  latestItems: [],
  loaded: false
};

const qualityRequestConfigs: Record<QualityRequestType, QualityRequestConfig> = {
  partner: {
    eyebrow: "업체/혜택 제안",
    title: "한국인에게 도움 되는 혜택을 추천해주세요",
    copy: "한국어 메뉴, 예약 혜택, 픽업, 할인처럼 여행자가 실제로 좋아할 만한 제안을 운영자가 검토해요.",
    nameLabel: "업체명",
    namePlaceholder: "예: ○○ 마사지, ○○ 식당",
    detailLabel: "제안 내용",
    detailPlaceholder: "예: 한국어 메뉴가 있고 예약하면 10% 할인 가능해 보여요.",
    presets: ["한국어 메뉴", "예약 혜택", "픽업 가능", "할인/쿠폰", "단체 혜택"],
    reportNamePrefix: "업체/혜택 제안",
    reportCategory: "맛집"
  },
  correction: {
    eyebrow: "정보 수정 요청",
    title: "틀린 정보를 알려주면 지도 품질에 반영해요",
    copy: "폐업, 이전, 가격 변동, 영업시간 변경처럼 방문 전에 꼭 알아야 하는 정보를 검토 요청할 수 있어요.",
    nameLabel: "장소명",
    namePlaceholder: "예: ○○ 카페, ○○ 식당",
    detailLabel: "수정할 내용",
    detailPlaceholder: "예: 영업시간이 바뀐 것 같아요. Google Maps에는 22시까지로 보여요.",
    presets: ["영업시간 변경", "폐업/휴업", "주소 이전", "가격 변동", "사진 오류"],
    reportNamePrefix: "정보 수정 요청",
    reportCategory: "맛집"
  }
};

function createQualityRequestForm(): QualityRequestForm {
  return {
    name: "",
    area: "",
    googleMapsUri: "",
    detail: ""
  };
}

const mapDestinations = ["호치민", "다낭", "나트랑", "하노이", "달랏", "푸꾸옥"] as const;
type MapDestination = (typeof mapDestinations)[number];

const mapCategories: MapCategory[] = [
  { id: "food", filterId: "food", label: "전체 맛집", dot: "#FF7A00", icon: "🍜", copy: "한국인 후기와 최근 확인 기준으로 고른 식당" },
  { id: "vietnamese", filterId: "vietnamese", label: "로컬 맛집", dot: "#F97316", icon: "VN", copy: "쌀국수·분짜·반미처럼 실패 적은 로컬 식당" },
  { id: "korean", filterId: "korean", label: "한식", dot: "#16A34A", icon: "한", copy: "한국 음식이 생각날 때 무난한 식당" },
  { id: "chinese", filterId: "chinese", label: "중식", dot: "#EF4444", icon: "中", copy: "짬뽕·딤섬처럼 익숙한 메뉴" },
  { id: "japanese", filterId: "japanese", label: "일식", dot: "#111827", icon: "日", copy: "스시·라멘·이자카야 추천" },
  { id: "cafe", filterId: "cafe", label: "카페", dot: "#FFC233", icon: "☕", copy: "식사 전후 쉬어가기 좋은 카페" }
];

const safeSituationFilters = ["부모님", "혼밥", "로컬", "쌀국수", "해장", "분위기", "예약 쉬움", "바가지 낮음"];

const guideSituationFilters = [
  "첫날 저녁",
  "부모님",
  "혼밥",
  "로컬 입문",
  "접대",
  "해장",
  "야식",
  "비 오는 날",
  "가성비",
  "분위기",
  "한식 충전",
  "예약 쉬움"
];

type HomeGuideCard = {
  id: string;
  situation: string;
  title: string;
  target: string;
  copy: string;
  placeNames: string[];
  updatedLabel: string;
  filterId: string;
};

const cityCounts: Record<string, number> = {
  food: 28,
  vietnamese: 16,
  cafe: 14,
  rooftop: 24,
  korean: 10,
  chinese: 8,
  japanese: 8,
  tour: 18,
  massage: 10,
};

const mapSpots = [
  { left: "18%", top: "30%", size: 72, category: "food" },
  { left: "38%", top: "25%", size: 52, category: "cafe" },
  { left: "58%", top: "33%", size: 98, category: "rooftop" },
  { left: "76%", top: "42%", size: 56, category: "photo" },
  { left: "28%", top: "54%", size: 84, category: "market" },
  { left: "50%", top: "61%", size: 58, category: "massage" },
  { left: "68%", top: "69%", size: 70, category: "karaoke" },
  { left: "18%", top: "73%", size: 42, category: "rooftop" },
  { left: "84%", top: "25%", size: 44, category: "cafe" }
];

export function HomeScreen({
  input,
  liveInfo,
  googlePlaces,
  focusedPlace,
  onOpenPlaces,
  onOpenTravel,
  onOpenMarketplace,
  onOpenReport,
  onOpenSavedPlaces,
  savedPlaceIds = [],
  onToggleSavedPlace,
  onSubmitPlaceReport,
  memberId,
  onRequireAuth
}: HomeScreenProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("food");
  const [selectedMapDestination, setSelectedMapDestination] = useState<MapDestination>(input.destination);
  const [homeActivity, setHomeActivity] = useState<HomeActivitySnapshot>(emptyHomeActivity);
  const [qualityRequestType, setQualityRequestType] = useState<QualityRequestType | null>(null);
  const [qualityRequestForm, setQualityRequestForm] = useState<QualityRequestForm>(createQualityRequestForm);
  const [qualityRequestStatus, setQualityRequestStatus] = useState("");
  const [qualityRequestSubmitting, setQualityRequestSubmitting] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<"peek" | "mid" | "full">("peek");
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isCompactMobile = !isDesktop && height < 760;
  const navOffset = isCompactMobile ? 82 : 94;
  const locateButtonSize = isCompactMobile ? 52 : 60;
  const sheetTargetHeight =
    sheetSnap === "peek"
      ? Math.max(isCompactMobile ? 292 : 320, height * (isCompactMobile ? 0.42 : 0.38))
      : sheetSnap === "mid"
        ? height * 0.5
        : height * (isCompactMobile ? 0.74 : 0.78);
  const sheetHeight = Math.round(
    Math.min(
      isDesktop ? 620 : Math.max(160, height - navOffset - (isCompactMobile ? 76 : 104)),
      sheetTargetHeight
    )
  );
  const sheetTop = height - navOffset - sheetHeight;
  const locateTop = Math.max(isCompactMobile ? 212 : 274, sheetTop - locateButtonSize - 14);
  const locateBottom = Math.max(navOffset + 12, height - locateTop - locateButtonSize);
  const selectedCategory = mapCategories.find((category) => category.id === selectedCategoryId) ?? mapCategories[0];
  const selectedCategoryDisplayLabel = selectedCategory.id === "food" ? "맛집" : selectedCategory.label;
  const visibleFocusedPlace =
    focusedPlace &&
    focusedPlace.city === selectedMapDestination &&
    getMapCategoryIdFromPlace(focusedPlace) === selectedCategory.id &&
    hasUsableHomeMapCoordinates(focusedPlace)
      ? focusedPlace
      : undefined;
  const mapHtml = useMemo(() => buildGoogleMapHtml(selectedMapDestination, selectedCategory, visibleFocusedPlace), [selectedMapDestination, selectedCategory, visibleFocusedPlace]);
  const selectedCategoryCount = useMemo(
    () => countHomeCategoryPlaces(selectedMapDestination, selectedCategory),
    [selectedMapDestination, selectedCategory]
  );
  const selectedMapMarkerCount = useMemo(
    () => countHomeMappableCategoryPlaces(selectedMapDestination, selectedCategory),
    [selectedMapDestination, selectedCategory]
  );
  const visibleMapMarkerCount = Math.min(selectedMapMarkerCount, 8);
  const verifiedHomeTopCount = Math.min(8, selectedCategoryCount);
  const topSavedPlaces = useMemo(() => {
    return dedupeHomePlaces(
      curatedPlaces.filter((place) => place.city === selectedMapDestination && !isHomeSuppressedPlace(place))
    )
      .sort((a, b) => getTodayHotScore(b) - getTodayHotScore(a))
      .slice(0, 5);
  }, [selectedMapDestination]);
  const recentKoreanReviews = useMemo(() => buildRecentKoreanReviews(topSavedPlaces), [topSavedPlaces]);
  const selectedMapPlaces = useMemo(
    () => getHomeSafeMapPlaces(selectedMapDestination, selectedCategory.id).slice(0, sheetSnap === "full" ? 12 : sheetSnap === "mid" ? 2 : 1),
    [selectedMapDestination, selectedCategory.id, sheetSnap]
  );
  const guideTopPlaces = useMemo(
    () => getHomeSafeMapPlaces(selectedMapDestination, "food").slice(0, 8),
    [selectedMapDestination]
  );
  const homeGuideCards = useMemo(
    () => buildHomeSituationGuides(selectedMapDestination, guideTopPlaces),
    [guideTopPlaces, selectedMapDestination]
  );

  const expandSheet = () => {
    setSheetSnap((current) => (current === "peek" ? "mid" : "full"));
  };

  const collapseSheet = () => {
    setSheetSnap((current) => (current === "full" ? "mid" : "peek"));
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -36) {
          expandSheet();
          return;
        }
        if (gesture.dy > 36) collapseSheet();
      }
    })
  ).current;

  useEffect(() => {
    setSelectedMapDestination(input.destination);
  }, [input.destination]);

  useEffect(() => {
    if (!focusedPlace) return;
    setSelectedMapDestination(focusedPlace.city);
    setSelectedCategoryId(getMapCategoryIdFromPlace(focusedPlace));
  }, [focusedPlace]);

  useEffect(() => {
    trackEvent("view_home", { city: selectedMapDestination });
  }, [selectedMapDestination]);

  useEffect(() => {
    let active = true;
    setHomeActivity((current) => ({ ...current, loaded: false }));
    loadHomeActivitySnapshot(selectedMapDestination)
      .then((snapshot) => {
        if (active) setHomeActivity(snapshot);
      })
      .catch(() => {
        if (active) setHomeActivity({ ...emptyHomeActivity, loaded: true });
      });

    return () => {
      active = false;
    };
  }, [selectedMapDestination]);

  const openNearbyPlaces = () => {
    trackEvent("click_nearby_places", { city: selectedMapDestination, source: "home_hero" });
    onOpenPlaces("all", selectedMapDestination);
  };

  const openPopularPlaces = () => {
    trackEvent("click_nearby_places", { city: selectedMapDestination, filter: selectedCategory.filterId, source: "home_popular" });
    onOpenPlaces(selectedCategory.filterId, selectedMapDestination);
  };

  const openReportFromHome = () => {
    trackEvent("report_place", { city: selectedMapDestination, source: "home_trust_card" });
    onOpenReport();
  };

  const openQualityRequest = (requestType: QualityRequestType) => {
    if (!memberId) {
      onRequireAuth?.();
      return;
    }
    trackEvent("report_place", { city: selectedMapDestination, source: `home_quality_${requestType}` });
    setQualityRequestType(requestType);
    setQualityRequestForm(createQualityRequestForm());
    setQualityRequestStatus("");
  };

  const closeQualityRequest = () => {
    if (qualityRequestSubmitting) return;
    setQualityRequestType(null);
    setQualityRequestStatus("");
  };

  const updateQualityRequestForm = (updates: Partial<QualityRequestForm>) => {
    setQualityRequestForm((current) => ({ ...current, ...updates }));
  };

  const addQualityRequestPreset = (preset: string) => {
    setQualityRequestForm((current) => ({
      ...current,
      detail: current.detail.includes(preset) ? current.detail : `${current.detail}${current.detail ? "\n" : ""}- ${preset}`
    }));
  };

  const submitQualityRequest = async () => {
    if (!memberId) {
      onRequireAuth?.();
      return;
    }
    if (!qualityRequestType) return;

    const config = qualityRequestConfigs[qualityRequestType];
    const name = qualityRequestForm.name.trim();
    const detail = qualityRequestForm.detail.trim();
    if (!name) {
      setQualityRequestStatus(`${config.nameLabel}을 적어주세요.`);
      return;
    }
    if (!detail) {
      setQualityRequestStatus(`${config.detailLabel}을 한 줄이라도 적어주세요.`);
      return;
    }

    const now = new Date().toISOString();
    const area = qualityRequestForm.area.trim() || String(selectedMapDestination);
    const report: PlaceReport = {
      id: `quality-${qualityRequestType}-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      status: "검토중",
      city: selectedMapDestination,
      reporterType: "여행 준비중",
      reporterId: memberId,
      name: `${config.reportNamePrefix}: ${name}`,
      googleMapsUri:
        qualityRequestForm.googleMapsUri.trim() ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${area} ${selectedMapDestination}`)}`,
      area,
      category: config.reportCategory,
      priceLevel: "보통",
      reason: `[${config.eyebrow}] ${detail}`,
      mapReflectionStatus: "검토중",
      viewCount: 0,
      rewardPoints: qualityRequestType === "partner" ? 15 : 10
    };

    try {
      setQualityRequestSubmitting(true);
      await Promise.resolve(onSubmitPlaceReport(report));
      setQualityRequestStatus("접수됐어요. 마이페이지의 내 제보 현황에서 검토 상태를 확인할 수 있어요.");
      setQualityRequestForm(createQualityRequestForm());
    } catch (error) {
      const message = error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.";
      setQualityRequestStatus(`저장에 실패했어요. ${message}`);
    } finally {
      setQualityRequestSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.guideHomeScroll}
        contentContainerStyle={[styles.guideHomeContent, isDesktop && styles.guideHomeContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.guideHero, isDesktop && styles.guideHeroDesktop]}>
          <View style={styles.guideHeroTop}>
            <View style={styles.guideBrandMark}>
              <BrandLogo size={74} />
            </View>
            <View style={styles.guideHeroTrustBadge}>
              <Text style={styles.guideHeroTrustText}>한국인 기준</Text>
            </View>
          </View>
          <Text style={styles.guideEyebrow}>MANGO VIETNAM GUIDE</Text>
          <Text style={[styles.guideHeroTitle, isDesktop && styles.guideHeroTitleDesktop]}>한국인이 베트남에서 식당 고르다 실패하지 않게</Text>
          <Text style={styles.guideHeroCopy}>
            모든 식당을 보여주지 않아요. 한국인 후기, 최근 확인, 가격 리스크를 기준으로 먼저 볼 선택지만 골라요.
          </Text>
          <View style={styles.guideHeroActions}>
            <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.guidePrimaryButton}>
              <Text style={styles.guidePrimaryButtonText}>오늘의 검증 TOP 보기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openReportFromHome} style={styles.guideGhostButton}>
              <Text style={styles.guideGhostButtonText}>장소 제보</Text>
            </Pressable>
          </View>
        </View>

        {isDesktop ? (
          <View style={styles.guideDesktopGrid}>
            <View style={styles.guideDesktopLeft}>
              <View style={[styles.guidePanel, styles.guideDesktopPanel]}>
                <View style={styles.guideSectionHeader}>
                  <View>
                    <Text style={styles.guideSectionKicker}>상황 탐색</Text>
                    <Text style={styles.guideSectionTitle}>음식보다 상황이 먼저예요</Text>
                  </View>
                </View>
                <View style={styles.guideDesktopSituationList}>
                  {guideSituationFilters.slice(0, 10).map((filter, index) => (
                    <Pressable
                      key={filter}
                      accessibilityRole="button"
                      onPress={() => onOpenPlaces("all", selectedMapDestination)}
                      style={[styles.guideDesktopSituationItem, index === 0 && styles.guideDesktopSituationItemActive]}
                    >
                      <Text style={[styles.guideDesktopSituationText, index === 0 && styles.guideDesktopSituationTextActive]}>{filter}</Text>
                      <Text style={styles.guideDesktopSituationArrow}>›</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.guidePanel, styles.guideDesktopPanel]}>
                <View style={styles.guideSectionHeader}>
                  <View>
                    <Text style={styles.guideSectionKicker}>도시 변경</Text>
                    <Text style={styles.guideSectionTitle}>베트남 주요 도시</Text>
                  </View>
                </View>
                <View style={styles.guideDesktopCityGrid}>
                  {mapDestinations.map((destination) => {
                    const selected = selectedMapDestination === destination;
                    return (
                      <Pressable
                        key={destination}
                        accessibilityRole="button"
                        onPress={() => setSelectedMapDestination(destination)}
                        style={[styles.guideDesktopCityButton, selected && styles.guideDesktopCityButtonActive]}
                      >
                        <Text style={[styles.guideDesktopCityText, selected && styles.guideDesktopCityTextActive]}>{destination}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.guideDesktopCenter}>
              <View style={[styles.guidePanel, styles.guideDesktopPanel]}>
                <View style={styles.guideSectionHeader}>
                  <View>
                    <Text style={styles.guideSectionKicker}>추천 가이드</Text>
                    <Text style={styles.guideSectionTitle}>{selectedMapDestination}에서 바로 쓰는 판단 리스트</Text>
                  </View>
                </View>
                <View style={[styles.guideCardList, styles.guideDesktopCardGrid]}>
                  {homeGuideCards.map((guide) => (
                    <Pressable
                      key={guide.id}
                      accessibilityRole="button"
                      onPress={() => onOpenPlaces(guide.filterId, selectedMapDestination)}
                      style={[styles.guideContentCard, styles.guideDesktopContentCard]}
                    >
                      <View style={styles.guideContentTop}>
                        <Text style={styles.guideContentSituation}>{guide.situation}</Text>
                        <Text style={styles.guideContentUpdated}>{guide.updatedLabel}</Text>
                      </View>
                      <Text style={styles.guideContentTitle}>{guide.title}</Text>
                      <Text style={styles.guideContentCopy}>{guide.copy}</Text>
                      <View style={styles.guideContentFooter}>
                        <Text style={styles.guideContentTarget}>{guide.target}</Text>
                        <Text style={styles.guideContentPlaces} numberOfLines={1}>{guide.placeNames.join(" · ")}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.guidePanel, styles.guideDesktopPanel]}>
                <View style={styles.guideSectionHeader}>
                  <View>
                    <Text style={styles.guideSectionKicker}>오늘의 검증 TOP</Text>
                    <Text style={styles.guideSectionTitle}>먼저 이 8곳만 봐도 충분해요</Text>
                  </View>
                  <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.guideSmallButton}>
                    <Text style={styles.guideSmallButtonText}>전체 보기</Text>
                  </Pressable>
                </View>
                <View style={styles.guideTopList}>
                  {guideTopPlaces.slice(0, 5).map((place, index) => {
                    const safeProfile = getMangoSafeChoiceProfile(place, { surface: "home", categoryId: "food" });
                    const saved = savedPlaceIds.includes(place.id);
                    return (
                      <Pressable key={place.id} accessibilityRole="button" onPress={() => onOpenPlaces("all", selectedMapDestination)} style={[styles.guideTopCard, styles.guideDesktopTopCard]}>
                        <Text style={styles.guideTopRank}>#{index + 1}</Text>
                        <View style={styles.guideTopBody}>
                          <View style={styles.guideTopBadgeRow}>
                            <Text style={styles.guideTopBadge}>{safeProfile.shortLabel}</Text>
                            <Text style={styles.guideTopBadgeMuted}>{safeProfile.badges[0] ?? "망고 검증"}</Text>
                          </View>
                          <Text style={styles.guideTopTitle} numberOfLines={1}>{formatMapPlaceName(place.name)}</Text>
                          <Text style={styles.guideTopReason} numberOfLines={2}>{safeProfile.reason}</Text>
                          <Text style={styles.guideTopCaution} numberOfLines={1}>{safeProfile.caution}</Text>
                        </View>
                        <Pressable accessibilityRole="button" onPress={() => onToggleSavedPlace?.(place.id)} style={[styles.guideTopSave, saved && styles.guideTopSaveActive]}>
                          <Text style={[styles.guideTopSaveText, saved && styles.guideTopSaveTextActive]}>{saved ? "♥" : "♡"}</Text>
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.guideDesktopRight}>
              <View style={[styles.guidePanel, styles.guideDesktopPanel]}>
                <Text style={styles.guideAsideTitle}>오늘의 검증 TOP</Text>
                <Text style={styles.guideAsideText}>모든 장소 대신 지금 실패 가능성이 낮은 선택지만 먼저 보여줘요.</Text>
                <View style={styles.guideAsideList}>
                  {guideTopPlaces.slice(0, 4).map((place, index) => (
                    <Pressable key={place.id} accessibilityRole="button" onPress={() => onOpenPlaces("all", selectedMapDestination)} style={styles.guideAsideRow}>
                      <Text style={styles.guideAsideRank}>{index + 1}</Text>
                      <View style={styles.guideAsideCopy}>
                        <Text style={styles.guideAsideName} numberOfLines={1}>{formatMapPlaceName(place.name)}</Text>
                        <Text style={styles.guideAsideMeta} numberOfLines={1}>{getMangoSafeChoiceProfile(place, { surface: "home" }).shortLabel}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.guideAsideButton}>
                  <Text style={styles.guideAsideButtonText}>검증 리스트 열기</Text>
                </Pressable>
              </View>

              <View style={styles.guideTrustPanel}>
                <Text style={styles.guideTrustTitle}>망고베트남은 이런 근거로 추천을 줄여요</Text>
                <View style={styles.guideTrustGrid}>
                  <Text style={styles.guideTrustChip}>한국인 후기 밀도</Text>
                  <Text style={styles.guideTrustChip}>최근 확인일</Text>
                  <Text style={styles.guideTrustChip}>가격 예측 가능성</Text>
                  <Text style={styles.guideTrustChip}>웨이팅 리스크</Text>
                  <Text style={styles.guideTrustChip}>동행 유형 적합도</Text>
                  <Text style={styles.guideTrustChip}>가기 전 주의점</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => onOpenPlaces("all", selectedMapDestination)} style={styles.guideMapCta}>
                  <Text style={styles.guideMapCtaText}>지도로 보조 확인하기</Text>
                </Pressable>
              </View>

              <View style={[styles.guidePanel, styles.guideDesktopPanel]}>
                <Text style={styles.guideAsideTitle}>뉴스레터</Text>
                <Text style={styles.guideAsideText}>호치민, 다낭, 나트랑의 새 검증 가이드를 주 1회 요약해요.</Text>
                <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.guideAsideButton}>
                  <Text style={styles.guideAsideButtonText}>가이드 먼저 보기</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.guidePanel}>
              <View style={styles.guideSectionHeader}>
                <View>
                  <Text style={styles.guideSectionKicker}>도시 선택</Text>
                  <Text style={styles.guideSectionTitle}>어디에서 실패를 줄일까요?</Text>
                </View>
                <Text style={styles.guideSectionMeta}>{guideTopPlaces.length}곳 우선 검증</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guideCityRail}>
                {mapDestinations.map((destination) => {
                  const selected = selectedMapDestination === destination;
                  return (
                    <Pressable
                      key={destination}
                      accessibilityRole="button"
                      onPress={() => setSelectedMapDestination(destination)}
                      style={[styles.guideCityChip, selected && styles.guideCityChipActive]}
                    >
                      <Text style={[styles.guideCityText, selected && styles.guideCityTextActive]}>{destination}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.guidePanel}>
              <View style={styles.guideSectionHeader}>
                <View>
                  <Text style={styles.guideSectionKicker}>상황별 판단</Text>
                  <Text style={styles.guideSectionTitle}>음식 종류보다 지금 상황이 먼저예요</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guideSituationRail}>
                {guideSituationFilters.map((filter, index) => (
                  <Pressable
                    key={filter}
                    accessibilityRole="button"
                    onPress={() => onOpenPlaces("all", selectedMapDestination)}
                    style={[styles.guideSituationChip, index === 0 && styles.guideSituationChipActive]}
                  >
                    <Text style={[styles.guideSituationText, index === 0 && styles.guideSituationTextActive]}>{filter}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.guidePanel}>
              <View style={styles.guideSectionHeader}>
                <View>
                  <Text style={styles.guideSectionKicker}>추천 가이드</Text>
                  <Text style={styles.guideSectionTitle}>{selectedMapDestination}에서 바로 쓰는 판단 리스트</Text>
                </View>
              </View>
              <View style={styles.guideCardList}>
                {homeGuideCards.map((guide) => (
                  <Pressable
                    key={guide.id}
                    accessibilityRole="button"
                    onPress={() => onOpenPlaces(guide.filterId, selectedMapDestination)}
                    style={styles.guideContentCard}
                  >
                    <View style={styles.guideContentTop}>
                      <Text style={styles.guideContentSituation}>{guide.situation}</Text>
                      <Text style={styles.guideContentUpdated}>{guide.updatedLabel}</Text>
                    </View>
                    <Text style={styles.guideContentTitle}>{guide.title}</Text>
                    <Text style={styles.guideContentCopy}>{guide.copy}</Text>
                    <View style={styles.guideContentFooter}>
                      <Text style={styles.guideContentTarget}>{guide.target}</Text>
                      <Text style={styles.guideContentPlaces} numberOfLines={1}>{guide.placeNames.join(" · ")}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.guidePanel}>
              <View style={styles.guideSectionHeader}>
                <View>
                  <Text style={styles.guideSectionKicker}>오늘의 검증 TOP</Text>
                  <Text style={styles.guideSectionTitle}>먼저 이 8곳만 봐도 충분해요</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.guideSmallButton}>
                  <Text style={styles.guideSmallButtonText}>전체 보기</Text>
                </Pressable>
              </View>
              <View style={styles.guideTopList}>
                {guideTopPlaces.slice(0, 4).map((place, index) => {
                  const safeProfile = getMangoSafeChoiceProfile(place, { surface: "home", categoryId: "food" });
                  const saved = savedPlaceIds.includes(place.id);
                  return (
                    <Pressable key={place.id} accessibilityRole="button" onPress={() => onOpenPlaces("all", selectedMapDestination)} style={styles.guideTopCard}>
                      <Text style={styles.guideTopRank}>#{index + 1}</Text>
                      <View style={styles.guideTopBody}>
                        <View style={styles.guideTopBadgeRow}>
                          <Text style={styles.guideTopBadge}>{safeProfile.shortLabel}</Text>
                          <Text style={styles.guideTopBadgeMuted}>{safeProfile.badges[0] ?? "망고 검증"}</Text>
                        </View>
                        <Text style={styles.guideTopTitle} numberOfLines={1}>{formatMapPlaceName(place.name)}</Text>
                        <Text style={styles.guideTopReason} numberOfLines={2}>{safeProfile.reason}</Text>
                        <Text style={styles.guideTopCaution} numberOfLines={1}>{safeProfile.caution}</Text>
                      </View>
                      <Pressable accessibilityRole="button" onPress={() => onToggleSavedPlace?.(place.id)} style={[styles.guideTopSave, saved && styles.guideTopSaveActive]}>
                        <Text style={[styles.guideTopSaveText, saved && styles.guideTopSaveTextActive]}>{saved ? "♥" : "♡"}</Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.guideTrustPanel}>
              <Text style={styles.guideTrustTitle}>망고베트남은 이런 근거로 추천을 줄여요</Text>
              <View style={styles.guideTrustGrid}>
                <Text style={styles.guideTrustChip}>한국인 후기 밀도</Text>
                <Text style={styles.guideTrustChip}>최근 확인일</Text>
                <Text style={styles.guideTrustChip}>가격 예측 가능성</Text>
                <Text style={styles.guideTrustChip}>웨이팅 리스크</Text>
                <Text style={styles.guideTrustChip}>동행 유형 적합도</Text>
                <Text style={styles.guideTrustChip}>가기 전 주의점</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => onOpenPlaces("all", selectedMapDestination)} style={styles.guideMapCta}>
                <Text style={styles.guideMapCtaText}>지도로 보조 확인하기</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {false ? (
      <View style={[styles.referenceMapStage, isDesktop && styles.referenceMapStageDesktop]}>
        <View style={styles.referenceMapCanvas}>
          <InteractiveHomeMap html={mapHtml} />
        </View>

        <View pointerEvents="box-none" style={[styles.referenceTopOverlay, isCompactMobile && styles.referenceTopOverlayCompact]}>
          <View style={[styles.referenceStatusBar, isCompactMobile && styles.referenceStatusBarCompact]}>
            <Text style={[styles.referenceStatusTime, isCompactMobile && styles.referenceStatusTimeCompact]}>19:09</Text>
            <View style={styles.referenceStatusRight}>
              <Text style={[styles.referenceSignalText, isCompactMobile && styles.referenceSignalTextCompact]}>▦ 5G</Text>
              <Text style={[styles.referenceBatteryText, isCompactMobile && styles.referenceBatteryTextCompact]}>47</Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={[styles.referenceSearchBar, isCompactMobile && styles.referenceSearchBarCompact]}>
            <Text style={[styles.referenceSearchIcon, isCompactMobile && styles.referenceSearchIconCompact]}>⌕</Text>
            <Text numberOfLines={1} style={[styles.referenceSearchText, isCompactMobile && styles.referenceSearchTextCompact]}>
              한국인이 실패하지 않을 베트남 맛집 지도
            </Text>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={[styles.referenceMapSearchPill, isCompactMobile && styles.referenceMapSearchPillCompact]}>
            <Text style={[styles.referenceRefreshIcon, isCompactMobile && styles.referenceRefreshIconCompact]}>↻</Text>
            <Text style={[styles.referenceMapSearchText, isCompactMobile && styles.referenceMapSearchTextCompact]}>검증 맛집 TOP 8 보기</Text>
          </Pressable>
        </View>

        {sheetSnap !== "full" ? (
          <Pressable
            accessibilityRole="button"
            onPress={openNearbyPlaces}
            style={[
              styles.referenceLocateButton,
              {
                bottom: locateBottom,
                width: locateButtonSize,
                height: locateButtonSize,
                borderRadius: locateButtonSize / 2
              }
            ]}
          >
            <Text style={[styles.referenceLocateIcon, isCompactMobile && styles.referenceLocateIconCompact]}>⌖</Text>
          </Pressable>
        ) : null}

        <View style={[styles.referenceBottomSheet, isCompactMobile && styles.referenceBottomSheetCompact, { height: sheetHeight, bottom: navOffset }]} {...sheetPanResponder.panHandlers}>
          <Pressable accessibilityRole="button" onPress={expandSheet} style={styles.referenceSheetHandleHit}>
            <View style={styles.referenceSheetHandle} />
          </Pressable>
          <View style={[styles.referenceSheetTopLine, isCompactMobile && styles.referenceSheetTopLineCompact]}>
            <View style={styles.referenceSheetTitleWrap}>
              <Text numberOfLines={1} style={[styles.referenceSheetTitle, isCompactMobile && styles.referenceSheetTitleCompact]}>
                오늘 믿고 고를 {selectedCategoryDisplayLabel}
              </Text>
              <Text numberOfLines={1} style={[styles.referenceSheetSubtitle, isCompactMobile && styles.referenceSheetSubtitleCompact]}>
                {selectedMapDestination} · 한국인 후기와 최근 확인 기준
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onOpenSavedPlaces ?? openPopularPlaces} style={[styles.referenceSavedShortcut, isCompactMobile && styles.referenceSavedShortcutCompact]}>
              <Text style={styles.referenceSavedShortcutText}>찜</Text>
            </Pressable>
            <Text style={styles.referenceSheetSnapText}>{sheetSnap === "peek" ? "추천" : sheetSnap === "mid" ? "목록" : "전체"}</Text>
          </View>

          {sheetSnap !== "peek" ? (
          <View style={styles.referenceSegment}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenPlaces(selectedCategory.filterId, selectedMapDestination)}
              style={[styles.referenceSegmentButton, styles.referenceSegmentButtonActive]}
            >
              <Text numberOfLines={1} style={[styles.referenceSegmentText, styles.referenceSegmentTextActive]}>
                검증 {selectedCategoryDisplayLabel}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onOpenSavedPlaces ?? openPopularPlaces} style={styles.referenceSegmentButton}>
              <Text numberOfLines={1} style={styles.referenceSegmentText}>
                저장한 선택
              </Text>
            </Pressable>
          </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.referenceFilterScroll, isCompactMobile && styles.referenceFilterScrollCompact]}
            contentContainerStyle={[styles.referenceCategoryChips, isCompactMobile && styles.referenceCategoryChipsCompact]}
          >
            {mapCategories.map((category) => {
              const selected = selectedCategoryId === category.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                  style={[styles.referenceCategoryChip, selected && styles.referenceCategoryChipActive]}
                >
                  <Text numberOfLines={1} style={[styles.referenceCategoryText, selected && styles.referenceCategoryTextActive]}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {sheetSnap !== "peek" ? (
            <View style={styles.referenceBadgeRow}>
              <Text style={styles.referenceMangoBadge}>망고 검증</Text>
              <Text style={styles.referenceRisingBadge}>검증 기준</Text>
              <Pressable accessibilityRole="button" onPress={openReportFromHome} style={styles.referenceMiniGhostButton}>
                <Text style={styles.referenceMiniGhostText}>제보</Text>
              </Pressable>
            </View>
          ) : null}

          {sheetSnap !== "peek" ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.referenceSituationScroll}
              contentContainerStyle={styles.referenceSituationChips}
            >
              {safeSituationFilters.map((filter, index) => (
                <Text key={filter} style={[styles.referenceSituationChip, index === 0 && styles.referenceSituationChipActive]}>
                  {filter}
                </Text>
              ))}
            </ScrollView>
          ) : null}

          <View style={[styles.referenceResultBlock, sheetSnap === "peek" && styles.referenceResultBlockPeek]}>
            {selectedMapMarkerCount > 0 ? (
              <>
                {sheetSnap === "full" ? (
                  <View style={styles.referenceResultHeader}>
                    <View style={[styles.referenceResultIcon, { backgroundColor: selectedCategory.dot }]}>
                      <Text style={styles.referenceResultIconText}>{selectedCategory.icon}</Text>
                    </View>
                    <View style={styles.referenceResultCopyWrap}>
                      <Text style={styles.referenceResultEyebrow}>오늘의 검증 추천</Text>
                      <Text numberOfLines={1} style={styles.referenceResultTitle}>
                        {visibleFocusedPlace ? formatMapPlaceName(visibleFocusedPlace?.name ?? selectedCategory.label) : "검증 TOP 선택지"}
                      </Text>
                      <Text numberOfLines={2} style={styles.referenceResultCopy}>
                        {visibleFocusedPlace
                          ? getMangoSafeChoiceProfile(visibleFocusedPlace!, { surface: "map", categoryId: selectedCategory.id }).reason
                          : `모든 장소가 아니라 실패 확률 낮은 ${visibleMapMarkerCount}곳만 먼저 보여줘요`}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {sheetSnap === "full" ? (
                  <>
                    <View style={styles.referenceStatsRow}>
                      <View style={styles.referenceStatPill}>
                        <Text style={styles.referenceStatLabel}>검증 TOP</Text>
                        <Text style={styles.referenceStatValue}>{verifiedHomeTopCount}곳</Text>
                      </View>
                      <View style={styles.referenceStatPill}>
                        <Text style={styles.referenceStatLabel}>TOP 표시</Text>
                        <Text style={styles.referenceStatValue}>{visibleMapMarkerCount}곳</Text>
                      </View>
                      <View style={styles.referenceStatPill}>
                        <Text style={styles.referenceStatLabel}>현지 날씨</Text>
                        <Text style={styles.referenceStatValue}>{formatWeatherValue(liveInfo)}</Text>
                      </View>
                    </View>

                    <View style={styles.referenceActionRow}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onOpenPlaces(selectedCategory.filterId, selectedMapDestination)}
                        style={styles.referencePrimaryButton}
                      >
                        <Text style={styles.referencePrimaryButtonText}>검증 리스트 보기</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={openReportFromHome} style={styles.referenceSecondaryButton}>
                        <Text style={styles.referenceSecondaryButtonText}>제보</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={[styles.referencePlaceList, sheetSnap === "peek" && styles.referencePlaceListPeek]}
                  contentContainerStyle={[
                    styles.referencePlaceListContent,
                    sheetSnap === "peek" && styles.referencePlaceListContentPeek,
                    sheetSnap === "mid" && styles.referencePlaceListContentMid,
                    { paddingBottom: sheetSnap === "peek" ? 6 : navOffset + 16 }
                  ]}
                >
                    {selectedMapPlaces.map((place, index) => {
                      const saved = savedPlaceIds.includes(place.id);
                      const imageUrl = getFocusedPlaceImageUrl(place);
                      const safeProfile = getMangoSafeChoiceProfile(place, { surface: "home", categoryId: selectedCategory.id });
                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={place.id}
                          onPress={() => onOpenPlaces(selectedCategory.filterId, selectedMapDestination)}
                          style={[styles.referencePlaceCard, sheetSnap === "peek" && styles.referencePlaceCardPeek]}
                        >
                          {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={[styles.referencePlaceImage, sheetSnap === "peek" && styles.referencePlaceImagePeek]} />
                          ) : (
                            <View style={[styles.referencePlaceImage, sheetSnap === "peek" && styles.referencePlaceImagePeek, styles.referencePlaceImageEmpty]}>
                              <Text style={styles.referencePlaceImageText}>{selectedCategory.icon}</Text>
                            </View>
                          )}
                          <View style={styles.referencePlaceBody}>
                            <View style={styles.referencePlaceBadges}>
                              <Text numberOfLines={1} style={styles.referenceRankBadge}>
                                #{index + 1} {safeProfile.shortLabel}
                              </Text>
                              {isMangoRecentlyRisingPlace(place, { surface: "home", categoryId: selectedCategory.id }) ? (
                                <Text numberOfLines={1} style={styles.referenceHotBadge}>
                                  최근 급상승
                                </Text>
                              ) : null}
                            </View>
                            <Text numberOfLines={1} style={styles.referencePlaceTitle}>
                              {formatMapPlaceName(place.name)}
                            </Text>
                            <Text numberOfLines={1} style={styles.referencePlaceMeta}>
                              {safeProfile.label} · {getDisplayHomeCategory(place.category)}
                            </Text>
                            {sheetSnap !== "peek" ? (
                              <Text numberOfLines={2} style={styles.referencePlaceReason}>
                                {safeProfile.reason}
                              </Text>
                            ) : null}
                            {sheetSnap !== "peek" ? (
                              <>
                                <Text numberOfLines={1} style={styles.referencePlaceCaution}>
                                  {safeProfile.caution}
                                </Text>
                                <Text numberOfLines={1} style={styles.referencePlaceDistance}>
                                  {formatHomeDistanceLabel(place, index)}
                                </Text>
                              </>
                            ) : null}
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => onToggleSavedPlace?.(place.id)}
                            style={[styles.referenceSaveButton, saved && styles.referenceSaveButtonActive]}
                          >
                            <Text style={[styles.referenceSaveButtonText, saved && styles.referenceSaveButtonTextActive]}>
                              {saved ? "♥" : "♡"}
                            </Text>
                          </Pressable>
                        </Pressable>
                      );
                    })}
                </ScrollView>
              </>
            ) : (
              <View style={styles.referenceEmptyState}>
                <Text style={styles.referenceEmptyIcon}>⌕</Text>
                <Text style={styles.referenceEmptyText}>반경 내에 {selectedCategoryDisplayLabel}이 없습니다</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      ) : null}
      {false ? (
      <>
      <View pointerEvents="none" style={styles.nightScanline} />
      <View pointerEvents="none" style={styles.neonSweep} />
      <ScrollView
        style={[styles.phone, styles.legacyMapHidden, isDesktop && styles.phoneDesktop]}
        contentContainerStyle={[styles.phoneContent, isDesktop && styles.phoneContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <BrandLogo size={62} />
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>망고베트남</Text>
              <Text style={styles.subBrand}>실패하지 않는 베트남 가이드</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.searchButton}>
            <Text style={styles.searchIcon}>⌕</Text>
          </Pressable>
        </View>

        <View style={styles.mapIntroPanel}>
          <View>
            <Text style={styles.mapIntroEyebrow}>망고베트남 지도</Text>
            <Text style={styles.mapIntroTitle}>검증된 장소만 지도에서 바로 보기</Text>
            <Text style={styles.mapIntroCopy}>카테고리를 고르면 해당 장소만 지도와 하단 카드에 표시돼요.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.mapIntroButton}>
            <Text style={styles.mapIntroButtonText}>인기 장소</Text>
          </Pressable>
        </View>

        <View style={styles.controlPanel}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlLabel}>도시 선택</Text>
            <Text style={styles.controlHint}>지도 중심 변경</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityRailScroll} contentContainerStyle={styles.cityRail}>
            {mapDestinations.map((destination) => {
              const selected = selectedMapDestination === destination;
              return (
                <Pressable
                  key={destination}
                  accessibilityRole="button"
                  onPress={() => setSelectedMapDestination(destination)}
                  style={[styles.cityChip, selected && styles.cityChipActive]}
                >
                  <Text style={[styles.cityText, selected && styles.cityTextActive]}>{destination}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.controlDivider} />

          <View style={styles.controlHeader}>
            <Text style={styles.controlLabel}>장소 필터</Text>
            <Text style={styles.controlHint}>{selectedCategory.label} 레이어 보기</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
            {mapCategories.map((category) => {
              const selected = selectedCategoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedCategoryId(category.id)}
                  style={[
                    styles.categoryChip,
                    selected && styles.categoryChipActive,
                    selected && { borderColor: category.dot, backgroundColor: `${category.dot}24` }
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{getHomeCategoryEmoji(category.id)}</Text>
                  <View style={styles.categoryTextWrap}>
                    <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{category.label}</Text>
                    <Text style={styles.categoryCount}>{countHomeCategoryPlaces(selectedMapDestination, category)}곳</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.mapCanvas}>
          <InteractiveHomeMap html={mapHtml} />
        </View>

        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>{visibleFocusedPlace ? "탐색에서 선택한 장소" : "오늘의 여행 레이어"}</Text>
              <Text style={styles.sheetTitle}>{visibleFocusedPlace ? formatMapPlaceName(visibleFocusedPlace?.name ?? selectedCategory.label) : selectedCategory.label}</Text>
              <Text style={styles.sheetCopy}>
                {visibleFocusedPlace
                  ? `${visibleFocusedPlace?.category ?? selectedCategory.label} · ${visibleFocusedPlace?.area ?? selectedMapDestination}`
                  : `${selectedCategory.copy} · 확대하면 더 많은 장소가 보여요`}
              </Text>
            </View>
            <View style={[styles.sheetIcon, { backgroundColor: selectedCategory.dot }]}>
              <Text style={styles.sheetIconText}>{selectedCategory.icon}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <InfoPill label="전체 후보" value={`${selectedCategoryCount}곳`} />
            <InfoPill label="지도 표시" value={`${visibleMapMarkerCount}곳`} />
            <InfoPill label="날씨" value={formatWeatherValue(liveInfo)} />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenPlaces(selectedCategory.filterId, selectedMapDestination)}
              style={(state) => {
                const hovered = Boolean((state as unknown as { hovered?: boolean }).hovered);
                return [styles.primaryAction, hovered && styles.primaryActionHover, state.pressed && styles.primaryActionPressed];
              }}
            >
              <Text style={styles.primaryActionText}>{visibleFocusedPlace ? "같은 카테고리 보기" : "자세히 보기"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openReportFromHome} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>제보</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
      </>
      ) : null}
      <QualityRequestSheet
        requestType={qualityRequestType}
        city={selectedMapDestination}
        form={qualityRequestForm}
        status={qualityRequestStatus}
        submitting={qualityRequestSubmitting}
        onChange={updateQualityRequestForm}
        onClose={closeQualityRequest}
        onPresetPress={addQualityRequestPreset}
        onSubmit={submitQualityRequest}
      />
    </SafeAreaView>
  );
}

function CommunityAction({ title, copy, badge, actionLabel, onPress }: { title: string; copy: string; badge: string; actionLabel: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.communityCard}>
      <View style={styles.communityCardTop}>
        <Text style={styles.communityCardTitle}>{title}</Text>
        <Text style={styles.communityBadge}>{badge}</Text>
      </View>
      <Text style={styles.communityCardCopy}>{copy}</Text>
      <Text style={styles.communityActionText}>{actionLabel}</Text>
    </Pressable>
  );
}

function QualityRequestSheet({
  requestType,
  city,
  form,
  status,
  submitting,
  onChange,
  onClose,
  onPresetPress,
  onSubmit
}: {
  requestType: QualityRequestType | null;
  city: Destination;
  form: QualityRequestForm;
  status: string;
  submitting: boolean;
  onChange: (updates: Partial<QualityRequestForm>) => void;
  onClose: () => void;
  onPresetPress: (preset: string) => void;
  onSubmit: () => void;
}) {
  if (!requestType) return null;

  const config = qualityRequestConfigs[requestType];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.qualityOverlay}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.qualityBackdrop} />
        <View style={styles.qualitySheet}>
          <View style={styles.qualityHandle} />
          <View style={styles.qualityHeader}>
            <View style={styles.qualityHeaderCopy}>
              <Text style={styles.qualityEyebrow}>{config.eyebrow}</Text>
              <Text style={styles.qualityTitle}>{config.title}</Text>
              <Text style={styles.qualityCopy}>{config.copy}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.qualityCloseButton}>
              <Text style={styles.qualityCloseText}>닫기</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.qualityForm}>
            <View style={styles.qualityContextBox}>
              <Text style={styles.qualityContextLabel}>현재 도시</Text>
              <Text style={styles.qualityContextValue}>{city}</Text>
            </View>

            <Text style={styles.qualityLabel}>{config.nameLabel}</Text>
            <TextInput
              value={form.name}
              onChangeText={(text) => onChange({ name: text })}
              placeholder={config.namePlaceholder}
              placeholderTextColor="rgba(35,44,59,0.46)"
              style={styles.qualityInput}
            />

            <Text style={styles.qualityLabel}>지역/주소</Text>
            <TextInput
              value={form.area}
              onChangeText={(text) => onChange({ area: text })}
              placeholder="예: 1군 벤탄 근처, 다낭 미케비치 앞"
              placeholderTextColor="rgba(35,44,59,0.46)"
              style={styles.qualityInput}
            />

            <Text style={styles.qualityLabel}>Google Maps 링크 <Text style={styles.qualityOptional}>(선택)</Text></Text>
            <TextInput
              value={form.googleMapsUri}
              onChangeText={(text) => onChange({ googleMapsUri: text })}
              placeholder="링크가 있으면 검토가 더 빨라요"
              placeholderTextColor="rgba(35,44,59,0.46)"
              style={styles.qualityInput}
              autoCapitalize="none"
            />

            <Text style={styles.qualityLabel}>{config.detailLabel}</Text>
            <View style={styles.qualityPresetRail}>
              {config.presets.map((preset) => (
                <Pressable key={preset} accessibilityRole="button" onPress={() => onPresetPress(preset)} style={styles.qualityPresetChip}>
                  <Text style={styles.qualityPresetText}>{preset}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={form.detail}
              onChangeText={(text) => onChange({ detail: text })}
              placeholder={config.detailPlaceholder}
              placeholderTextColor="rgba(35,44,59,0.46)"
              style={[styles.qualityInput, styles.qualityTextArea]}
              multiline
              textAlignVertical="top"
            />

            {status ? <Text style={styles.qualityStatusText}>{status}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={onSubmit}
              style={[styles.qualitySubmitButton, submitting && styles.qualitySubmitButtonDisabled]}
            >
              <Text style={styles.qualitySubmitText}>{submitting ? "저장 중..." : "검토 요청 보내기"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TrustSignalCard({ title, value, copy, onPress }: { title: string; value: string; copy: string; onPress?: () => void }) {
  const content = (
    <View style={styles.trustSignalCard}>
      <Text style={styles.trustSignalTitle}>{title}</Text>
      <Text style={styles.trustSignalValue}>{value}</Text>
      <Text style={styles.trustSignalCopy}>{copy}</Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
}

function TodayQuickCard({ title, value, copy, onPress }: { title: string; value: string; copy: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.todayQuickCard}>
      <Text style={styles.todayQuickValue}>{value}</Text>
      <Text style={styles.todayQuickTitle}>{title}</Text>
      <Text style={styles.todayQuickCopy}>{copy}</Text>
    </Pressable>
  );
}

function TopSavedPlaceCard({ place, rank, onPress }: { place: CuratedPlace; rank: number; onPress: () => void }) {
  const imageUrl = getFocusedPlaceImageUrl(place);
  const reviewCount = getHomeKoreanReviewCount(place);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.topSavedCard}>
      <View style={styles.topSavedImageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.topSavedImage} resizeMode="cover" />
        ) : (
          <View style={styles.topSavedImageEmpty}>
            <Text style={styles.topSavedImageEmptyText}>사진 준비중</Text>
          </View>
        )}
        <Text style={styles.topSavedRank}>{rank}</Text>
      </View>
      <View style={styles.topSavedCardBody}>
        <Text style={styles.topSavedCategory}>{getDisplayHomeCategory(place.category)}</Text>
        <Text style={styles.topSavedPlaceName} numberOfLines={2}>{formatMapPlaceName(place.name)}</Text>
        <View style={styles.topSavedMetaRow}>
          <Text style={styles.topSavedRating}>★ {formatHomePlaceRating(place)}</Text>
          <Text style={styles.topSavedMeta}>한국인 후기 {reviewCount}개</Text>
        </View>
        <Text style={styles.topSavedVerified}>{formatHomeVerifiedLabel(place)}</Text>
      </View>
    </Pressable>
  );
}

function TodayHotSpotRow({ place, rank, onPress }: { place: CuratedPlace; rank: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.todayHotRow}>
      <Text style={styles.todayHotRank}>{rank}</Text>
      <View style={styles.todayHotCopy}>
        <Text style={styles.todayHotTitle} numberOfLines={1}>{formatMapPlaceName(place.name)}</Text>
        <Text style={styles.todayHotMeta} numberOfLines={1}>
          평점 {formatHomePlaceRating(place)} · {place.area || place.city} · 최근 확인
        </Text>
      </View>
      <Text style={styles.todayHotCategory}>{getDisplayHomeCategory(place.category)}</Text>
    </Pressable>
  );
}

function RecentKoreanReviewCard({ item, onPress }: { item: HomeReviewItem; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.recentReviewCard}>
      <View style={styles.recentReviewAvatar}>
        <Text style={styles.recentReviewAvatarText}>{item.nickname.slice(0, 1)}</Text>
      </View>
      <View style={styles.recentReviewCopy}>
        <View style={styles.recentReviewTop}>
          <Text style={styles.recentReviewName}>{item.nickname}</Text>
          <Text style={styles.recentReviewRating}>{"●".repeat(Math.max(1, Math.min(5, Math.round(item.rating))))}</Text>
        </View>
        <Text style={styles.recentReviewText} numberOfLines={2}>{item.content}</Text>
        <Text style={styles.recentReviewPlace} numberOfLines={1}>{formatMapPlaceName(item.place.name)} · {item.tags.slice(0, 2).join(" · ")}</Text>
      </View>
    </Pressable>
  );
}

function TodayActivityRow({ item, onPress }: { item: HomeActivityItem; onPress: () => void }) {
  const typeLabel = item.type === "meetup" ? "모임" : item.type === "market" ? "장터" : item.type === "talk" ? "생활톡" : "제보";
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.todayActivityRow}>
      <Text style={styles.todayActivityType}>{typeLabel}</Text>
      <View style={styles.todayActivityCopy}>
        <Text style={styles.todayActivityTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.todayActivityMeta} numberOfLines={1}>{item.meta}</Text>
      </View>
    </Pressable>
  );
}

function buildHomeSituationGuides(city: MapDestination, places: CuratedPlace[]): HomeGuideCard[] {
  const topNames = places.slice(0, 3).map((place) => formatMapPlaceName(place.name));
  const updatedLabel = places[0] ? formatHomeVerifiedLabel(places[0]) : "최근 확인 준비중";
  const fallbackNames = topNames.length > 0 ? topNames : ["검증 후보 준비중"];

  return [
    {
      id: "first-dinner",
      situation: "첫날 저녁",
      title: `${city} 첫날 저녁 실패 낮은 식당 7곳`,
      target: "초행자 · 커플 · 가족",
      copy: "도착 첫날에는 맛보다 동선, 가격, 주문 난이도가 더 중요해요.",
      placeNames: fallbackNames,
      updatedLabel,
      filterId: "all"
    },
    {
      id: "parents",
      situation: "부모님",
      title: `부모님 모시고 가기 무난한 ${city} 식당`,
      target: "가족여행 · 노부모 동반",
      copy: "좌석, 청결, 메뉴 선택, 택시 접근성을 먼저 보는 리스트예요.",
      placeNames: fallbackNames,
      updatedLabel,
      filterId: "korean"
    },
    {
      id: "local-beginner",
      situation: "로컬 입문",
      title: `베트남 음식 초보도 실패 적은 ${city} 로컬 맛집`,
      target: "첫 방문 · 현지식 입문",
      copy: "로컬 분위기는 살리되 주문과 맛의 호불호 리스크를 낮췄어요.",
      placeNames: fallbackNames,
      updatedLabel,
      filterId: "vietnamese"
    },
    {
      id: "business",
      situation: "접대",
      title: `한국 손님 접대할 때 무난한 ${city} 식당`,
      target: "출장자 · 거주자",
      copy: "분위기, 예약, 가격 예측 가능성을 함께 보는 접대 후보예요.",
      placeNames: fallbackNames,
      updatedLabel,
      filterId: "all"
    }
  ];
}

function countHomeCategoryPlaces(destination: MapDestination, category: MapCategory) {
  const count = getHomeMapPlaces(destination, category.id).length;
  return count || cityCounts[category.id] || 0;
}

function countHomeMappableCategoryPlaces(destination: MapDestination, category: MapCategory) {
  return getHomeSafeMapPlaces(destination, category.id).length;
}

function getHomeCategoryEmoji(categoryId: string) {
  const emojis: Record<string, string> = {
    food: "🍜",
    vietnamese: "VN",
    cafe: "☕",
    massage: "💆",
    rooftop: "🍸",
    korean: "한",
    chinese: "中",
    japanese: "日",
    tour: "📍"
  };
  return emojis[categoryId] ?? "📌";
}

function getHomeKoreanReviewCount(place: CuratedPlace) {
  return getMangoCommentCount(place);
}

function formatHomeVerifiedLabel(place: CuratedPlace) {
  if (!place.lastVerifiedAt) return "최근 확인 준비중";
  const verifiedAt = new Date(`${place.lastVerifiedAt}T00:00:00`);
  if (Number.isNaN(verifiedAt.getTime())) return "최근 확인 준비중";
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const verifiedMidnight = new Date(verifiedAt.getFullYear(), verifiedAt.getMonth(), verifiedAt.getDate());
  const diffDays = Math.max(0, Math.floor((todayMidnight.getTime() - verifiedMidnight.getTime()) / 86400000));
  if (diffDays === 0) return "오늘 확인";
  if (diffDays === 1) return "1일 전 확인";
  if (diffDays <= 30) return `${diffDays}일 전 확인`;
  return `${verifiedAt.getMonth() + 1}/${verifiedAt.getDate()} 확인`;
}

function buildRecentKoreanReviews(places: CuratedPlace[]): HomeReviewItem[] {
  return places
    .flatMap((place) =>
      getRealisticPlaceReviews(place, 2).slice(0, 2).map((review, index) => ({
        id: `${place.id}-${index}`,
        place,
        nickname: review.nickname || "여행자",
        rating: review.rating || 5,
        content: review.content,
        tags: review.tags ?? []
      }))
    )
    .filter((item) => item.content.trim().length > 0)
    .slice(0, 4);
}

function getTodayHotScore(place: CuratedPlace) {
  return getMangoRankScore(place, { surface: "home" });
}

function formatHomePlaceRating(place: CuratedPlace) {
  const rating = place.rating ?? 4.5;
  return rating.toFixed(1);
}

async function loadHomeActivitySnapshot(destination: MapDestination): Promise<HomeActivitySnapshot> {
  if (!isSupabaseConfigured()) return { ...emptyHomeActivity, loaded: true };

  const encodedDestination = encodeURIComponent(destination);
  const [meetups, marketItems, communityPosts, placeReports] = await Promise.all([
    supabaseSelect<HomeMeetupRow>(
      "meetups",
      `select=id,title,category,city,status,created_at&city=eq.${encodedDestination}&status=eq.open&order=created_at.desc&limit=8`
    ).catch(() => []),
    supabaseSelect<HomeMarketRow>(
      "market_items",
      `select=id,title,price_label,city,status,created_at&city=eq.${encodedDestination}&status=in.(selling,reserved)&order=created_at.desc&limit=8`
    ).catch(() => []),
    supabaseSelect<HomeCommunityPostRow>(
      "community_posts",
      `select=id,title,category,city,comments_count,created_at&city=eq.${encodedDestination}&status=eq.open&order=created_at.desc&limit=8`
    ).catch(() => []),
    supabaseSelect<HomePlaceReportRow>(
      "place_reports",
      `select=id,name,category,city,status,created_at&city=eq.${encodedDestination}&order=created_at.desc&limit=8`
    ).catch(() => [])
  ]);

  const latestItems = [
    ...meetups.slice(0, 2).map<HomeActivityItem>((row) => ({
      id: row.id,
      type: "meetup",
      title: formatHomeActivityTitle(row.title, "새 모임이 올라왔어요"),
      meta: `${row.category ?? "번개"} · ${formatHomeRelativeTime(row.created_at)}`
    })),
    ...marketItems.slice(0, 2).map<HomeActivityItem>((row) => ({
      id: row.id,
      type: "market",
      title: formatHomeActivityTitle(row.title, "새 장터 글이 올라왔어요"),
      meta: `${row.price_label || "가격 확인"} · ${formatHomeRelativeTime(row.created_at)}`
    })),
    ...communityPosts.slice(0, 2).map<HomeActivityItem>((row) => ({
      id: row.id,
      type: "talk",
      title: formatHomeActivityTitle(row.title, "새 생활톡이 올라왔어요"),
      meta: `댓글 ${row.comments_count ?? 0} · ${formatHomeRelativeTime(row.created_at)}`
    })),
    ...placeReports.slice(0, 1).map<HomeActivityItem>((row) => ({
      id: row.id,
      type: "report",
      title: formatHomeActivityTitle(row.name, "새 스팟 제보가 올라왔어요"),
      meta: `${row.status ?? "검토중"} · ${formatHomeRelativeTime(row.created_at)}`
    }))
  ]
    .sort((a, b) => getHomeActivityTypeWeight(a.type) - getHomeActivityTypeWeight(b.type))
    .slice(0, 4);

  return {
    meetupCount: meetups.length,
    marketCount: marketItems.length,
    talkCount: communityPosts.length,
    reportCount: placeReports.length,
    latestItems,
    loaded: true
  };
}

function getHomeActivityTypeWeight(type: HomeActivityItem["type"]) {
  if (type === "meetup") return 1;
  if (type === "market") return 2;
  if (type === "talk") return 3;
  return 4;
}

function formatHomeActivityTitle(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 4) return fallback;
  if (/^[0-9ㄱ-ㅎㅏ-ㅣㅇㅋㅎ\s.?!]+$/i.test(normalized)) return fallback;
  return normalized;
}

function formatHomeRelativeTime(value?: string) {
  if (!value) return "방금";
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) return "방금";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.floor(diffHours / 24)}일 전`;
}

function getHomeVisiblePlaces(destination: MapDestination, categoryId: string) {
  return dedupeHomePlaces(
    curatedPlaces.filter((place) => place.city === destination && matchHomeCategory(place, categoryId) && isHomeVisiblePlace(place))
  );
}

function getHomeMapPlaces(destination: MapDestination, categoryId: string) {
  return dedupeHomePlaces(
    curatedPlaces.filter((place) => place.city === destination && matchHomeCategory(place, categoryId) && !isHomeSuppressedPlace(place))
  );
}

function getHomeSafeMapPlaces(destination: MapDestination, categoryId: string) {
  return getHomeMapPlaces(destination, categoryId)
    .filter((place) => hasSafeHomeMapCoordinates(place, destination))
    .sort((left, right) => compareMangoSafeChoices(left, right, { surface: "map", categoryId }));
}

function matchHomeCategory(place: CuratedPlace, categoryId: string) {
  if (categoryId === "food") return isHomeFoodGuidePlace(place);
  if (categoryId === "vietnamese") return isVietnameseHomePlace(place);
  if (categoryId === "cafe") return matchesStrictCategory(place, "cafe");
  if (categoryId === "massage") return matchesStrictCategory(place, "massage");
  if (categoryId === "rooftop") return matchesStrictCategory(place, "rooftop");
  if (categoryId === "korean") return matchesStrictCategory(place, "korean");
  if (categoryId === "chinese") return isChineseHomePlace(place);
  if (categoryId === "japanese") return isJapaneseHomePlace(place);
  if (categoryId === "tour" || categoryId === "photo") return matchesStrictCategory(place, "tour");
  return false;
}

function isHomeFoodGuidePlace(place: CuratedPlace) {
  if (isHomeNonFoodGuideCategory(place)) return false;
  return place.category === "맛집" || place.category === "카페" || matchesStrictCategory(place, "korean") || isChineseHomePlace(place) || isJapaneseHomePlace(place);
}

function isHomeNonFoodGuideCategory(place: CuratedPlace) {
  return ["마사지", "바/루프탑", "가라오케", "쇼핑", "환전", "사진명소", "투어/액티비티"].includes(place.category);
}

function isChineseHomePlace(place: CuratedPlace) {
  const haystack = `${place.name} ${place.category} ${place.tags.join(" ")}`.toLowerCase();
  return (
    place.tags.includes("중식당") ||
    place.tags.includes("한국식중식") ||
    haystack.includes("chinese") ||
    haystack.includes("jjamppong") ||
    haystack.includes("jjambbong") ||
    haystack.includes("jajang") ||
    haystack.includes("dim sum") ||
    haystack.includes("딤섬") ||
    haystack.includes("짬뽕") ||
    haystack.includes("짜장")
  );
}

function isVietnameseHomePlace(place: CuratedPlace) {
  return place.category === "맛집" && !matchesStrictCategory(place, "korean") && !isChineseHomePlace(place) && !isJapaneseHomePlace(place);
}

function isJapaneseHomePlace(place: CuratedPlace) {
  const haystack = `${place.name} ${place.category} ${place.tags.join(" ")}`.toLowerCase();
  return (
    place.tags.includes("일식당") ||
    haystack.includes("japanese") ||
    haystack.includes("sushi") ||
    haystack.includes("ramen") ||
    haystack.includes("izakaya") ||
    haystack.includes("스시") ||
    haystack.includes("라멘") ||
    haystack.includes("이자카야")
  );
}

function hasSafeHomeMapCoordinates(place: CuratedPlace, destination: MapDestination) {
  const coordinates = getHomeMapCoordinates(place);
  if (!coordinates) return false;
  return isCoordinateInsideDestination(destination, coordinates.lat, coordinates.lng);
}

function hasUsableHomeMapCoordinates(place: CuratedPlace) {
  return Boolean(getHomeMapCoordinates(place));
}

function getHomeMapCoordinates(place: CuratedPlace) {
  const coordinates = place.coordinates as
    | {
        latitude?: number;
        longitude?: number;
        lat?: number;
        lng?: number;
      }
    | undefined;
  if (!coordinates) return undefined;
  const lat = Number(coordinates.latitude ?? coordinates.lat);
  const lng = Number(coordinates.longitude ?? coordinates.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function getMapCategoryIdFromPlace(place: CuratedPlace) {
  const category = getStrictPlaceCategory(place);
  if (isChineseHomePlace(place)) return "chinese";
  if (isJapaneseHomePlace(place)) return "japanese";
  return category === "tour" ? "photo" : category;
}

function formatMapPlaceName(name: string) {
  return name
    .replace(/\s+-\s*(vietnamese cuisine|vietnamese food|vegetarian food|vegan food).*$/i, "")
    .replace(/\s*&\s*(vegetarian|vegan).*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getDisplayHomeCategory(category: CuratedPlace["category"]) {
  return category === "사진명소" ? "관광명소" : category;
}

function formatHomeDistanceLabel(place: CuratedPlace, index: number) {
  const distanceKm = Math.max(0.4, Math.min(6.8, 0.5 + index * 0.4));
  const area = place.area ? `${place.area} · ` : "";
  return `${area}${distanceKm.toFixed(1)}km`;
}

function InteractiveHomeMap({ html }: { html: string }) {
  if (Platform.OS === "web") {
    return createElement("iframe", {
      srcDoc: html,
      style: {
        border: 0,
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block"
      },
      loading: "lazy",
      allowFullScreen: true,
      referrerPolicy: "no-referrer-when-downgrade",
      title: "Mango Vietnam live Google map"
    } as any);
  }

  return (
    <View style={styles.mapFallback}>
      <Text style={styles.mapFallbackText}>앱 빌드에서는 Google Maps SDK 지도가 들어갑니다.</Text>
    </View>
  );
}

function buildGoogleMapHtml(destination: MapDestination, selectedCategory: MapCategory, focusedPlace?: CuratedPlace) {
  const cityCenter: Record<MapDestination, [number, number]> = {
    호치민: [10.7769, 106.7009],
    다낭: [16.0544, 108.2022],
    나트랑: [12.2388, 109.1967],
    하노이: [21.0278, 105.8342],
    달랏: [11.9404, 108.4583],
    푸꾸옥: [10.2899, 103.984]
  };
  const cityZoom: Record<MapDestination, number> = {
    호치민: 12,
    다낭: 13,
    나트랑: 13,
    하노이: 13,
    달랏: 13,
    푸꾸옥: 12
  };
  const citySpots: Record<MapDestination, Record<string, { title: string; sub: string }[]>> = {
    호치민: {
      food: [{ title: "Hai's Restaurant", sub: "베트남 맛집" }, { title: "A Taste of Saigon", sub: "벤탄 근처 맛집" }, { title: "Phở Việt Nam", sub: "쌀국수" }],
      cafe: [{ title: "XLIII Coffee", sub: "스페셜티 카페" }, { title: "Okkio Cafe", sub: "감성 카페" }, { title: "Maison Marou", sub: "디저트 카페" }],
      rooftop: [{ title: "Saigon Saigon Rooftop", sub: "루프탑 바" }, { title: "Bui Vien Walking Street", sub: "밤거리" }],
      photo: [{ title: "Cafe Apartment", sub: "관광명소" }, { title: "Nguyen Hue Street", sub: "산책·사진" }],
      market: [{ title: "Ben Thanh Market", sub: "시장·기념품" }, { title: "Saigon Square", sub: "쇼핑" }],
      exchange: [{ title: "Ha Tam Jewelry", sub: "환전 후보" }, { title: "Kim Mai Gold", sub: "환전 후보" }],
      massage: [{ title: "Golden Lotus Spa", sub: "마사지" }, { title: "Moc Huong Spa", sub: "마사지" }],
      karaoke: [{ title: "Karaoke District 1", sub: "가라오케" }]
    },
    다낭: {
      food: [{ title: "Bếp Cuốn Đà Nẵng", sub: "베트남 가정식" }, { title: "Madame Lân", sub: "다낭 인기 맛집" }, { title: "Mì Quảng Bà Mua", sub: "미꽝" }],
      cafe: [{ title: "NAM House Cafe", sub: "레트로 카페" }, { title: "Wonderlust Cafe", sub: "브런치 카페" }, { title: "43 Factory Coffee", sub: "스페셜티" }],
      rooftop: [{ title: "Sky36", sub: "루프탑 바" }, { title: "Dragon Bridge Night", sub: "야경" }],
      photo: [{ title: "My Khe Beach", sub: "해변 사진" }, { title: "Dragon Bridge", sub: "야경 사진" }],
      market: [{ title: "Han Market", sub: "시장·쇼핑" }, { title: "Son Tra Night Market", sub: "야시장" }],
      exchange: [{ title: "Soan Ha Jewelry", sub: "환전 후보" }, { title: "Kim Yen Gold", sub: "환전 후보" }],
      massage: [{ title: "Herbal Spa", sub: "마사지" }, { title: "Queen Spa", sub: "마사지" }],
      karaoke: [{ title: "Karaoke Đà Nẵng Center", sub: "가라오케" }]
    },
    나트랑: {
      food: [{ title: "Galangal", sub: "베트남 음식" }, { title: "Lac Canh", sub: "로컬 BBQ" }, { title: "Nem Nướng Đặng Văn Quyên", sub: "넴느엉" }],
      cafe: [{ title: "Rainforest Cafe", sub: "감성 카페" }, { title: "An Cafe", sub: "휴식 카페" }, { title: "Iced Coffee", sub: "시내 카페" }],
      rooftop: [{ title: "Skylight Nha Trang", sub: "루프탑 바" }, { title: "Sailing Club", sub: "비치 클럽" }],
      photo: [{ title: "Tran Phu Beach", sub: "해변 사진" }, { title: "Po Nagar Tower", sub: "관광 사진" }],
      market: [{ title: "Dam Market", sub: "시장" }, { title: "Nha Trang Center", sub: "쇼핑" }],
      exchange: [{ title: "Kim Vinh Jewelry", sub: "환전 후보" }, { title: "Kim Chung Jewelry", sub: "환전 후보" }],
      massage: [{ title: "I-Resort Mud Bath", sub: "온천·스파" }, { title: "Sen Spa Nha Trang", sub: "마사지" }],
      karaoke: [{ title: "Karaoke Nha Trang Center", sub: "가라오케" }]
    },
    하노이: {
      food: [{ title: "Bún Chả Hương Liên", sub: "분짜" }, { title: "Phở Thìn", sub: "쌀국수" }, { title: "Bánh Mì 25", sub: "반미" }],
      cafe: [{ title: "Cafe Giảng", sub: "전통 커피" }, { title: "Loading T Cafe", sub: "감성 카페" }, { title: "The Note Coffee", sub: "사진 카페" }],
      rooftop: [{ title: "Ta Hien Beer Street", sub: "맥주거리" }, { title: "Summit Lounge", sub: "루프탑" }],
      photo: [{ title: "Hoan Kiem Lake", sub: "산책·사진" }, { title: "Train Street", sub: "관광명소" }],
      market: [{ title: "Dong Xuan Market", sub: "시장" }, { title: "Hang Gai Street", sub: "쇼핑" }],
      exchange: [{ title: "Quoc Trinh Gold", sub: "환전 후보" }, { title: "Ha Trung Street Exchange", sub: "환전 거리" }],
      massage: [{ title: "SF Spa Hanoi", sub: "마사지" }, { title: "La Spa Hanoi", sub: "마사지" }],
      karaoke: [{ title: "Karaoke Old Quarter", sub: "가라오케" }]
    },
    달랏: {
      food: [{ title: "Bánh Căn Nhà Chung", sub: "달랏 로컬 맛집" }, { title: "Lẩu Gà Lá É Tao Ngộ", sub: "닭전골" }, { title: "Artist Alley", sub: "분위기 맛집" }],
      cafe: [{ title: "Kokoro Cafe", sub: "사진 카페" }, { title: "Still Cafe", sub: "감성 카페" }, { title: "Túi Mơ To", sub: "전망 카페" }],
      rooftop: [{ title: "Maze Bar", sub: "밤 코스" }, { title: "Dalat Night Market", sub: "야시장" }],
      photo: [{ title: "Dalat Railway Station", sub: "관광명소" }, { title: "Linh Phuoc Pagoda", sub: "관광 사진" }],
      market: [{ title: "Dalat Market", sub: "시장" }, { title: "Dalat Night Market", sub: "야시장" }],
      exchange: [{ title: "Dalat Gold Shop", sub: "환전 후보" }, { title: "Hoa Binh Area Exchange", sub: "환전 후보" }],
      massage: [{ title: "Dalat Spa", sub: "마사지" }, { title: "Herbal Spa Dalat", sub: "마사지" }],
      karaoke: [{ title: "Karaoke Đà Lạt Center", sub: "가라오케" }]
    },
    푸꾸옥: {
      food: [{ title: "Xin Chào Restaurant", sub: "해산물" }, { title: "Ra Khơi", sub: "로컬 해산물" }, { title: "Crab House", sub: "크랩" }],
      cafe: [{ title: "Chuồn Chuồn Bistro", sub: "전망 카페" }, { title: "Son Tra Hill Coffee", sub: "카페" }, { title: "Phu Quoc Coffee House", sub: "휴식 카페" }],
      rooftop: [{ title: "Sunset Sanato", sub: "선셋 바" }, { title: "OCSEN Beach Bar", sub: "비치 바" }],
      photo: [{ title: "Sunset Town", sub: "관광명소" }, { title: "Sao Beach", sub: "해변 사진" }],
      market: [{ title: "Phu Quoc Night Market", sub: "야시장" }, { title: "Duong Dong Market", sub: "시장" }],
      exchange: [{ title: "Duong Dong Gold Shop", sub: "환전 후보" }, { title: "Phu Quoc Money Exchange", sub: "환전 후보" }],
      massage: [{ title: "Luna Thai Spa", sub: "마사지" }, { title: "La Veranda Spa", sub: "마사지" }],
      karaoke: [{ title: "Karaoke Phu Quoc Center", sub: "가라오케" }]
    }
  };
  const focusedCoordinates = focusedPlace ? getHomeMapCoordinates(focusedPlace) : undefined;
  const focusCenter = focusedCoordinates
    ? ([focusedCoordinates.lat, focusedCoordinates.lng] as [number, number])
    : undefined;
  const [lat, lng] = focusCenter ?? cityCenter[destination];
  const baseZoom = cityZoom[destination];
  const initialZoom = focusCenter ? 16 : baseZoom;
  const focusedZoom = destination === "푸꾸옥" || destination === "호치민" ? 16 : 17;
  const selectedMarkerLimit = Math.min(getHomeSafeMapPlaces(destination, selectedCategory.id).length, 8);
  const markers = mapCategories.flatMap((category) =>
    getGoogleBackedMapSpots(destination, category, citySpots[destination][category.id] ?? [], category.id === selectedCategory.id ? selectedMarkerLimit : 0).map((spot, index) => {
      const activeCategory = category.id === selectedCategory.id;
      const markerOffset = activeCategory ? getHomeMarkerOffset(index) : { lat: 0, lng: 0 };
      return {
        id: category.id,
        title: spot.title,
        sub: spot.sub,
        description: spot.description,
        imageUrl: spot.imageUrl,
        mapsUri: spot.mapsUri,
        query: spot.query,
        rating: spot.rating,
        reviewCount: spot.reviewCount,
        mangoRecommendationCount: spot.mangoRecommendationCount,
        mangoCommentCount: spot.mangoCommentCount,
        priceLevel: spot.priceLevel,
        area: spot.area,
        address: spot.address,
        bestTime: spot.bestTime,
        checkHint: spot.checkHint,
        rank: index + 1,
        markerLabel: activeCategory ? `#${index + 1}` : category.label,
        labelVisible: activeCategory && index === 0,
        visibleFromZoom: activeCategory ? baseZoom : baseZoom + 3,
        labelFromZoom: activeCategory ? baseZoom + 2 : 16,
        lat: spot.coordinates.lat + markerOffset.lat,
        lng: spot.coordinates.lng + markerOffset.lng,
        color: category.dot
      };
    })
  );
  const activeMarkers = markers.map((marker) => ({
    ...marker,
    active: marker.id === selectedCategory.id
  }));
  const focusedMapPlace = focusedPlace && focusedCoordinates ? focusedPlace : undefined;
  const focusedSafeProfile = focusedMapPlace ? getMangoSafeChoiceProfile(focusedMapPlace, { surface: "map", categoryId: selectedCategory.id }) : undefined;
  const focusMarker = focusedMapPlace && focusedCoordinates
    ? {
        id: "focused",
        title: formatMapPlaceName(focusedMapPlace.name),
        sub: `${getDisplayHomeCategory(focusedMapPlace.category)} · ${focusedMapPlace.area ?? destination}`,
        description: focusedSafeProfile?.reason ?? buildMapPlaceDescription(focusedMapPlace),
        imageUrl: getFocusedPlaceImageUrl(focusedMapPlace),
        lat: focusedCoordinates.lat,
        lng: focusedCoordinates.lng,
        color: selectedCategory.dot,
        active: true,
        mapsUri: focusedMapPlace.googleMapsUri,
        query: `${focusedMapPlace.name} ${destination}`,
        rating: focusedMapPlace.rating,
        reviewCount: getMangoCommentCount(focusedMapPlace),
        mangoRecommendationCount: getMangoRecommendationCount(focusedMapPlace),
        mangoCommentCount: getMangoCommentCount(focusedMapPlace),
        priceLevel: focusedMapPlace.priceLevel,
        area: focusedMapPlace.area,
        address: getHomeMapAddressLabel(destination, focusedMapPlace),
        bestTime: focusedMapPlace.bestTime[0],
        checkHint: focusedSafeProfile?.label ?? getMapPlaceCheckHint(focusedMapPlace),
        rank: 1,
        markerLabel: "선택",
        labelVisible: true,
        visibleFromZoom: 0,
        labelFromZoom: 0
      }
    : undefined;
  const renderMarkers = focusMarker ? [...activeMarkers.filter((marker) => marker.id !== selectedCategory.id), focusMarker] : activeMarkers;
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const fallbackMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${destination} ${selectedCategory.label}`)}`;

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; background: #FFF7DF; overflow: hidden; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .fallback {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 24px;
      color: #1F2937;
      text-align: center;
      background: linear-gradient(145deg, #FFF7DF, #FFE8A3);
    }
    .fallback strong { font-size: 16px; font-weight: 900; }
    .fallback span { color: #6B7280; font-size: 12px; font-weight: 800; line-height: 1.5; }
    .fallback a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      padding: 0 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, #FF7A00, #FF6F0F);
      color: #FFF7F0;
      box-shadow: 0 0 22px rgba(255,122,0,0.28);
      text-decoration: none;
      font-size: 13px;
      font-weight: 900;
    }
    .gm-style { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .custom-popup {
      position: absolute;
      bottom: 14px;
      left: 50%;
      z-index: 5;
      width: min(380px, calc(100% - 24px));
      max-height: calc(100% - 24px);
      transform: translateX(-50%);
      background: #FFFFFF;
      color: #1F2937;
      border: 1px solid rgba(0,79,45,0.16);
      border-radius: 22px;
      box-shadow: 0 18px 44px rgba(0,0,0,0.32);
      overflow: hidden auto;
      pointer-events: auto;
      animation: sheetUp 160ms ease-out;
    }
    .custom-popup[hidden] { display: none; }
    .custom-popup::before {
      content: "";
      position: absolute;
      top: 8px;
      left: 50%;
      width: 44px;
      height: 4px;
      transform: translateX(-50%);
      border-radius: 999px;
      background: rgba(31,41,55,0.18);
      z-index: 4;
    }
    @keyframes sheetUp {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .popup-close {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 4;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: 2px solid rgba(255,255,255,0.96);
      border-radius: 999px;
      background: rgba(0,79,45,0.92);
      color: #FFFFFF;
      font-size: 23px;
      font-weight: 900;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(0,0,0,0.26);
    }
    .popup-close:hover {
      transform: scale(1.04);
      background: #FFB800;
      color: #1F2937;
    }
    .place-popup {
      width: min(380px, calc(100vw - 24px));
      max-width: min(380px, calc(100vw - 24px));
      overflow: hidden;
      border-radius: 20px;
    }
    .place-photo {
      width: 100%;
      height: 168px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #FFF7DF;
      background-image: linear-gradient(135deg, #FFF7DF, #FFD36B);
      background-position: center;
      background-size: cover;
    }
    .place-photo-empty {
      background-image: linear-gradient(135deg, #FFF9E8, #FFE7A8);
    }
    .place-photo span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.78);
      color: #8A5A00;
      font-size: 11px;
      font-weight: 900;
    }
    .place-body { padding: 14px 16px 16px; }
    .place-kicker {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      margin-bottom: 7px;
      padding: 5px 8px;
      border-radius: 999px;
      background: rgba(0,79,45,0.08);
      color: #004F2D;
      font-size: 11px;
      font-weight: 900;
      line-height: 1.15;
      white-space: normal;
    }
    .place-title {
      color: #004F2D;
      font-size: 20px;
      font-weight: 900;
      line-height: 1.26;
      letter-spacing: 0;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .place-sub {
      margin-top: 7px;
      color: #374151;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .place-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }
    .place-meta {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 0 8px;
      border-radius: 999px;
      background: #F1F8F3;
      color: #004F2D;
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
      white-space: nowrap;
    }
    .place-area-line {
      margin-top: 8px;
      color: #4B5563;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.35;
    }
    .place-address {
      margin-top: 8px;
      color: #1F2937;
      font-size: 11px;
      font-weight: 900;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .map-link {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      margin-top: 10px;
      border-radius: 12px;
      background: #004F2D;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 10px 22px rgba(0,79,45,0.20);
    }
    .spot-label {
      transform: translate(-50%, -36px);
      color: #004F2D;
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(0,79,45,0.18);
      border-radius: 999px;
      box-shadow: 0 8px 18px rgba(0,0,0,0.28), 0 0 18px rgba(255,194,51,0.22);
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
      white-space: nowrap;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="customPopup" class="custom-popup" hidden></div>
  <script>
    const markers = ${JSON.stringify(renderMarkers)};
    const apiKey = ${JSON.stringify(apiKey)};
    const fallbackMapUrl = ${JSON.stringify(fallbackMapUrl)};
    const mapStyle = [
      { elementType: "geometry", stylers: [{ color: "#FFF7DF" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#4B5563" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#FFFDF5" }] },
      { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#EBD8A6" }] },
      { featureType: "poi", elementType: "geometry", stylers: [{ color: "#FFE8A3" }] },
      { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#DDECC6" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#F1D9A8" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FFD36B" }] },
      { featureType: "transit", elementType: "geometry", stylers: [{ color: "#F4E5C2" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#BFE3F5" }] }
    ];
    const escapeHtml = (value) => String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const formatRatingMeta = (marker) => typeof marker.rating === "number" ? "★ " + marker.rating.toFixed(1) : undefined;
    const formatReviewMeta = (marker) => {
      const count = Number(marker.mangoCommentCount || 0);
      if (!count) return undefined;
      return "망고리뷰 " + count.toLocaleString("ko-KR") + "개";
    };
    const formatMangoMeta = (marker) => marker.checkHint ? marker.checkHint : "한국어 맥락 정리";
    const formatCommentMeta = () => undefined;
    function renderFallback(message) {
      document.getElementById("map").innerHTML =
        "<div class='fallback'>" +
          "<strong>Google Maps를 불러오지 못했어요</strong>" +
          "<span>" + escapeHtml(message || "API 키와 도메인 제한을 확인해주세요.") + "</span>" +
          "<a target='_top' rel='noopener noreferrer' href='" + escapeHtml(fallbackMapUrl) + "'>Google Maps에서 열기</a>" +
        "</div>";
    }

    let selectedMarkerEntry = null;
    function escapeSvgText(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    function getMarkerIcon(data, selected) {
      const text = String(data.markerLabel || (data.active ? "추천" : data.priceLevel || "M"));
      const width = Math.max(48, Math.min(86, text.length * 16 + 24));
      const height = selected ? 38 : 32;
      const bg = selected ? "#111827" : data.active ? "#FFC233" : "#FFFFFF";
      const fg = selected ? "#FFFFFF" : "#111827";
      const stroke = data.active ? "#FFB800" : "rgba(17,24,39,0.18)";
      const svg =
        "<svg xmlns='http://www.w3.org/2000/svg' width='" + width + "' height='" + height + "' viewBox='0 0 " + width + " " + height + "'>" +
          "<filter id='s' x='-30%' y='-40%' width='160%' height='190%'><feDropShadow dx='0' dy='5' stdDeviation='5' flood-color='rgba(17,24,39,0.25)'/></filter>" +
          "<rect x='2' y='2' width='" + (width - 4) + "' height='" + (height - 8) + "' rx='16' fill='" + bg + "' stroke='" + stroke + "' stroke-width='1.5' filter='url(#s)'/>" +
          "<path d='M" + (width / 2 - 5) + " " + (height - 8) + " L" + (width / 2) + " " + height + " L" + (width / 2 + 5) + " " + (height - 8) + " Z' fill='" + bg + "'/>" +
          "<text x='50%' y='" + (selected ? 22 : 20) + "' text-anchor='middle' font-family='-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' font-size='13' font-weight='900' fill='" + fg + "'>" + escapeSvgText(text) + "</text>" +
        "</svg>";
      return {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(width, height),
        anchor: new google.maps.Point(width / 2, height)
      };
    }
    function clearSelectedMarker() {
      if (selectedMarkerEntry) {
        selectedMarkerEntry.marker.setIcon(getMarkerIcon(selectedMarkerEntry.data, false));
        selectedMarkerEntry.marker.setZIndex(selectedMarkerEntry.data.active ? 20 : 5);
        selectedMarkerEntry = null;
      }
    }
    function closePopup() {
      const popup = document.getElementById("customPopup");
      if (popup) popup.hidden = true;
      clearSelectedMarker();
    }

    function openPopupForMarker(map, entry, content) {
      const popup = document.getElementById("customPopup");
      popup.innerHTML = "<button class='popup-close' type='button' aria-label='Close popup' title='Close'>&times;</button>" + content;
      popup.hidden = false;
      popup.onclick = (event) => event.stopPropagation();
      clearSelectedMarker();
      selectedMarkerEntry = entry;
      entry.marker.setIcon(getMarkerIcon(entry.data, true));
      entry.marker.setZIndex(80);
      const photo = popup.querySelector(".place-photo[data-image-url]");
      if (photo && photo.dataset.imageUrl) {
        photo.style.backgroundImage = "url('" + photo.dataset.imageUrl.replace(/'/g, "\\\\'") + "')";
        photo.textContent = "";
      }
      popup.querySelector(".popup-close").addEventListener("click", (event) => {
        event.stopPropagation();
        closePopup();
      });
      map.panTo(entry.marker.getPosition());
    }

    window.initMangoMap = () => {
      const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: ${lat}, lng: ${lng} },
        zoom: ${initialZoom},
        disableDefaultUI: true,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: false,
        clickableIcons: false,
        gestureHandling: "greedy",
        styles: mapStyle
      });
      map.addListener("click", closePopup);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closePopup();
      });
      let focusedGoogleMarker = null;
      const labelMarkers = [];
      const googleMarkers = [];
      const syncMarkerVisibility = () => {
        const zoom = map.getZoom() || 0;
        googleMarkers.forEach(({ data, marker }) => {
          marker.setMap(data.id === "focused" || zoom >= data.visibleFromZoom ? map : null);
        });
        labelMarkers.forEach(({ data, marker }) => {
          const markerVisible = data.id === "focused" || zoom >= data.visibleFromZoom;
          marker.setMap(markerVisible && (data.labelVisible || (data.active && zoom >= data.labelFromZoom)) ? map : null);
        });
      };
      markers.forEach((marker) => {
      const mapHref = marker.mapsUri || ("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(marker.query));
      const metaItems = [formatRatingMeta(marker), formatReviewMeta(marker), formatMangoMeta(marker), formatCommentMeta(marker)].filter(Boolean);
      const metaHtml = metaItems.length > 0
        ? "<div class='place-meta-row'>" + metaItems.map((item) => "<span class='place-meta'>" + escapeHtml(item) + "</span>").join("") + "</div>"
        : "";
      const areaLine = [marker.area, marker.checkHint].filter(Boolean).join(" · ");
      const addressLine = marker.address || "";
        const googleMarker = new google.maps.Marker({
          position: { lat: marker.lat, lng: marker.lng },
          map: marker.id === "focused" || marker.visibleFromZoom <= ${initialZoom} ? map : null,
          title: marker.title,
          zIndex: marker.id === "focused" ? 30 : marker.active ? 20 : 5,
          icon: getMarkerIcon(marker, false)
        });
        if (marker.active || marker.id === "focused") {
          const labelMarker = new google.maps.Marker({
            position: { lat: marker.lat, lng: marker.lng },
            map: marker.labelVisible ? map : null,
            clickable: false,
            zIndex: 40,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 0,
              fillOpacity: 0,
              strokeOpacity: 0,
              labelOrigin: new google.maps.Point(0, -32)
            },
            label: {
              text: marker.title,
              color: "#1F2937",
              fontSize: "11px",
              fontWeight: "900",
              className: "spot-label"
            }
          });
          labelMarkers.push({ data: marker, marker: labelMarker });
        }
        const markerEntry = { data: marker, marker: googleMarker };
        googleMarkers.push(markerEntry);
        const photoHtml = marker.imageUrl
          ? "<div class='place-photo' data-image-url='" + escapeHtml(marker.imageUrl) + "'><span>사진 보기</span></div>"
          : "<div class='place-photo place-photo-empty'><span>사진 준비중</span></div>";
        const popupHtml =
        "<div class='place-popup'>" +
          photoHtml +
          "<div class='place-body'>" +
            "<div class='place-kicker'>" + escapeHtml(marker.sub) + "</div>" +
            "<div class='place-title'>" + escapeHtml(marker.title) + "</div>" +
            "<div class='place-sub'>" + escapeHtml(marker.description) + "</div>" +
            metaHtml +
            (addressLine ? "<div class='place-address'>" + escapeHtml(addressLine) + "</div>" : "") +
            (areaLine ? "<div class='place-area-line'>" + escapeHtml(areaLine) + "</div>" : "") +
            "<a class='map-link' target='_top' rel='noopener noreferrer' href='" + escapeHtml(mapHref) + "'>Google Maps 열기</a>" +
          "</div>" +
        "</div>";
        googleMarker.addListener("click", () => openPopupForMarker(map, markerEntry, popupHtml));
        if (marker.id === "focused") {
          focusedGoogleMarker = { data: marker, marker: googleMarker, html: popupHtml, position: { lat: marker.lat, lng: marker.lng } };
        }
      });
      map.addListener("zoom_changed", syncMarkerVisibility);
      syncMarkerVisibility();
      if (focusedGoogleMarker) {
        map.setCenter(focusedGoogleMarker.position);
        map.setZoom(${focusedZoom});
        google.maps.event.addListenerOnce(map, "idle", () => {
          openPopupForMarker(map, focusedGoogleMarker, focusedGoogleMarker.html);
          window.setTimeout(() => map.panBy(0, -120), 80);
        });
      }
    };

    if (!apiKey) {
      renderFallback("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY가 설정되어 있지 않아요.");
    } else {
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(apiKey) + "&callback=initMangoMap&language=ko&region=VN&loading=async";
      script.async = true;
      script.defer = true;
      script.onerror = () => renderFallback("Google Maps 스크립트 로드에 실패했어요. API 키, 결제 설정, 허용 도메인을 확인해주세요.");
      document.head.appendChild(script);
    }
  </script>
</body>
</html>`;
}

function getHomeMarkerOffset(index: number) {
  const offsets = [
    { lat: 0, lng: 0 },
    { lat: 0.00042, lng: -0.00035 },
    { lat: -0.00038, lng: 0.00036 },
    { lat: 0.00032, lng: 0.00042 },
    { lat: -0.00044, lng: -0.00028 },
    { lat: 0.00018, lng: -0.00056 },
    { lat: -0.00022, lng: 0.00058 },
    { lat: 0.00056, lng: 0.00012 }
  ];
  return offsets[index % offsets.length];
}

const mapDestinationBounds: Record<MapDestination, { lat: [number, number]; lng: [number, number] }> = {
  호치민: { lat: [10.25, 11.15], lng: [106.15, 107.25] },
  다낭: { lat: [15.75, 16.35], lng: [107.75, 108.55] },
  나트랑: { lat: [11.85, 12.55], lng: [108.85, 109.45] },
  하노이: { lat: [20.65, 21.45], lng: [105.35, 106.15] },
  달랏: { lat: [11.75, 12.15], lng: [108.25, 108.65] },
  푸꾸옥: { lat: [9.9, 10.55], lng: [103.75, 104.15] }
};

function isCoordinateInsideDestination(destination: MapDestination, latitude: number, longitude: number) {
  const bounds = mapDestinationBounds[destination];
  return latitude >= bounds.lat[0] && latitude <= bounds.lat[1] && longitude >= bounds.lng[0] && longitude <= bounds.lng[1];
}

function getGoogleBackedMapSpots(
  destination: MapDestination,
  category: MapCategory,
  fallbackSpots: { title: string; sub: string }[],
  limit = 3
) {
  const places = getHomeSafeMapPlaces(destination, category.id)
    .sort((left, right) => {
      const mapPriorityScore = compareMangoSafeChoices(left, right, { surface: "map", categoryId: category.id });
      if (mapPriorityScore !== 0) return mapPriorityScore;
      const photoScore = Number(Boolean(right.photoName)) - Number(Boolean(left.photoName));
      if (photoScore !== 0) return photoScore;
      return (right.userRatingCount ?? 0) - (left.userRatingCount ?? 0);
    })
    .slice(0, limit);

  if (places.length > 0) {
    return places
      .map((place) => {
        const coordinates = getHomeMapCoordinates(place);
        if (!coordinates) return undefined;
        const safeProfile = getMangoSafeChoiceProfile(place, { surface: "map", categoryId: category.id });
        return {
          title: formatMapPlaceName(place.name),
          sub: `${getDisplayHomeCategory(place.category)}${place.area ? ` · ${place.area}` : ""}`,
          description: safeProfile.reason,
          imageUrl: getFocusedPlaceImageUrl(place),
          mapsUri: place.googleMapsUri,
          query: `${place.name} ${destination}`,
          coordinates,
          address: getHomeMapAddressLabel(destination, place),
          rating: place.rating,
          reviewCount: getMangoCommentCount(place),
          mangoRecommendationCount: getMangoRecommendationCount(place),
          mangoCommentCount: getMangoCommentCount(place),
          priceLevel: place.priceLevel,
          area: place.area,
          bestTime: place.bestTime[0],
          checkHint: safeProfile.label
        };
      })
      .filter((place): place is NonNullable<typeof place> => Boolean(place));
  }

  return [];
}

function getHomeMapAddressLabel(destination: MapDestination, place: CuratedPlace) {
  if (place.address && !isLowValueMapAddress(place.address)) return place.address;
  const area = place.area ? `${place.area} · ` : "";
  return `${area}Google Maps에서 정확한 위치 확인`;
}

function isLowValueMapAddress(address: string) {
  return /^[A-Z0-9]{4,}\+[A-Z0-9]{2,}/i.test(address.trim());
}

function isHomeVisiblePlace(place: CuratedPlace) {
  if (isHomeSuppressedPlace(place)) return false;
  if (place.tags.includes("지도추천")) return true;
  const reviewCount = place.userRatingCount ?? 0;
  if (reviewCount < 100) return false;
  if (place.category === "맛집" && (place.koreanReviewSignal?.reviewCount ?? 0) <= 0 && reviewCount < 300 && !hasHomeKeywordTag(place)) return false;
  if (place.category === "카페" && !(place.photoName || place.hiddenGem || place.rainyDayOk)) return false;
  return true;
}

function hasHomeKeywordTag(place: CuratedPlace) {
  return place.tags.some((tag) => ["한식당", "중식당", "일식당", "쌀국수", "반미", "해산물", "고기", "브런치", "길거리음식", "채식가능", "프리미엄"].includes(tag));
}

function isHomeSuppressedPlace(place: CuratedPlace) {
  const haystack = `${place.id} ${place.name} ${place.oneLine} ${place.tags.join(" ")}`.toLowerCase();
  return haystack.includes("에그커피") || haystack.includes("egg coffee") || haystack.includes("eggyolk");
}

function dedupeHomePlaces(places: CuratedPlace[]) {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return places.filter((place) => {
    const idKey = place.googlePlaceId || place.id;
    const nameKey = normalizeHomePlaceDedupeKey(place);
    if (seenIds.has(idKey) || seenNames.has(nameKey)) return false;
    seenIds.add(idKey);
    seenNames.add(nameKey);
    return true;
  });
}

function normalizeHomePlaceDedupeKey(place: CuratedPlace) {
  return `${place.city}-${formatMapPlaceName(place.name)}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function buildMapSpotDescription(destination: MapDestination, category: MapCategory, spotLabel: string) {
  const categoryCopy: Record<string, string> = {
    food: "식사 동선에 넣기 좋은 장소예요. 피크 시간에는 대기 가능성이 있어요.",
    cafe: "더운 낮이나 이동 사이에 쉬어가기 좋은 카페예요.",
    massage: "많이 걷는 날 중간 회복 코스로 넣기 좋아요. 예약 가능 여부를 먼저 보세요.",
    rooftop: "저녁 이후 분위기 전환용으로 보기 좋아요. 귀가는 Grab Car를 추천해요.",
    chinese: "짬뽕, 딤섬처럼 익숙한 메뉴가 필요할 때 보기 좋은 장소예요.",
    japanese: "스시, 라멘, 이자카야처럼 가볍게 고르기 좋은 일식 코스예요.",
    market: "기념품과 간식 쇼핑을 한 번에 보기 좋은 장소예요.",
    photo: "사진 남기기 좋은 곳이라 낮 시간대 방문을 먼저 추천해요.",
    exchange: "환율과 지급액을 현장에서 비교하고 소액부터 바꾸는 편이 좋아요.",
    karaoke: "밤 일정 전에 룸 요금과 음료 포함 여부를 먼저 확인하세요."
  };

  return `${destination} ${spotLabel}. ${categoryCopy[category.id] ?? category.copy}`;
}

function getFocusedPlaceImageUrl(place: CuratedPlace) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const photoName = place.photoNames?.[0] ?? place.photoName;
  if (apiKey && photoName) {
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=640&key=${apiKey}`;
  }

  return "";
}

function buildMapPlaceDescription(place: CuratedPlace) {
  const name = place.name.toLowerCase();
  const tags = place.tags;
  const firstBestTime = place.bestTime[0];

  if (place.category === "맛집") {
    if (name.includes("unatoto") || name.includes("うな") || tags.includes("장어")) return "장어덮밥·구이로 빠르게 한 끼 잡기 좋은 식당";
    if (tags.includes("한국식중식") || name.includes("jjambbong") || name.includes("jjamppong")) return "짬뽕·중식 메뉴가 당길 때 보기 좋은 한식 중식 장소";
    if (tags.includes("브런치") || name.includes("brunch") || name.includes("breakfast")) return "늦은 아침이나 가벼운 점심으로 넣기 좋은 브런치 장소";
    if (tags.includes("해산물") || name.includes("seafood") || name.includes("crab")) return "해산물 메뉴를 중심으로 저녁 코스에 넣기 좋은 식당";
    if (tags.includes("쌀국수") || name.includes("pho")) return "쌀국수 한 그릇으로 가볍게 들르기 좋은 현지식 장소";
    if (tags.includes("반미") || name.includes("banh mi")) return "이동 중 간단히 먹기 좋은 반미·간편식 장소";
    if (tags.includes("채식가능") || name.includes("vegan") || name.includes("vegetarian")) return "채식 메뉴 선택지가 있어 식단 맞추기 좋은 식당";
    if (place.priceLevel === "저렴") return "가격 부담 낮게 한 끼 해결하기 좋은 가성비 식당";
    if (place.priceLevel === "프리미엄") return "조금 더 좋은 분위기로 식사 잡기 좋은 프리미엄 장소";
    if (firstBestTime) return `${firstBestTime} 시간대에 동선 중간 식사로 넣기 좋은 맛집`;
    return "평점과 위치를 보고 한 끼 장소로 넣기 좋은 식당";
  }

  if (place.category === "카페") {
    if (tags.includes("사진맛집") || tags.includes("뷰맛집")) return "사진 찍고 쉬어가기 좋은 분위기 카페";
    if (tags.includes("디저트")) return "커피와 디저트로 쉬어가기 좋은 카페";
    if (place.rainyDayOk) return "비 오거나 더울 때 실내 대피용으로 좋은 카페";
    return "동선 중간에 쉬어가기 좋은 카페";
  }

  if (place.category === "마사지") {
    if (place.priceLevel === "프리미엄") return "컨디션 회복용으로 잡기 좋은 프리미엄 스파";
    if (place.priceLevel === "저렴") return "걷는 일정 중간에 부담 없이 넣기 좋은 마사지";
    return "많이 걷는 날 중간 휴식으로 넣기 좋은 마사지";
  }

  if (place.category === "바/루프탑") return "저녁 이후 분위기 전환용으로 보기 좋은 밤 코스";
  if (place.category === "환전") return "여행 경비 준비 전 환율을 비교해보기 좋은 장소";
  if (place.category === "쇼핑") return "기념품과 간식 쇼핑을 한 번에 보기 좋은 장소";
  if (place.category === "사진명소") return "대표 관광명소를 짧게 둘러보기 좋은 스팟";
  if (place.category === "가라오케") return "밤 일정 전 가격과 룸 조건 확인이 필요한 장소";

  return cleanHomePlaceCopy(place.oneLine || place.koreanTip);
}

function cleanHomePlaceCopy(value: string) {
  return value
    .replace(/\s*후보\s*/g, " ")
    .replace(/피크 시간, 메뉴 사진, 최근 영업시간은 Google Maps에서 한 번 확인하세요\.?/g, "피크 시간대에는 대기 여부를 확인하면 좋아요.")
    .replace(/최근 영업시간은 Google Maps에서 한 번 확인하세요\.?/g, "")
    .replace(/Google Maps에서 한 번 확인하세요\.?/g, "")
    .replace(/Google Places 기준으로 추가한\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMapPlaceCheckHint(place: CuratedPlace) {
  if (place.category === "맛집") return "영업시간 확인";
  if (place.category === "마사지") return "예약 확인 추천";
  if (place.category === "환전") return "환율 현장 확인";
  if (place.category === "바/루프탑" || place.category === "가라오케") return "밤 이동 Grab 추천";
  return place.beginnerSafe ? "초행자 무난" : "방문 전 확인";
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function formatWeatherValue(liveInfo: LiveTravelInfo) {
  if (liveInfo.weather.status !== "ready") return "확인중";
  return `${liveInfo.weather.temperatureC}°C`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
    overflow: "hidden",
    paddingBottom: 0
  },
  guideHomeScroll: {
    flex: 1,
    backgroundColor: colors.cream
  },
  guideHomeContent: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 116,
    gap: 12
  },
  guideHomeContentDesktop: {
    maxWidth: 1360,
    paddingHorizontal: 36,
    paddingTop: 26,
    paddingBottom: 88,
    gap: 24
  },
  guideHero: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#25301F",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  guideHeroDesktop: {
    padding: 34,
    minHeight: 330
  },
  guideHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16
  },
  guideBrandMark: {
    width: 88,
    height: 88,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideHeroTrustBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(15,81,50,0.10)",
    borderWidth: 1,
    borderColor: "rgba(15,81,50,0.18)"
  },
  guideHeroTrustText: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "800"
  },
  guideEyebrow: {
    color: colors.greenDeep,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 18
  },
  guideHeroTitle: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "800",
    marginTop: 8
  },
  guideHeroTitleDesktop: {
    fontSize: 46,
    lineHeight: 56,
    maxWidth: 720
  },
  guideHeroCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    marginTop: 10
  },
  guideHeroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },
  guidePrimaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenDeep,
    paddingHorizontal: 12
  },
  guidePrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  guideGhostButton: {
    minWidth: 94,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12
  },
  guideGhostButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  guidePanel: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  guideDesktopGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 22
  },
  guideDesktopLeft: {
    width: 250,
    gap: 16
  },
  guideDesktopCenter: {
    flex: 1,
    minWidth: 0,
    gap: 16
  },
  guideDesktopRight: {
    width: 310,
    gap: 16
  },
  guideDesktopPanel: {
    borderRadius: 18,
    padding: 18,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  guideDesktopSituationList: {
    gap: 8
  },
  guideDesktopSituationItem: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideDesktopSituationItemActive: {
    backgroundColor: colors.greenDeep,
    borderColor: colors.greenDeep
  },
  guideDesktopSituationText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700"
  },
  guideDesktopSituationTextActive: {
    color: "#FFFFFF"
  },
  guideDesktopSituationArrow: {
    color: "#9CA3AF",
    fontSize: 18,
    fontWeight: "900"
  },
  guideDesktopCityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  guideDesktopCityButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideDesktopCityButtonActive: {
    backgroundColor: "rgba(255,179,33,0.20)",
    borderColor: colors.cyan
  },
  guideDesktopCityText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700"
  },
  guideDesktopCityTextActive: {
    color: colors.greenDeep
  },
  guideSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12
  },
  guideSectionKicker: {
    color: colors.greenDeep,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800"
  },
  guideSectionTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: 3
  },
  guideSectionMeta: {
    color: colors.greenDeep,
    backgroundColor: "rgba(15,81,50,0.08)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "800"
  },
  guideCityRail: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 12
  },
  guideCityChip: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideCityChipActive: {
    backgroundColor: "rgba(255,179,33,0.20)",
    borderColor: colors.cyan
  },
  guideCityText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700"
  },
  guideCityTextActive: {
    color: colors.greenDeep
  },
  guideSituationRail: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 12
  },
  guideSituationChip: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideSituationChipActive: {
    backgroundColor: colors.greenDeep,
    borderColor: colors.greenDeep
  },
  guideSituationText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700"
  },
  guideSituationTextActive: {
    color: "#FFFFFF"
  },
  guideCardList: {
    gap: 10
  },
  guideDesktopCardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  guideContentCard: {
    borderRadius: 16,
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideDesktopContentCard: {
    width: "48.8%",
    minHeight: 190,
    padding: 18
  },
  guideContentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  guideContentSituation: {
    color: colors.greenDeep,
    backgroundColor: "rgba(15,81,50,0.08)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "800"
  },
  guideContentUpdated: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "900"
  },
  guideContentTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: 11
  },
  guideContentCopy: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: 6
  },
  guideContentFooter: {
    gap: 4,
    marginTop: 12
  },
  guideContentTarget: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  guideContentPlaces: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800"
  },
  guideSmallButton: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#F7F5EF"
  },
  guideSmallButtonText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800"
  },
  guideTopList: {
    gap: 10
  },
  guideTopCard: {
    minHeight: 126,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideDesktopTopCard: {
    minHeight: 118
  },
  guideTopRank: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 38,
    color: colors.greenDeep,
    backgroundColor: "rgba(15,81,50,0.10)",
    fontSize: 13,
    fontWeight: "800"
  },
  guideTopBody: {
    flex: 1,
    minWidth: 0
  },
  guideTopBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  guideTopBadge: {
    color: "#0B3D27",
    backgroundColor: "#EAF8EF",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800"
  },
  guideTopBadgeMuted: {
    color: "#7A4C00",
    backgroundColor: "rgba(255,179,33,0.16)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  guideTopTitle: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    marginTop: 8
  },
  guideTopReason: {
    color: "#374151",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 4
  },
  guideTopCaution: {
    color: "#A16207",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    marginTop: 5
  },
  guideTopSave: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideTopSaveActive: {
    backgroundColor: "rgba(255,179,33,0.16)",
    borderColor: colors.cyan
  },
  guideTopSaveText: {
    color: "#6B7280",
    fontSize: 19,
    fontWeight: "900"
  },
  guideTopSaveTextActive: {
    color: "#D97706"
  },
  guideTrustPanel: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.greenDeep,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  guideTrustTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800"
  },
  guideTrustGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  guideTrustChip: {
    color: "#F7F5EF",
    backgroundColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "700"
  },
  guideMapCta: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cyan,
    marginTop: 15
  },
  guideMapCtaText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  guideAsideTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  guideAsideList: {
    gap: 10,
    marginTop: 12
  },
  guideAsideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 58,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  guideAsideRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 28,
    color: colors.greenDeep,
    backgroundColor: "rgba(15,81,50,0.10)",
    fontSize: 12,
    fontWeight: "800"
  },
  guideAsideCopy: {
    flex: 1,
    minWidth: 0
  },
  guideAsideName: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800"
  },
  guideAsideMeta: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 2
  },
  guideAsideText: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 8
  },
  guideAsideButton: {
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenDeep,
    marginTop: 14
  },
  guideAsideButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  referenceMapStage: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.cream
  },
  referenceMapStageDesktop: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(70,88,104,0.14)"
  },
  referenceMapCanvas: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "#EDF2F3"
  },
  referenceTopOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 8,
    paddingHorizontal: 24,
    paddingTop: 18,
    alignItems: "center"
  },
  referenceTopOverlayCompact: {
    paddingHorizontal: 18,
    paddingTop: 10
  },
  referenceStatusBar: {
    width: "100%",
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 42
  },
  referenceStatusBarCompact: {
    minHeight: 24,
    paddingHorizontal: 24
  },
  referenceStatusTime: {
    color: "#0F172A",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900"
  },
  referenceStatusTimeCompact: {
    fontSize: 16,
    lineHeight: 20
  },
  referenceStatusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  referenceSignalText: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900"
  },
  referenceSignalTextCompact: {
    fontSize: 12,
    lineHeight: 15
  },
  referenceBatteryText: {
    minWidth: 28,
    height: 18,
    borderRadius: 6,
    overflow: "hidden",
    textAlign: "center",
    color: "#FFFFFF",
    backgroundColor: "#2FC95D",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "900"
  },
  referenceBatteryTextCompact: {
    minWidth: 24,
    height: 16,
    borderRadius: 5,
    fontSize: 10,
    lineHeight: 16
  },
  referenceSearchBar: {
    width: "100%",
    minHeight: 72,
    borderRadius: 36,
    marginTop: 32,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.97)",
    shadowColor: "#243447",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  referenceSearchBarCompact: {
    minHeight: 58,
    borderRadius: 29,
    marginTop: 12,
    paddingHorizontal: 18,
    gap: 10,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }
  },
  referenceSearchIcon: {
    color: "#F59E0B",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800"
  },
  referenceSearchIconCompact: {
    fontSize: 28,
    lineHeight: 32
  },
  referenceSearchText: {
    flex: 1,
    minWidth: 0,
    color: "#5D6673",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "800"
  },
  referenceSearchTextCompact: {
    fontSize: 16,
    lineHeight: 22
  },
  referenceMapSearchPill: {
    minHeight: 54,
    borderRadius: 28,
    marginTop: 30,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#243447",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7
  },
  referenceMapSearchPillCompact: {
    minHeight: 44,
    borderRadius: 22,
    marginTop: 14,
    paddingHorizontal: 18,
    gap: 8,
    shadowOpacity: 0.11,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }
  },
  referenceRefreshIcon: {
    color: "#F59E0B",
    fontSize: 23,
    lineHeight: 26,
    fontWeight: "900"
  },
  referenceRefreshIconCompact: {
    fontSize: 19,
    lineHeight: 22
  },
  referenceMapSearchText: {
    color: "#D97706",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900"
  },
  referenceMapSearchTextCompact: {
    fontSize: 14,
    lineHeight: 18
  },
  referenceLocateButton: {
    position: "absolute",
    left: 26,
    bottom: 416,
    zIndex: 7,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    shadowColor: "#243447",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9
  },
  referenceLocateIcon: {
    color: "#F59E0B",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900"
  },
  referenceLocateIconCompact: {
    fontSize: 28,
    lineHeight: 32
  },
  referenceBottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 94,
    zIndex: 9,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: "rgba(255,255,255,0.995)",
    overflow: "hidden",
    shadowColor: "#172033",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10
  },
  referenceBottomSheetCompact: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10
  },
  referenceSheetHandleHit: {
    alignSelf: "center",
    minWidth: 84,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  referenceSheetHandle: {
    alignSelf: "center",
    width: 54,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#D1D5DB"
  },
  referenceSheetTopLine: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
    marginBottom: 8
  },
  referenceSheetTopLineCompact: {
    minHeight: 36,
    marginTop: 0,
    marginBottom: 5
  },
  referenceSheetTitleWrap: {
    flex: 1,
    minWidth: 0
  },
  referenceSheetTitle: {
    color: "#111827",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900"
  },
  referenceSheetTitleCompact: {
    fontSize: 16,
    lineHeight: 20
  },
  referenceSheetSubtitle: {
    color: "#8B93A1",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 1
  },
  referenceSheetSubtitleCompact: {
    fontSize: 10,
    lineHeight: 13
  },
  referenceSavedShortcut: {
    minWidth: 44,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4CF"
  },
  referenceSavedShortcutCompact: {
    minWidth: 40,
    height: 30,
    borderRadius: 15
  },
  referenceSavedShortcutText: {
    color: "#111827",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  referenceSheetSnapText: {
    minWidth: 34,
    color: "#9CA3AF",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "right"
  },
  referenceSegment: {
    minHeight: 56,
    borderRadius: 36,
    padding: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9E9EF"
  },
  referenceSegmentButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  referenceSegmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4
  },
  referenceSegmentText: {
    color: "#8F949E",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center"
  },
  referenceSegmentTextActive: {
    color: "#2F80FF"
  },
  referenceFilterScroll: {
    marginHorizontal: -18,
    marginTop: 8
  },
  referenceFilterScrollCompact: {
    marginHorizontal: -16,
    marginTop: 5
  },
  referenceCategoryChips: {
    paddingHorizontal: 18,
    gap: 8
  },
  referenceCategoryChipsCompact: {
    paddingHorizontal: 16,
    gap: 7
  },
  referenceCategoryChip: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#EEF0F3"
  },
  referenceCategoryChipActive: {
    backgroundColor: "#FFC233",
    borderColor: "#FFC233",
    shadowColor: "#7C4A00",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4
  },
  referenceCategoryIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "900"
  },
  referenceCategoryIconActive: {
    color: "#111827",
    backgroundColor: "rgba(255,255,255,0.92)"
  },
  referenceCategoryText: {
    color: "#3F4652",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  referenceCategoryTextActive: {
    color: "#111827"
  },
  referenceBadgeRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8
  },
  referenceMangoBadge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: "#111827",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    backgroundColor: "#FFF4CF"
  },
  referenceRisingBadge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: "#2F5B16",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    backgroundColor: "#E8F8D7"
  },
  referenceMiniGhostButton: {
    marginLeft: "auto",
    minWidth: 44,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F5F8"
  },
  referenceMiniGhostText: {
    color: "#4B5563",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  referenceSituationScroll: {
    marginHorizontal: -18,
    marginTop: 7
  },
  referenceSituationChips: {
    paddingHorizontal: 18,
    gap: 7
  },
  referenceSituationChip: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#4B5563",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    backgroundColor: "#F3F5F8",
    borderWidth: 1,
    borderColor: "#EEF0F3"
  },
  referenceSituationChipActive: {
    color: "#111827",
    backgroundColor: "#FFF4CF",
    borderColor: "#FFE3A3"
  },
  referenceIconChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F3F7"
  },
  referenceIconChipText: {
    color: "#5F6977",
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900"
  },
  referenceFilterChip: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F2F3F7"
  },
  referenceFilterIcon: {
    color: "#6B7280",
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "900"
  },
  referenceParkingIcon: {
    color: "#6B7280",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900"
  },
  referenceFilterText: {
    color: "#3F4652",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  referenceResultBlock: {
    flex: 1,
    minHeight: 0,
    paddingTop: 10
  },
  referenceResultBlockPeek: {
    paddingTop: 4
  },
  referenceResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13
  },
  referenceResultIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  referenceResultIconText: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900"
  },
  referenceResultCopyWrap: {
    flex: 1,
    minWidth: 0
  },
  referenceResultEyebrow: {
    color: "#2F80FF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  referenceResultTitle: {
    color: "#111827",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    marginTop: 1
  },
  referenceResultCopy: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 2
  },
  referenceStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 15
  },
  referenceStatPill: {
    flex: 1,
    minWidth: 0,
    minHeight: 55,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: "center",
    backgroundColor: "#F3F5F8"
  },
  referenceStatLabel: {
    color: "#8B93A1",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900"
  },
  referenceStatValue: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 3
  },
  referenceActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10
  },
  referencePrimaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F80FF"
  },
  referencePrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  referenceSecondaryButton: {
    width: 78,
    minHeight: 50,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F5F8"
  },
  referenceSecondaryButtonText: {
    color: "#3F4652",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  referencePlaceList: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: -4,
    marginTop: 12
  },
  referencePlaceListPeek: {
    marginTop: 6
  },
  referencePlaceListContent: {
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 18
  },
  referencePlaceListContentPeek: {
    gap: 6,
    paddingBottom: 8
  },
  referencePlaceListContentMid: {
    gap: 8
  },
  referencePlaceCard: {
    minHeight: 112,
    borderRadius: 22,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF0F3",
    shadowColor: "#172033",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  referencePlaceCardPeek: {
    minHeight: 82,
    padding: 8,
    borderRadius: 18,
    alignItems: "center"
  },
  referencePlaceImage: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: "#F3F4F6"
  },
  referencePlaceImagePeek: {
    width: 54,
    height: 54,
    borderRadius: 14
  },
  referencePlaceImageEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4CF"
  },
  referencePlaceImageText: {
    color: "#111827",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900"
  },
  referencePlaceBody: {
    flex: 1,
    minWidth: 0
  },
  referencePlaceBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4
  },
  referenceRankBadge: {
    overflow: "hidden",
    maxWidth: 112,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: "#111827",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    backgroundColor: "#FFF4CF"
  },
  referenceHotBadge: {
    overflow: "hidden",
    maxWidth: 82,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: "#2F5B16",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    backgroundColor: "#E8F8D7"
  },
  referencePlaceTitle: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900"
  },
  referencePlaceMeta: {
    color: "#5D6673",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 3
  },
  referencePlaceReason: {
    color: "#111827",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 3
  },
  referencePlaceCaution: {
    color: "#9A5A00",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 2
  },
  referencePlaceDistance: {
    color: "#9CA3AF",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 2
  },
  referenceSaveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F5F8"
  },
  referenceSaveButtonActive: {
    backgroundColor: "#111827"
  },
  referenceSaveButtonText: {
    color: "#6B7280",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900"
  },
  referenceSaveButtonTextActive: {
    color: "#FFC233"
  },
  referenceEmptyState: {
    flex: 1,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10
  },
  referenceEmptyIcon: {
    color: "#9CA3AF",
    fontSize: 56,
    lineHeight: 60,
    fontWeight: "800"
  },
  referenceEmptyText: {
    color: "#6B7280",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: 14,
    textAlign: "center"
  },
  legacyMapHidden: {
    display: "none"
  },
  nightScanline: {
    display: "none",
    position: "absolute",
    left: 0,
    right: 0,
    top: 104,
    height: 1,
    backgroundColor: "rgba(255,194,51,0.36)",
    shadowColor: colors.cyan,
    shadowOpacity: 0.44,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    transform: [{ rotate: "-8deg" }]
  },
  neonSweep: {
    display: "none",
    position: "absolute",
    left: 0,
    right: 0,
    top: 248,
    height: 1,
    backgroundColor: "rgba(255,111,15,0.24)",
    shadowColor: colors.neonPink,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    transform: [{ rotate: "7deg" }]
  },
  phone: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: "transparent"
  },
  phoneDesktop: {
    maxWidth: 1180
  },
  phoneContent: {
    flexGrow: 1,
    paddingBottom: 112
  },
  phoneContentDesktop: {
    paddingHorizontal: 28,
    paddingBottom: 128
  },
  topBar: {
    zIndex: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 12
  },
  brandLockup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0
  },
  brandCopy: {
    flex: 1,
    minWidth: 0
  },
  brand: {
    color: "#FF9F1C",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    textShadowColor: "rgba(255,122,0,0.28)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20
  },
  subBrand: {
    color: colors.nightMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 2
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    borderWidth: 1,
    borderColor: "rgba(255,248,232,0.28)",
    ...sunsetGlow
  },
  searchIcon: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900"
  },
  mapIntroPanel: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.35)",
    ...shadow
  },
  mapIntroEyebrow: {
    color: "#FF9F1C",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  mapIntroTitle: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    marginTop: 3
  },
  mapIntroCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 5
  },
  mapIntroButton: {
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#FFD43B"
  },
  mapIntroButtonText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  topSavedSection: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 30,
    paddingVertical: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    ...shadow
  },
  topSavedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 17,
    marginBottom: 13
  },
  topSavedHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  topSavedEyebrow: {
    color: "#FF9F1C",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  topSavedTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 3
  },
  topSavedCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 5
  },
  topSavedBadge: {
    minWidth: 44,
    color: colors.ink,
    backgroundColor: "#FFD43B",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900"
  },
  topSavedRail: {
    gap: 12,
    paddingHorizontal: 17,
    paddingRight: 24
  },
  topSavedCard: {
    width: 230,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#EED69A"
  },
  topSavedImageWrap: {
    height: 145,
    backgroundColor: "#F4E6BD",
    position: "relative"
  },
  topSavedImage: {
    width: "100%",
    height: "100%"
  },
  topSavedImageEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  topSavedImageEmptyText: {
    color: "#8A5A00",
    fontSize: 12,
    fontWeight: "900"
  },
  topSavedRank: {
    position: "absolute",
    left: 12,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "#FFD43B",
    color: colors.ink,
    textAlign: "center",
    lineHeight: 34,
    fontSize: 15,
    fontWeight: "900"
  },
  topSavedCardBody: {
    padding: 13,
    gap: 6
  },
  topSavedCategory: {
    alignSelf: "flex-start",
    color: "#07412A",
    backgroundColor: "#EAF8EE",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  topSavedPlaceName: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900"
  },
  topSavedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  topSavedRating: {
    color: "#07412A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  topSavedMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  topSavedVerified: {
    color: "#9A6500",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  controlPanel: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 26,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)",
    ...shadow
  },
  controlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10
  },
  controlLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  controlHint: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  controlDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 13
  },
  cityRailScroll: {
    zIndex: 6
  },
  cityRail: {
    zIndex: 6,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFF4D8",
    borderRadius: 22,
    padding: 5,
    paddingRight: 13
  },
  cityChip: {
    minHeight: 38,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  cityChipActive: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 }
  },
  cityText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  cityTextActive: {
    color: colors.ink
  },
  categoryRail: {
    zIndex: 5,
    flexDirection: "row",
    gap: 8,
    paddingRight: 20
  },
  categoryChip: {
    minHeight: 50,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.18)",
    backgroundColor: "#FFF4D8",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  categoryChipActive: {
    borderWidth: 2,
    transform: [{ translateY: -1 }],
    shadowColor: "#FFB000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  categoryEmoji: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 28,
    backgroundColor: "#FFFDF5",
    fontSize: 16
  },
  categoryTextWrap: {
    minWidth: 0
  },
  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: 5
  },
  categoryText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  categoryTextActive: {
    color: colors.ink
  },
  categoryCount: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    marginTop: 1
  },
  mapCanvas: {
    height: 360,
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 28,
    backgroundColor: "#FFF3C4",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    ...neonShadow
  },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,247,223,0.30)"
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3C4",
    padding: 24
  },
  mapFallbackText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center"
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)"
  },
  riverLine: {
    position: "absolute",
    left: "-12%",
    top: "45%",
    width: "130%",
    height: 90,
    borderRadius: 60,
    transform: [{ rotate: "-18deg" }],
    backgroundColor: "rgba(90,120,120,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  currentLocation: {
    position: "absolute",
    left: "48%",
    top: "47%",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E8"
  },
  currentLocationInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2F80FF"
  },
  mapGlow: {
    position: "absolute",
    marginLeft: -28,
    marginTop: -28,
    opacity: 0.48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 }
  },
  mapGlowActive: {
    opacity: 0.72,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.62)"
  },
  mapMarkerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900"
  },
  bottomSheet: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: colors.line,
    ...neonShadow
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D9D1C2",
    opacity: 1,
    marginBottom: 15
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  sheetEyebrow: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "800"
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    marginTop: 2
  },
  sheetCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: 4
  },
  sheetIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  sheetIconText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900"
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 15
  },
  infoPill: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: "#F7F5EF",
    paddingHorizontal: 11,
    paddingVertical: 10,
    justifyContent: "center"
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  infoValue: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 3
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  primaryAction: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenDeep,
    borderWidth: 1,
    borderColor: "rgba(255,216,189,0.34)",
    ...sunsetGlow
  },
  primaryActionHover: {
    transform: [{ scale: 1.015 }]
  },
  primaryActionPressed: {
    transform: [{ scale: 0.97 }]
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryAction: {
    width: 92,
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.line
  },
  secondaryActionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  todayPanel: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 20,
    padding: 17,
    backgroundColor: colors.greenDeep,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#203528",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  todayHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  todayEyebrow: {
    color: colors.cyan,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  todayTitle: {
    color: "#FFF7DF",
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    marginTop: 5
  },
  todayCopy: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 5
  },
  todayReactionBadge: {
    minWidth: 72,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: colors.cyan
  },
  todayReactionValue: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900"
  },
  todayReactionLabel: {
    color: colors.greenDeep,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800"
  },
  heroCtaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  heroPrimaryCta: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.30,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 }
  },
  heroSecondaryCta: {
    flex: 1,
    minHeight: 54,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,247,223,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,247,223,0.28)"
  },
  heroPrimaryText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  heroSecondaryText: {
    color: "#FFF7DF",
    fontSize: 15,
    fontWeight: "800"
  },
  trustSignalGrid: {
    gap: 9,
    marginTop: 14
  },
  trustSignalCard: {
    borderRadius: 18,
    padding: 13,
    backgroundColor: "rgba(255,247,223,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,247,223,0.18)"
  },
  trustSignalTitle: {
    color: "#FFD43B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  trustSignalValue: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 4
  },
  trustSignalCopy: {
    color: "rgba(255,247,223,0.74)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 4
  },
  todayQuickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 15
  },
  todayQuickCard: {
    width: "48%",
    minHeight: 94,
    borderRadius: 18,
    padding: 13,
    backgroundColor: "rgba(255,247,223,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,247,223,0.18)"
  },
  todayQuickValue: {
    alignSelf: "flex-start",
    color: "#FFD43B",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900"
  },
  todayQuickTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 7
  },
  todayQuickCopy: {
    color: "rgba(255,247,223,0.74)",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 4
  },
  todayHotList: {
    gap: 9,
    marginTop: 15
  },
  recentReviewCard: {
    minHeight: 84,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: "rgba(255,247,223,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,247,223,0.16)"
  },
  recentReviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD43B"
  },
  recentReviewAvatarText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  recentReviewCopy: {
    flex: 1,
    minWidth: 0
  },
  recentReviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  recentReviewName: {
    color: "#FFF7DF",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  recentReviewRating: {
    color: "#19A95B",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  recentReviewText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 5
  },
  recentReviewPlace: {
    color: "rgba(255,247,223,0.68)",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 5
  },
  todayLiveFeed: {
    gap: 7,
    borderRadius: 18,
    padding: 10,
    backgroundColor: "rgba(255,247,223,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,247,223,0.14)"
  },
  todayLiveTitle: {
    color: "#FFD43B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    marginBottom: 2
  },
  todayActivityRow: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  todayActivityType: {
    minWidth: 44,
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "900"
  },
  todayActivityCopy: {
    flex: 1,
    minWidth: 0
  },
  todayActivityTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  todayActivityMeta: {
    color: "rgba(255,247,223,0.68)",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    marginTop: 2
  },
  todaySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4
  },
  todaySectionTitle: {
    color: "#FFF7DF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  todaySectionMeta: {
    color: "rgba(255,247,223,0.68)",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800"
  },
  todayHotRow: {
    minHeight: 62,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,247,223,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,247,223,0.16)"
  },
  todayHotRank: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 34,
    color: colors.ink,
    backgroundColor: "#FFC233",
    fontSize: 15,
    fontWeight: "900"
  },
  todayHotCopy: {
    flex: 1,
    minWidth: 0
  },
  todayHotTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  todayHotMeta: {
    color: "rgba(255,247,223,0.72)",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 3
  },
  todayHotCategory: {
    maxWidth: 70,
    color: colors.ink,
    backgroundColor: "#FFF4D8",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "900"
  },
  communityPanel: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 26,
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.26)",
    ...shadow
  },
  communityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  communityEyebrow: {
    color: "#FFC233",
    fontSize: 12,
    fontWeight: "900"
  },
  communityTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 4
  },
  communityLive: {
    color: colors.ink,
    backgroundColor: colors.cyan,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900"
  },
  communityGrid: {
    gap: 9,
    marginTop: 13
  },
  communityCard: {
    minHeight: 72,
    borderRadius: 19,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.16)",
    padding: 12,
    shadowColor: colors.neonPink,
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 }
  },
  communityCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  communityCardTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  communityBadge: {
    color: colors.ink,
    backgroundColor: "rgba(255,194,51,0.14)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "900"
  },
  communityCardCopy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 6
  },
  communityActionText: {
    alignSelf: "flex-start",
    color: "#FF9500",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    marginTop: 10
  },
  qualityOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.34)"
  },
  qualityBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  qualitySheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === "web" ? 20 : 28,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.34)",
    shadowColor: "#4A2600",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 }
  },
  qualityHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(35,44,59,0.18)",
    marginBottom: 12
  },
  qualityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,194,51,0.22)"
  },
  qualityHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  qualityEyebrow: {
    color: "#FF9500",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  qualityTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    marginTop: 4
  },
  qualityCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 7
  },
  qualityCloseButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)"
  },
  qualityCloseText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  qualityForm: {
    paddingTop: 14,
    paddingBottom: 8
  },
  qualityContextBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    marginBottom: 14
  },
  qualityContextLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  qualityContextValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  qualityLabel: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 7
  },
  qualityOptional: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  qualityInput: {
    minHeight: 52,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.36)",
    fontSize: 14,
    fontWeight: "800"
  },
  qualityTextArea: {
    minHeight: 112,
    lineHeight: 20
  },
  qualityPresetRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 9
  },
  qualityPresetChip: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "rgba(255,194,51,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.32)"
  },
  qualityPresetText: {
    color: "#8A5200",
    fontSize: 12,
    fontWeight: "900"
  },
  qualityStatusText: {
    color: "#E85D04",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 13
  },
  qualitySubmitButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    backgroundColor: "#FF9500",
    ...sunsetGlow
  },
  qualitySubmitButtonDisabled: {
    opacity: 0.58
  },
  qualitySubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  }
});
