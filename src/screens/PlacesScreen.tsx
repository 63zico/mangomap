import { useEffect, useMemo, useRef, useState } from "react";
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { Header } from "../components/Header";
import { curatedPlaces } from "../data/places";
import { awardPointsOnce, createRemoteCheckin, loadRemoteReviews, submitRemoteReview } from "../services/mangomapEngagementService";
import { colors, shadow } from "../styles/theme";
import type { CuratedPlace, Destination, LiveTravelInfo, PlaceReport, PlannerInput } from "../types";
import { openGoogleMapsPlace } from "../utils/googleMaps";
import { formatMangoCommentChip, formatMangoRecommendationChip, getMangoCommentCount, getMangoReviewCount } from "../utils/placeCommunity";
import { compareMangoSafeChoices, getMangoSafeChoiceProfile } from "../utils/mangoSafeChoice";
import { getMangoRankBadges } from "../utils/placeRanking";
import { savePlaceReservationInquiry } from "../utils/placeReservationInquiries";
import {
  getCautions,
  getRealisticPlaceReviews,
  getRecommendedMenu,
  getRevisitIntent,
  getTrustBadge,
  getVisitTips,
  matchesStrictCategory
} from "../utils/placeTrust";

type PlacesScreenProps = {
  input: PlannerInput;
  liveInfo: LiveTravelInfo;
  savedPlaceIds: string[];
  placeReports: PlaceReport[];
  memberId?: string;
  memberName?: string;
  initialFilterId?: string;
  initialDestination?: Destination;
  reportOpenRequest?: number;
  onToggleSavedPlace: (placeId: string) => void;
  onSubmitPlaceReport: (report: PlaceReport) => void;
  onRemovePlaceReport: (reportId: string) => void;
  onOpenMapPlace: (place: CuratedPlace) => void;
  onRequireAuth?: () => void;
  onMangoTemperatureChange?: (delta: number) => void;
  onDetailOpenChange?: (open: boolean) => void;
};

type FilterId =
  | "all"
  | "food"
  | "cafe"
  | "massage"
  | "rooftop"
  | "karaoke"
  | "shopping"
  | "photo"
  | "exchange"
  | "korean"
  | "chinese"
  | "japanese"
  | "vietnamese";

type PlaceComment = {
  id: string;
  placeId: string;
  memberName: string;
  message: string;
  createdAt: string;
  rating?: number;
  tags?: string[];
  source?: "local" | "remote" | "seed";
};

const destinationTabs: Destination[] = ["호치민", "다낭", "나트랑", "하노이", "달랏", "푸꾸옥"];

const filters: Array<{ id: FilterId; label: string; match: (place: CuratedPlace) => boolean }> = [
  { id: "all", label: "전체 맛집", match: (place) => isFoodGuidePlace(place) },
  { id: "food", label: "맛집", match: isRestaurantFoodGuidePlace },
  { id: "cafe", label: "카페", match: (place) => matchesStrictCategory(place, "cafe") },
  { id: "massage", label: "마사지", match: (place) => matchesStrictCategory(place, "massage") },
  { id: "rooftop", label: "술집", match: (place) => matchesStrictCategory(place, "rooftop") },
  { id: "karaoke", label: "가라오케", match: (place) => place.category === "가라오케" },
  { id: "shopping", label: "쇼핑", match: (place) => place.category === "쇼핑" },
  { id: "photo", label: "관광", match: (place) => matchesStrictCategory(place, "tour") },
  { id: "exchange", label: "환전", match: (place) => place.category === "환전" },
  { id: "korean", label: "한식", match: (place) => matchesStrictCategory(place, "korean") },
  {
    id: "chinese",
    label: "중식",
    match: isChineseFoodGuidePlace
  },
  {
    id: "japanese",
    label: "일식",
    match: isJapaneseFoodGuidePlace
  },
  { id: "vietnamese", label: "베트남 음식", match: (place) => place.category === "맛집" && !hasTag(place, ["한식당", "중식당", "일식당"]) }
];

const shortcutFilters: FilterId[] = ["food", "vietnamese", "korean", "chinese", "japanese", "cafe"];

type SituationFilter = {
  id: string;
  label: string;
  title: string;
  copy: string;
  keywords: string[];
};

const situationFilters: SituationFilter[] = [
  {
    id: "all",
    label: "전체 상황",
    title: "오늘 실패 확률 낮은 맛집",
    copy: "한국인 후기와 최근 확인 신호가 있는 식당만 먼저 보여줘요.",
    keywords: []
  },
  {
    id: "first-dinner",
    label: "첫날 저녁",
    title: "첫날 저녁에 무난한 식당",
    copy: "도착 첫날에는 맛보다 동선, 가격, 주문 난이도가 더 중요해요.",
    keywords: ["초행", "저녁", "무난", "로컬", "가족", "커플"]
  },
  {
    id: "parents",
    label: "부모님",
    title: "부모님 모시고 가기 무난한 식당",
    copy: "좌석, 청결, 메뉴 선택, 택시 접근성이 안정적인 후보예요.",
    keywords: ["부모님", "가족", "든든함", "한식", "무난", "청결"]
  },
  {
    id: "solo",
    label: "혼밥",
    title: "혼자 가도 부담 낮은 맛집",
    copy: "1인 주문, 좌석, 가격 예측 가능성을 함께 보는 리스트예요.",
    keywords: ["혼밥", "혼자", "점심", "가성비", "로컬"]
  },
  {
    id: "local-beginner",
    label: "로컬 입문",
    title: "베트남 음식 초보도 실패 적은 곳",
    copy: "로컬 분위기는 살리되 주문과 맛의 호불호 리스크를 낮췄어요.",
    keywords: ["로컬", "쌀국수", "분짜", "반미", "초행", "가성비"]
  },
  {
    id: "business",
    label: "접대",
    title: "한국 손님 접대에 무난한 식당",
    copy: "분위기, 예약, 가격 예측 가능성을 함께 보는 접대 후보예요.",
    keywords: ["접대", "분위기", "예약", "저녁", "프리미엄"]
  },
  {
    id: "rain",
    label: "비 오는 날",
    title: "비 오는 날 이동 부담 낮은 식당",
    copy: "실내 쾌적함과 택시 접근성을 우선해서 보여줘요.",
    keywords: ["비", "실내", "카페", "택시", "무난"]
  },
  {
    id: "hangover",
    label: "해장",
    title: "여행 다음날 해장하기 무난한 맛집",
    copy: "국물, 영업시간, 이동 부담을 함께 보는 회복용 리스트예요.",
    keywords: ["해장", "국물", "쌀국수", "점심", "든든함"]
  }
];

const placeCommunityStorageKey = "mangomap-place-comments-v2";

