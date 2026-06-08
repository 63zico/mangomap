import { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { BottomNav } from "./src/components/BottomNav";
import { AuthRequiredScreen as AuthGateScreen } from "./src/components/AuthRequiredScreen";
import { WelcomePopup } from "./src/components/WelcomePopup";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PlannerFormScreen } from "./src/screens/PlannerFormScreen";
import { PlanScreen } from "./src/screens/PlanScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { PlacesScreen } from "./src/screens/PlacesScreen";
import { DuringTripScreen } from "./src/screens/DuringTripScreen";
import { MarketplaceScreen } from "./src/screens/MarketplaceScreen";
import { SavedTripsScreen } from "./src/screens/SavedTripsScreen";
import { MyScreen } from "./src/screens/MyScreen";
import { generateItinerary, recomputeItinerary } from "./src/services/itineraryService";
import { createFallbackLiveInfo, loadLiveTravelInfo } from "./src/services/liveInfoService";
import { createInitialGooglePlacesState } from "./src/services/googlePlacesService";
import { convertCuratedPlaceToPlanPlace, getReplacementCandidates } from "./src/services/placeReplacementService";
import { curatedPlaces } from "./src/data/places";
import { loadSavedPlaceIds, savePlaceIds } from "./src/storage/savedPlaces";
import { loadSavedTrips, saveTrip } from "./src/storage/savedTrips";
import { deletePlaceReport, loadPlaceReports, savePlaceReport } from "./src/storage/placeReports";
import { requestMemberAccountDeletion, syncMemberProfileToSupabase } from "./src/storage/memberProfiles";
import { consumeSupabaseOAuthRedirect } from "./src/services/supabaseAuthService";
import { clearSupabaseSession } from "./src/services/supabaseClient";
import { consumePendingLegalConsent, createLegalConsent } from "./src/config/legal";
import type { AuthJoinPayload, MemberProfile } from "./src/types/auth";
import type { CuratedPlace, Destination, GooglePlacesState, Itinerary, LiveTravelInfo, PlacePlan, PlaceReport, PlannerInput, SavedTrip, ScreenName } from "./src/types";

const initialInput: PlannerInput = {
  destination: "호치민",
  duration: "2박3일",
  companion: "커플",
  budget: "보통",
  preferences: ["맛집", "카페", "마사지", "야경"],
  style: "반반",
  accommodationArea: "1군/벤탄시장",
  arrivalTime: "오후 도착",
  departureTime: "밤 출국",
  mustVisit: "",
  avoid: ""
};

const tabScreens: ScreenName[] = ["places", "home", "saved", "my"];
const welcomeStorageKey = "mangomap-welcome-seen-v1";
const memberStorageKey = "tripbuddy-member-profile-v1";
const memberTemperatureStorageKey = "tripbuddy-member-temperature-v1";
const defaultMemberTemperature = 36.5;

type AuthPrompt = {
  title: string;
  copy: string;
};

type TravelEntryMode = "all" | "mine";
type MarketplaceEntryMode = "all" | "trading";

function loadWelcomeSeen() {
  if (Platform.OS !== "web") return false;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  return storage?.getItem(welcomeStorageKey) === "true";
}

function saveWelcomeSeen() {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  storage?.setItem(welcomeStorageKey, "true");
}

function normalizeMemberProfile(profile: Partial<MemberProfile> & { id?: string; nickname?: string }): MemberProfile | undefined {
  if (!profile.nickname) return undefined;

  return {
    id: profile.id ?? `member-${Date.now()}`,
    authUid: profile.authUid,
    nickname: profile.nickname,
    provider: profile.provider ?? "nickname",
    phone: profile.phone,
    phoneVerifiedAt: profile.phoneVerifiedAt,
    email: profile.email,
    avatarUri: profile.avatarUri,
    bio: profile.bio,
    homeBase: profile.homeBase,
    travelStyle: profile.travelStyle,
    interestTags: profile.interestTags ?? [],
    verifiedAt: profile.verifiedAt ?? new Date().toISOString(),
    termsAcceptedAt: profile.termsAcceptedAt,
    termsVersion: profile.termsVersion,
    privacyVersion: profile.privacyVersion,
    accountStatus: profile.accountStatus ?? "active",
    deletionRequestedAt: profile.deletionRequestedAt
  };
}

