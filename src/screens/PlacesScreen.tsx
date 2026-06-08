import { useEffect, useMemo, useRef, useState } from "react";
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { Header } from "../components/Header";
import { curatedPlaces } from "../data/places";
import { colors, shadow } from "../styles/theme";
import type { CuratedPlace, Destination, LiveTravelInfo, PlaceReport, PlannerInput } from "../types";
import { openGoogleMapsPlace } from "../utils/googleMaps";
import { formatMangoCommentChip, formatMangoRecommendationChip, getMangoCommentCount, getMangoRecommendationCount, getMangoReviewCount } from "../utils/placeCommunity";

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
};

const destinationTabs: Destination[] = ["호치민", "다낭", "나트랑", "하노이", "달랏", "푸꾸옥"];

const filters: Array<{ id: FilterId; label: string; match: (place: CuratedPlace) => boolean }> = [
  { id: "all", label: "전체", match: () => true },
  { id: "food", label: "맛집", match: (place) => place.category === "맛집" },
  { id: "cafe", label: "카페", match: (place) => place.category === "카페" },
  { id: "massage", label: "마사지", match: (place) => place.category === "마사지" },
  { id: "rooftop", label: "루프탑", match: (place) => place.category === "바/루프탑" || hasTag(place, ["루프탑", "칵테일", "클럽"]) },
  { id: "karaoke", label: "가라오케", match: (place) => place.category === "가라오케" },
  { id: "shopping", label: "쇼핑", match: (place) => place.category === "쇼핑" },
  { id: "photo", label: "관광명소", match: (place) => place.category === "사진명소" },
  { id: "exchange", label: "환전", match: (place) => place.category === "환전" },
  { id: "korean", label: "한식당", match: (place) => hasTag(place, ["한식당", "한국어가능", "한국인추천"]) || nameHas(place, ["korean", "bbq", "doya", "hanam"]) },
  { id: "chinese", label: "중식당", match: (place) => hasTag(place, ["중식당"]) || nameHas(place, ["chinese", "jjamppong", "jajang", "dim sum"]) },
  { id: "japanese", label: "일식당", match: (place) => hasTag(place, ["일식당"]) || nameHas(place, ["sushi", "ramen", "izakaya", "japanese"]) },
  { id: "vietnamese", label: "베트남 음식", match: (place) => place.category === "맛집" && !hasTag(place, ["한식당", "중식당", "일식당"]) }
];

const shortcutFilters: FilterId[] = ["food", "cafe", "massage", "rooftop", "shopping", "photo", "exchange", "karaoke"];

const placeCommunityStorageKey = "mangomap-place-comments-v2";