export function PlacesScreen({
  input,
  savedPlaceIds,
  memberId,
  memberName,
  initialFilterId,
  initialDestination,
  onToggleSavedPlace,
  onOpenMapPlace,
  onRequireAuth,
  onDetailOpenChange
}: PlacesScreenProps) {
  const [selectedCity, setSelectedCity] = useState<Destination>(initialDestination ?? input.destination);
  const [selectedFilterId, setSelectedFilterId] = useState<FilterId>(normalizeFilterId(initialFilterId));
  const [selectedSituationId, setSelectedSituationId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<CuratedPlace | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [comments, setComments] = useState<PlaceComment[]>(loadComments);
  const [remoteComments, setRemoteComments] = useState<PlaceComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [checkedInPlaceIds, setCheckedInPlaceIds] = useState<string[]>([]);
  const [detailNotice, setDetailNotice] = useState("");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const appMaxWidth = isDesktop ? 1400 : 560;

  useEffect(() => {
    onDetailOpenChange?.(Boolean(selectedPlace));
    return () => onDetailOpenChange?.(false);
  }, [onDetailOpenChange, selectedPlace]);

  useEffect(() => {
    if (initialDestination) setSelectedCity(initialDestination);
  }, [initialDestination]);

  useEffect(() => {
    if (initialFilterId) setSelectedFilterId(normalizeFilterId(initialFilterId));
  }, [initialFilterId]);

  useEffect(() => {
    setShowAll(false);
    setSelectedPlace(null);
  }, [selectedCity, selectedFilterId, selectedSituationId, searchQuery]);

  useEffect(() => {
    saveComments(comments);
  }, [comments]);

  useEffect(() => {
    let active = true;
    if (!selectedPlace) {
      setRemoteComments([]);
      setDetailNotice("");
      return () => {
        active = false;
      };
    }

    loadRemoteReviews(selectedPlace.id)
      .then((rows) => {
        if (!active) return;
        setRemoteComments(rows.map((row) => ({
          id: row.id,
          placeId: row.place_id,
          memberName: row.nickname,
          message: row.content,
          createdAt: row.created_at,
          rating: row.rating,
          tags: row.tags,
          source: "remote"
        })));
      })
      .catch(() => {
        if (active) setRemoteComments([]);
      });

    return () => {
      active = false;
    };
  }, [selectedPlace?.id]);

  const selectedFilter = filters.find((filter) => filter.id === selectedFilterId) ?? filters[0];
  const selectedSituation = situationFilters.find((filter) => filter.id === selectedSituationId) ?? situationFilters[0];
  const filterCounts = useMemo(() => {
    const cityPlaces = curatedPlaces.filter((place) => place.city === selectedCity);
    return filters.reduce<Partial<Record<FilterId, number>>>((counts, filter) => {
      counts[filter.id] = cityPlaces.filter((place) => filter.match(place)).length;
      return counts;
    }, {});
  }, [selectedCity]);

  const places = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return curatedPlaces
      .filter((place) => place.city === selectedCity)
      .filter((place) => selectedFilter.match(place))
      .filter((place) => matchesSituationFilter(place, selectedSituation))
      .filter((place) => {
        if (!query) return true;
        return [place.name, place.area, place.address, place.oneLine, place.koreanTip, ...place.tags]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => compareMangoSafeChoices(a, b, { surface: "explore", categoryId: selectedFilter.id }));
  }, [searchQuery, selectedCity, selectedFilter, selectedSituation]);

  const verifiedTopPlaces = selectedFilter.id === "all" ? pickDiverseSafePlaces(places, 8) : places.slice(0, 8);
  const verifiedTopIds = new Set(verifiedTopPlaces.map((place) => place.id));
  const candidatePlaces = places.filter((place) => !verifiedTopIds.has(place.id));
  const verifiedTopCount = verifiedTopPlaces.length;
  const mustVisit = verifiedTopPlaces.slice(0, 4);
  const visibleList = showAll ? candidatePlaces.slice(0, 16) : candidatePlaces.slice(0, 3);
  const primarySection = getExplorePrimarySection(selectedFilter.id, selectedCity, selectedSituation);
  const secondarySectionTitle = selectedFilter.id === "all" ? "검증 후보 더 보기" : `다른 검증 ${selectedFilter.label}`;
  const allButtonLabel = selectedFilter.id === "all" ? "검증 후보 더 보기" : `검증 ${selectedFilter.label} 더 보기`;
  const exploreTitle = selectedFilter.id === "all" ? `${selectedCity} 맛집 가이드` : `${selectedCity} ${selectedFilter.label}`;
  const exploreSubtitle = "지도보다 먼저, 상황에 맞는 실패 낮은 식당만 골랐어요.";

  if (selectedPlace) {
    return (
      <AppShell
        scroll={false}
        backgroundColor="#FFFFFF"
        maxWidth={isDesktop ? 1160 : 560}
        horizontalPadding={0}
        contentStyle={styles.detailShellContent}
      >
        <PlaceDetailV2
          place={selectedPlace}
          saved={savedPlaceIds.includes(selectedPlace.id)}
          comments={[
            ...remoteComments.filter((comment) => comment.placeId === selectedPlace.id),
            ...comments.filter((comment) => comment.placeId === selectedPlace.id && !remoteComments.some((remote) => remote.id === comment.id))
          ]}
          commentDraft={commentDraft}
          commentRating={commentRating}
          checkedIn={checkedInPlaceIds.includes(selectedPlace.id)}
          notice={detailNotice}
          onChangeComment={setCommentDraft}
          onChangeCommentRating={setCommentRating}
          onBack={() => {
            setSelectedPlace(null);
            setCommentDraft("");
            setCommentRating(5);
          }}
          onToggleSaved={() => onToggleSavedPlace(selectedPlace.id)}
          onOpenMap={() => onOpenMapPlace(selectedPlace)}
          onOpenGoogleMaps={() => openGoogleMapsPlace(selectedPlace)}
          onCheckIn={async () => {
            if (!memberId || !memberName) {
              onRequireAuth?.();
              return;
            }
            setDetailNotice("");
            try {
              await createRemoteCheckin({ place: selectedPlace, memberId, nickname: memberName });
              await awardPointsOnce("checkin", selectedPlace.id, 500, "장소 체크인");
              setCheckedInPlaceIds((current) => current.includes(selectedPlace.id) ? current : [selectedPlace.id, ...current]);
              setDetailNotice("체크인 완료. 망고포인트 적립 대상이에요.");
            } catch (error) {
              setDetailNotice(`체크인을 저장하지 못했어요. ${error instanceof Error ? error.message : ""}`.trim());
            }
          }}
          onSubmitComment={() => {
            const message = commentDraft.trim();
            if (!message) return;
            if (!memberName) {
              onRequireAuth?.();
              return;
            }
            const newComment: PlaceComment = {
              id: `place-comment-${Date.now()}`,
              placeId: selectedPlace.id,
              memberName,
              message,
              createdAt: new Date().toISOString(),
              rating: commentRating,
              source: "local"
            };
            setComments((current) => [
              newComment,
              ...current
            ]);
            if (memberId) {
              submitRemoteReview({
                place: selectedPlace,
                memberId,
                nickname: memberName,
                rating: commentRating,
                content: message,
                tags: ["한국인 후기"]
              })
                .then((row) => {
                  if (row) {
                    setRemoteComments((current) => [
                      {
                        id: row.id,
                        placeId: row.place_id,
                        memberName: row.nickname,
                        message: row.content,
                        createdAt: row.created_at,
                        rating: row.rating,
                        tags: row.tags,
                        source: "remote"
                      },
                      ...current.filter((comment) => comment.id !== row.id)
                    ]);
                    awardPointsOnce("review", selectedPlace.id, 200, "장소 후기 작성");
                  }
                })
                .catch(() => setDetailNotice("후기는 화면에 임시 저장됐지만 서버 저장은 실패했어요."));
            }
            setCommentDraft("");
            setCommentRating(5);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell withBottomNav maxWidth={appMaxWidth} horizontalPadding={isDesktop ? 32 : 20}>
      <Header eyebrow="맛집 가이드" title={exploreTitle} subtitle={exploreSubtitle} />

      <View style={[styles.searchPanel, isDesktop && styles.searchPanelDesktop]}>
        <View style={[styles.searchBox, isDesktop && styles.searchBoxDesktop]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`${selectedCity}에서 실패 적은 맛집 찾기`}
            placeholderTextColor="#A87813"
            style={styles.searchInput}
          />
        </View>

        {isDesktop ? (
          <View style={styles.desktopSearchMetaRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.desktopCityTabs}>
              {destinationTabs.map((city) => (
                <Pressable key={city} onPress={() => setSelectedCity(city)} style={[styles.desktopCityPill, selectedCity === city && styles.desktopCityPillActive]}>
                  <Text style={[styles.desktopCityPillText, selectedCity === city && styles.desktopCityPillTextActive]}>{city}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.desktopSearchSummary}>지금 {selectedCity} · {selectedSituation.label} · 검증 TOP {verifiedTopCount}</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityTabs}>
              {destinationTabs.map((city) => (
                <Pressable key={city} onPress={() => setSelectedCity(city)} style={[styles.cityPill, selectedCity === city && styles.cityPillActive]}>
                  <Text style={[styles.cityPillText, selectedCity === city && styles.cityPillTextActive]}>{city}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.situationHeaderRow}>
              <Text style={styles.situationHeaderTitle}>상황으로 먼저 고르기</Text>
              <Text style={styles.situationHeaderMeta}>음식 종류는 보조 필터</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.situationTabs}>
              {situationFilters.map((filter) => {
                const selected = selectedSituation.id === filter.id;
                return (
                  <Pressable key={filter.id} onPress={() => setSelectedSituationId(filter.id)} style={[styles.situationPill, selected && styles.situationPillActive]}>
                    <Text style={[styles.situationPillText, selected && styles.situationPillTextActive]}>{filter.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
              {shortcutFilters.map((filterId) => {
                const filter = filters.find((item) => item.id === filterId) ?? filters[0];
                return (
                  <Pressable key={filter.id} onPress={() => setSelectedFilterId(filter.id)} style={[styles.filterPill, selectedFilterId === filter.id && styles.filterPillActive]}>
                    <Text style={[styles.filterIcon, selectedFilterId === filter.id && styles.filterIconActive]}>{getFilterIcon(filter.id)}</Text>
                    <Text style={[styles.filterText, selectedFilterId === filter.id && styles.filterTextActive]}>{filter.label}</Text>
                    <Text style={[styles.filterCount, selectedFilterId === filter.id && styles.filterCountActive]}>TOP {Math.min(8, filterCounts[filter.id] ?? 0)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.activeFilterSummary}>
              <Text style={styles.activeFilterSummaryText}>
                지금 {selectedCity} · {selectedSituation.label} · 검증 TOP {verifiedTopCount}
              </Text>
            </View>
          </>
        )}
      </View>

      {!isDesktop ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topFilterScroll} contentContainerStyle={styles.topFilterBar}>
          <Pressable style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>초행자 안전</Text>
          </Pressable>
          <Pressable style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>가격 확인</Text>
          </Pressable>
          <Pressable style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>최근 확인</Text>
          </Pressable>
          <Pressable style={styles.outlineButtonWide}>
            <Text style={styles.outlineButtonText}>예약 쉬움</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <View style={isDesktop ? styles.exploreDesktopLayout : undefined}>
        {isDesktop ? (
          <View style={styles.exploreSituationSidebar}>
            <Text style={styles.exploreSidebarEyebrow}>상황 탐색</Text>
            <Text style={styles.exploreSidebarTitle}>무엇을 피하고 싶나요?</Text>
            <View style={styles.exploreSidebarList}>
              {situationFilters.map((filter) => {
                const selected = selectedSituation.id === filter.id;
                return (
                  <Pressable key={filter.id} onPress={() => setSelectedSituationId(filter.id)} style={[styles.exploreSidebarItem, selected && styles.exploreSidebarItemActive]}>
                    <View style={styles.exploreSidebarItemCopy}>
                      <Text style={[styles.exploreSidebarItemLabel, selected && styles.exploreSidebarItemLabelActive]}>{filter.label}</Text>
                      <Text style={[styles.exploreSidebarItemHint, selected && styles.exploreSidebarItemHintActive]} numberOfLines={2}>{filter.copy}</Text>
                    </View>
                    <Text style={[styles.exploreSidebarArrow, selected && styles.exploreSidebarArrowActive]}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <View style={isDesktop ? styles.exploreDesktopList : undefined}>
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{primarySection.title}</Text>
        <Text style={styles.sectionCopy}>{primarySection.copy}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselTrack}>
          {mustVisit.map((place) => {
            const safeProfile = getMangoSafeChoiceProfile(place, { surface: "explore", categoryId: selectedFilter.id });
            return (
              <Pressable key={place.id} style={styles.heroCard} onPress={() => setSelectedPlace(place)}>
                {getPlaceImageUrl(place) ? (
                <ImageBackground source={{ uri: getPlaceImageUrl(place)! }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
                  <Pressable style={styles.saveBubble} onPress={() => onToggleSavedPlace(place.id)}>
                    <Text style={styles.saveBubbleText}>{savedPlaceIds.includes(place.id) ? "♥" : "♡"}</Text>
                  </Pressable>
                  <View style={styles.awardBadge}>
                    <Text style={styles.awardBadgeText}>{safeProfile.label}</Text>
                  </View>
                </ImageBackground>
                ) : (
                  <View style={[styles.heroImage, styles.photoEmpty, styles.heroImageRadius]}>
                    <Text style={styles.photoEmptyTitle}>사진 준비중</Text>
                    <Text style={styles.photoEmptyCopy}>실제 매장 사진이 확인되면 표시돼요.</Text>
                  </View>
                )}
                <Text style={styles.guideBadge}>{safeProfile.badges[0] ?? "망고 검증"}</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>{place.name}</Text>
                <Text style={styles.heroSafeMeta} numberOfLines={1}>{safeProfile.label} · {getDisplayCategory(place.category)}</Text>
                <Text style={styles.heroSafeReason} numberOfLines={2}>{safeProfile.reason}</Text>
                <Text style={styles.heroSafeCaution} numberOfLines={1}>{safeProfile.caution}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{secondarySectionTitle}</Text>
        <View style={styles.popularList}>
          {visibleList.map((place) => {
            const safeProfile = getMangoSafeChoiceProfile(place, { surface: "explore", categoryId: selectedFilter.id });
            return (
              <Pressable key={place.id} style={styles.popularRow} onPress={() => setSelectedPlace(place)}>
                {getPlaceImageUrl(place) ? (
                  <Image source={{ uri: getPlaceImageUrl(place)! }} style={styles.popularImage} />
                ) : (
                  <View style={[styles.popularImage, styles.photoEmptySmall]}>
                    <Text style={styles.photoEmptySmallText}>사진 준비중</Text>
                  </View>
                )}
                <View style={styles.popularBody}>
                  <Text style={styles.guideBadgeSmall}>{safeProfile.label}</Text>
                  <Text style={styles.popularTitle} numberOfLines={2}>{place.name}</Text>
                  <Text style={styles.popularSafeMeta} numberOfLines={1}>{getDisplayCategory(place.category)} · {selectedCity}</Text>
                  <Text style={styles.popularSafeReason} numberOfLines={2}>{safeProfile.reason}</Text>
                  <Text style={styles.popularSafeCaution} numberOfLines={1}>{safeProfile.caution}</Text>
                </View>
                <Pressable style={styles.rowSaveButton} onPress={() => onToggleSavedPlace(place.id)}>
                  <Text style={styles.rowSaveText}>{savedPlaceIds.includes(place.id) ? "♥" : "♡"}</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
        {candidatePlaces.length > visibleList.length ? (
          <Pressable style={styles.allButton} onPress={() => setShowAll((value) => !value)}>
            <Text style={styles.allButtonText}>{showAll ? "접기" : allButtonLabel}</Text>
          </Pressable>
        ) : null}
      </View>
        </View>
        {isDesktop ? (
          <DesktopExploreMapPanel
            city={selectedCity}
            places={verifiedTopPlaces.slice(0, 6)}
            onOpenPlace={setSelectedPlace}
            onOpenMapPlace={onOpenMapPlace}
          />
        ) : null}
      </View>

      {!isDesktop && verifiedTopPlaces[0] ? (
        <Pressable style={styles.floatingMapButton} onPress={() => onOpenMapPlace(verifiedTopPlaces[0])}>
          <Text style={styles.floatingMapText}>⌖ 지도</Text>
        </Pressable>
      ) : null}
    </AppShell>
  );
}

function getExplorePrimarySection(filterId: FilterId, city: Destination, situation: SituationFilter) {
  if (situation.id !== "all") {
    return {
      title: situation.title,
      copy: `${city}에서 ${situation.copy}`
    };
  }

  const sections: Partial<Record<FilterId, { title: string; copy: string }>> = {
    all: {
      title: "오늘 실패 확률 낮은 맛집",
      copy: `${city}에서 한국인 후기와 최근 확인 신호가 있는 식당만 먼저 보여줘요.`
    },
    food: {
      title: "지금 고르면 무난한 맛집",
      copy: "맛보다 먼저 가격, 대기, 한국인 후기 신호를 함께 본 음식점이에요."
    },
    cafe: {
      title: "식사 전후 쉬어가기 좋은 카페",
      copy: "사진, 휴식, 작업 신호가 있는 카페만 골라서 보여줘요."
    },
    massage: {
      title: "초행자도 무난한 마사지",
      copy: "가격 확인, 강도 조절, 예약 안정성을 우선해서 보여줘요."
    },
    rooftop: {
      title: "밤에도 덜 불안한 술집",
      copy: "야경과 분위기뿐 아니라 이동 부담과 후기 신호까지 함께 봐요."
    },
    korean: {
      title: "한식이 생각날 때",
      copy: "부모님, 장기여행, 든든함 신호가 있는 한식 후보예요."
    },
    chinese: {
      title: "익숙한 메뉴가 필요할 때",
      copy: "짬뽕, 딤섬, 중식 메뉴처럼 동행 만족도가 높은 식당이에요."
    },
    japanese: {
      title: "가볍게 정리되는 일식",
      copy: "스시, 라멘, 이자카야처럼 일정 중간에 넣기 좋은 후보예요."
    },
    vietnamese: {
      title: "로컬 음식 입문용",
      copy: "쌀국수, 분짜, 반미처럼 처음 가도 실패가 적은 베트남 식당이에요."
    },
    photo: {
      title: "첫 방문 코스 후보",
      copy: "사진, 산책, 접근성을 함께 보고 일정에 넣기 쉬운 장소예요."
    },
    shopping: {
      title: "바가지 걱정 줄이는 쇼핑 후보",
      copy: "여행 중 필요한 물건을 찾을 때 가격 예측이 쉬운 곳부터 보여줘요."
    },
    exchange: {
      title: "여행 생활 안전 후보",
      copy: "환전이나 실용적인 일을 처리할 때 확인 신호가 있는 곳이에요."
    },
    karaoke: {
      title: "밤 일정 리스크 체크",
      copy: "일행과 2차로 움직일 때 비용과 이동 부담을 먼저 확인해요."
    }
  };
  return sections[filterId] ?? sections.all!;
}

function matchesSituationFilter(place: CuratedPlace, situation: SituationFilter) {
  if (situation.id === "all" || situation.keywords.length === 0) return true;
  const safeProfile = getMangoSafeChoiceProfile(place, { surface: "explore" });
  const haystack = [
    place.name,
    place.area,
    place.address,
    place.oneLine,
    place.koreanTip,
    place.category,
    ...place.tags,
    ...(place.bestTime ?? []),
    ...(place.koreanReviewSignal?.keywords ?? []),
    place.koreanReviewSignal?.summary,
    safeProfile.label,
    safeProfile.reason,
    safeProfile.caution,
    ...safeProfile.badges,
    ...safeProfile.recommendedFor,
    ...safeProfile.reviewKeywords
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return situation.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function DesktopExploreMapPanel({
  city,
  places,
  onOpenPlace,
  onOpenMapPlace
}: {
  city: Destination;
  places: CuratedPlace[];
  onOpenPlace: (place: CuratedPlace) => void;
  onOpenMapPlace: (place: CuratedPlace) => void;
}) {
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(places[0]?.id ?? null);

  useEffect(() => {
    setFocusedPlaceId(places[0]?.id ?? null);
  }, [places]);

  const focusedPlace = places.find((place) => place.id === focusedPlaceId) ?? places[0];
  const mapUrl = focusedPlace ? getStaticMapUrl(focusedPlace, places) : undefined;
  const focusedSafeProfile = focusedPlace ? getMangoSafeChoiceProfile(focusedPlace, { surface: "explore" }) : undefined;
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    setMapFailed(false);
  }, [mapUrl]);

  return (
    <View style={styles.exploreMapPanel}>
      <View style={styles.exploreMapHeader}>
        <Text style={styles.exploreMapEyebrow}>망고베트남 검증 지도</Text>
        <Text style={styles.exploreMapTitle}>{city} 검증 TOP</Text>
      </View>
      <View style={styles.exploreMapCanvas}>
        {mapUrl && !mapFailed ? (
          <Image source={{ uri: mapUrl }} style={styles.exploreMapImage} resizeMode="cover" onError={() => setMapFailed(true)} />
        ) : (
          <View style={styles.exploreMapFallback}>
            <View style={styles.exploreMapGrid} />
            <View style={[styles.exploreMapFallbackPin, styles.exploreMapFallbackPinPrimary]}>
              <Text style={styles.exploreMapFallbackPinText}>⌖</Text>
            </View>
            <View style={[styles.exploreMapFallbackPin, styles.exploreMapFallbackPinSecondary]}>
              <Text style={styles.exploreMapFallbackPinSmallText}>맛집</Text>
            </View>
            <View style={[styles.exploreMapFallbackPin, styles.exploreMapFallbackPinTertiary]}>
              <Text style={styles.exploreMapFallbackPinSmallText}>카페</Text>
            </View>
            <View style={styles.exploreMapEmpty}>
              <Text style={styles.exploreMapEmptyTitle}>지도 미리보기 준비중</Text>
              <Text style={styles.exploreMapEmptyCopy}>지도가 느리게 뜨면 지도 탭에서 같은 장소를 바로 확인할 수 있어요.</Text>
              {focusedPlace ? (
                <Pressable style={styles.exploreMapFallbackButton} onPress={() => onOpenMapPlace(focusedPlace)}>
                  <Text style={styles.exploreMapFallbackButtonText}>지도 탭에서 보기</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      </View>
      {focusedPlace ? (
        <View style={styles.exploreMapCard}>
          <Text style={styles.exploreMapCardName} numberOfLines={2}>{focusedPlace.name}</Text>
          <Text style={styles.exploreMapCardMeta} numberOfLines={2}>{focusedSafeProfile?.label} · {focusedSafeProfile?.reason}</Text>
          <View style={styles.exploreMapCardActions}>
            <Pressable style={styles.exploreMapPrimaryButton} onPress={() => onOpenPlace(focusedPlace)}>
              <Text style={styles.exploreMapPrimaryText}>상세보기</Text>
            </Pressable>
            <Pressable style={styles.exploreMapGhostButton} onPress={() => onOpenMapPlace(focusedPlace)}>
              <Text style={styles.exploreMapGhostText}>지도 탭</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.exploreMapList}>
        {places.slice(0, 5).map((place) => {
          const safeProfile = getMangoSafeChoiceProfile(place, { surface: "explore" });
          return (
            <Pressable key={place.id} style={[styles.exploreMapListItem, focusedPlace?.id === place.id && styles.exploreMapListItemActive]} onPress={() => setFocusedPlaceId(place.id)}>
              <Text style={styles.exploreMapListName} numberOfLines={1}>{place.name}</Text>
              <Text style={styles.exploreMapListMeta}>{safeProfile.label} · {getDisplayCategory(place.category)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type DetailTabKey = "home" | "info" | "map" | "reviews";

const detailTabsV2: Array<{ key: DetailTabKey; label: string }> = [
  { key: "home", label: "홈" },
  { key: "info", label: "정보" },
  { key: "map", label: "지도" },
  { key: "reviews", label: "리뷰" }
];

function PlaceDetailV2({
  place,
  saved,
  comments,
  commentDraft,
  commentRating,
  checkedIn,
  notice,
  onChangeComment,
  onChangeCommentRating,
  onBack,
  onToggleSaved,
  onOpenMap,
  onOpenGoogleMaps,
  onCheckIn,
  onSubmitComment
}: {
  place: CuratedPlace;
  saved: boolean;
  comments: PlaceComment[];
  commentDraft: string;
  commentRating: number;
  checkedIn: boolean;
  notice: string;
  onChangeComment: (value: string) => void;
  onChangeCommentRating: (value: number) => void;
  onBack: () => void;
  onToggleSaved: () => void;
  onOpenMap: () => void;
  onOpenGoogleMaps: () => void;
  onCheckIn: () => void;
  onSubmitComment: () => void;
}) {
  const defaultComments = useMemo(() => buildDefaultComments(place), [place]);
  const allComments = useMemo(() => [...comments, ...defaultComments], [comments, defaultComments]);
  const displayRating = useMemo(() => getDisplayRatingFromComments(place, allComments), [place, allComments]);
  const reviewBreakdown = useMemo(() => getRatingBreakdown(allComments), [allComments]);
  const galleryImages = useMemo(() => getPlaceImageUrls(place), [place]);
  const introParagraphs = useMemo(() => buildPlaceLongIntro(place), [place]);
  const recommendedMenu = useMemo(() => getRecommendedMenu(place), [place]);
  const trustBadge = useMemo(() => getTrustBadge(place), [place]);
  const mapUrl = useMemo(() => getStaticMapUrl(place, [place]), [place]);
  const rankBadges = useMemo(() => getDetailMangoBadges(place), [place]);
  const safeProfile = useMemo(() => getMangoSafeChoiceProfile(place, { surface: "explore" }), [place]);
  const openingHours = Array.isArray(place.openingHoursText) ? place.openingHoursText : [];
  const [openingExpanded, setOpeningExpanded] = useState(false);
  const [inquiryDraft, setInquiryDraft] = useState("");
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const detailScrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Record<DetailTabKey, number>>({
    home: 0,
    info: 0,
    map: 0,
    reviews: 0
  });
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabKey>("home");
  const reviewCount = getDetailReviewCount(place, allComments.length);
  const address = place.address || `${place.area ?? place.city} 위치 확인 필요`;
  const visibleReasons = getDetailKoreanReasons(place, recommendedMenu).slice(0, 3);
  const visibleReviews = allComments.slice(0, comments.length > 0 ? 4 : 2);
  const topReviewBreakdown = reviewBreakdown.filter((row) => row.count > 0).slice(0, 3);
  const shownOpeningHours = openingExpanded ? openingHours : openingHours.slice(0, 3);

  const scrollToDetailSection = (section: DetailTabKey) => {
    setActiveDetailTab(section);
    setTimeout(() => {
      detailScrollRef.current?.scrollTo({
        y: Math.max(sectionOffsets.current[section] - 52, 0),
        animated: true
      });
    }, 0);
  };

  const saveReservationInquiryDraft = () => {
    const draft = inquiryDraft.trim();
    if (!draft) return;
    savePlaceReservationInquiry({
      placeId: place.id,
      placeName: place.name,
      city: place.city,
      draft
    });
    setInquirySubmitted(true);
  };

  return (
    <View style={styles.detailV2Page}>
      <View style={styles.detailV2Header}>
        <Pressable accessibilityRole="button" accessibilityLabel="장소 상세 닫기" onPress={onBack} style={styles.detailV2HeaderButton}>
          <Text style={styles.detailV2HeaderIcon}>‹</Text>
        </Pressable>
        <Text style={styles.detailV2HeaderTitle} numberOfLines={1}>{place.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={saved ? "저장 취소" : "장소 저장"} onPress={onToggleSaved} style={styles.detailV2HeaderButton}>
          <Text style={[styles.detailV2HeaderIcon, saved && styles.detailV2HeaderIconSaved]}>{saved ? "♥" : "♡"}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={detailScrollRef}
        style={styles.detailV2Scroll}
        contentContainerStyle={styles.detailV2Content}
        stickyHeaderIndices={[3]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailV2Gallery}>
          <DetailPhotoMosaic images={galleryImages} placeName={place.name} />
        </View>

        <View style={styles.detailV2Summary}>
          <View style={styles.detailV2TitleRow}>
            <View style={styles.detailV2TitleCopy}>
              <Text style={styles.detailV2Title} numberOfLines={2}>{place.name}</Text>
              <Text style={styles.detailV2Address} numberOfLines={2}>{address}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? "저장 취소" : "장소 저장"} onPress={onToggleSaved} style={[styles.detailV2SaveButton, saved && styles.detailV2SaveButtonActive]}>
              <Text style={[styles.detailV2SaveIcon, saved && styles.detailV2SaveIconActive]}>{saved ? "♥" : "♡"}</Text>
            </Pressable>
          </View>
          <View style={styles.detailV2RatingRow}>
            <Text style={styles.detailV2Star}>★</Text>
            <Text style={styles.detailV2Rating}>{formatRating(displayRating)}</Text>
            <Text style={styles.detailV2ReviewText}>리뷰 {formatCount(reviewCount)}</Text>
            <Text style={styles.detailV2DotText}>·</Text>
            <Text style={styles.detailV2Category}>{getDisplayCategory(place.category)}</Text>
          </View>
          <View style={styles.detailV2BadgeRow}>
            {uniqueLabels(safeProfile.badges.concat(rankBadges)).slice(0, 4).map((badge) => (
              <Text key={badge} style={styles.detailV2Badge}>{badge}</Text>
            ))}
          </View>
          <View style={styles.detailV2SafePanel}>
            <View style={styles.detailV2SafeTop}>
              <Text style={styles.detailV2SafeLabel}>{safeProfile.label}</Text>
              <Text style={styles.detailV2SafeScore}>근거 {safeProfile.evidence.length}개</Text>
            </View>
            <Text style={styles.detailV2SafeReason} numberOfLines={2}>{safeProfile.reason}</Text>
            <Text style={styles.detailV2SafeCaution} numberOfLines={2}>{safeProfile.caution}</Text>
            <View style={styles.detailV2EvidenceRow}>
              {safeProfile.evidence.slice(0, 4).map((item) => (
                <Text key={item} style={styles.detailV2EvidenceChip}>{item}</Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.detailV2ActionBar}>
          <DetailActionButton icon="✎" label="리뷰" onPress={() => scrollToDetailSection("reviews")} accessibilityLabel="리뷰 작성으로 이동" />
          <DetailActionButton icon="↗" label="길찾기" onPress={onOpenGoogleMaps} accessibilityLabel="Google Maps에서 길찾기" />
          <DetailActionButton icon="⌖" label="지도" onPress={onOpenMap} accessibilityLabel="망고베트남 지도에서 보기" />
          <DetailActionButton icon={saved ? "♥" : "♡"} label={saved ? "저장됨" : "저장"} onPress={onToggleSaved} accessibilityLabel={saved ? "저장 취소" : "장소 저장"} active={saved} />
        </View>

        <View style={styles.detailV2Tabs}>
          {detailTabsV2.map((tab) => (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={`${tab.label} 섹션으로 이동`}
              style={styles.detailV2TabButton}
              onPress={() => scrollToDetailSection(tab.key)}
            >
              <Text style={[styles.detailV2TabText, activeDetailTab === tab.key && styles.detailV2TabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        <View
          style={styles.detailV2Section}
          onLayout={(event) => {
            sectionOffsets.current.home = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.detailV2SectionTitle}>왜 실패 가능성이 낮나요?</Text>
          <View style={styles.detailV2IntroBox}>
            <Text style={styles.detailV2IntroText} numberOfLines={4}>
              {safeProfile.reason || introParagraphs[0] || cleanPlaceCopy(place.koreanTip) || `${place.city}에서 한국인 여행자가 고르기 좋은 장소입니다.`}
            </Text>
          </View>

          <View style={styles.detailV2Subsection}>
            <Text style={styles.detailV2SubTitle}>한국인 후기 기반 추천 이유</Text>
            {visibleReasons.map((reason) => (
              <View key={reason} style={styles.detailV2BulletRow}>
                <Text style={styles.detailV2BulletDot}>✓</Text>
                <Text style={styles.detailV2BulletText} numberOfLines={2}>{reason}</Text>
              </View>
            ))}
          </View>

          <View style={styles.detailV2Subsection}>
            <Text style={styles.detailV2SubTitle}>가기 전 체크</Text>
            {safeProfile.checks.map((check) => (
              <View key={check} style={styles.detailV2BulletRow}>
                <Text style={styles.detailV2BulletDot}>✓</Text>
                <Text style={styles.detailV2BulletText} numberOfLines={2}>{check}</Text>
              </View>
            ))}
            <View style={styles.detailV2CautionPill}>
              <Text style={styles.detailV2CautionText} numberOfLines={2}>{safeProfile.caution}</Text>
            </View>
          </View>

          <View style={styles.detailV2Subsection}>
            <Text style={styles.detailV2SubTitle}>검증 근거</Text>
            <View style={styles.detailV2ChipRow}>
              {safeProfile.evidence.map((item) => (
                <Text key={item} style={styles.detailV2SignalChip}>{item}</Text>
              ))}
            </View>
          </View>

          <View style={styles.detailV2Subsection}>
            <Text style={styles.detailV2SubTitle}>추천 대상</Text>
            <View style={styles.detailV2ChipRow}>
              {safeProfile.recommendedFor.map((label) => (
                <Text key={label} style={styles.detailV2SignalChip}>{label}</Text>
              ))}
            </View>
          </View>

          <View style={styles.detailV2Subsection}>
            <Text style={styles.detailV2SubTitle}>비추천 대상</Text>
            <View style={styles.detailV2ChipRow}>
              {safeProfile.notRecommendedFor.map((label) => (
                <Text key={label} style={[styles.detailV2SignalChip, styles.detailV2SignalChipMuted]}>{label}</Text>
              ))}
            </View>
          </View>

          <View style={styles.detailV2Subsection}>
            <Text style={styles.detailV2SubTitle}>한국인 후기에서 자주 나온 말</Text>
            <View style={styles.detailV2ChipRow}>
              {safeProfile.reviewKeywords.slice(0, 6).map((keyword) => (
                <Text key={keyword} style={styles.detailV2SignalChip}>{keyword}</Text>
              ))}
            </View>
          </View>

          <View style={styles.detailV2MiniMapBlock}>
            <View style={styles.detailV2SectionHeaderRow}>
              <Text style={styles.detailV2SubTitle}>지도</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="지도 섹션 보기" onPress={() => scrollToDetailSection("map")}>
                <Text style={styles.detailV2MoreLink}>더보기 ›</Text>
              </Pressable>
            </View>
            <DetailMapPreview mapUrl={mapUrl} placeName={place.name} onOpenMap={onOpenMap} />
          </View>

          <View style={styles.detailV2Subsection}>
            <View style={styles.detailV2SectionHeaderRow}>
              <Text style={styles.detailV2SubTitle}>리뷰</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="리뷰 섹션 보기" onPress={() => scrollToDetailSection("reviews")}>
                <Text style={styles.detailV2MoreLink}>더보기 ›</Text>
              </Pressable>
            </View>
            {visibleReviews.length > 0 ? (
              visibleReviews.slice(0, 2).map((comment) => <DetailReviewCard key={comment.id} comment={comment} place={place} compact />)
            ) : (
              <DetailEmptyReview />
            )}
          </View>
        </View>

        <View
          style={styles.detailV2Section}
          onLayout={(event) => {
            sectionOffsets.current.info = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.detailV2SectionTitle}>기본 정보</Text>
          <View style={styles.detailV2InfoList}>
            <DetailInfoLine icon="⌖" title="주소" value={address} />
            <DetailInfoLine icon="☎" title="전화번호" value={normalizeDetailInfo(formatPhoneNumber(place))} />
            <DetailInfoLine icon="ⓘ" title="카테고리" value={getDisplayCategory(place.category)} />
            <DetailInfoLine icon="$" title="가격대" value={place.priceLevel || "확인 필요"} />
            <DetailInfoLine icon="◎" title="추천 시간" value={place.bestTime.length > 0 ? place.bestTime.join(" · ") : "확인 필요"} />
            <DetailInfoLine icon="✓" title="최근 확인" value={normalizeDetailInfo(formatVerifiedDate(place.lastVerifiedAt))} badge={trustBadge.shortLabel} />
          </View>

          <View style={styles.detailV2HoursCard}>
            <View style={styles.detailV2SectionHeaderRow}>
              <Text style={styles.detailV2SubTitle}>영업시간</Text>
              {openingHours.length > 3 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={openingExpanded ? "영업시간 접기" : "영업시간 더 보기"} onPress={() => setOpeningExpanded((current) => !current)}>
                  <Text style={styles.detailV2MoreLink}>{openingExpanded ? "접기" : "더보기"}</Text>
                </Pressable>
              ) : null}
            </View>
            {shownOpeningHours.length > 0 ? (
              shownOpeningHours.map((row) => (
                <Text key={row} style={styles.detailV2HoursText} numberOfLines={2}>{row}</Text>
              ))
            ) : (
              <Text style={styles.detailV2MutedText}>{formatOpeningHoursSummary(place)}</Text>
            )}
          </View>

          <View style={styles.detailV2InfoActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={checkedIn ? "체크인 완료" : "방문 체크인"} onPress={onCheckIn} style={[styles.detailV2InfoButton, checkedIn && styles.detailV2InfoButtonActive]}>
              <Text style={[styles.detailV2InfoButtonText, checkedIn && styles.detailV2InfoButtonTextActive]}>{checkedIn ? "체크인 완료" : "방문 체크인"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Google Maps 열기" onPress={onOpenGoogleMaps} style={styles.detailV2InfoButton}>
              <Text style={styles.detailV2InfoButtonText}>Google Maps 열기</Text>
            </Pressable>
          </View>
          <View style={styles.detailV2InquiryBox}>
            <View style={styles.detailV2SectionHeaderRow}>
              <View>
                <Text style={styles.detailV2InquiryTitle}>예약 문의</Text>
                <Text style={styles.detailV2InquiryCopy}>날짜와 인원을 남겨두면 마이 탭에서 다시 확인할 수 있어요.</Text>
              </View>
              <Text style={styles.detailV2InquiryBadge}>초안 저장</Text>
            </View>
            <View style={styles.detailV2InquiryInputRow}>
              <TextInput
                value={inquiryDraft}
                onChangeText={(value) => {
                  setInquiryDraft(value);
                  setInquirySubmitted(false);
                }}
                placeholder="예: 오늘 19시, 2명, 창가/예약 가능 여부"
                placeholderTextColor="#9CA3AF"
                style={styles.detailV2InquiryInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="예약 문의 초안 저장"
                onPress={saveReservationInquiryDraft}
                style={[styles.detailV2InquirySubmit, !inquiryDraft.trim() && styles.detailV2InquirySubmitDisabled]}
                disabled={!inquiryDraft.trim()}
              >
                <Text style={[styles.detailV2InquirySubmitText, !inquiryDraft.trim() && styles.detailV2InquirySubmitTextDisabled]}>저장</Text>
              </Pressable>
            </View>
            {inquirySubmitted ? (
              <Text style={styles.detailV2InquiryDone}>문의 초안을 저장했어요. 마이 탭에서 다시 볼 수 있어요.</Text>
            ) : null}
          </View>
          <View style={styles.detailV2CommerceRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="제휴 쿠폰 준비중" disabled style={[styles.detailV2CommerceButton, styles.detailV2CommerceButtonDisabled]}>
              <Text style={styles.detailV2CommerceTextDisabled}>쿠폰 준비중</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="제휴 혜택 준비중" disabled style={[styles.detailV2CommerceButton, styles.detailV2CommerceButtonDisabled]}>
              <Text style={styles.detailV2CommerceTextDisabled}>제휴 혜택 준비중</Text>
            </Pressable>
          </View>
          {notice ? (
            <View style={styles.detailV2Notice}>
              <Text style={styles.detailV2NoticeText}>{notice}</Text>
            </View>
          ) : null}
        </View>

        <View
          style={styles.detailV2Section}
          onLayout={(event) => {
            sectionOffsets.current.map = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.detailV2SectionTitle}>지도</Text>
          <DetailMapPreview mapUrl={mapUrl} placeName={place.name} large onOpenMap={onOpenMap} />
          <Pressable accessibilityRole="button" accessibilityLabel="Google Maps에서 길찾기" onPress={onOpenGoogleMaps} style={styles.detailV2DirectionsButton}>
            <Text style={styles.detailV2DirectionsText}>Google Maps에서 길찾기</Text>
          </Pressable>
        </View>

        <View
          style={styles.detailV2Section}
          onLayout={(event) => {
            sectionOffsets.current.reviews = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.detailV2SectionHeaderRow}>
            <Text style={styles.detailV2SectionTitle}>리뷰</Text>
            <Text style={styles.detailV2ReviewCount}>{allComments.length}개</Text>
          </View>
          <View style={styles.detailV2ReviewSignalBox}>
            <Text style={styles.detailV2ReviewSignalTitle}>한국인 판단 신호</Text>
            <View style={styles.detailV2ChipRow}>
              {safeProfile.reviewKeywords.slice(0, 5).map((keyword) => (
                <Text key={keyword} style={styles.detailV2SignalChip}>{keyword}</Text>
              ))}
            </View>
          </View>
          <View style={styles.detailV2ReviewSummary}>
            <View style={styles.detailV2ReviewScoreBox}>
              <Text style={styles.detailV2ReviewScore}>{formatRating(displayRating)}</Text>
              <Text style={styles.detailV2ReviewScoreLabel}>{getRatingLabel(displayRating)}</Text>
            </View>
            <View style={styles.detailV2ReviewMiniBars}>
              {topReviewBreakdown.length > 0 ? topReviewBreakdown.map((row) => (
                <View key={row.label} style={styles.detailV2ReviewMiniRow}>
                  <Text style={styles.detailV2ReviewMiniLabel}>{row.label}</Text>
                  <View style={styles.detailV2ReviewMiniTrack}>
                    <View style={[styles.detailV2ReviewMiniFill, { width: `${row.percent}%` }]} />
                  </View>
                  <Text style={styles.detailV2ReviewMiniCount}>{row.count}</Text>
                </View>
              )) : (
                <Text style={styles.detailV2MutedText}>아직 평점 분포가 충분하지 않아요.</Text>
              )}
            </View>
          </View>

          <View style={styles.detailV2CommentComposer}>
            <View style={styles.detailV2ComposerTop}>
              <Text style={styles.detailV2SubTitle}>첫인상 남기기</Text>
              <View style={styles.commentRatingDots}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <Pressable
                    key={score}
                    accessibilityRole="button"
                    accessibilityLabel={`${score}점 선택`}
                    onPress={() => onChangeCommentRating(score)}
                    style={[styles.detailV2RatingDot, score <= commentRating && styles.detailV2RatingDotActive]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.detailV2CommentInputRow}>
              <TextInput
                value={commentDraft}
                onChangeText={onChangeComment}
                placeholder="맛, 가격, 분위기, 한국인 입장에서 좋았던 점"
                placeholderTextColor="#9CA3AF"
                style={styles.detailV2CommentInput}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="리뷰 등록" style={styles.detailV2CommentSubmit} onPress={onSubmitComment}>
                <Text style={styles.detailV2CommentSubmitText}>등록</Text>
              </Pressable>
            </View>
          </View>

          {allComments.length > 0 ? (
            allComments.slice(0, 8).map((comment) => <DetailReviewCard key={comment.id} comment={comment} place={place} />)
          ) : (
            <DetailEmptyReview />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailPhotoMosaic({ images, placeName }: { images: string[]; placeName: string }) {
  if (images.length === 0) {
    return (
      <View style={styles.detailV2PhotoPlaceholder}>
        <Text style={styles.detailV2PhotoPlaceholderTitle}>사진 준비중</Text>
        <Text style={styles.detailV2PhotoPlaceholderText}>실제 장소 사진이 확인되면 표시돼요.</Text>
      </View>
    );
  }

  if (images.length === 1) {
    return <Image source={{ uri: images[0] }} accessibilityLabel={`${placeName} 대표 사진`} style={styles.detailV2PhotoSingle} resizeMode="cover" />;
  }

  const remainingCount = Math.max(images.length - 3, 0);
  return (
    <View style={styles.detailV2PhotoGrid}>
      <Image source={{ uri: images[0] }} accessibilityLabel={`${placeName} 대표 사진`} style={styles.detailV2PhotoMain} resizeMode="cover" />
      <View style={styles.detailV2PhotoSide}>
        <Image source={{ uri: images[1] }} accessibilityLabel={`${placeName} 사진 2`} style={styles.detailV2PhotoSideImage} resizeMode="cover" />
        <View style={styles.detailV2PhotoSideImageWrap}>
          <Image source={{ uri: images[2] ?? images[1] }} accessibilityLabel={`${placeName} 사진 3`} style={styles.detailV2PhotoSideImage} resizeMode="cover" />
          {remainingCount > 0 ? (
            <View style={styles.detailV2PhotoMoreOverlay}>
              <Text style={styles.detailV2PhotoMoreText}>+{remainingCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DetailActionButton({
  icon,
  label,
  onPress,
  accessibilityLabel,
  active
}: {
  icon: string;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  active?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={[styles.detailV2ActionButton, active && styles.detailV2ActionButtonActive]}>
      <Text style={[styles.detailV2ActionIcon, active && styles.detailV2ActionIconActive]}>{icon}</Text>
      <Text style={[styles.detailV2ActionLabel, active && styles.detailV2ActionLabelActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function DetailInfoLine({ icon, title, value, badge }: { icon: string; title: string; value: string; badge?: string }) {
  return (
    <View style={styles.detailV2InfoRow}>
      <Text style={styles.detailV2InfoIcon}>{icon}</Text>
      <View style={styles.detailV2InfoTextBox}>
        <View style={styles.detailV2InfoTitleRow}>
          <Text style={styles.detailV2InfoTitle}>{title}</Text>
          {badge ? <Text style={styles.detailV2InfoBadge}>{badge}</Text> : null}
        </View>
        <Text style={styles.detailV2InfoValue} numberOfLines={3}>{value}</Text>
      </View>
    </View>
  );
}

function DetailMapPreview({ mapUrl, placeName, onOpenMap, large = false }: { mapUrl?: string; placeName: string; onOpenMap: () => void; large?: boolean }) {
  return (
    <View style={[styles.detailV2MapCard, large && styles.detailV2MapCardLarge]}>
      {mapUrl ? (
        <Image source={{ uri: mapUrl }} accessibilityLabel={`${placeName} 지도 미리보기`} style={styles.detailV2MapImage} resizeMode="cover" />
      ) : (
        <View style={styles.detailV2MapPlaceholder}>
          <Text style={styles.detailV2MapPlaceholderTitle}>지도 준비중</Text>
          <Text style={styles.detailV2MapPlaceholderText}>좌표가 확인되면 지도가 표시돼요.</Text>
        </View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="지도 크게 보기" onPress={onOpenMap} style={styles.detailV2MapOpenButton}>
        <Text style={styles.detailV2MapOpenIcon}>⛶</Text>
      </Pressable>
    </View>
  );
}

function DetailReviewCard({ comment, place, compact = false }: { comment: PlaceComment; place: CuratedPlace; compact?: boolean }) {
  return (
    <View style={[styles.detailV2ReviewCard, compact && styles.detailV2ReviewCardCompact]}>
      <View style={styles.detailV2ReviewAvatar}>
        <Text style={styles.detailV2ReviewAvatarText}>{comment.memberName.slice(0, 1)}</Text>
      </View>
      <View style={styles.detailV2ReviewBody}>
        <View style={styles.detailV2ReviewTop}>
          <Text style={styles.detailV2ReviewName} numberOfLines={1}>{comment.memberName}</Text>
          <Text style={styles.detailV2ReviewSource}>{comment.source === "seed" ? "참고 후기" : "망고베트남 후기"}</Text>
        </View>
        <View style={styles.detailV2ReviewMetaRow}>
          <RatingDots rating={comment.rating ?? place.rating ?? 4.6} small />
          <Text style={styles.detailV2ReviewTime}>{formatCommentTime(comment.createdAt)}</Text>
        </View>
        <Text style={styles.detailV2ReviewMessage} numberOfLines={compact ? 2 : 4}>{comment.message}</Text>
        {comment.tags?.length ? (
          <View style={styles.detailV2ReviewTags}>
            {comment.tags.slice(0, 3).map((tag) => (
              <Text key={tag} style={styles.detailV2ReviewTag}>{tag}</Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DetailEmptyReview() {
  return (
    <View style={styles.detailV2EmptyReview}>
      <Text style={styles.detailV2EmptyIcon}>⌕</Text>
      <Text style={styles.detailV2EmptyTitle}>아직 작성된 리뷰가 없어요</Text>
      <Text style={styles.detailV2EmptyText}>첫 리뷰를 남겨 도움을 주세요.</Text>
    </View>
  );
}

function PlaceDetail({
  place,
  saved,
  comments,
  commentDraft,
  commentRating,
  checkedIn,
  notice,
  onChangeComment,
  onChangeCommentRating,
  onBack,
  onToggleSaved,
  onOpenMap,
  onOpenGoogleMaps,
  onCheckIn,
  onSubmitComment
}: {
  place: CuratedPlace;
  saved: boolean;
  comments: PlaceComment[];
  commentDraft: string;
  commentRating: number;
  checkedIn: boolean;
  notice: string;
  onChangeComment: (value: string) => void;
  onChangeCommentRating: (value: number) => void;
  onBack: () => void;
  onToggleSaved: () => void;
  onOpenMap: () => void;
  onOpenGoogleMaps: () => void;
  onCheckIn: () => void;
  onSubmitComment: () => void;
}) {
  const defaultComments = useMemo(() => buildDefaultComments(place), [place]);
  const allComments = useMemo(() => [...comments, ...defaultComments], [comments, defaultComments]);
  const displayRating = useMemo(() => getDisplayRatingFromComments(place, allComments), [place, allComments]);
  const reviewBreakdown = useMemo(() => getRatingBreakdown(allComments), [allComments]);
  const galleryImages = useMemo(() => getPlaceImageUrls(place), [place]);
  const introParagraphs = useMemo(() => buildPlaceLongIntro(place), [place]);
  const featureBullets = useMemo(() => buildPlaceFeatures(place), [place]);
  const trustBadge = useMemo(() => getTrustBadge(place), [place]);
  const recommendedMenu = useMemo(() => getRecommendedMenu(place), [place]);
  const revisitIntent = useMemo(() => getRevisitIntent(place), [place]);
  const visitTips = useMemo(() => getVisitTips(place), [place]);
  const cautions = useMemo(() => getCautions(place), [place]);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const galleryCardWidth = isDesktop ? 620 : Math.max(300, Math.min(width - 48, 430));
  const detailScrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Record<"photos" | "overview" | "comments", number>>({
    photos: 0,
    overview: 0,
    comments: 0
  });
  const [activeDetailTab, setActiveDetailTab] = useState<"photos" | "overview" | "comments">("photos");
  const scrollToDetailSection = (section: "photos" | "overview" | "comments") => {
    setActiveDetailTab(section);
    setTimeout(() => {
      detailScrollRef.current?.scrollTo({
        y: Math.max(sectionOffsets.current[section] - 10, 0),
        animated: true
      });
    }, 0);
  };
  return (
    <ScrollView ref={detailScrollRef} style={styles.detailPage} contentContainerStyle={[styles.detailContent, isDesktop && styles.detailContentDesktop]} stickyHeaderIndices={[1]}>
      <View style={styles.detailTopBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <View style={styles.detailActions}>
          <Pressable onPress={onToggleSaved} style={styles.detailIconButton}>
            <Text style={styles.detailIconText}>{saved ? "♥" : "♡"}</Text>
          </Pressable>
          <Pressable onPress={onOpenGoogleMaps} style={styles.detailIconButton}>
            <Text style={styles.detailIconText}>↗</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.detailTabs}>
        {([
          ["photos", "사진"],
          ["overview", "개요"],
          ["comments", "댓글"]
        ] as const).map(([section, label]) => (
          <Pressable key={section} style={styles.detailTabButton} onPress={() => scrollToDetailSection(section)}>
            <Text style={[styles.detailTab, activeDetailTab === section && styles.detailTabActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View
        style={styles.detailPhotoStage}
        onLayout={(event) => {
          sectionOffsets.current.photos = event.nativeEvent.layout.y;
        }}
      >
        <ScrollView
          horizontal
          decelerationRate="fast"
          snapToInterval={galleryCardWidth + 12}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.detailPhotoTrack}
          style={styles.detailPhotoScroll}
        >
          {galleryImages.length > 0 ? galleryImages.map((uri, index) => (
            <View key={`${uri}-${index}`} style={[styles.detailPhotoFrame, { width: galleryCardWidth }]}>
              <Image source={{ uri }} style={styles.detailImage} />
              {index === 0 ? (
                <View style={styles.awardPhotoBadge}>
                  <Text style={styles.awardPhotoBadgeText}>망고픽</Text>
                </View>
              ) : null}
              <View style={styles.photoIndexBadge}>
                <Text style={styles.photoIndexText}>{index + 1} / {galleryImages.length}</Text>
              </View>
            </View>
          )) : (
            <View style={[styles.detailPhotoFrame, styles.detailPhotoEmptyFrame, { width: galleryCardWidth }]}>
              <Text style={styles.photoEmptyTitle}>사진 준비중</Text>
              <Text style={styles.photoEmptyCopy}>실제 매장 사진이 확인되면 이곳에 표시돼요.</Text>
            </View>
          )}
        </ScrollView>
        {galleryImages.length > 0 ? (
          <View style={styles.photoCountBadge}>
            <Text style={styles.photoCountText}>▧ {galleryImages.length}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>{place.name}</Text>
        <RatingLine place={place} large rating={displayRating} reviewCount={allComments.length} />
        <Text style={styles.detailMeta}>{buildMeta(place)}</Text>
        <View style={styles.trustQuickGrid}>
          <View style={styles.trustQuickCard}>
            <Text style={styles.trustQuickLabel}>검증 레벨</Text>
            <Text style={styles.trustQuickValue}>{trustBadge.shortLabel}</Text>
            <Text style={styles.trustQuickCopy}>{trustBadge.title}</Text>
          </View>
          <View style={styles.trustQuickCard}>
            <Text style={styles.trustQuickLabel}>추천 메뉴</Text>
            <Text style={styles.trustQuickValue}>{recommendedMenu}</Text>
          </View>
          <View style={styles.trustQuickCard}>
            <Text style={styles.trustQuickLabel}>재방문 의사</Text>
            <Text style={styles.trustQuickValue}>{revisitIntent}</Text>
          </View>
        </View>
        <View style={styles.detailLinkRow}>
          <Pressable onPress={onOpenMap}><Text style={styles.detailLink}>지도에서 보기</Text></Pressable>
          <Pressable onPress={onOpenGoogleMaps}><Text style={styles.detailLink}>구글맵 열기</Text></Pressable>
          <Pressable onPress={onCheckIn}><Text style={styles.detailLink}>{checkedIn ? "체크인 완료" : "방문 체크인"}</Text></Pressable>
        </View>
        {notice ? (
          <View style={styles.detailNotice}>
            <Text style={styles.detailNoticeText}>{notice}</Text>
          </View>
        ) : null}
        {isDesktop ? (
          <View style={styles.detailDesktopRail}>
            <View style={styles.detailRailCard}>
              <Text style={styles.detailRailLabel}>최근 확인</Text>
              <Text style={styles.detailRailValue}>{formatVerifiedDate(place.lastVerifiedAt)}</Text>
            </View>
            <View style={styles.detailRailCard}>
              <Text style={styles.detailRailLabel}>영업시간</Text>
              <Text style={styles.detailRailValue}>{formatOpeningHoursSummary(place)}</Text>
            </View>
            <View style={styles.detailRailCard}>
              <Text style={styles.detailRailLabel}>전화번호</Text>
              <Text style={styles.detailRailValue}>{formatPhoneNumber(place)}</Text>
            </View>
            <Pressable style={styles.detailRailPrimary} onPress={onOpenMap}>
              <Text style={styles.detailRailPrimaryText}>망고베트남 지도에서 보기</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View
        style={styles.detailSection}
        onLayout={(event) => {
          sectionOffsets.current.overview = event.nativeEvent.layout.y;
        }}
      >
        <Text style={styles.detailSectionTitle}>소개</Text>
        {introParagraphs.map((paragraph) => (
          <Text key={paragraph} style={styles.detailParagraph}>{paragraph}</Text>
        ))}
        <View style={styles.detailInfoGrid}>
          <InfoItem title="추천 시간" value={place.bestTime.join(" · ") || "방문 전 확인"} />
          <InfoItem title="가격대" value={place.priceLevel} />
          <InfoItem title="지역" value={place.area ?? place.city} />
          <InfoItem title="망고 반응" value={`${formatMangoRecommendationChip(place)} · ${formatMangoCommentChip(place)}`} />
        </View>
        <View style={styles.visitAdviceGrid}>
          <View style={styles.visitAdviceCard}>
            <Text style={styles.visitAdviceTitle}>방문 팁</Text>
            {visitTips.map((tip) => (
              <Text key={tip} style={styles.visitAdviceText}>• {tip}</Text>
            ))}
          </View>
          <View style={styles.visitAdviceCard}>
            <Text style={styles.visitAdviceTitle}>주의사항</Text>
            {cautions.map((caution) => (
              <Text key={caution} style={styles.visitAdviceText}>• {caution}</Text>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>한눈에 보기</Text>
        <View style={styles.featureList}>
          {featureBullets.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureCopy}>{feature.copy}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>평점 시각화</Text>
        <View style={styles.reviewScoreCard}>
          <View style={styles.reviewScoreSummary}>
            <Text style={styles.reviewBigScore}>{formatRating(displayRating)}</Text>
            <Text style={styles.reviewScoreLabel}>{getRatingLabel(displayRating)}</Text>
            <RatingDots rating={displayRating} />
            <Text style={styles.reviewScoreSub}>{getReviewBasisLabel(allComments.length)}</Text>
          </View>
          <View style={styles.reviewBars}>
            {reviewBreakdown.map((row) => (
              <View key={row.label} style={styles.reviewBarRow}>
                <View style={styles.reviewBarHeader}>
                  <Text style={styles.reviewBarLabel}>{row.label}</Text>
                  <Text style={styles.reviewBarCount}>{row.count}</Text>
                </View>
                <View style={styles.reviewTrack}>
                  <View style={[styles.reviewFill, { width: `${row.percent}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View
        style={styles.detailSection}
        onLayout={(event) => {
          sectionOffsets.current.comments = event.nativeEvent.layout.y;
        }}
      >
        <View style={styles.commentHeader}>
          <Text style={styles.detailSectionTitle}>망고단 댓글</Text>
          <Text style={styles.commentCount}>{allComments.length}개</Text>
        </View>
        <View style={styles.commentBox}>
          <View style={styles.commentRatingPicker}>
            <View style={styles.commentRatingTop}>
              <Text style={styles.commentRatingLabel}>내 평점</Text>
              <Text style={styles.commentRatingHint}>{getRatingLabel(commentRating)}</Text>
            </View>
            <View style={styles.commentRatingDots}>
              {[1, 2, 3, 4, 5].map((score) => (
                <Pressable
                  key={score}
                  accessibilityRole="button"
                  accessibilityLabel={`${score}점 선택`}
                  onPress={() => onChangeCommentRating(score)}
                  style={[styles.commentRatingDot, score <= commentRating && styles.commentRatingDotActive]}
                />
              ))}
            </View>
          </View>
          <View style={styles.commentInputRow}>
            <TextInput
              value={commentDraft}
              onChangeText={onChangeComment}
              placeholder="가격, 맛, 분위기, 한국인 입장에서 좋았던 점을 남겨주세요"
              placeholderTextColor="#9CA3AF"
              style={styles.commentInput}
            />
            <Pressable style={styles.commentSubmit} onPress={onSubmitComment}>
              <Text style={styles.commentSubmitText}>등록</Text>
            </Pressable>
          </View>
        </View>
        {allComments.slice(0, 8).map((comment) => (
          <View key={comment.id} style={styles.commentCard}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarText}>{comment.memberName.slice(0, 1)}</Text>
            </View>
            <View style={styles.commentBody}>
              <View style={styles.commentMetaTop}>
                <View style={styles.commentNameRow}>
                  <Text style={styles.commentName}>{comment.memberName}</Text>
                  <Text style={styles.commentSource}>{comment.source === "seed" ? "참고 후기" : "망고베트남 후기"}</Text>
                </View>
                <Text style={styles.commentTime}>{formatCommentTime(comment.createdAt)}</Text>
              </View>
              <RatingDots rating={comment.rating ?? place.rating ?? 4.6} small />
              <Text style={styles.commentMessage}>{comment.message}</Text>
              {comment.tags?.length ? (
                <View style={styles.commentTagRow}>
                  {comment.tags.slice(0, 3).map((tag) => (
                    <Text key={tag} style={styles.commentTag}>{tag}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function InfoItem({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatCommentTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return new Date(value).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function RatingLine({
  place,
  compact = false,
  large = false,
  rating,
  reviewCount
}: {
  place: CuratedPlace;
  compact?: boolean;
  large?: boolean;
  rating?: number;
  reviewCount?: number;
}) {
  const displayRating = rating ?? place.rating ?? 4.6;
  const mangoReviewCount = reviewCount ?? getMangoReviewCount(place);
  const reviewLabel =
    typeof reviewCount === "number"
      ? mangoReviewCount > 0
        ? `망고후기 ${formatCount(mangoReviewCount)}`
        : "후기 대기"
      : mangoReviewCount > 0
        ? "한국어 후기"
        : "후기 대기";
  return (
    <View style={[styles.ratingLine, compact && styles.ratingLineCompact]}>
      <Text style={[styles.ratingNumber, large && styles.ratingNumberLarge]}>{formatRating(displayRating)}</Text>
      <RatingDots rating={displayRating} small={compact} />
      <Text style={[styles.ratingReviews, large && styles.ratingReviewsLarge]}>{reviewLabel}</Text>
    </View>
  );
}

function RatingDots({ rating, small = false }: { rating: number; small?: boolean }) {
  const full = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <View style={styles.dots}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} style={[styles.dot, small && styles.dotSmall, index < full ? styles.dotFull : styles.dotEmpty]} />
      ))}
    </View>
  );
}

function buildDefaultComments(place: CuratedPlace): PlaceComment[] {
  return getRealisticPlaceReviews(place, 5).map((comment, index) => ({
    id: `default-${place.id}-${index}`,
    placeId: place.id,
    memberName: comment.nickname,
    message: comment.content,
    createdAt: getSeedCommentDate(place.id, index),
    rating: comment.rating,
    tags: comment.tags,
    source: "seed"
  }));
}

function getSeedCommentDate(placeId: string, index: number) {
  const hash = placeId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const daysAgo = 2 + (hash % 11) + index * 5;
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

function getDisplayRatingFromComments(place: CuratedPlace, reviewComments: PlaceComment[]) {
  const ratings = getValidCommentRatings(reviewComments);
  if (ratings.length === 0) return place.rating ?? 4.6;
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return total / ratings.length;
}

function getRatingBreakdown(reviewComments: PlaceComment[]) {
  const rows = [
    { label: "훌륭함", score: 5, count: 0 },
    { label: "좋음", score: 4, count: 0 },
    { label: "보통", score: 3, count: 0 },
    { label: "아쉬움", score: 2, count: 0 },
    { label: "비추천", score: 1, count: 0 }
  ];
  getValidCommentRatings(reviewComments).forEach((rating) => {
    const normalized = Math.max(1, Math.min(5, Math.round(rating)));
    const row = rows.find((item) => item.score === normalized);
    if (row) row.count += 1;
  });
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return rows.map((row) => ({
    label: row.label,
    count: row.count,
    percent: total > 0 && row.count > 0 ? Math.max(4, Math.round((row.count / total) * 100)) : 0
  }));
}

function getValidCommentRatings(reviewComments: PlaceComment[]) {
  return reviewComments
    .map((comment) => comment.rating)
    .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating) && rating >= 1 && rating <= 5);
}

function getRatingLabel(rating: number) {
  const rounded = Math.round(rating);
  if (rounded >= 5) return "훌륭함";
  if (rounded === 4) return "좋음";
  if (rounded === 3) return "보통";
  if (rounded === 2) return "아쉬움";
  return "비추천";
}

function getReviewBasisLabel(count: number) {
  return count > 0 ? `망고베트남 후기 ${count}개 기준` : "망고베트남 후기 대기";
}

function getPlaceImageUrl(place: CuratedPlace) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey && place.photoName) {
    return `https://places.googleapis.com/v1/${place.photoName}/media?maxWidthPx=720&key=${apiKey}`;
  }

  return undefined;
}

function getPlaceImageUrls(place: CuratedPlace) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const photoNames = [...(place.photoNames ?? []), place.photoName].filter((photoName): photoName is string => Boolean(photoName));
  const images = apiKey
    ? photoNames.map((photoName) => `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=980&key=${apiKey}`)
    : [];
  return Array.from(new Set(images)).slice(0, 6);
}

function getPlaceCoordinates(place: CuratedPlace) {
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

function getStaticMapUrl(place: CuratedPlace, nearbyPlaces: CuratedPlace[]) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const centerCoordinates = getPlaceCoordinates(place);
  if (!apiKey || !centerCoordinates) return undefined;
  const center = `${centerCoordinates.lat},${centerCoordinates.lng}`;
  const markers = nearbyPlaces
    .map((item) => getPlaceCoordinates(item))
    .filter((coordinates): coordinates is { lat: number; lng: number } => Boolean(coordinates))
    .slice(0, 8)
    .map((coordinates, index) => {
      const color = index === 0 ? "0x063F28" : "0xFF9F1C";
      return `markers=color:${color}%7C${coordinates.lat},${coordinates.lng}`;
    })
    .join("&");
  const markerQuery = markers ? `&${markers}` : "";
  return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=13&size=640x520&scale=2&maptype=roadmap${markerQuery}&key=${apiKey}`;
}

function buildPlaceLongIntro(place: CuratedPlace) {
  const area = place.area ?? place.city;
  const summary = cleanPlaceCopy(place.oneLine);
  const tips = getVisitTips(place);
  const cautions = getCautions(place);
  const menu = getRecommendedMenu(place);
  const categoryIntro =
    place.category === "바/루프탑"
      ? "야경을 보면서 한두 잔 하기 좋은 곳입니다. 분위기와 좌석 위치가 만족도를 크게 좌우하니 해질 무렵이나 저녁 초반에 맞춰 가는 편이 좋아요."
      : place.category === "카페"
        ? "더운 시간대에 쉬어가거나 사진을 남기기 좋은 곳입니다. 커피만 보고 가기보다 좌석, 소음, 조명까지 같이 보면 선택이 쉬워요."
        : place.category === "마사지"
          ? "많이 걷는 일정 중간에 컨디션을 회복하기 좋은 마사지 스팟입니다. 코스 시간과 강도, 추가 비용을 먼저 확인하면 일정이 덜 꼬입니다."
          : place.category === "맛집"
            ? "식사 동선에 넣기 좋은 음식점입니다. 처음 방문이면 대표 메뉴부터 고르고, 피크 시간대에는 대기 가능성을 생각하고 움직이는 편이 안전해요."
            : "여행 동선 중간에 넣어두기 좋은 장소입니다. 이동 시간과 방문 목적이 맞을 때 만족도가 높습니다.";
  return [
    summary || `${area}에서 일정에 넣기 좋은 장소입니다.`,
    categoryIntro,
    `추천 메뉴는 ${menu}입니다. ${tips[0] ?? "방문 전 운영 정보를 확인하세요."}`,
    cautions.length > 0 ? `주의할 점은 ${cautions.join(", ")}입니다.` : "방문 전 최신 운영 정보를 한 번 더 확인하면 좋습니다."
  ];
}

function buildPlaceFeatures(place: CuratedPlace) {
  const openTime = place.bestTime.length > 0 ? `${place.bestTime.join(" · ")} 추천` : "방문 전 영업시간 확인";
  return [
    {
      icon: "⌚",
      title: "추천 시간",
      copy: openTime
    },
    {
      icon: "⌖",
      title: "위치",
      copy: `${place.area ?? place.city}${place.address ? ` · ${place.address}` : ""}`
    },
    {
      icon: "ⓘ",
      title: "특징",
      copy: place.tags.slice(0, 5).join(" · ") || getDisplayCategory(place.category)
    },
    {
      icon: "☎",
      title: "문의",
      copy: formatPhoneNumber(place)
    }
  ];
}

function cleanPlaceCopy(value?: string) {
  return String(value ?? "")
    .replace(/Google 리뷰 기준으로?/g, "")
    .replace(/Google Maps? 기준으로?/gi, "")
    .replace(/구글맵 기준으로?/g, "")
    .replace(/실제 주소 기준으로?/g, "")
    .replace(/영업시간 기준으로?/g, "")
    .replace(/리뷰 수가 많아/g, "")
    .replace(/평점이 높아/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatOpeningHoursSummary(place: CuratedPlace) {
  if (Array.isArray(place.openingHoursText) && place.openingHoursText.length > 0) {
    return place.openingHoursText[0].replace(/\s+/g, " ");
  }
  if (typeof place.openNow === "boolean") return place.openNow ? "영업 중" : "영업 종료";
  return "업데이트 예정";
}

function formatPhoneNumber(place: CuratedPlace) {
  return place.internationalPhoneNumber || place.nationalPhoneNumber || "업데이트 예정";
}

function formatVerifiedDate(value?: string) {
  if (!value) return "업데이트 예정";
  return value.slice(0, 10);
}

function normalizeCategory(place: CuratedPlace) {
  if (place.category === "카페") return "cafe";
  if (place.category === "마사지") return "massage";
  if (place.category === "바/루프탑" || place.category === "가라오케") return "night";
  if (place.category === "쇼핑") return "shopping";
  if (place.category === "사진명소" || place.category === "투어/액티비티") return "photo";
  return "food";
}

function pickDiverseSafePlaces(places: CuratedPlace[], limit: number) {
  const selected: CuratedPlace[] = [];
  const selectedIds = new Set<string>();
  const categoryCounts = new Map<string, number>();
  const firstPassCategoryLimit = 1;

  for (const place of places) {
    const category = normalizeCategory(place);
    if ((categoryCounts.get(category) ?? 0) >= firstPassCategoryLimit) continue;
    selected.push(place);
    selectedIds.add(place.id);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    if (selected.length >= limit) return selected;
  }

  for (const place of places) {
    if (selectedIds.has(place.id)) continue;
    selected.push(place);
    if (selected.length >= limit) return selected;
  }

  return selected;
}

function getDisplayCategory(category: CuratedPlace["category"]) {
  return category === "사진명소" ? "관광명소" : category;
}

function getExploreRankBadge(place: CuratedPlace, categoryId?: string) {
  return getMangoRankBadges(place, { surface: "explore", categoryId, limit: 1 })[0] ?? "망고 추천";
}

function getDetailMangoBadges(place: CuratedPlace) {
  const badges = [
    ...getMangoRankBadges(place, { surface: "explore", limit: 3 }),
    place.beginnerSafe ? "초행자 추천" : undefined,
    place.lastVerifiedAt ? "최근 확인됨" : undefined
  ].filter((badge): badge is string => Boolean(badge));

  return Array.from(new Set(badges)).slice(0, 5);
}

function getDetailReviewCount(place: CuratedPlace, localReviewCount: number) {
  return Math.max(getMangoReviewCount(place), localReviewCount, place.userRatingCount ?? 0);
}

function getDetailKoreanReasons(place: CuratedPlace, recommendedMenu: string) {
  const keywords = place.koreanReviewSignal?.keywords?.slice(0, 3).join(" · ");
  return [
    place.koreanReviewSignal?.summary,
    keywords ? `한국인 후기 키워드: ${keywords}` : undefined,
    recommendedMenu ? `처음이면 ${recommendedMenu}부터 확인하기 좋아요` : undefined,
    place.beginnerSafe ? "초행자도 고르기 쉬운 동선과 카테고리예요" : undefined,
    getMangoCommentCount(place) > 0 ? `망고단 반응 ${formatMangoCommentChip(place)}` : undefined
  ].filter((reason): reason is string => Boolean(reason));
}

function normalizeDetailInfo(value?: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized || /정보없음|업데이트 예정|undefined|null/i.test(normalized)) return "확인 필요";
  return normalized;
}

function buildMeta(place: CuratedPlace) {
  const price = place.priceLevel === "저렴" ? "$" : place.priceLevel === "프리미엄" ? "$$$" : "$$";
  const category = place.category === "맛집" ? "음식점" : getDisplayCategory(place.category);
  const area = place.area ?? place.city;
  return `${price} · ${category} · ${place.tags.slice(0, 2).join(" · ")} · ${area}`;
}

function hasTag(place: CuratedPlace, tags: string[]) {
  return place.tags.some((tag) => tags.some((keyword) => tag.toLowerCase().includes(keyword.toLowerCase())));
}

function isFoodGuidePlace(place: CuratedPlace) {
  if (isNonFoodGuideCategory(place)) return false;
  return (
    place.category === "맛집" ||
    place.category === "카페" ||
    matchesStrictCategory(place, "korean") ||
    isChineseFoodGuidePlace(place) ||
    isJapaneseFoodGuidePlace(place)
  );
}

function isRestaurantFoodGuidePlace(place: CuratedPlace) {
  return isFoodGuidePlace(place) && place.category !== "카페";
}

function isNonFoodGuideCategory(place: CuratedPlace) {
  return ["마사지", "바/루프탑", "가라오케", "쇼핑", "환전", "사진명소", "투어/액티비티"].includes(place.category);
}

function isChineseFoodGuidePlace(place: CuratedPlace) {
  return hasTag(place, ["중식당", "한국식중식"]) || nameHas(place, ["chinese", "jjamppong", "jjambbong", "jajang", "dim sum", "딤섬", "짬뽕", "짜장"]);
}

function isJapaneseFoodGuidePlace(place: CuratedPlace) {
  return hasTag(place, ["일식당"]) || nameHas(place, ["sushi", "ramen", "izakaya", "japanese", "스시", "라멘", "이자카야"]);
}

function nameHas(place: CuratedPlace, keywords: string[]) {
  const name = place.name.toLowerCase();
  return keywords.some((keyword) => name.includes(keyword.toLowerCase()));
}

function normalizeFilterId(value?: string): FilterId {
  return filters.some((filter) => filter.id === value) ? (value as FilterId) : "all";
}

function getFilterIcon(filterId: FilterId) {
  const icons: Record<FilterId, string> = {
    all: "●",
    food: "🍜",
    cafe: "☕",
    massage: "💆",
    rooftop: "🍸",
    karaoke: "🎤",
    shopping: "🛍",
    photo: "📷",
    exchange: "💱",
    korean: "한",
    chinese: "중",
    japanese: "일",
    vietnamese: "VN"
  };
  return icons[filterId];
}

function formatRating(value?: number) {
  return (value ?? 4.6).toFixed(1);
}

function formatCount(value: number) {
  if (value >= 10000) return `${Math.floor(value / 1000) / 10}만+`;
  if (value >= 1000) return `${Math.floor(value).toLocaleString()}`;
  return `${value}`;
}

function uniqueLabels(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function loadComments(): PlaceComment[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(placeCommunityStorageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveComments(comments: PlaceComment[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(placeCommunityStorageKey, JSON.stringify(comments.slice(0, 200)));
  } catch {
    // 댓글 저장 실패는 탐색 사용을 막지 않는다.
  }
}

const styles = StyleSheet.create({
  searchPanel: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 14,
    ...shadow
  },
  searchPanelDesktop: {
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  searchBox: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#F7F5EF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10
  },
  searchBoxDesktop: {
    flex: 1,
    minWidth: 340,
    maxWidth: 520,
    minHeight: 54,
    borderRadius: 16
  },
  searchIcon: { fontSize: 27, color: colors.greenDeep, fontWeight: "800" },
  searchInput: { flex: 1, fontSize: 17, color: colors.ink, fontWeight: "700" },
  desktopSearchMetaRow: {
    flex: 1,
    minWidth: 0,
    gap: 8
  },
  desktopCityTabs: {
    flexDirection: "row",
    gap: 7,
    paddingRight: 12
  },
  desktopCityPill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  desktopCityPillActive: {
    backgroundColor: "rgba(255,179,33,0.20)",
    borderColor: colors.cyan
  },
  desktopCityPillText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700"
  },
  desktopCityPillTextActive: {
    color: colors.greenDeep
  },
  desktopSearchSummary: {
    color: colors.greenDeep,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  },
  cityTabs: { gap: 10, paddingRight: 16 },
  cityPill: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#F7F5EF"
  },
  cityPillActive: { backgroundColor: "rgba(255,179,33,0.20)", borderColor: colors.cyan },
  cityPillText: { color: colors.muted, fontSize: 15, fontWeight: "700" },
  cityPillTextActive: { color: colors.greenDeep },
  situationHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: -2
  },
  situationHeaderTitle: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800"
  },
  situationHeaderMeta: {
    color: colors.greenDeep,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700"
  },
  situationTabs: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16
  },
  situationPill: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  situationPillActive: {
    backgroundColor: colors.greenDeep,
    borderColor: colors.greenDeep
  },
  situationPillText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700"
  },
  situationPillTextActive: {
    color: "#FFFFFF"
  },
  filterTabs: { gap: 14, paddingRight: 16 },
  filterPill: {
    alignItems: "center",
    gap: 6,
    minWidth: 76,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "transparent"
  },
  filterPillActive: {
    backgroundColor: "rgba(255,179,33,0.16)",
    borderColor: colors.cyan
  },
  filterIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    textAlign: "center",
    lineHeight: 58,
    overflow: "hidden",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 25
  },
  filterIconActive: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan
  },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  filterTextActive: { color: colors.greenDeep },
  filterCount: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14
  },
  filterCountActive: {
    color: colors.greenDeep
  },
  activeFilterSummary: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: "rgba(15,81,50,0.07)",
    borderWidth: 1,
    borderColor: "rgba(15,81,50,0.14)",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start"
  },
  activeFilterSummaryText: {
    color: colors.greenDeep,
    fontSize: 13,
    fontWeight: "700"
  },
  topFilterScroll: {
    marginTop: 18,
    marginBottom: 4
  },
  topFilterBar: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 28
  },
  exploreDesktopLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24
  },
  exploreSituationSidebar: {
    width: 258,
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FFFFFF",
    padding: 16,
    ...shadow
  },
  exploreSidebarEyebrow: {
    color: colors.greenDeep,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  exploreSidebarTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    marginTop: 4
  },
  exploreSidebarList: {
    gap: 8,
    marginTop: 16
  },
  exploreSidebarItem: {
    minHeight: 72,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  exploreSidebarItemActive: {
    backgroundColor: colors.greenDeep,
    borderColor: colors.greenDeep
  },
  exploreSidebarItemCopy: {
    flex: 1,
    minWidth: 0
  },
  exploreSidebarItemLabel: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800"
  },
  exploreSidebarItemLabelActive: {
    color: "#FFFFFF"
  },
  exploreSidebarItemHint: {
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    marginTop: 3
  },
  exploreSidebarItemHintActive: {
    color: "rgba(255,255,255,0.70)"
  },
  exploreSidebarArrow: {
    color: "#9CA3AF",
    fontSize: 20,
    fontWeight: "900"
  },
  exploreSidebarArrowActive: {
    color: "#FFD43B"
  },
  exploreDesktopList: {
    flex: 1,
    minWidth: 0,
    maxWidth: 680
  },
  exploreMapPanel: {
    width: 334,
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 14,
    ...shadow
  },
  exploreMapHeader: { gap: 4 },
  exploreMapEyebrow: { color: "#A87813", fontSize: 13, fontWeight: "900" },
  exploreMapTitle: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  exploreMapCanvas: {
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line
  },
  exploreMapImage: { width: "100%", height: "100%" },
  exploreMapEmpty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  exploreMapEmptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  exploreMapEmptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center", fontWeight: "800" },
  exploreMapFallback: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#EEF4EF"
  },
  exploreMapGrid: {
    position: "absolute",
    top: -30,
    right: -80,
    bottom: -30,
    left: -80,
    opacity: 0.55,
    backgroundColor: "#F7F5EF",
    borderWidth: 28,
    borderColor: "#E5DED0",
    transform: [{ rotate: "-10deg" }]
  },
  exploreMapFallbackPin: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4
  },
  exploreMapFallbackPinPrimary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    right: 34,
    top: 30,
    backgroundColor: colors.greenDeep
  },
  exploreMapFallbackPinSecondary: {
    width: 62,
    height: 38,
    borderRadius: 999,
    left: 28,
    bottom: 44,
    backgroundColor: colors.cyan
  },
  exploreMapFallbackPinTertiary: {
    width: 58,
    height: 34,
    borderRadius: 999,
    right: 48,
    bottom: 54,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.line
  },
  exploreMapFallbackPinText: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" },
  exploreMapFallbackPinSmallText: { color: "#271400", fontSize: 12, fontWeight: "900" },
  exploreMapFallbackButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: colors.cyan,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  exploreMapFallbackButtonText: { color: "#271400", fontSize: 13, fontWeight: "900" },
  exploreMapCard: {
    borderRadius: 16,
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 8
  },
  exploreMapCardName: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: "800" },
  exploreMapCardMeta: { color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  exploreMapCardActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  exploreMapPrimaryButton: { flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
  exploreMapPrimaryText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  exploreMapGhostButton: { minWidth: 86, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.greenDeep, alignItems: "center", justifyContent: "center" },
  exploreMapGhostText: { color: colors.greenDeep, fontSize: 14, fontWeight: "800" },
  exploreMapList: { gap: 8 },
  exploreMapListItem: { borderRadius: 14, padding: 12, backgroundColor: "#F7F5EF", borderWidth: 1, borderColor: colors.line },
  exploreMapListItemActive: { backgroundColor: "rgba(255,179,33,0.16)", borderColor: colors.cyan },
  exploreMapListName: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  exploreMapListMeta: { color: colors.muted, fontSize: 12, marginTop: 4, fontWeight: "600" },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.greenDeep,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#FFFFFF"
  },
  outlineButtonWide: {
    borderWidth: 1,
    borderColor: colors.greenDeep,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#FFFFFF"
  },
  outlineButtonText: { color: colors.greenDeep, fontSize: 15, fontWeight: "800" },
  sectionBlock: {
    marginTop: 28
  },
  sectionTitle: { color: colors.ink, fontSize: 28, fontWeight: "800", letterSpacing: 0 },
  sectionCopy: { color: colors.muted, fontSize: 17, lineHeight: 26, marginTop: 8, fontWeight: "600" },
  carouselTrack: { gap: 22, paddingVertical: 18, paddingRight: 28 },
  heroCard: { width: 246 },
  heroImage: { width: "100%", height: 286, justifyContent: "space-between", padding: 12 },
  heroImageRadius: { borderRadius: 14 },
  photoEmpty: {
    backgroundColor: "#F7F5EF",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  photoEmptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  photoEmptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", fontWeight: "600" },
  saveBubble: {
    alignSelf: "flex-end",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  saveBubbleText: { color: colors.greenDeep, fontSize: 32, fontWeight: "800" },
  awardBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(15,81,50,0.86)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  awardBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  guideBadge: {
    color: "#D43F53",
    backgroundColor: "#FFF1F3",
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 13,
    overflow: "hidden",
    fontSize: 13,
    fontWeight: "800"
  },
  heroTitle: { color: colors.ink, fontSize: 23, lineHeight: 29, marginTop: 8, fontWeight: "800" },
  ratingLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  ratingLineCompact: { marginTop: 4 },
  ratingNumber: { color: colors.greenDeep, fontSize: 18, fontWeight: "800" },
  ratingNumberLarge: { fontSize: 22 },
  ratingReviews: { color: colors.greenDeep, fontSize: 15, fontWeight: "800" },
  ratingReviewsLarge: { fontSize: 18 },
  dots: { flexDirection: "row", gap: 3, alignItems: "center" },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#009A44" },
  dotSmall: { width: 11, height: 11, borderRadius: 6 },
  dotFull: { backgroundColor: "#009A44" },
  dotEmpty: { backgroundColor: "#FFFFFF" },
  heroMeta: { color: colors.ink, fontSize: 17, lineHeight: 25, marginTop: 7, fontWeight: "600" },
  heroSafeMeta: { color: colors.greenDeep, fontSize: 14, lineHeight: 19, marginTop: 7, fontWeight: "800" },
  heroSafeReason: { color: colors.ink, fontSize: 15, lineHeight: 22, marginTop: 5, fontWeight: "600" },
  heroSafeCaution: { color: "#8A5A00", fontSize: 13, lineHeight: 18, marginTop: 5, fontWeight: "700" },
  popularList: { gap: 20, marginTop: 18 },
  popularRow: { flexDirection: "row", gap: 14, minHeight: 142, position: "relative" },
  popularImage: { width: 142, height: 142, borderRadius: 12, backgroundColor: "#F3F4F6" },
  photoEmptySmall: { alignItems: "center", justifyContent: "center", padding: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: "#F7F5EF" },
  photoEmptySmallText: { color: colors.muted, fontSize: 12, lineHeight: 16, textAlign: "center", fontWeight: "700" },
  popularBody: { flex: 1, paddingRight: 28 },
  guideBadgeSmall: { color: "#D43F53", fontSize: 13, fontWeight: "900", marginBottom: 4 },
  popularTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  popularMeta: { color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: 5, fontWeight: "600" },
  popularSafeMeta: { color: colors.greenDeep, fontSize: 13, lineHeight: 18, marginTop: 4, fontWeight: "800" },
  popularSafeReason: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 5, fontWeight: "600" },
  popularSafeCaution: { color: "#8A5A00", fontSize: 12, lineHeight: 17, marginTop: 4, fontWeight: "700" },
  rowSaveButton: {
    position: "absolute",
    left: 98,
    top: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  rowSaveText: { color: colors.greenDeep, fontSize: 25, fontWeight: "800" },
  allButton: {
    minHeight: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: colors.greenDeep,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
    backgroundColor: "#FFFFFF"
  },
  allButtonText: { color: colors.greenDeep, fontSize: 19, fontWeight: "800" },
  floatingMapButton: {
    position: "absolute",
    bottom: 118,
    alignSelf: "center",
    minWidth: 132,
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: "#063F28",
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  floatingMapText: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  detailShellContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "#FFFFFF"
  },
  detailV2Page: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
    overflow: "hidden"
  },
  detailV2Header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 30
  },
  detailV2HeaderButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  detailV2HeaderIcon: {
    color: "#111827",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700"
  },
  detailV2HeaderIconSaved: {
    color: "#F5A400"
  },
  detailV2HeaderTitle: {
    flex: 1,
    color: "#111827",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    paddingHorizontal: 8
  },
  detailV2Scroll: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  detailV2Content: {
    paddingBottom: 24,
    backgroundColor: "#FFFFFF"
  },
  detailV2Gallery: {
    backgroundColor: "#FFFFFF"
  },
  detailV2PhotoGrid: {
    width: "100%",
    height: 238,
    flexDirection: "row",
    gap: 3,
    backgroundColor: "#FFFFFF"
  },
  detailV2PhotoMain: {
    flex: 1,
    height: "100%",
    backgroundColor: "#E5E7EB"
  },
  detailV2PhotoSide: {
    width: "34%",
    gap: 3
  },
  detailV2PhotoSideImageWrap: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#E5E7EB"
  },
  detailV2PhotoSideImage: {
    flex: 1,
    width: "100%",
    backgroundColor: "#E5E7EB"
  },
  detailV2PhotoMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.52)"
  },
  detailV2PhotoMoreText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900"
  },
  detailV2PhotoSingle: {
    width: "100%",
    height: 238,
    backgroundColor: "#E5E7EB"
  },
  detailV2PhotoPlaceholder: {
    height: 232,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FA"
  },
  detailV2PhotoPlaceholderTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900"
  },
  detailV2PhotoPlaceholderText: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    fontWeight: "700"
  },
  detailV2Summary: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3"
  },
  detailV2TitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14
  },
  detailV2TitleCopy: {
    flex: 1
  },
  detailV2Title: {
    color: "#111827",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900"
  },
  detailV2Address: {
    color: "#4B5563",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    fontWeight: "700"
  },
  detailV2SaveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF"
  },
  detailV2SaveButtonActive: {
    borderColor: "#FFE19A",
    backgroundColor: "#FFF8E1"
  },
  detailV2SaveIcon: {
    color: "#9CA3AF",
    fontSize: 28,
    fontWeight: "900"
  },
  detailV2SaveIconActive: {
    color: "#F5A400"
  },
  detailV2RatingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  detailV2Star: {
    color: "#2F80ED",
    fontSize: 21,
    fontWeight: "900"
  },
  detailV2Rating: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900"
  },
  detailV2ReviewText: {
    color: "#4B5563",
    fontSize: 15,
    fontWeight: "800"
  },
  detailV2DotText: {
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "900"
  },
  detailV2Category: {
    color: "#4B5563",
    fontSize: 15,
    fontWeight: "800"
  },
  detailV2BadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  detailV2Badge: {
    color: "#7A4C00",
    backgroundColor: "#FFF5D6",
    borderWidth: 1,
    borderColor: "#FFE3A3",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "900"
  },
  detailV2SafePanel: {
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    gap: 7,
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FFE3A3"
  },
  detailV2SafeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  detailV2SafeLabel: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900"
  },
  detailV2SafeScore: {
    color: "#9A5A00",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  detailV2SafeReason: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800"
  },
  detailV2SafeCaution: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  detailV2EvidenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 3
  },
  detailV2EvidenceChip: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: "#6B4A00",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFE3A3"
  },
  detailV2ActionBar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  detailV2ActionButton: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  detailV2ActionButtonActive: {
    backgroundColor: "#FFF8E1"
  },
  detailV2ActionIcon: {
    color: "#4B5563",
    fontSize: 22,
    fontWeight: "900"
  },
  detailV2ActionIconActive: {
    color: "#F5A400"
  },
  detailV2ActionLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "900"
  },
  detailV2ActionLabelActive: {
    color: "#7A4C00"
  },
  detailV2Tabs: {
    height: 54,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 20
  },
  detailV2TabButton: {
    flex: 1,
    height: 54,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  detailV2TabText: {
    width: "100%",
    color: "#6B7280",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    paddingBottom: 13,
    borderBottomWidth: 3,
    borderBottomColor: "transparent"
  },
  detailV2TabTextActive: {
    color: "#111827",
    fontWeight: "900",
    borderBottomColor: "#2F80ED"
  },
  detailV2Section: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 8,
    borderBottomColor: "#F5F6F8"
  },
  detailV2SectionTitle: {
    color: "#111827",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    marginBottom: 14
  },
  detailV2IntroBox: {
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#F1F2F4"
  },
  detailV2IntroText: {
    color: "#374151",
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "700"
  },
  detailV2Subsection: {
    marginTop: 22,
    gap: 10
  },
  detailV2SubTitle: {
    color: "#111827",
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900"
  },
  detailV2BulletRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start"
  },
  detailV2BulletDot: {
    width: 20,
    color: "#F5A400",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "900"
  },
  detailV2BulletText: {
    flex: 1,
    color: "#374151",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700"
  },
  detailV2CautionPill: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FED7AA"
  },
  detailV2CautionText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  detailV2ChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  detailV2SignalChip: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    color: "#0B3D27",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#CDEFD8"
  },
  detailV2SignalChipMuted: {
    color: "#6B4A00",
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA"
  },
  detailV2MiniMapBlock: {
    marginTop: 22
  },
  detailV2SectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  detailV2MoreLink: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "900"
  },
  detailV2MapCard: {
    height: 178,
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  detailV2MapCardLarge: {
    height: 246,
    marginTop: 0
  },
  detailV2MapImage: {
    width: "100%",
    height: "100%"
  },
  detailV2MapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18
  },
  detailV2MapPlaceholderTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900"
  },
  detailV2MapPlaceholderText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
    fontWeight: "700"
  },
  detailV2MapOpenButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    ...shadow
  },
  detailV2MapOpenIcon: {
    color: "#374151",
    fontSize: 23,
    fontWeight: "900"
  },
  detailV2InfoList: {
    gap: 16
  },
  detailV2InfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14
  },
  detailV2InfoIcon: {
    width: 28,
    color: "#6B7280",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  detailV2InfoTextBox: {
    flex: 1,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3"
  },
  detailV2InfoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  detailV2InfoTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900"
  },
  detailV2InfoBadge: {
    color: "#7A4C00",
    backgroundColor: "#FFF5D6",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "900"
  },
  detailV2InfoValue: {
    color: "#374151",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 5,
    fontWeight: "700"
  },
  detailV2HoursCard: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    gap: 8
  },
  detailV2HoursText: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  detailV2MutedText: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  detailV2InfoActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  detailV2InfoButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10
  },
  detailV2InfoButtonActive: {
    backgroundColor: "#FFF5D6"
  },
  detailV2InfoButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "900"
  },
  detailV2InfoButtonTextActive: {
    color: "#7A4C00"
  },
  detailV2InquiryBox: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FFE3A3",
    padding: 14,
    gap: 12
  },
  detailV2InquiryTitle: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900"
  },
  detailV2InquiryCopy: {
    color: "#7A4C00",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    fontWeight: "800"
  },
  detailV2InquiryBadge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: "#0B3D27",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    backgroundColor: "#ECFDF3"
  },
  detailV2InquiryInputRow: {
    flexDirection: "row",
    gap: 8
  },
  detailV2InquiryInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0D89A",
    paddingHorizontal: 12,
    color: "#111827",
    fontSize: 13,
    fontWeight: "800"
  },
  detailV2InquirySubmit: {
    minWidth: 58,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD43B"
  },
  detailV2InquirySubmitDisabled: {
    backgroundColor: "#F3F4F6"
  },
  detailV2InquirySubmitText: {
    color: "#271400",
    fontSize: 13,
    fontWeight: "900"
  },
  detailV2InquirySubmitTextDisabled: {
    color: "#9CA3AF"
  },
  detailV2InquiryDone: {
    color: "#0B7A45",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  detailV2CommerceRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10
  },
  detailV2CommerceButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  detailV2CommerceButtonDisabled: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  detailV2CommerceTextDisabled: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "900"
  },
  detailV2Notice: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#FFE3A3"
  },
  detailV2NoticeText: {
    color: "#7A4C00",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  detailV2DirectionsButton: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    backgroundColor: "#111827"
  },
  detailV2DirectionsText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900"
  },
  detailV2ReviewCount: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "900"
  },
  detailV2ReviewSignalBox: {
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    gap: 10,
    marginBottom: 12
  },
  detailV2ReviewSignalTitle: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  detailV2ReviewSummary: {
    flexDirection: "row",
    gap: 16,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF0F3"
  },
  detailV2ReviewScoreBox: {
    width: 86
  },
  detailV2ReviewScore: {
    color: "#111827",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900"
  },
  detailV2ReviewScoreLabel: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2,
    fontWeight: "900"
  },
  detailV2ReviewMiniBars: {
    flex: 1,
    gap: 8
  },
  detailV2ReviewMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  detailV2ReviewMiniLabel: {
    width: 48,
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "900"
  },
  detailV2ReviewMiniTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E5E7EB"
  },
  detailV2ReviewMiniFill: {
    height: "100%",
    backgroundColor: "#F5A400"
  },
  detailV2ReviewMiniCount: {
    width: 20,
    color: "#6B7280",
    textAlign: "right",
    fontSize: 12,
    fontWeight: "900"
  },
  detailV2CommentComposer: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 12
  },
  detailV2ComposerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  detailV2RatingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#F5A400",
    backgroundColor: "#FFFFFF"
  },
  detailV2RatingDotActive: {
    backgroundColor: "#F5A400"
  },
  detailV2CommentInputRow: {
    flexDirection: "row",
    gap: 9
  },
  detailV2CommentInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    color: "#111827",
    fontSize: 14,
    fontWeight: "700"
  },
  detailV2CommentSubmit: {
    minWidth: 62,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD43B"
  },
  detailV2CommentSubmitText: {
    color: "#271400",
    fontSize: 14,
    fontWeight: "900"
  },
  detailV2ReviewCard: {
    flexDirection: "row",
    gap: 11,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3"
  },
  detailV2ReviewCardCompact: {
    paddingVertical: 12
  },
  detailV2ReviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5D6"
  },
  detailV2ReviewAvatarText: {
    color: "#7A4C00",
    fontSize: 15,
    fontWeight: "900"
  },
  detailV2ReviewBody: {
    flex: 1
  },
  detailV2ReviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  detailV2ReviewName: {
    maxWidth: "60%",
    color: "#111827",
    fontSize: 15,
    fontWeight: "900"
  },
  detailV2ReviewSource: {
    color: "#0B7A45",
    backgroundColor: "#EAF8EF",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "900"
  },
  detailV2ReviewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6
  },
  detailV2ReviewTime: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "800"
  },
  detailV2ReviewMessage: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 7,
    fontWeight: "700"
  },
  detailV2ReviewTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8
  },
  detailV2ReviewTag: {
    color: "#4B5563",
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "900"
  },
  detailV2EmptyReview: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 6
  },
  detailV2EmptyIcon: {
    color: "#9CA3AF",
    fontSize: 42,
    fontWeight: "900"
  },
  detailV2EmptyTitle: {
    color: "#4B5563",
    fontSize: 17,
    fontWeight: "900"
  },
  detailV2EmptyText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "700"
  },
  detailPage: { flex: 1, backgroundColor: "#FFFFFF" },
  detailContent: { paddingBottom: 120 },
  detailContentDesktop: {
    maxWidth: 1120,
    alignSelf: "center",
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 40
  },
  detailTopBar: {
    minHeight: 64,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  backButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  backButtonText: { color: "#063F28", fontSize: 44, fontWeight: "700" },
  detailActions: { flexDirection: "row", gap: 12 },
  detailIconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F8F1" },
  detailIconText: { color: "#063F28", fontSize: 26, fontWeight: "900" },
  detailTabs: {
    minHeight: 58,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    zIndex: 10
  },
  detailTabButton: { paddingTop: 12 },
  detailTab: { color: "#063F28", fontSize: 20, fontWeight: "900", paddingBottom: 14, opacity: 0.58 },
  detailTabActive: {
    color: "#063F28",
    fontSize: 20,
    fontWeight: "900",
    paddingBottom: 12,
    borderBottomWidth: 4,
    borderBottomColor: "#063F28",
    opacity: 1
  },
  detailPhotoStage: { position: "relative", backgroundColor: "#F3F4F6", paddingVertical: 14 },
  detailPhotoScroll: { width: "100%" },
  detailPhotoTrack: { paddingLeft: 18, paddingRight: 30, gap: 12 },
  detailPhotoFrame: {
    width: 340,
    height: 300,
    position: "relative",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#E5E7EB"
  },
  detailPhotoEmptyFrame: { alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#FFF8E6", borderWidth: 1, borderColor: "#F0D89A" },
  detailImage: { width: "100%", height: "100%", backgroundColor: "#F3F4F6" },
  awardPhotoBadge: {
    position: "absolute",
    left: 18,
    bottom: 18,
    borderRadius: 16,
    backgroundColor: colors.cyan,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  awardPhotoBadgeText: { color: "#063F28", fontSize: 16, fontWeight: "900" },
  photoCountBadge: {
    position: "absolute",
    right: 18,
    bottom: 18,
    borderRadius: 22,
    backgroundColor: "#063F28",
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  photoCountText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  photoIndexBadge: {
    position: "absolute",
    right: 14,
    top: 14,
    borderRadius: 999,
    backgroundColor: "rgba(6, 63, 40, 0.88)",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  photoIndexText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  detailSection: { paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  detailTitle: { color: "#063F28", fontSize: 40, lineHeight: 46, fontWeight: "900" },
  detailMeta: { color: "#063F28", fontSize: 18, lineHeight: 28, marginTop: 10, fontWeight: "800" },
  trustQuickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  trustQuickCard: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 18,
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F0D89A",
    padding: 14
  },
  trustQuickLabel: { color: "#A87813", fontSize: 12, fontWeight: "900" },
  trustQuickValue: { color: "#063F28", fontSize: 16, lineHeight: 22, marginTop: 5, fontWeight: "900" },
  trustQuickCopy: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3, fontWeight: "800" },
  detailLinkRow: { flexDirection: "row", gap: 24, marginTop: 16, flexWrap: "wrap" },
  detailLink: { color: "#063F28", fontSize: 18, fontWeight: "900", textDecorationLine: "underline" },
  detailNotice: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F0D89A",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  detailNoticeText: {
    color: "#063F28",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "900"
  },
  detailDesktopRail: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  detailRailCard: {
    minWidth: 160,
    flexGrow: 1,
    borderRadius: 18,
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F0D89A",
    padding: 14
  },
  detailRailLabel: { color: colors.muted, fontSize: 12, fontWeight: "900" },
  detailRailValue: { color: colors.ink, fontSize: 15, lineHeight: 21, marginTop: 5, fontWeight: "900" },
  detailRailPrimary: {
    minHeight: 58,
    minWidth: 230,
    flexGrow: 1,
    borderRadius: 18,
    backgroundColor: "#063F28",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  detailRailPrimaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  detailSectionTitle: { color: "#063F28", fontSize: 26, fontWeight: "900", marginBottom: 14 },
  detailParagraph: { color: colors.ink, fontSize: 18, lineHeight: 29, fontWeight: "700", marginBottom: 10 },
  detailInfoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  infoItem: { width: "48%", borderRadius: 16, backgroundColor: "#FFF8E6", padding: 14, borderWidth: 1, borderColor: "#F0D89A" },
  infoTitle: { color: colors.muted, fontSize: 13, fontWeight: "900" },
  infoValue: { color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 5 },
  visitAdviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  visitAdviceCard: {
    flex: 1,
    minWidth: 220,
    borderRadius: 18,
    backgroundColor: "#F4FFF7",
    borderWidth: 1,
    borderColor: "#BEE8C8",
    padding: 14
  },
  visitAdviceTitle: { color: "#063F28", fontSize: 15, fontWeight: "900", marginBottom: 8 },
  visitAdviceText: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: "800", marginTop: 3 },
  featureList: { gap: 18 },
  featureRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  featureIcon: { width: 34, color: "#063F28", fontSize: 26, fontWeight: "900" },
  featureTextBox: { flex: 1 },
  featureTitle: { color: "#063F28", fontSize: 19, fontWeight: "900" },
  featureCopy: { color: colors.ink, fontSize: 17, lineHeight: 26, marginTop: 4, fontWeight: "700" },
  reviewScoreCard: { flexDirection: "row", gap: 18 },
  reviewScoreSummary: { minWidth: 106 },
  reviewBigScore: { color: "#063F28", fontSize: 56, fontWeight: "900" },
  reviewScoreLabel: { color: "#063F28", fontSize: 18, fontWeight: "900", marginBottom: 8 },
  reviewScoreSub: { color: colors.muted, fontSize: 12, fontWeight: "900", marginTop: 8 },
  reviewBars: { flex: 1, gap: 12 },
  reviewBarRow: { gap: 6 },
  reviewBarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  reviewBarLabel: { color: "#063F28", fontSize: 15, fontWeight: "900" },
  reviewBarCount: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  reviewTrack: { height: 10, backgroundColor: "#E5E7EB", borderRadius: 999, overflow: "hidden" },
  reviewFill: { height: "100%", backgroundColor: "#009A44" },
  commentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  commentCount: { color: "#063F28", fontSize: 16, fontWeight: "900" },
  commentBox: { gap: 10, marginBottom: 18 },
  commentRatingPicker: {
    borderRadius: 18,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#F0D89A",
    padding: 12,
    gap: 8
  },
  commentRatingTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  commentRatingLabel: { color: "#063F28", fontSize: 14, fontWeight: "900" },
  commentRatingHint: { color: "#A87813", fontSize: 13, fontWeight: "900" },
  commentRatingDots: { flexDirection: "row", gap: 8 },
  commentRatingDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#009A44", backgroundColor: "transparent" },
  commentRatingDotActive: { backgroundColor: "#009A44" },
  commentInputRow: { flexDirection: "row", gap: 10 },
  commentInput: { flex: 1, minHeight: 52, borderRadius: 18, backgroundColor: "#F9FAFB", paddingHorizontal: 14, color: colors.ink, fontSize: 16, fontWeight: "800" },
  commentSubmit: { minWidth: 72, borderRadius: 18, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
  commentSubmitText: { color: "#271400", fontSize: 15, fontWeight: "900" },
  commentCard: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7"
  },
  commentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFF1C2", alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: "#063F28", fontSize: 16, fontWeight: "900" },
  commentBody: { flex: 1 },
  commentMetaTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  commentNameRow: { flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 },
  commentName: { color: "#063F28", fontSize: 17, fontWeight: "900" },
  commentSource: {
    color: "#0B7A45",
    backgroundColor: "#EAF8EF",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "900"
  },
  commentTime: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  commentMessage: { color: colors.ink, fontSize: 15, lineHeight: 23, marginTop: 7, fontWeight: "800" },
  commentTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  commentTag: {
    color: "#063F28",
    backgroundColor: "#FFF7D6",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "900"
  }
});
