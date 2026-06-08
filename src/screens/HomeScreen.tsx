import { createElement, useEffect, useMemo, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "../components/BrandLogo";
import { curatedPlaces } from "../data/places";
import { isSupabaseConfigured, supabaseSelect } from "../services/supabaseClient";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";
import type { CuratedPlace, CuratedPlaceCategory, Destination, GooglePlacesState, Itinerary, LiveTravelInfo, PlaceReport, PlannerInput } from "../types";
import { trackEvent } from "../utils/analytics";
import { getMangoCommentCount, getMangoRecommendationCount } from "../utils/placeCommunity";

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
  { id: "food", filterId: "food", label: "맛집", dot: "#FF7A00", icon: "M", copy: "한국인 후기 많은 식당" },
  { id: "cafe", filterId: "cafe", label: "카페", dot: "#FFC233", icon: "C", copy: "쉬기 좋고 사진 남기기 좋은 카페" },
  { id: "massage", filterId: "massage", label: "마사지", dot: "#3E8DFF", icon: "S", copy: "걷는 일정 중간 회복 코스" },
  { id: "market", filterId: "shopping", label: "쇼핑", dot: "#FFB84D", icon: "B", copy: "시장·기념품·여행템" },
  { id: "exchange", filterId: "exchange", label: "생활", dot: "#FDE047", icon: "V", copy: "환전·실용 장소" },
  { id: "photo", filterId: "photo", label: "여행", dot: "#20D8D2", icon: "P", copy: "관광명소·밤코스·투어" }
];