export function PlacesScreen({
  input,
  savedPlaceIds,
  memberName,
  initialFilterId,
  initialDestination,
  onToggleSavedPlace,
  onOpenMapPlace,
  onRequireAuth
}: PlacesScreenProps) {
  const [selectedCity, setSelectedCity] = useState<Destination>(initialDestination ?? input.destination);
  const [selectedFilterId, setSelectedFilterId] = useState<FilterId>(normalizeFilterId(initialFilterId));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<CuratedPlace | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [comments, setComments] = useState<PlaceComment[]>(loadComments);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const appMaxWidth = isDesktop ? 1240 : 560;

  useEffect(() => {
    if (initialDestination) setSelectedCity(initialDestination);
  }, [initialDestination]);

  useEffect(() => {
    if (initialFilterId) setSelectedFilterId(normalizeFilterId(initialFilterId));
  }, [initialFilterId]);

  useEffect(() => {
    setShowAll(false);
    setSelectedPlace(null);
  }, [selectedCity, selectedFilterId, searchQuery]);

  useEffect(() => {
    saveComments(comments);
  }, [comments]);

  const selectedFilter = filters.find((filter) => filter.id === selectedFilterId) ?? filters[0];
  const places = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return curatedPlaces
      .filter((place) => place.city === selectedCity)
      .filter((place) => selectedFilter.match(place))
      .filter((place) => {
        if (!query) return true;
        return [place.name, place.area, place.address, place.oneLine, place.koreanTip, ...place.tags]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => scorePlace(b) - scorePlace(a));
  }, [searchQuery, selectedCity, selectedFilter]);

  const mustVisit = places.slice(0, 6);
  const popular = places.slice(6, 12);
  const visibleList = showAll ? places : popular.slice(0, 3);

  if (selectedPlace) {
    return (
      <AppShell maxWidth={isDesktop ? 1160 : 560} horizontalPadding={isDesktop ? 32 : 20}>
        <PlaceDetail
          place={selectedPlace}
          saved={savedPlaceIds.includes(selectedPlace.id)}
          comments={comments.filter((comment) => comment.placeId === selectedPlace.id)}
          commentDraft={commentDraft}
          commentRating={commentRating}
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
          onSubmitComment={() => {
            const message = commentDraft.trim();
            if (!message) return;
            if (!memberName) {
              onRequireAuth?.();
              return;
            }
            setComments((current) => [
              {
                id: `place-comment-${Date.now()}`,
                placeId: selectedPlace.id,
                memberName,
                message,
                createdAt: new Date().toISOString(),
                rating: commentRating
              },
              ...current
            ]);
            setCommentDraft("");
            setCommentRating(5);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell maxWidth={appMaxWidth} horizontalPadding={isDesktop ? 32 : 20}>
      <Header eyebrow="탐색" title={`${selectedCity}의 ${selectedFilter.label}`} subtitle="망고맵 추천과 여행자 댓글을 한 번에 확인해요." />

      <View style={[styles.searchPanel, isDesktop && styles.searchPanelDesktop]}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`${selectedCity}에서 전체 찾기`}
            placeholderTextColor="#A87813"
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityTabs}>
          {destinationTabs.map((city) => (
            <Pressable key={city} onPress={() => setSelectedCity(city)} style={[styles.cityPill, selectedCity === city && styles.cityPillActive]}>
              <Text style={[styles.cityPillText, selectedCity === city && styles.cityPillTextActive]}>{city}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {shortcutFilters.map((filterId) => {
            const filter = filters.find((item) => item.id === filterId) ?? filters[0];
            return (
              <Pressable key={filter.id} onPress={() => setSelectedFilterId(filter.id)} style={[styles.filterPill, selectedFilterId === filter.id && styles.filterPillActive]}>
                <Text style={styles.filterIcon}>{getFilterIcon(filter.id)}</Text>
                <Text style={[styles.filterText, selectedFilterId === filter.id && styles.filterTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.topFilterBar}>
        <Pressable style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>영업 중</Text>
        </Pressable>
        <Pressable style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>요리 ▾</Text>
        </Pressable>
        <Pressable style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>가격 ▾</Text>
        </Pressable>
        <Pressable style={styles.outlineButtonWide}>
          <Text style={styles.outlineButtonText}>필터 더 보기</Text>
        </Pressable>
      </View>

      <View style={isDesktop ? styles.exploreDesktopLayout : undefined}>
        <View style={isDesktop ? styles.exploreDesktopList : undefined}>
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>필수 메뉴</Text>
        <Text style={styles.sectionCopy}>{selectedCity}에서 먼저 보면 좋은 후보를 가로로 넘겨보세요.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselTrack}>
          {mustVisit.map((place) => (
            <Pressable key={place.id} style={styles.heroCard} onPress={() => setSelectedPlace(place)}>
              {getPlaceImageUrl(place) ? (
              <ImageBackground source={{ uri: getPlaceImageUrl(place)! }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
                <Pressable style={styles.saveBubble} onPress={() => onToggleSavedPlace(place.id)}>
                  <Text style={styles.saveBubbleText}>{savedPlaceIds.includes(place.id) ? "♥" : "♡"}</Text>
                </Pressable>
                <View style={styles.awardBadge}>
                  <Text style={styles.awardBadgeText}>망고픽</Text>
                </View>
              </ImageBackground>
              ) : (
                <View style={[styles.heroImage, styles.photoEmpty, styles.heroImageRadius]}>
                  <Text style={styles.photoEmptyTitle}>사진 준비중</Text>
                  <Text style={styles.photoEmptyCopy}>실제 매장 사진이 확인되면 표시돼요.</Text>
                </View>
              )}
              <Text style={styles.guideBadge}>망고단 추천</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>{place.name}</Text>
              <RatingLine place={place} />
              <Text style={styles.heroMeta} numberOfLines={2}>{buildMeta(place)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>인기 {selectedFilter.label}</Text>
        <View style={styles.popularList}>
          {visibleList.map((place) => (
            <Pressable key={place.id} style={styles.popularRow} onPress={() => setSelectedPlace(place)}>
              {getPlaceImageUrl(place) ? (
                <Image source={{ uri: getPlaceImageUrl(place)! }} style={styles.popularImage} />
              ) : (
                <View style={[styles.popularImage, styles.photoEmptySmall]}>
                  <Text style={styles.photoEmptySmallText}>사진 준비중</Text>
                </View>
              )}
              <View style={styles.popularBody}>
                <Text style={styles.guideBadgeSmall}>망고단</Text>
                <Text style={styles.popularTitle} numberOfLines={2}>{place.name}</Text>
                <RatingLine place={place} compact />
                <Text style={styles.popularMeta} numberOfLines={2}>{buildMeta(place)} · 영업 중 · {selectedCity}</Text>
              </View>
              <Pressable style={styles.rowSaveButton} onPress={() => onToggleSavedPlace(place.id)}>
                <Text style={styles.rowSaveText}>{savedPlaceIds.includes(place.id) ? "♥" : "♡"}</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
        {places.length > visibleList.length ? (
          <Pressable style={styles.allButton} onPress={() => setShowAll((value) => !value)}>
            <Text style={styles.allButtonText}>{showAll ? "접기" : `모든 ${selectedFilter.label} 보기`}</Text>
          </Pressable>
        ) : null}
      </View>
        </View>
        {isDesktop ? (
          <DesktopExploreMapPanel
            city={selectedCity}
            places={places.slice(0, 6)}
            onOpenPlace={setSelectedPlace}
            onOpenMapPlace={onOpenMapPlace}
          />
        ) : null}
      </View>

      {!isDesktop && places[0] ? (
        <Pressable style={styles.floatingMapButton} onPress={() => onOpenMapPlace(places[0])}>
          <Text style={styles.floatingMapText}>⌖ 지도</Text>
        </Pressable>
      ) : null}
    </AppShell>
  );
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
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    setMapFailed(false);
  }, [mapUrl]);

  return (
    <View style={styles.exploreMapPanel}>
      <View style={styles.exploreMapHeader}>
        <Text style={styles.exploreMapEyebrow}>MANGOMAP 지도</Text>
        <Text style={styles.exploreMapTitle}>{city}에서 바로 비교</Text>
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
          <Text style={styles.exploreMapCardMeta}>{getDisplayCategory(focusedPlace.category)} · {formatRating(focusedPlace.rating)} · 망고맵 후기 {getMangoReviewCount(focusedPlace)}개</Text>
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
        {places.slice(0, 5).map((place) => (
          <Pressable key={place.id} style={[styles.exploreMapListItem, focusedPlace?.id === place.id && styles.exploreMapListItemActive]} onPress={() => setFocusedPlaceId(place.id)}>
            <Text style={styles.exploreMapListName} numberOfLines={1}>{place.name}</Text>
            <Text style={styles.exploreMapListMeta}>{getDisplayCategory(place.category)} · 후기 {getMangoReviewCount(place)}개</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PlaceDetail({
  place,
  saved,
  comments,
  commentDraft,
  commentRating,
  onChangeComment,
  onChangeCommentRating,
  onBack,
  onToggleSaved,
  onOpenMap,
  onOpenGoogleMaps,
  onSubmitComment
}: {
  place: CuratedPlace;
  saved: boolean;
  comments: PlaceComment[];
  commentDraft: string;
  commentRating: number;
  onChangeComment: (value: string) => void;
  onChangeCommentRating: (value: number) => void;
  onBack: () => void;
  onToggleSaved: () => void;
  onOpenMap: () => void;
  onOpenGoogleMaps: () => void;
  onSubmitComment: () => void;
}) {
  const defaultComments = useMemo(() => buildDefaultComments(place), [place]);
  const allComments = useMemo(() => [...comments, ...defaultComments], [comments, defaultComments]);
  const displayRating = useMemo(() => getDisplayRatingFromComments(place, allComments), [place, allComments]);
  const reviewBreakdown = useMemo(() => getRatingBreakdown(allComments), [allComments]);
  const galleryImages = useMemo(() => getPlaceImageUrls(place), [place]);
  const introParagraphs = useMemo(() => buildPlaceLongIntro(place), [place]);
  const featureBullets = useMemo(() => buildPlaceFeatures(place), [place]);
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
        <View style={styles.detailLinkRow}>
          <Pressable onPress={onOpenMap}><Text style={styles.detailLink}>지도에서 보기</Text></Pressable>
          <Pressable onPress={onOpenGoogleMaps}><Text style={styles.detailLink}>구글맵 열기</Text></Pressable>
        </View>
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
              <Text style={styles.detailRailPrimaryText}>MANGOMAP 지도에서 보기</Text>
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
              <Text style={styles.commentName}>{comment.memberName}</Text>
              <RatingDots rating={comment.rating ?? place.rating ?? 4.6} small />
              <Text style={styles.commentMessage}>{comment.message}</Text>
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
  return (
    <View style={[styles.ratingLine, compact && styles.ratingLineCompact]}>
      <Text style={[styles.ratingNumber, large && styles.ratingNumberLarge]}>{formatRating(displayRating)}</Text>
      <RatingDots rating={displayRating} small={compact} />
      <Text style={[styles.ratingReviews, large && styles.ratingReviewsLarge]}>({formatCount(mangoReviewCount)})</Text>
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
  const baseRating = Math.max(3, Math.min(5, Math.round(place.rating ?? 4.6)));
  const comments = [
    {
      message: `${place.area ?? place.city} 일정 중간에 넣기 좋아요. ${place.bestTime[0] ?? "방문 전"} 시간대 추천합니다.`,
      rating: baseRating
    },
    {
      message: `처음 가도 주문이나 동선이 크게 어렵지 않았어요. 피크 시간만 피하면 더 편합니다.`,
      rating: Math.max(3, baseRating - 1)
    },
    {
      message: place.koreanReviewSignal?.summary ?? "망고단 기준으로 저장해둘 만한 후보예요.",
      rating: baseRating
    }
  ];
  return comments.map((comment, index) => ({
    id: `default-${place.id}-${index}`,
    placeId: place.id,
    memberName: index === 0 ? "망고단" : "여행자",
    message: comment.message,
    createdAt: new Date().toISOString(),
    rating: comment.rating
  }));
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
  return count > 0 ? `망고맵 후기 ${count}개 기준` : "망고맵 후기 대기";
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
  const times = place.bestTime.length > 0 ? place.bestTime.join("이나 ") : "식사 전후";
  const tags = place.tags.slice(0, 4).join(" · ");
  const tip = cleanPlaceCopy(place.koreanTip);
  const categoryIntro =
    place.category === "바/루프탑"
      ? "야경과 분위기를 같이 챙기고 싶은 날에 어울리는 곳이에요. 해가 지는 시간대에 가면 사진과 대화 흐름이 자연스럽고, 2차 장소로도 쓰기 좋습니다."
      : place.category === "카페"
        ? "더운 오후에 쉬어가기 좋은 카페 후보예요. 사진을 남기거나 잠깐 작업하기 좋은 동선인지, 좌석과 소음 분위기를 같이 보고 고르면 실패 확률이 낮아요."
        : place.category === "마사지"
          ? "이동이 많았던 날 컨디션을 회복하기 좋은 스팟이에요. 예약 가능 여부와 코스 시간을 먼저 확인하면 일정이 꼬이지 않습니다."
          : place.category === "맛집"
            ? "여행 중 식사 동선에 넣기 좋은 맛집 후보예요. 메뉴 선택이 어렵다면 대표 메뉴와 최근 사진을 먼저 보고, 피크 시간대 웨이팅까지 감안해서 움직이는 편이 좋습니다."
            : "여행 동선 중간에 넣어두기 좋은 장소예요. 방문 목적과 이동 시간을 같이 맞춰보면 일정 완성도가 올라갑니다.";

  return [
    cleanPlaceCopy(place.oneLine),
    `${area} 근처에서 ${times}에 들르기 좋은 후보입니다. ${categoryIntro}`,
    `${tip || "동선과 분위기를 함께 보고 고르면 실패 확률이 낮은 장소예요."} ${tags ? `${tags} 포인트를 함께 확인해보세요.` : "저장해두고 근처에 있을 때 다시 확인하기 좋아요."}`
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

function getDisplayCategory(category: CuratedPlace["category"]) {
  return category === "사진명소" ? "관광명소" : category;
}

function scorePlace(place: CuratedPlace) {
  return (place.rating ?? 4.3) * 100 + (place.userRatingCount ?? 0) / 100 + getMangoRecommendationCount(place);
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
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#FFE1A6",
    padding: 18,
    gap: 16,
    ...shadow
  },
  searchPanelDesktop: {
    padding: 22
  },
  searchBox: {
    minHeight: 62,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F4D894",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10
  },
  searchIcon: { fontSize: 28, color: colors.muted, fontWeight: "900" },
  searchInput: { flex: 1, fontSize: 18, color: colors.ink, fontWeight: "900" },
  cityTabs: { gap: 10, paddingRight: 16 },
  cityPill: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D7A8",
    backgroundColor: "#FFF9E8"
  },
  cityPillActive: { backgroundColor: colors.cyan },
  cityPillText: { color: colors.muted, fontSize: 15, fontWeight: "900" },
  cityPillTextActive: { color: "#271400" },
  filterTabs: { gap: 14, paddingRight: 16 },
  filterPill: { alignItems: "center", gap: 7, minWidth: 70 },
  filterPillActive: {},
  filterIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    textAlign: "center",
    lineHeight: 58,
    overflow: "hidden",
    backgroundColor: "#FFF2CE",
    borderWidth: 1,
    borderColor: "#FFD67D",
    fontSize: 25
  },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: "900" },
  filterTextActive: { color: "#1F2937" },
  topFilterBar: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    marginBottom: 4,
    overflow: "hidden"
  },
  exploreDesktopLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 28
  },
  exploreDesktopList: {
    flex: 1,
    minWidth: 0
  },
  exploreMapPanel: {
    width: 390,
    marginTop: 28,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F0D89A",
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 14,
    ...shadow
  },
  exploreMapHeader: { gap: 4 },
  exploreMapEyebrow: { color: "#A87813", fontSize: 13, fontWeight: "900" },
  exploreMapTitle: { color: colors.ink, fontSize: 24, fontWeight: "900" },
  exploreMapCanvas: {
    height: 260,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#F0D89A"
  },
  exploreMapImage: { width: "100%", height: "100%" },
  exploreMapEmpty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  exploreMapEmptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  exploreMapEmptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center", fontWeight: "800" },
  exploreMapFallback: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FEF3C7"
  },
  exploreMapGrid: {
    position: "absolute",
    top: -30,
    right: -80,
    bottom: -30,
    left: -80,
    opacity: 0.55,
    backgroundColor: "#FFF7DF",
    borderWidth: 28,
    borderColor: "#FFE3A5",
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
    backgroundColor: "#063F28"
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
    borderColor: "#F0D89A"
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
    borderRadius: 20,
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F0D89A",
    padding: 14,
    gap: 8
  },
  exploreMapCardName: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: "900" },
  exploreMapCardMeta: { color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: "800" },
  exploreMapCardActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  exploreMapPrimaryButton: { flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
  exploreMapPrimaryText: { color: "#271400", fontSize: 14, fontWeight: "900" },
  exploreMapGhostButton: { minWidth: 86, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: "#063F28", alignItems: "center", justifyContent: "center" },
  exploreMapGhostText: { color: "#063F28", fontSize: 14, fontWeight: "900" },
  exploreMapList: { gap: 8 },
  exploreMapListItem: { borderRadius: 16, padding: 12, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#EEF2F7" },
  exploreMapListItemActive: { backgroundColor: "#FFF2CE", borderColor: colors.cyan },
  exploreMapListName: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  exploreMapListMeta: { color: colors.muted, fontSize: 12, marginTop: 4, fontWeight: "800" },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#1C5A3B",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#FFFFFF"
  },
  outlineButtonWide: {
    borderWidth: 1,
    borderColor: "#1C5A3B",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#FFFFFF"
  },
  outlineButtonText: { color: "#0B3D27", fontSize: 15, fontWeight: "900" },
  sectionBlock: {
    marginTop: 28
  },
  sectionTitle: { color: colors.ink, fontSize: 30, fontWeight: "900", letterSpacing: 0 },
  sectionCopy: { color: colors.muted, fontSize: 18, lineHeight: 28, marginTop: 8, fontWeight: "800" },
  carouselTrack: { gap: 22, paddingVertical: 18, paddingRight: 28 },
  heroCard: { width: 250 },
  heroImage: { width: "100%", height: 290, justifyContent: "space-between", padding: 12 },
  heroImageRadius: { borderRadius: 18 },
  photoEmpty: {
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F0D89A",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  photoEmptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  photoEmptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", fontWeight: "800" },
  saveBubble: {
    alignSelf: "flex-end",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  saveBubbleText: { color: "#063F28", fontSize: 32, fontWeight: "900" },
  awardBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.cyan,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  awardBadgeText: { color: "#271400", fontSize: 13, fontWeight: "900" },
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
    fontWeight: "900"
  },
  heroTitle: { color: colors.ink, fontSize: 24, lineHeight: 30, marginTop: 8, fontWeight: "900" },
  ratingLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  ratingLineCompact: { marginTop: 4 },
  ratingNumber: { color: "#063F28", fontSize: 18, fontWeight: "900" },
  ratingNumberLarge: { fontSize: 22 },
  ratingReviews: { color: "#063F28", fontSize: 16, fontWeight: "800" },
  ratingReviewsLarge: { fontSize: 18 },
  dots: { flexDirection: "row", gap: 3, alignItems: "center" },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#009A44" },
  dotSmall: { width: 11, height: 11, borderRadius: 6 },
  dotFull: { backgroundColor: "#009A44" },
  dotEmpty: { backgroundColor: "#FFFFFF" },
  heroMeta: { color: colors.ink, fontSize: 17, lineHeight: 25, marginTop: 7, fontWeight: "700" },
  popularList: { gap: 22, marginTop: 18 },
  popularRow: { flexDirection: "row", gap: 16, minHeight: 145, position: "relative" },
  popularImage: { width: 145, height: 145, borderRadius: 14, backgroundColor: "#F3F4F6" },
  photoEmptySmall: { alignItems: "center", justifyContent: "center", padding: 10, borderWidth: 1, borderColor: "#F0D89A", backgroundColor: "#FFF8E6" },
  photoEmptySmallText: { color: colors.muted, fontSize: 12, lineHeight: 16, textAlign: "center", fontWeight: "900" },
  popularBody: { flex: 1, paddingRight: 28 },
  guideBadgeSmall: { color: "#D43F53", fontSize: 13, fontWeight: "900", marginBottom: 4 },
  popularTitle: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: "900" },
  popularMeta: { color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: 5, fontWeight: "700" },
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
  rowSaveText: { color: "#063F28", fontSize: 25, fontWeight: "900" },
  allButton: {
    minHeight: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: "#063F28",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
    backgroundColor: "#FFFFFF"
  },
  allButtonText: { color: "#063F28", fontSize: 20, fontWeight: "900" },
  floatingMapButton: {
    position: "absolute",
    bottom: 88,
    alignSelf: "center",
    minWidth: 150,
    minHeight: 64,
    borderRadius: 34,
    backgroundColor: "#063F28",
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  floatingMapText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
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
  detailLinkRow: { flexDirection: "row", gap: 24, marginTop: 16, flexWrap: "wrap" },
  detailLink: { color: "#063F28", fontSize: 18, fontWeight: "900", textDecorationLine: "underline" },
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
  commentCard: { flexDirection: "row", gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#EEF2F7" },
  commentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF1C2", alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: "#063F28", fontSize: 18, fontWeight: "900" },
  commentBody: { flex: 1 },
  commentName: { color: "#063F28", fontSize: 18, fontWeight: "900" },
  commentMessage: { color: colors.ink, fontSize: 17, lineHeight: 27, marginTop: 8, fontWeight: "700" }
});