function loadMemberProfile(): MemberProfile | undefined {
  if (Platform.OS !== "web") return undefined;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return undefined;

  try {
    const rawValue = storage.getItem(memberStorageKey);
    return rawValue ? normalizeMemberProfile(JSON.parse(rawValue) as Partial<MemberProfile>) : undefined;
  } catch {
    return undefined;
  }
}

function saveMemberProfile(profile: MemberProfile) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  const normalizedProfile = normalizeMemberProfile(profile);
  if (normalizedProfile) storage?.setItem(memberStorageKey, JSON.stringify(normalizedProfile));
}

function clearMemberProfile() {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  storage?.removeItem(memberStorageKey);
}

function normalizeTemperature(value: number) {
  return Math.min(60, Math.max(20, Math.round(value * 10) / 10));
}

function loadMemberTemperature() {
  if (Platform.OS !== "web") return defaultMemberTemperature;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return defaultMemberTemperature;

  try {
    const rawValue = storage.getItem(memberTemperatureStorageKey);
    const parsedValue = rawValue ? Number(rawValue) : defaultMemberTemperature;
    return Number.isFinite(parsedValue) ? normalizeTemperature(parsedValue) : defaultMemberTemperature;
  } catch {
    return defaultMemberTemperature;
  }
}

function saveMemberTemperature(value: number) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  storage?.setItem(memberTemperatureStorageKey, String(normalizeTemperature(value)));
}

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("places");
  const [showWelcomePopup, setShowWelcomePopup] = useState(() => !loadWelcomeSeen());
  const [plannerInput, setPlannerInput] = useState<PlannerInput>(initialInput);
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary>(() => generateItinerary(initialInput));
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [prefillDestination, setPrefillDestination] = useState<Destination | undefined>();
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<string[]>([]);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState<string[]>([]);
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);
  const [placeReports, setPlaceReports] = useState<PlaceReport[]>([]);
  const [liveInfo, setLiveInfo] = useState<LiveTravelInfo>(() => createFallbackLiveInfo(initialInput.destination));
  const [googlePlaces, setGooglePlaces] = useState<GooglePlacesState>(() => createInitialGooglePlacesState(initialInput.destination));
  const [exploreFilterId, setExploreFilterId] = useState<string | undefined>();
  const [exploreDestination, setExploreDestination] = useState<Destination | undefined>();
  const [placeReportOpenRequest, setPlaceReportOpenRequest] = useState(0);
  const [mapFocusPlace, setMapFocusPlace] = useState<CuratedPlace | undefined>();
  const [memberProfile, setMemberProfile] = useState<MemberProfile | undefined>(() => loadMemberProfile());
  const [memberTemperature, setMemberTemperature] = useState(() => loadMemberTemperature());
  const [authPrompt, setAuthPrompt] = useState<AuthPrompt | undefined>();
  const [travelEntryMode, setTravelEntryMode] = useState<TravelEntryMode>("all");
  const [marketplaceEntryMode, setMarketplaceEntryMode] = useState<MarketplaceEntryMode>("all");
  const [tabBadges, setTabBadges] = useState<Partial<Record<ScreenName, number>>>({});
  const myPlaceReports = useMemo(() => {
    const reporterIds = [memberProfile?.authUid, memberProfile?.id].filter(Boolean);
    if (reporterIds.length === 0) return placeReports;
    return placeReports.filter((report) => Boolean(report.reporterId) && reporterIds.includes(report.reporterId));
  }, [memberProfile?.authUid, memberProfile?.id, placeReports]);

  useEffect(() => {
    loadSavedTrips().then(setSavedTrips).catch(() => setSavedTrips([]));
    loadSavedPlaceIds().then(setSavedPlaceIds).catch(() => setSavedPlaceIds([]));
  }, []);

  useEffect(() => {
    loadPlaceReports().then(setPlaceReports).catch(() => setPlaceReports([]));
  }, [memberProfile?.authUid, memberProfile?.id]);

  useEffect(() => {
    let active = true;
    setLiveInfo(createFallbackLiveInfo(plannerInput.destination));
    setGooglePlaces({
      ...createInitialGooglePlacesState(plannerInput.destination),
      message: "저장된 MANGOMAP 장소 DB를 우선 사용해요."
    });

    loadLiveTravelInfo(plannerInput.destination)
      .then((info) => {
        if (active) setLiveInfo(info);
      })
      .catch(() => {
        if (active) setLiveInfo(createFallbackLiveInfo(plannerInput.destination));
      });

    return () => {
      active = false;
    };
  }, [plannerInput.destination]);

  const showBottomNav = useMemo(() => tabScreens.includes(screen), [screen]);

  const openPlanner = (destination?: Destination) => {
    setPrefillDestination(destination);
    setScreen("planner");
  };

  const openPlaces = (filterId?: string, destination?: Destination) => {
    setExploreFilterId(filterId);
    setExploreDestination(destination);
    setScreen("places");
  };

  const openTravel = (entryMode: TravelEntryMode = "all") => {
    setTravelEntryMode(entryMode);
    setScreen("travel");
  };

  const openMarketplace = (entryMode: MarketplaceEntryMode = "all") => {
    setMarketplaceEntryMode(entryMode);
    setScreen("marketplace");
  };

  const openPlaceReport = () => {
    setExploreFilterId(undefined);
    setExploreDestination(undefined);
    setPlaceReportOpenRequest((current) => current + 1);
    setScreen("places");
  };

  const openHomeMapForPlace = (place: CuratedPlace) => {
    setMapFocusPlace(place);
    setScreen("home");
  };

  const changeTab = (nextScreen: ScreenName) => {
    setTabBadges((current) => ({ ...current, [nextScreen]: 0 }));
    if (nextScreen !== "home") setMapFocusPlace(undefined);
    if (nextScreen === "home" && screen !== "home") setMapFocusPlace(undefined);
    if (nextScreen === "travel") setTravelEntryMode("all");
    if (nextScreen === "marketplace") setMarketplaceEntryMode("all");
    if (nextScreen === "places") {
      setExploreFilterId(undefined);
      setExploreDestination(undefined);
    }
    setAuthPrompt(undefined);
    setScreen(nextScreen);
  };

  const closeWelcomePopup = () => {
    saveWelcomeSeen();
    setShowWelcomePopup(false);
  };

  const openWelcomeMap = () => {
    closeWelcomePopup();
    setScreen("places");
  };

  const openWelcomePopularPlaces = () => {
    closeWelcomePopup();
    openPlaces("all", plannerInput.destination);
  };

  const openWelcomeJoin = () => {
    closeWelcomePopup();
    setAuthPrompt({
      title: "MANGOMAP 시작하기",
      copy: "지도와 장소 탐색은 바로 볼 수 있고, 저장·한국어 후기·장소 제보는 카카오 또는 Google 로그인 후 사용할 수 있어요."
    });
  };

  const joinWithAuth = (payload: AuthJoinPayload) => {
    const consent = payload.termsAcceptedAt
      ? {
        termsAcceptedAt: payload.termsAcceptedAt,
        termsVersion: payload.termsVersion,
        privacyVersion: payload.privacyVersion
      }
      : consumePendingLegalConsent() ?? createLegalConsent();
    const profile: MemberProfile = {
      id: payload.authUid ?? `${payload.provider}-${Date.now()}`,
      authUid: payload.authUid,
      nickname: payload.nickname,
      provider: payload.provider,
      phone: payload.phone,
      phoneVerifiedAt: undefined,
      email: payload.email,
      verifiedAt: new Date().toISOString(),
      termsAcceptedAt: consent.termsAcceptedAt,
      termsVersion: consent.termsVersion,
      privacyVersion: consent.privacyVersion,
      accountStatus: "active"
    };
    saveMemberProfile(profile);
    syncMemberProfileToSupabase(profile, memberTemperature).catch(() => undefined);
    setMemberProfile(profile);
    setAuthPrompt(undefined);
  };

  useEffect(() => {
    consumeSupabaseOAuthRedirect().then((payload) => {
      if (payload) joinWithAuth(payload);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const badgeHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ screen?: ScreenName; count?: number }>).detail;
      if (!detail?.screen) return;
      setTabBadges((current) => ({
        ...current,
        [detail.screen as ScreenName]: Math.max(0, detail.count ?? 0)
      }));
    };
    globalThis.addEventListener?.("mangomap:tab-badge", badgeHandler as EventListener);
    return () => globalThis.removeEventListener?.("mangomap:tab-badge", badgeHandler as EventListener);
  }, []);

  const logoutMember = () => {
    clearMemberProfile();
    clearSupabaseSession();
    setMemberProfile(undefined);
  };

  const deleteMemberAccount = async () => {
    const currentProfile = memberProfile;
    if (currentProfile) {
      const deletionRequestedAt = new Date().toISOString();
      const deletionProfile = {
        ...currentProfile,
        accountStatus: "deletion_requested" as const,
        deletionRequestedAt
      };
      saveMemberProfile(deletionProfile);
      await requestMemberAccountDeletion(deletionProfile, deletionRequestedAt).catch(() => undefined);
    }

    clearMemberProfile();
    clearSupabaseSession();
    setMemberProfile(undefined);
  };

  const updateMemberProfile = (updates: Partial<MemberProfile>) => {
    setMemberProfile((current) => {
      if (!current) return current;
      const nextProfile = {
        ...current,
        ...updates,
        nickname: updates.nickname?.trim() || current.nickname,
        interestTags: updates.interestTags ?? current.interestTags ?? []
      };
      saveMemberProfile(nextProfile);
      syncMemberProfileToSupabase(nextProfile, memberTemperature).catch(() => undefined);
      return nextProfile;
    });
  };

  const updateMemberTemperature = (delta: number) => {
    setMemberTemperature((current) => {
      const next = normalizeTemperature(current + delta);
      saveMemberTemperature(next);
      if (memberProfile) syncMemberProfileToSupabase(memberProfile, next).catch(() => undefined);
      return next;
    });
  };

  const handleGenerate = (input: PlannerInput) => {
    const itinerary = generateItinerary(input);
    setPlannerInput(input);
    setCurrentItinerary(itinerary);
    setSelectedDay(1);
    setVisitedPlaceIds([]);
    setScreen("plan");
  };

  const handleSave = async () => {
    const nextTrip: SavedTrip = {
      id: `${Date.now()}`,
      title: `${plannerInput.destination} ${plannerInput.duration}`,
      createdAt: new Date().toISOString(),
      input: plannerInput,
      itinerary: currentItinerary
    };

    const nextTrips = await saveTrip(nextTrip);
    setSavedTrips(nextTrips);
  };

  const selectSavedTrip = (trip: SavedTrip) => {
    setPlannerInput(trip.input);
    setCurrentItinerary(trip.itinerary);
    setSelectedDay(1);
    setScreen("plan");
  };

  const toggleVisited = (placeId: string) => {
    setVisitedPlaceIds((current) =>
      current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId]
    );
  };

  const toggleFavorite = (placeId: string) => {
    setFavoritePlaceIds((current) =>
      current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId]
    );
  };

  const toggleSavedPlace = async (placeId: string) => {
    const nextIds = savedPlaceIds.includes(placeId) ? savedPlaceIds.filter((id) => id !== placeId) : [placeId, ...savedPlaceIds];
    setSavedPlaceIds(nextIds);
    await savePlaceIds(nextIds);
  };

  const submitPlaceReport = async (report: PlaceReport) => {
    const isNewReport = !placeReports.some((candidate) => candidate.id === report.id);
    const nextReports = await savePlaceReport({
      ...report,
      reporterId: memberProfile?.authUid ?? memberProfile?.id ?? report.reporterId
    });
    setPlaceReports(nextReports);
    if (memberProfile && isNewReport) updateMemberTemperature(0.3);
  };

  const removePlaceReport = async (reportId: string) => {
    const nextReports = await deletePlaceReport(reportId);
    setPlaceReports(nextReports);
  };

  const removePlace = (dayNumber: number, placeId: string) => {
    setCurrentItinerary((current) => {
      const next = {
        ...current,
        days: current.days.map((day) =>
          day.day === dayNumber ? { ...day, places: day.places.filter((place) => place.id !== placeId) } : day
        )
      };
      return recomputeItinerary(next, plannerInput);
    });
  };

  const replacePlace = (dayNumber: number, placeId: string) => {
    setCurrentItinerary((current) => {
      const next = {
        ...current,
        days: current.days.map((day) =>
          day.day === dayNumber
            ? {
                ...day,
                places: day.places.map((place) => (place.id === placeId ? createSmartReplacementPlace(place, plannerInput) : place))
              }
            : day
        )
      };
      return recomputeItinerary(next, plannerInput);
    });
  };

  const replacePlaceWith = (dayNumber: number, placeId: string, replacement: string) => {
    setCurrentItinerary((current) => {
      const next = {
        ...current,
        days: current.days.map((day) =>
          day.day === dayNumber
            ? {
                ...day,
                places: day.places.map((place) => (place.id === placeId ? createSmartReplacementPlace(place, plannerInput, replacement) : place))
              }
            : day
        )
      };
      return recomputeItinerary(next, plannerInput);
    });
  };

  const optimizeForWeather = () => {
    setCurrentItinerary((current) => {
      const next = {
        ...current,
        days: current.days.map((day) =>
          day.day === selectedDay
            ? {
                ...day,
                places: day.places.map((place) => (shouldWeatherReplace(place) ? createWeatherSafePlace(place) : place))
              }
            : day
        )
      };
      return recomputeItinerary(next, plannerInput);
    });
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        {screen === "home" && (
          <HomeScreen
            input={plannerInput}
            itinerary={currentItinerary}
            liveInfo={liveInfo}
            googlePlaces={googlePlaces}
            selectedDay={selectedDay}
            visitedPlaceIds={visitedPlaceIds}
            onStartPlanner={openPlanner}
            onOpenPlan={() => setScreen("plan")}
            onOpenPlaces={openPlaces}
            onOpenTravel={() => openTravel()}
            onOpenMarketplace={() => openMarketplace()}
            onOpenReport={openPlaceReport}
            onSubmitPlaceReport={submitPlaceReport}
            memberId={memberProfile?.authUid ?? memberProfile?.id}
            onRequireAuth={() =>
              setAuthPrompt({
                title: "MANGOMAP 제보 참여",
                copy: "장소 제보와 정보 수정 요청은 검토 상태를 남겨야 해서 카카오 또는 Google 로그인 후 사용할 수 있어요."
              })
            }
            focusedPlace={mapFocusPlace}
          />
        )}
        {screen === "planner" && (
          <PlannerFormScreen initialDestination={prefillDestination} onBack={() => setScreen("home")} onGenerate={handleGenerate} />
        )}
        {screen === "plan" && (
          <PlanScreen
            input={plannerInput}
            itinerary={currentItinerary}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onSave={handleSave}
            visitedPlaceIds={visitedPlaceIds}
            favoritePlaceIds={favoritePlaceIds}
            liveInfo={liveInfo}
            onToggleVisited={toggleVisited}
            onToggleFavorite={toggleFavorite}
            onRemovePlace={removePlace}
            onReplacePlace={replacePlace}
            onReplacePlaceWith={replacePlaceWith}
            getReplacementOptions={(place) => getReplacementCandidates(place, plannerInput, 6)}
            onOptimizeForWeather={optimizeForWeather}
          />
        )}
        {screen === "map" && <MapScreen itinerary={currentItinerary} selectedDay={selectedDay} input={plannerInput} onSelectDay={setSelectedDay} />}
        {screen === "places" && (
          <PlacesScreen
            input={plannerInput}
            liveInfo={liveInfo}
            savedPlaceIds={savedPlaceIds}
            placeReports={placeReports}
            onToggleSavedPlace={toggleSavedPlace}
            onSubmitPlaceReport={submitPlaceReport}
            onRemovePlaceReport={removePlaceReport}
            initialFilterId={exploreFilterId}
            initialDestination={exploreDestination}
            reportOpenRequest={placeReportOpenRequest}
            memberId={memberProfile?.authUid ?? memberProfile?.id}
            memberName={memberProfile?.nickname}
            onMangoTemperatureChange={updateMemberTemperature}
            onRequireAuth={() =>
              setAuthPrompt({
                title: "망고단 참여는 가입 후 가능해요",
                copy: "장소 추천과 댓글은 여행자 신뢰 정보라 카카오 또는 Google 로그인 후 남길 수 있어요."
              })
            }
            onOpenMapPlace={openHomeMapForPlace}
          />
        )}
        {screen === "travel" && (
          <DuringTripScreen
            input={plannerInput}
            itinerary={currentItinerary}
            selectedDay={selectedDay}
            visitedPlaceIds={visitedPlaceIds}
            liveInfo={liveInfo}
            memberId={memberProfile?.authUid ?? memberProfile?.id}
            memberName={memberProfile?.nickname}
            entryMode={travelEntryMode}
            onRequireAuth={() =>
              setAuthPrompt({
                title: "모임 참여는 가입 후 가능해요",
                copy: "모임 목록은 볼 수 있고, 방입장/모임 만들기/대화는 카카오 또는 Google 로그인 후 사용할 수 있어요."
              })
            }
            onOpenMap={() => setScreen("map")}
            onOpenPlan={() => setScreen("plan")}
          />
        )}
        {screen === "marketplace" && (
          <MarketplaceScreen
            input={plannerInput}
            memberId={memberProfile?.authUid ?? memberProfile?.id}
            memberName={memberProfile?.nickname}
            memberTemperature={memberTemperature}
            entryMode={marketplaceEntryMode}
            onRequireAuth={() =>
              setAuthPrompt({
                title: "중고장터 참여는 가입 후 가능해요",
                copy: "물건 목록은 볼 수 있고, 판매글 올리기와 거래문의 1:1 대화는 카카오 또는 Google 로그인 후 사용할 수 있어요."
              })
            }
          />
        )}
        {screen === "saved" && (
          <SavedTripsScreen
            trips={savedTrips}
            savedPlaces={curatedPlaces.filter((place) => savedPlaceIds.includes(place.id))}
            onBack={() => setScreen("home")}
            onSelect={selectSavedTrip}
            onToggleSavedPlace={toggleSavedPlace}
          />
        )}
        {screen === "my" && (
          <MyScreen
            savedPlaceCount={savedPlaceIds.length}
            placeReports={myPlaceReports}
            memberProfile={memberProfile}
            memberName={memberProfile?.nickname}
            memberProvider={memberProfile?.provider}
            memberIdentity={memberProfile?.phone ?? memberProfile?.email}
            memberTemperature={memberTemperature}
            onOpenSaved={() => setScreen("saved")}
            onOpenPlaces={() => openPlaces()}
            onOpenReport={openPlaceReport}
            onOpenMeetups={() => openTravel("mine")}
            onOpenMarketplace={() => openMarketplace("trading")}
            onRequireAuth={() =>
              setAuthPrompt({
                title: "MANGOMAP 가입하기",
                copy: "지도와 장소 탐색은 바로 볼 수 있고, 프로필·저장·한국어 후기·장소 제보는 인증 후 사용할 수 있어요."
              })
            }
            onUpdateProfile={updateMemberProfile}
            onLogout={logoutMember}
            onDeleteAccount={deleteMemberAccount}
          />
        )}
        {showBottomNav ? <BottomNav active={screen} onChange={changeTab} badges={tabBadges} /> : null}
        {showWelcomePopup ? (
          <WelcomePopup
            onExploreMap={openWelcomeMap}
            onOpenPopularPlaces={openWelcomePopularPlaces}
            onJoin={openWelcomeJoin}
            onClose={closeWelcomePopup}
          />
        ) : null}
        {authPrompt ? <AuthGateScreen title={authPrompt.title} copy={authPrompt.copy} onJoin={joinWithAuth} onClose={() => setAuthPrompt(undefined)} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

function createReplacementPlace(place: PlacePlan, forcedReplacement?: string): PlacePlan {
  if (!forcedReplacement) return place;
  const replacement = forcedReplacement;
  return {
    ...place,
    id: `${place.id}-alt-${Date.now()}`,
    placeName: replacement,
    description: `${place.placeName} 대신 넣은 대체 코스예요.`,
    mapQuery: `${replacement} Vietnam`,
    googleMapsUri: undefined,
    fitReason: "사용자가 원래 장소를 대체해서 더 취향에 맞게 조정한 코스예요.",
    localTip: "실제 방문 전 Google Maps 평점과 영업시간을 확인하세요.",
    warning: undefined
  };
}

function createSmartReplacementPlace(place: PlacePlan, input: PlannerInput, forcedReplacement?: string): PlacePlan {
  const candidates = getReplacementCandidates(place, input, 12);
  const selectedCandidate = forcedReplacement
    ? candidates.find((candidate) => candidate.name === forcedReplacement)
    : candidates.find((candidate) => candidate.name !== place.placeName);

  if (selectedCandidate) {
    return convertCuratedPlaceToPlanPlace(place, selectedCandidate);
  }

  return createReplacementPlace(place, forcedReplacement);
}

function shouldWeatherReplace(place: PlacePlan) {
  return ["관광지", "야경", "액티비티"].includes(place.category);
}

function createWeatherSafePlace(place: PlacePlan): PlacePlan {
  const replacement = place.category === "야경" ? "실내 루프탑 라운지" : place.category === "액티비티" ? "실내 카페 + 마사지 코스" : "근처 감성 카페";
  return {
    ...createReplacementPlace(place, replacement),
    description: `비나 더위가 있을 때 ${place.placeName} 대신 넣기 좋은 실내 대체 코스예요.`,
    fitReason: "현재 날씨를 고려해서 야외 이동 부담이 적은 코스로 조정했어요.",
    rainyAlternative: "이미 날씨 대응 코스로 바꾼 일정이에요.",
    reliabilityBadge: "날씨 대응 추천",
    openingHint: "실내 코스지만 방문 전 영업시간 확인"
  };
}