const cityCounts: Record<string, number> = {
  food: 28,
  cafe: 14,
  rooftop: 24,
  market: 11,
  photo: 18,
  exchange: 8,
  massage: 10,
  karaoke: 4
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const selectedCategory = mapCategories.find((category) => category.id === selectedCategoryId) ?? mapCategories[0];
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
  const topSavedPlaces = useMemo(() => {
    return dedupeHomePlaces(
      curatedPlaces.filter((place) => place.city === selectedMapDestination && !isHomeSuppressedPlace(place))
    )
      .sort((a, b) => getTodayHotScore(b) - getTodayHotScore(a))
      .slice(0, 5);
  }, [selectedMapDestination]);
  const recentKoreanReviews = useMemo(() => buildRecentKoreanReviews(topSavedPlaces), [topSavedPlaces]);

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
      <View pointerEvents="none" style={styles.nightScanline} />
      <View pointerEvents="none" style={styles.neonSweep} />
      <ScrollView
        style={[styles.phone, isDesktop && styles.phoneDesktop]}
        contentContainerStyle={[styles.phoneContent, isDesktop && styles.phoneContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <BrandLogo size={62} />
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>MANGOMAP</Text>
              <Text style={styles.subBrand}>베트남 여행자 현지맵</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.searchButton}>
            <Text style={styles.searchIcon}>⌕</Text>
          </Pressable>
        </View>

        <View style={styles.topSavedSection}>
          <View style={styles.topSavedHeader}>
            <View style={styles.topSavedHeaderCopy}>
              <Text style={styles.topSavedEyebrow}>오늘의 선택</Text>
              <Text style={styles.topSavedTitle}>오늘 한국인이 가장 많이 저장한 장소</Text>
              <Text style={styles.topSavedCopy}>사진, 후기, 최근 확인 상태를 먼저 보고 실패 확률 낮은 곳부터 고르세요.</Text>
            </View>
            <Text style={styles.topSavedBadge}>{topSavedPlaces.length}곳</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topSavedRail}>
            {topSavedPlaces.map((place, index) => (
              <TopSavedPlaceCard
                key={place.id}
                place={place}
                rank={index + 1}
                onPress={() => {
                  trackEvent("view_place", { placeId: place.id, source: "home_top_saved", city: selectedMapDestination });
                  onOpenPlaces(getMapCategoryIdFromPlace(place), selectedMapDestination);
                }}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.todayPanel}>
          <View style={styles.todayHeader}>
            <View style={styles.todayHeaderCopy}>
              <Text style={styles.todayEyebrow}>{selectedMapDestination} 여행중?</Text>
              <Text style={styles.todayTitle}>한국인들이 직접 저장한 맛집 · 마사지 · 카페만 모았습니다.</Text>
              <Text style={styles.todayCopy}>실패 없는 여행지 찾기</Text>
            </View>
            <View style={styles.todayReactionBadge}>
              <Text style={styles.todayReactionValue}>한국어</Text>
              <Text style={styles.todayReactionLabel}>후기 지도</Text>
            </View>
          </View>

          <View style={styles.heroCtaRow}>
            <Pressable accessibilityRole="button" onPress={openNearbyPlaces} style={styles.heroPrimaryCta}>
              <Text style={styles.heroPrimaryText}>내 주변 장소 보기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openPopularPlaces} style={styles.heroSecondaryCta}>
              <Text style={styles.heroSecondaryText}>인기 장소 보기</Text>
            </Pressable>
          </View>

          <View style={styles.trustSignalGrid}>
            <TrustSignalCard title="한국어 후기 기반" value="맛·가격·분위기" copy="한국인 여행자 기준으로 실패 확률을 줄여요." />
            <TrustSignalCard title="최근 확인된 장소" value="영업·주소 체크" copy="방문 전 바뀐 정보가 있는지 확인해요." />
            <TrustSignalCard title="여행자/현지인 제보" value="검토 후 반영" copy="좋은 장소와 오류 제보를 지도 품질로 쌓아요." onPress={openReportFromHome} />
          </View>

          <View style={styles.todayHotList}>
            <View style={styles.todaySectionHeader}>
              <Text style={styles.todaySectionTitle}>최근 한국인 후기</Text>
              <Text style={styles.todaySectionMeta}>방문 팁</Text>
            </View>
            {recentKoreanReviews.map((item) => (
              <RecentKoreanReviewCard
                key={item.id}
                item={item}
                onPress={() => {
                  trackEvent("view_place", { placeId: item.place.id, source: "home_recent_review", city: selectedMapDestination });
                  onOpenPlaces(getMapCategoryIdFromPlace(item.place), selectedMapDestination);
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.controlPanel}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlLabel}>도시 선택</Text>
            <Text style={styles.controlHint}>지도 중심 변경</Text>
          </View>
          <View style={styles.cityRail}>
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
          </View>

          <View style={styles.controlDivider} />

          <View style={styles.controlHeader}>
            <Text style={styles.controlLabel}>장소 필터</Text>
            <Text style={styles.controlHint}>{selectedCategory.label} 레이어 보기</Text>
          </View>
          <View style={styles.categoryRail}>
            {mapCategories.map((category) => {
              const selected = selectedCategoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedCategoryId(category.id)}
                  style={[styles.categoryChip, selected && { borderColor: category.dot, backgroundColor: `${category.dot}24` }]}
                >
                  <Text style={styles.categoryEmoji}>{getHomeCategoryEmoji(category.id)}</Text>
                  <View style={styles.categoryTextWrap}>
                    <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{category.label}</Text>
                    <Text style={styles.categoryCount}>{countHomeCategoryPlaces(selectedMapDestination, category)}곳</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.mapCanvas}>
          <InteractiveHomeMap html={mapHtml} />
        </View>

        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>{visibleFocusedPlace ? "탐색에서 선택한 장소" : "오늘의 여행 레이어"}</Text>
              <Text style={styles.sheetTitle}>{visibleFocusedPlace ? formatMapPlaceName(visibleFocusedPlace.name) : selectedCategory.label}</Text>
              <Text style={styles.sheetCopy}>
                {visibleFocusedPlace
                  ? `${visibleFocusedPlace.category} · ${visibleFocusedPlace.area ?? selectedMapDestination}`
                  : `${selectedCategory.copy} · 확대하면 더 많은 장소가 보여요`}
              </Text>
            </View>
            <View style={[styles.sheetIcon, { backgroundColor: selectedCategory.dot }]}>
              <Text style={styles.sheetIconText}>{selectedCategory.icon}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <InfoPill label="전체 후보" value={`${selectedCategoryCount}곳`} />
            <InfoPill label="지도 표시" value={`${selectedMapMarkerCount}곳`} />
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

        <View style={styles.communityPanel}>
          <View style={styles.communityHeader}>
            <View>
              <Text style={styles.communityEyebrow}>망고맵 품질</Text>
              <Text style={styles.communityTitle}>한국인 기준으로 더 정확해지는 지도</Text>
            </View>
            <Text style={styles.communityLive}>검토중</Text>
          </View>
          <View style={styles.communityGrid}>
            <CommunityAction
              title="장소 제보"
              copy="새 장소나 주소·영업시간·사진 오류를 알려주세요."
              badge="지도 품질"
              actionLabel="제보하기"
              onPress={openReportFromHome}
            />
            <CommunityAction
              title="업체/혜택 제안"
              copy="한국인에게 보여줄 만한 매장과 혜택을 추천해주세요."
              badge="제휴 후보"
              actionLabel="제안하기"
              onPress={() => openQualityRequest("partner")}
            />
            <CommunityAction
              title="정보 수정 요청"
              copy="폐업, 이전, 가격 변동을 검토 요청할 수 있어요."
              badge="검토"
              actionLabel="수정 요청"
              onPress={() => openQualityRequest("correction")}
            />
          </View>
        </View>

      </ScrollView>
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
    cafe: "☕",
    massage: "💆",
    market: "🛍️",
    exchange: "💱",
    photo: "📍"
  };
  return emojis[categoryId] ?? "📌";
}

function getHomeKoreanReviewCount(place: CuratedPlace) {
  return Math.max(place.reviews?.length ?? 0, place.koreanReviewSignal?.reviewCount ?? 0, getMangoCommentCount(place));
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
      (place.reviews ?? []).slice(0, 2).map((review, index) => ({
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
  const koreanSignal = (place.koreanReviewSignal?.score ?? 0) * 10;
  const mangoReviewWeight = getHomeKoreanReviewCount(place) * 18;
  const savedWeight = getMangoRecommendationCount(place) * 8;
  return (place.rating ?? 0) * 18 + koreanSignal + mangoReviewWeight + savedWeight;
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
  return getHomeMapPlaces(destination, categoryId).filter((place) => hasSafeHomeMapCoordinates(place, destination));
}

function matchHomeCategory(place: CuratedPlace, categoryId: string) {
  if (categoryId === "food") return place.category === "맛집";
  if (categoryId === "cafe") return place.category === "카페";
  if (categoryId === "massage") return place.category === "마사지";
  if (categoryId === "market") return place.category === "쇼핑";
  if (categoryId === "exchange") return place.category === "환전";
  if (categoryId === "photo") return ["사진명소", "바/루프탑", "가라오케", "투어/액티비티"].includes(place.category);
  return false;
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
  const categoryMap: Record<CuratedPlaceCategory, string> = {
    맛집: "food",
    카페: "cafe",
    마사지: "massage",
    "바/루프탑": "photo",
    쇼핑: "market",
    사진명소: "photo",
    환전: "exchange",
    가라오케: "photo",
    "투어/액티비티": "photo"
  };
  return categoryMap[place.category] ?? "food";
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
      title: "MANGOMAP live Google map"
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
  const selectedMarkerLimit = Math.max(24, Math.min(getHomeSafeMapPlaces(destination, selectedCategory.id).length, 160));
  const initialSelectedMarkerLimit = Math.min(selectedMarkerLimit, destination === "호치민" ? 36 : 28);
  const markers = mapCategories.flatMap((category) =>
    getGoogleBackedMapSpots(destination, category, citySpots[destination][category.id] ?? [], category.id === selectedCategory.id ? selectedMarkerLimit : 3).map((spot, index) => {
      const activeCategory = category.id === selectedCategory.id;
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
        labelVisible: activeCategory && index < 4,
        visibleFromZoom: activeCategory ? (index < initialSelectedMarkerLimit ? baseZoom : index < 88 ? baseZoom + 1 : baseZoom + 2) : baseZoom + 2,
        labelFromZoom: activeCategory ? (index < 4 ? baseZoom : index < 12 ? baseZoom + 1 : 16) : 16,
        lat: spot.coordinates.lat,
        lng: spot.coordinates.lng,
        color: category.dot
      };
    })
  );
  const activeMarkers = markers.map((marker) => ({
    ...marker,
    active: marker.id === selectedCategory.id
  }));
  const focusedMapPlace = focusedPlace && focusedCoordinates ? focusedPlace : undefined;
  const focusMarker = focusedMapPlace && focusedCoordinates
    ? {
        id: "focused",
        title: formatMapPlaceName(focusedMapPlace.name),
        sub: `${getDisplayHomeCategory(focusedMapPlace.category)} · ${focusedMapPlace.area ?? destination}`,
        description: buildMapPlaceDescription(focusedMapPlace),
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
        checkHint: getMapPlaceCheckHint(focusedMapPlace),
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
    function getMarkerIcon(data, selected) {
      const radius = selected ? (data.id === "focused" ? 23 : 15) : data.id === "focused" ? 22 : data.labelVisible ? 13 : data.active ? 9 : 5;
      const fillOpacity = selected ? 0.9 : data.id === "focused" ? 0.86 : data.labelVisible ? 0.72 : data.active ? 0.48 : 0.1;
      const strokeOpacity = selected ? 1 : data.id === "focused" ? 1 : data.active ? 0.9 : 0.18;
      return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: radius,
        fillColor: data.color,
        fillOpacity,
        strokeColor: selected ? "#1F2937" : data.color,
        strokeOpacity,
        strokeWeight: selected ? 5 : data.id === "focused" ? 5 : data.labelVisible ? 4 : data.active ? 3 : 2
      };
    }
    function clearSelectedMarker() {
      if (selectedMarkerEntry) {
        selectedMarkerEntry.marker.setIcon(getMarkerIcon(selectedMarkerEntry.data, false));
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
        disableDefaultUI: false,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        clickableIcons: false,
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
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(apiKey) + "&callback=initMangoMap&language=ko&region=VN";
      script.async = true;
      script.defer = true;
      script.onerror = () => renderFallback("Google Maps 스크립트 로드에 실패했어요. API 키, 결제 설정, 허용 도메인을 확인해주세요.");
      document.head.appendChild(script);
    }
  </script>
</body>
</html>`;
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
      const mapPriorityScore = getHomeMapPriority(right) - getHomeMapPriority(left);
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
        return {
          title: formatMapPlaceName(place.name),
          sub: `${getDisplayHomeCategory(place.category)}${place.area ? ` · ${place.area}` : ""}`,
          description: buildMapPlaceDescription(place),
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
          checkHint: getMapPlaceCheckHint(place)
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

function getHomeMapPriority(place: CuratedPlace) {
  let score = 0;
  if (place.tags.includes("지도추천")) score += 1000;
  if (place.coordinates) score += 120;
  if (place.googlePlaceId.startsWith("manual-")) score += 30;
  return score;
}

function buildMapSpotDescription(destination: MapDestination, category: MapCategory, spotLabel: string) {
  const categoryCopy: Record<string, string> = {
    food: "식사 동선에 넣기 좋은 장소예요. 피크 시간에는 대기 가능성이 있어요.",
    cafe: "더운 낮이나 이동 사이에 쉬어가기 좋은 카페예요.",
    massage: "많이 걷는 날 중간 회복 코스로 넣기 좋아요. 예약 가능 여부를 먼저 보세요.",
    rooftop: "저녁 이후 분위기 전환용으로 보기 좋아요. 귀가는 Grab Car를 추천해요.",
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
    backgroundColor: colors.midnight,
    overflow: "hidden"
  },
  nightScanline: {
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
  cityRail: {
    zIndex: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#FFF4D8",
    borderRadius: 22,
    padding: 5
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
    flexWrap: "wrap",
    gap: 8,
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
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    ...neonShadow
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#EBD8A6",
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
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "900"
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    marginTop: 2
  },
  sheetCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 4
  },
  sheetIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
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
    borderRadius: 18,
    backgroundColor: "#FFF4D8",
    paddingHorizontal: 11,
    paddingVertical: 10,
    justifyContent: "center"
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  infoValue: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
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
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
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
    color: "#FFF7F0",
    fontSize: 16,
    fontWeight: "900"
  },
  secondaryAction: {
    width: 92,
    minHeight: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8"
  },
  secondaryActionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  todayPanel: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 30,
    padding: 17,
    backgroundColor: "#432600",
    borderWidth: 1,
    borderColor: "rgba(255,210,74,0.48)",
    shadowColor: "#FF9F1C",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }
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
    color: "#FFD43B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  todayTitle: {
    color: "#FFF7DF",
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 5
  },
  todayCopy: {
    color: "rgba(255,247,223,0.74)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 5
  },
  todayReactionBadge: {
    minWidth: 72,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#FFC233"
  },
  todayReactionValue: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900"
  },
  todayReactionLabel: {
    color: "#5C3600",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900"
  },
  heroCtaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  heroPrimaryCta: {
    flex: 1,
    minHeight: 54,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF8A1F",
    shadowColor: "#FF8A1F",
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
    color: "#271400",
    fontSize: 15,
    fontWeight: "900"
  },
  heroSecondaryText: {
    color: "#FFF7DF",
    fontSize: 15,
    fontWeight: "900"
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
