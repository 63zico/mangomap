import { createElement, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "../components/BrandLogo";
import { curatedPlaces } from "../data/places";
import { isSupabaseConfigured, supabaseSelect } from "../services/supabaseClient";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";
import type { CuratedPlace, CuratedPlaceCategory, Destination, GooglePlacesState, Itinerary, LiveTravelInfo, PlannerInput } from "../types";
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

const mapDestinations = ["호치민", "다낭", "나트랑", "하노이", "달랏", "푸꾸옥"] as const;
type MapDestination = (typeof mapDestinations)[number];

const mapCategories: MapCategory[] = [
  { id: "food", filterId: "food", label: "맛집", dot: "#FF7A00", icon: "M", copy: "지금 갈 만한 식당" },
  { id: "cafe", filterId: "cafe", label: "카페", dot: "#FFC233", icon: "C", copy: "사진·스페셜티" },
  { id: "massage", filterId: "massage", label: "마사지", dot: "#3E8DFF", icon: "S", copy: "걷다가 쉬기 좋은 곳" },
  { id: "rooftop", filterId: "night", label: "루프탑·바", dot: "#FF6F0F", icon: "R", copy: "밤공기 좋은 코스" },
  { id: "market", filterId: "shopping", label: "시장·쇼핑", dot: "#FFB84D", icon: "B", copy: "벤탄·야시장·기념품" },
  { id: "photo", filterId: "photo", label: "사진명소", dot: "#20D8D2", icon: "P", copy: "여행 사진 남길 곳" },
  { id: "exchange", filterId: "exchange", label: "환전", dot: "#FDE047", icon: "V", copy: "환율 좋은 금은방·환전소" },
  { id: "karaoke", filterId: "karaoke", label: "가라오케", dot: "#FF6F0F", icon: "K", copy: "밤 코스 후보" }
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
  onOpenReport
}: HomeScreenProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("food");
  const [selectedMapDestination, setSelectedMapDestination] = useState<MapDestination>(input.destination);
  const [homeActivity, setHomeActivity] = useState<HomeActivitySnapshot>(emptyHomeActivity);
  const selectedCategory = mapCategories.find((category) => category.id === selectedCategoryId) ?? mapCategories[0];
  const visibleFocusedPlace =
    focusedPlace &&
    focusedPlace.city === selectedMapDestination &&
    getMapCategoryIdFromPlace(focusedPlace) === selectedCategory.id &&
    hasSafeHomeMapCoordinates(focusedPlace, selectedMapDestination)
      ? focusedPlace
      : undefined;
  const mapHtml = useMemo(() => buildGoogleMapHtml(selectedMapDestination, selectedCategory, visibleFocusedPlace), [selectedMapDestination, selectedCategory, visibleFocusedPlace]);
  const selectedCategoryCount = useMemo(
    () => countHomeCategoryPlaces(selectedMapDestination, selectedCategory),
    [selectedMapDestination, selectedCategory]
  );
  const liveCount = useMemo(
    () => googlePlaces.restaurants.length + googlePlaces.cafes.length + 42,
    [googlePlaces.restaurants.length, googlePlaces.cafes.length]
  );
  const todayHotPlaces = useMemo(() => {
    return dedupeHomePlaces(
      curatedPlaces.filter((place) => place.city === selectedMapDestination && !isHomeSuppressedPlace(place))
    )
      .sort((a, b) => getTodayHotScore(b) - getTodayHotScore(a))
      .slice(0, 3);
  }, [selectedMapDestination]);
  const todayReactionCount = useMemo(() => {
    const baseCount = todayHotPlaces.reduce((total, place) => total + getMangoRecommendationCount(place) + getMangoCommentCount(place), 0);
    const liveActivityBonus = homeActivity.meetupCount * 8 + homeActivity.marketCount * 3 + homeActivity.talkCount * 5 + homeActivity.reportCount * 4;
    return Math.max(128, baseCount + selectedCategoryCount * 3 + liveCount + liveActivityBonus);
  }, [homeActivity.marketCount, homeActivity.meetupCount, homeActivity.reportCount, homeActivity.talkCount, liveCount, selectedCategoryCount, todayHotPlaces]);

  useEffect(() => {
    setSelectedMapDestination(input.destination);
  }, [input.destination]);

  useEffect(() => {
    if (!focusedPlace) return;
    setSelectedMapDestination(focusedPlace.city);
    setSelectedCategoryId(getMapCategoryIdFromPlace(focusedPlace));
  }, [focusedPlace]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.nightScanline} />
      <View pointerEvents="none" style={styles.neonSweep} />
      <ScrollView style={styles.phone} contentContainerStyle={styles.phoneContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <BrandLogo size={62} />
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>MANGOMAP</Text>
              <Text style={styles.subBrand}>베트남 여행자 현지맵</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => onOpenPlaces(selectedCategory.filterId, selectedMapDestination)} style={styles.searchButton}>
            <Text style={styles.searchIcon}>⌕</Text>
          </Pressable>
        </View>

        <View style={styles.todayPanel}>
          <View style={styles.todayHeader}>
            <View style={styles.todayHeaderCopy}>
              <Text style={styles.todayEyebrow}>오늘의 망고맵</Text>
              <Text style={styles.todayTitle}>지금 {selectedMapDestination}에서 뜨는 것</Text>
              <Text style={styles.todayCopy}>핫플, 모임, 장터, 생활톡을 한 번에 확인해요.</Text>
            </View>
            <View style={styles.todayReactionBadge}>
              <Text style={styles.todayReactionValue}>{todayReactionCount.toLocaleString("ko-KR")}</Text>
              <Text style={styles.todayReactionLabel}>반응</Text>
            </View>
          </View>

          <View style={styles.todayQuickGrid}>
            <TodayQuickCard title="열린 모임" value={homeActivity.meetupCount > 0 ? `${homeActivity.meetupCount}개 열림` : "오늘 합류"} copy="식사·카페·이동 동행" onPress={onOpenTravel} />
            <TodayQuickCard title="방금 올라온 장터" value={homeActivity.marketCount > 0 ? `${homeActivity.marketCount}개 판매중` : "여행템 거래"} copy="유심·티켓·생활용품" onPress={onOpenMarketplace} />
            <TodayQuickCard title="생활톡" value={homeActivity.talkCount > 0 ? `${homeActivity.talkCount}개 대화` : "현지 질문"} copy="숙소·교통·주의사항" onPress={onOpenTravel} />
            <TodayQuickCard title="스팟 제보" value={homeActivity.reportCount > 0 ? `${homeActivity.reportCount}건 제보` : "망고단 기여"} copy="좋은 장소를 지도에 반영" onPress={onOpenReport} />
          </View>

          <View style={styles.todayHotList}>
            {homeActivity.latestItems.length > 0 ? (
              <View style={styles.todayLiveFeed}>
                <Text style={styles.todayLiveTitle}>방금 올라온 활동</Text>
                {homeActivity.latestItems.map((item) => (
                  <TodayActivityRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onPress={item.type === "market" ? onOpenMarketplace : item.type === "report" ? onOpenReport : onOpenTravel}
                  />
                ))}
              </View>
            ) : null}
            <View style={styles.todaySectionHeader}>
              <Text style={styles.todaySectionTitle}>오늘의 핫플 TOP 3</Text>
              <Text style={styles.todaySectionMeta}>망고단 반응순</Text>
            </View>
            {todayHotPlaces.map((place, index) => (
              <TodayHotSpotRow
                key={place.id}
                place={place}
                rank={index + 1}
                onPress={() => onOpenPlaces(getMapCategoryIdFromPlace(place), selectedMapDestination)}
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
                  <View style={[styles.categoryDot, { backgroundColor: category.dot }]} />
                  <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{category.label}</Text>
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
              <Text style={styles.sheetCopy}>{visibleFocusedPlace ? `${visibleFocusedPlace.category} · ${visibleFocusedPlace.area ?? selectedMapDestination}` : selectedCategory.copy}</Text>
            </View>
            <View style={[styles.sheetIcon, { backgroundColor: selectedCategory.dot }]}>
              <Text style={styles.sheetIconText}>{selectedCategory.icon}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <InfoPill label="후보" value={`${selectedCategoryCount}곳`} />
            <InfoPill label="날씨" value={formatWeatherValue(liveInfo)} />
            <InfoPill label="업데이트" value="오늘" />
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
            <Pressable accessibilityRole="button" onPress={onOpenTravel} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>모임</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.communityPanel}>
          <View style={styles.communityHeader}>
            <View>
              <Text style={styles.communityEyebrow}>여행자 커뮤니티</Text>
              <Text style={styles.communityTitle}>지도에서 보고, 사람들과 해결하기</Text>
            </View>
            <Text style={styles.communityLive}>{liveCount}개 후보</Text>
          </View>
          <View style={styles.communityGrid}>
            <CommunityAction title="번개모임" copy="식사·카페·이동 동행" badge="방입장" onPress={onOpenTravel} />
            <CommunityAction title="중고장터" copy="유심·티켓·여행용품" badge="거래" onPress={onOpenMarketplace} />
            <CommunityAction title="스팟제보" copy="현지 추천 장소 올리기" badge="기여" onPress={onOpenReport} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function CommunityAction({ title, copy, badge, onPress }: { title: string; copy: string; badge: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.communityCard}>
      <View style={styles.communityCardTop}>
        <Text style={styles.communityCardTitle}>{title}</Text>
        <Text style={styles.communityBadge}>{badge}</Text>
      </View>
      <Text style={styles.communityCardCopy}>{copy}</Text>
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

function TodayHotSpotRow({ place, rank, onPress }: { place: CuratedPlace; rank: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.todayHotRow}>
      <Text style={styles.todayHotRank}>{rank}</Text>
      <View style={styles.todayHotCopy}>
        <Text style={styles.todayHotTitle} numberOfLines={1}>{formatMapPlaceName(place.name)}</Text>
        <Text style={styles.todayHotMeta} numberOfLines={1}>
          망고단 추천 {getMangoRecommendationCount(place)} · 댓글 {getMangoCommentCount(place)}
        </Text>
      </View>
      <Text style={styles.todayHotCategory}>{place.category}</Text>
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

function getTodayHotScore(place: CuratedPlace) {
  return getMangoRecommendationCount(place) * 4 + getMangoCommentCount(place) * 3 + (place.rating ?? 0) * 12 + Math.min(place.userRatingCount ?? 0, 5000) / 100;
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
  if (categoryId === "rooftop") return place.category === "바/루프탑";
  if (categoryId === "market") return place.category === "쇼핑";
  if (categoryId === "photo") return place.category === "사진명소";
  if (categoryId === "exchange") return place.category === "환전";
  if (categoryId === "karaoke") return place.category === "가라오케";
  return false;
}

function hasSafeHomeMapCoordinates(place: CuratedPlace, destination: MapDestination) {
  if (!place.coordinates) return false;
  return isCoordinateInsideDestination(destination, place.coordinates.latitude, place.coordinates.longitude);
}

function getMapCategoryIdFromPlace(place: CuratedPlace) {
  const categoryMap: Record<CuratedPlaceCategory, string> = {
    맛집: "food",
    카페: "cafe",
    마사지: "massage",
    "바/루프탑": "rooftop",
    쇼핑: "market",
    사진명소: "photo",
    환전: "exchange",
    가라오케: "karaoke",
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
      photo: [{ title: "Cafe Apartment", sub: "사진명소" }, { title: "Nguyen Hue Street", sub: "산책·사진" }],
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
      photo: [{ title: "Hoan Kiem Lake", sub: "산책·사진" }, { title: "Train Street", sub: "사진명소" }],
      market: [{ title: "Dong Xuan Market", sub: "시장" }, { title: "Hang Gai Street", sub: "쇼핑" }],
      exchange: [{ title: "Quoc Trinh Gold", sub: "환전 후보" }, { title: "Ha Trung Street Exchange", sub: "환전 거리" }],
      massage: [{ title: "SF Spa Hanoi", sub: "마사지" }, { title: "La Spa Hanoi", sub: "마사지" }],
      karaoke: [{ title: "Karaoke Old Quarter", sub: "가라오케" }]
    },
    달랏: {
      food: [{ title: "Bánh Căn Nhà Chung", sub: "달랏 로컬 맛집" }, { title: "Lẩu Gà Lá É Tao Ngộ", sub: "닭전골" }, { title: "Artist Alley", sub: "분위기 맛집" }],
      cafe: [{ title: "Kokoro Cafe", sub: "사진 카페" }, { title: "Still Cafe", sub: "감성 카페" }, { title: "Túi Mơ To", sub: "전망 카페" }],
      rooftop: [{ title: "Maze Bar", sub: "밤 코스" }, { title: "Dalat Night Market", sub: "야시장" }],
      photo: [{ title: "Dalat Railway Station", sub: "사진명소" }, { title: "Linh Phuoc Pagoda", sub: "관광 사진" }],
      market: [{ title: "Dalat Market", sub: "시장" }, { title: "Dalat Night Market", sub: "야시장" }],
      exchange: [{ title: "Dalat Gold Shop", sub: "환전 후보" }, { title: "Hoa Binh Area Exchange", sub: "환전 후보" }],
      massage: [{ title: "Dalat Spa", sub: "마사지" }, { title: "Herbal Spa Dalat", sub: "마사지" }],
      karaoke: [{ title: "Karaoke Đà Lạt Center", sub: "가라오케" }]
    },
    푸꾸옥: {
      food: [{ title: "Xin Chào Restaurant", sub: "해산물" }, { title: "Ra Khơi", sub: "로컬 해산물" }, { title: "Crab House", sub: "크랩" }],
      cafe: [{ title: "Chuồn Chuồn Bistro", sub: "전망 카페" }, { title: "Son Tra Hill Coffee", sub: "카페" }, { title: "Phu Quoc Coffee House", sub: "휴식 카페" }],
      rooftop: [{ title: "Sunset Sanato", sub: "선셋 바" }, { title: "OCSEN Beach Bar", sub: "비치 바" }],
      photo: [{ title: "Sunset Town", sub: "사진명소" }, { title: "Sao Beach", sub: "해변 사진" }],
      market: [{ title: "Phu Quoc Night Market", sub: "야시장" }, { title: "Duong Dong Market", sub: "시장" }],
      exchange: [{ title: "Duong Dong Gold Shop", sub: "환전 후보" }, { title: "Phu Quoc Money Exchange", sub: "환전 후보" }],
      massage: [{ title: "Luna Thai Spa", sub: "마사지" }, { title: "La Veranda Spa", sub: "마사지" }],
      karaoke: [{ title: "Karaoke Phu Quoc Center", sub: "가라오케" }]
    }
  };
  const [lat, lng] = cityCenter[destination];
  const baseZoom = cityZoom[destination];
  const selectedMarkerLimit = Math.max(24, Math.min(getHomeSafeMapPlaces(destination, selectedCategory.id).length, 120));
  const initialSelectedMarkerLimit = Math.min(selectedMarkerLimit, destination === "호치민" ? 48 : 34);
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
        visibleFromZoom: activeCategory ? (index < initialSelectedMarkerLimit ? baseZoom : index < 88 ? baseZoom + 1 : baseZoom + 2) : baseZoom + 1,
        labelFromZoom: activeCategory ? (index < 4 ? baseZoom : index < 14 ? baseZoom + 1 : 16) : 16,
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
  const focusMarker = focusedPlace?.coordinates
    ? {
        id: "focused",
        title: formatMapPlaceName(focusedPlace.name),
        sub: `${focusedPlace.category} · ${focusedPlace.area ?? destination}`,
        description: buildMapPlaceDescription(focusedPlace),
        imageUrl: getFocusedPlaceImageUrl(focusedPlace),
        lat: focusedPlace.coordinates.latitude,
        lng: focusedPlace.coordinates.longitude,
        color: selectedCategory.dot,
        active: true,
        mapsUri: focusedPlace.googleMapsUri,
        query: `${focusedPlace.name} ${destination}`,
        rating: focusedPlace.rating,
        reviewCount: focusedPlace.userRatingCount,
        mangoRecommendationCount: getMangoRecommendationCount(focusedPlace),
        mangoCommentCount: getMangoCommentCount(focusedPlace),
        priceLevel: focusedPlace.priceLevel,
        area: focusedPlace.area,
        address: getHomeMapAddressLabel(destination, focusedPlace),
        bestTime: focusedPlace.bestTime[0],
        checkHint: getMapPlaceCheckHint(focusedPlace),
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
      const count = Number(marker.reviewCount || 0);
      if (!count) return undefined;
      if (count >= 10000) return "리뷰 " + (Math.round(count / 1000) / 10) + "만+";
      if (count >= 1000) return "리뷰 " + Math.round(count / 100) / 10 + "천+";
      return "리뷰 " + count.toLocaleString("ko-KR") + "+";
    };
    const formatMangoMeta = (marker) => Number(marker.mangoRecommendationCount || 0) ? "망고단 추천 " + Number(marker.mangoRecommendationCount).toLocaleString("ko-KR") : undefined;
    const formatCommentMeta = (marker) => Number(marker.mangoCommentCount || 0) ? "댓글 " + Number(marker.mangoCommentCount).toLocaleString("ko-KR") : undefined;
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
        zoom: ${cityZoom[destination]},
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
          map: marker.id === "focused" || marker.visibleFromZoom <= ${baseZoom} ? map : null,
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
        const popupHtml =
        "<div class='place-popup'>" +
          "<div class='place-photo' data-image-url='" + escapeHtml(marker.imageUrl) + "'><span>사진 보기</span></div>" +
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
        map.setZoom(${Math.min(Number(cityZoom[destination]) + 1, 15)});
        openPopupForMarker(map, focusedGoogleMarker, focusedGoogleMarker.html);
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
    return places.map((place) => ({
      title: formatMapPlaceName(place.name),
      sub: `${place.category}${place.area ? ` · ${place.area}` : ""}`,
      description: buildMapPlaceDescription(place),
      imageUrl: getFocusedPlaceImageUrl(place),
      mapsUri: place.googleMapsUri,
      query: `${place.name} ${destination}`,
      coordinates: { lat: place.coordinates!.latitude, lng: place.coordinates!.longitude },
      address: getHomeMapAddressLabel(destination, place),
      rating: place.rating,
      reviewCount: place.userRatingCount,
      mangoRecommendationCount: getMangoRecommendationCount(place),
      mangoCommentCount: getMangoCommentCount(place),
      priceLevel: place.priceLevel,
      area: place.area,
      bestTime: place.bestTime[0],
      checkHint: getMapPlaceCheckHint(place)
    }));
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
    food: "식사 동선에 넣기 좋은 후보예요. 피크 시간에는 대기 가능성이 있어요.",
    cafe: "더운 낮이나 이동 사이에 쉬어가기 좋은 카페 후보예요.",
    massage: "많이 걷는 날 중간 회복 코스로 넣기 좋아요. 예약 가능 여부를 먼저 보세요.",
    rooftop: "저녁 이후 분위기 전환용으로 보기 좋아요. 귀가는 Grab Car를 추천해요.",
    market: "기념품과 간식 쇼핑을 한 번에 보기 좋은 동선 후보예요.",
    photo: "사진 남기기 좋은 곳이라 낮 시간대 방문을 먼저 추천해요.",
    exchange: "환율과 지급액을 현장에서 비교하고 소액부터 바꾸는 편이 좋아요.",
    karaoke: "밤 일정 후보예요. 룸 요금과 음료 포함 여부를 먼저 확인하세요."
  };

  return `${destination} ${spotLabel}. ${categoryCopy[category.id] ?? category.copy}`;
}

function getFocusedPlaceImageUrl(place: CuratedPlace) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey && place.photoName) {
    return `https://places.googleapis.com/v1/${place.photoName}/media?maxWidthPx=640&key=${apiKey}`;
  }

  return getHomeMapImageUrl(place.city, getMapCategoryIdFromPlace(place), place.id);
}

function buildMapPlaceDescription(place: CuratedPlace) {
  const name = place.name.toLowerCase();
  const tags = place.tags;
  const firstBestTime = place.bestTime[0];

  if (place.category === "맛집") {
    if (name.includes("unatoto") || name.includes("うな") || tags.includes("장어")) return "장어덮밥·구이로 빠르게 한 끼 잡기 좋은 식당";
    if (tags.includes("한국식중식") || name.includes("jjambbong") || name.includes("jjamppong")) return "짬뽕·중식 메뉴가 당길 때 보기 좋은 한식 중식 후보";
    if (tags.includes("브런치") || name.includes("brunch") || name.includes("breakfast")) return "늦은 아침이나 가벼운 점심으로 넣기 좋은 브런치 후보";
    if (tags.includes("해산물") || name.includes("seafood") || name.includes("crab")) return "해산물 메뉴를 중심으로 저녁 코스에 넣기 좋은 식당";
    if (tags.includes("쌀국수") || name.includes("pho")) return "쌀국수 한 그릇으로 가볍게 들르기 좋은 현지식 후보";
    if (tags.includes("반미") || name.includes("banh mi")) return "이동 중 간단히 먹기 좋은 반미·간편식 후보";
    if (tags.includes("채식가능") || name.includes("vegan") || name.includes("vegetarian")) return "채식 메뉴 선택지가 있어 식단 맞추기 좋은 식당";
    if (place.priceLevel === "저렴") return "가격 부담 낮게 한 끼 해결하기 좋은 가성비 식당";
    if (place.priceLevel === "프리미엄") return "조금 더 좋은 분위기로 식사 잡기 좋은 프리미엄 후보";
    if (firstBestTime) return `${firstBestTime} 시간대에 동선 중간 식사로 넣기 좋은 맛집`;
    return "평점과 위치를 보고 한 끼 후보로 넣기 좋은 식당";
  }

  if (place.category === "카페") {
    if (tags.includes("사진맛집") || tags.includes("뷰맛집")) return "사진 찍고 쉬어가기 좋은 분위기 카페";
    if (tags.includes("디저트")) return "커피와 디저트로 쉬어가기 좋은 카페";
    if (place.rainyDayOk) return "비 오거나 더울 때 실내 대피용으로 좋은 카페";
    return "동선 중간에 쉬어가기 좋은 카페 후보";
  }

  if (place.category === "마사지") {
    if (place.priceLevel === "프리미엄") return "컨디션 회복용으로 잡기 좋은 프리미엄 스파";
    if (place.priceLevel === "저렴") return "걷는 일정 중간에 부담 없이 넣기 좋은 마사지";
    return "많이 걷는 날 중간 휴식으로 넣기 좋은 마사지 후보";
  }

  if (place.category === "바/루프탑") return "저녁 이후 분위기 전환용으로 보기 좋은 밤 코스";
  if (place.category === "환전") return "여행 경비 준비 전 환율을 비교해보기 좋은 후보";
  if (place.category === "쇼핑") return "기념품과 간식 쇼핑을 한 번에 보기 좋은 장소";
  if (place.category === "사진명소") return "짧게 들러 사진 남기기 좋은 스팟";
  if (place.category === "가라오케") return "밤 일정 전 가격과 룸 조건 확인이 필요한 후보";

  return place.oneLine || place.koreanTip;
}

function getMapPlaceCheckHint(place: CuratedPlace) {
  if (place.category === "맛집") return "영업시간 확인";
  if (place.category === "마사지") return "예약 확인 추천";
  if (place.category === "환전") return "환율 현장 확인";
  if (place.category === "바/루프탑" || place.category === "가라오케") return "밤 이동 Grab 추천";
  return place.beginnerSafe ? "초행자 무난" : "방문 전 확인";
}

function getHomeMapImageUrl(destination: MapDestination, categoryId: string, seed: string) {
  const images = homeMapImages[categoryId] ?? homeMapImages.food;
  return images[getStableMapImageIndex(`${destination}-${categoryId}-${seed}`, images.length)];
}

function getStableMapImageIndex(value: string, length: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % length;
}

const homeMapImages: Record<string, string[]> = {
  food: [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=640&q=80"
  ],
  cafe: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=640&q=80"
  ],
  massage: [
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=640&q=80"
  ],
  rooftop: [
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=640&q=80"
  ],
  market: [
    "https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1502163140606-888448ae8cfe?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=640&q=80"
  ],
  photo: [
    "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=640&q=80"
  ],
  exchange: [
    "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&w=640&q=80"
  ],
  karaoke: [
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1526328828355-69b01701ca6a?auto=format&fit=crop&w=640&q=80",
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=640&q=80"
  ]
};

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
  phoneContent: {
    flexGrow: 1,
    paddingBottom: 112
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
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    borderWidth: 1,
    borderColor: "rgba(255,248,232,0.28)",
    ...sunsetGlow
  },
  searchIcon: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 32,
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
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.18)",
    backgroundColor: "#FFF4D8",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
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
    display: "none",
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
  }
});
