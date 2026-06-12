import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { Header } from "../components/Header";
import { PrimaryButton } from "../components/PrimaryButton";
import { formatPlaceDisplayName } from "../services/placeReplacementService";
import { colors, shadow } from "../styles/theme";
import type { CuratedPlace, Itinerary, LiveTravelInfo, PlannerInput, PlacePlan } from "../types";
import { openGoogleMapsPlace } from "../utils/googleMaps";

type PlanScreenProps = {
  input: PlannerInput;
  itinerary: Itinerary;
  selectedDay: number;
  visitedPlaceIds: string[];
  favoritePlaceIds: string[];
  liveInfo: LiveTravelInfo;
  onSelectDay: (day: number) => void;
  onSave: () => void;
  onToggleVisited: (placeId: string) => void;
  onToggleFavorite: (placeId: string) => void;
  onRemovePlace: (dayNumber: number, placeId: string) => void;
  onReplacePlace: (dayNumber: number, placeId: string) => void;
  onReplacePlaceWith: (dayNumber: number, placeId: string, replacement: string) => void;
  getReplacementOptions: (place: PlacePlan) => CuratedPlace[];
  onOptimizeForWeather: () => void;
};

export function PlanScreen({
  input,
  itinerary,
  selectedDay,
  visitedPlaceIds,
  favoritePlaceIds,
  liveInfo,
  onSelectDay,
  onSave,
  onToggleVisited,
  onToggleFavorite,
  onRemovePlace,
  onReplacePlace,
  onReplacePlaceWith,
  getReplacementOptions,
  onOptimizeForWeather
}: PlanScreenProps) {
  const day = itinerary.days.find((item) => item.day === selectedDay) ?? itinerary.days[0];

  return (
    <AppShell withBottomNav>
      <Header
        eyebrow="코스 완성"
        title={`${input.destination} ${input.duration} 실패 적은 코스`}
        subtitle={`${input.accommodationArea} 출발 기준으로 이동 순서, 비용, 지도 링크까지 정리했어요.`}
        compactMascot
      />

      <ShareableCourseCard input={input} itinerary={itinerary} day={day} onSave={onSave} />

      <View style={styles.matchCard}>
        <View style={styles.matchTop}>
          <View style={styles.matchCopy}>
            <Text style={styles.matchLabel}>맞춤 점수</Text>
            <Text style={styles.persona}>{itinerary.personalization.persona}</Text>
          </View>
          <Text style={styles.matchScore}>{itinerary.personalization.matchScore}%</Text>
        </View>
        <Text style={styles.strategy}>{itinerary.personalization.routeStrategy}</Text>
        {itinerary.personalization.highlights.map((item) => (
          <Text key={item} style={styles.highlight}>
            ✓ {item}
          </Text>
        ))}
      </View>

      <View style={styles.contextCard}>
        <InfoPill label="숙소" value={input.accommodationArea} />
        <InfoPill label="도착" value={input.arrivalTime} />
        <InfoPill label="출국" value={input.departureTime} />
      </View>

      <CourseDecisionCard input={input} day={day} liveInfo={liveInfo} />

      <View style={styles.dayTabs}>
        {itinerary.days.map((item) => (
          <Pressable
            key={item.day}
            accessibilityRole="button"
            onPress={() => onSelectDay(item.day)}
            style={[styles.dayTab, selectedDay === item.day && styles.dayTabActive]}
          >
            <Text style={[styles.dayTabText, selectedDay === item.day && styles.dayTabTextActive]}>DAY {item.day}</Text>
          </Pressable>
        ))}
      </View>

      <JourneyPreview day={day} itinerary={itinerary} selectedDay={selectedDay} onSelectDay={onSelectDay} />

      <View style={styles.summaryGrid}>
        <Summary label="예상 비용" value={day.totalCost} />
        <Summary label="이동 시간" value={day.totalMoveTime} />
        <Summary label="일정 강도" value={day.intensity} />
      </View>

      {day.routeWarning ? (
        <View style={styles.routeWarningCard}>
          <Text style={styles.routeWarningTitle}>동선 경고</Text>
          <Text style={styles.routeWarningCopy}>{day.routeWarning}</Text>
        </View>
      ) : null}

      <View style={styles.weatherActionCard}>
        <View style={styles.weatherCopy}>
          <Text style={styles.weatherTitle}>오늘 날씨 반영</Text>
          <Text style={styles.weatherText}>{getWeatherPlanCopy(liveInfo)}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onOptimizeForWeather} style={styles.weatherButton}>
          <Text style={styles.weatherButtonText}>실내로 조정</Text>
        </Pressable>
      </View>

      <View style={styles.alertCard}>
        <Text style={styles.alertTitle}>비 오면 이렇게 바꿔요</Text>
        <Text style={styles.alertCopy}>{day.rainyPlan}</Text>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planTitle}>{day.title}</Text>
        <Text style={styles.planMood}>{day.mood}</Text>
        <View style={styles.timeline}>
          {day.places.map((place, index) => (
            <PlaceTimelineItem
              key={place.id}
              input={input}
              dayNumber={day.day}
              place={place}
              isLast={index === day.places.length - 1}
              visited={visitedPlaceIds.includes(place.id)}
              favorite={favoritePlaceIds.includes(place.id)}
              onToggleVisited={() => onToggleVisited(place.id)}
              onToggleFavorite={() => onToggleFavorite(place.id)}
              onRemove={() => onRemovePlace(day.day, place.id)}
              onReplace={() => onReplacePlace(day.day, place.id)}
              onReplaceWith={(replacement) => onReplacePlaceWith(day.day, place.id, replacement)}
              replacementOptions={getReplacementOptions(place)}
            />
          ))}
        </View>
      </View>

      <View style={styles.survivalCard}>
        <Text style={styles.survivalTitle}>더 맞춤으로 만들려면</Text>
        {itinerary.personalization.improvementTips.map((tip) => (
          <Text key={tip} style={styles.mustKnow}>
            ✓ {tip}
          </Text>
        ))}
      </View>

      <PrimaryButton label="이 코스 저장하기" tone="coral" onPress={onSave} />
    </AppShell>
  );
}

function ShareableCourseCard({
  input,
  itinerary,
  day,
  onSave
}: {
  input: PlannerInput;
  itinerary: Itinerary;
  day: Itinerary["days"][number];
  onSave: () => void;
}) {
  const heroPlaces = day.places.slice(0, 4);
  const reviewRichCount = day.places.filter((place) => (place.reviewCount ?? 0) >= 500).length;
  const koreanFitAverage = Math.round(
    day.places.reduce((sum, place) => sum + (place.koreanFitScore ?? itinerary.personalization.matchScore), 0) / Math.max(day.places.length, 1)
  );

  return (
    <View style={styles.shareCard}>
      <View style={styles.shareTopRow}>
        <View style={styles.shareTitleWrap}>
          <Text style={styles.shareEyebrow}>친구한테 보낼 코스</Text>
          <Text style={styles.shareTitle}>{input.destination} DAY {day.day} 숙소 기준 코스</Text>
          <Text style={styles.shareCopy}>{input.companion} · {input.budget} · {input.style} 여행자 기준</Text>
        </View>
        <View style={styles.shareScoreBubble}>
          <Text style={styles.shareScore}>{itinerary.personalization.matchScore}</Text>
          <Text style={styles.shareScoreLabel}>맞춤</Text>
        </View>
      </View>

      <View style={styles.shareRoute}>
        {heroPlaces.map((place, index) => (
          <View key={place.id} style={styles.shareRouteItem}>
            <Text style={styles.shareRouteNumber}>{index + 1}</Text>
            <View style={styles.shareRouteCopy}>
              <Text style={styles.shareRouteTime}>{place.time} · {place.period}</Text>
              <Text style={styles.shareRouteName} numberOfLines={1}>{formatPlaceDisplayName(place.placeName)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.shareProofGrid}>
        <View style={styles.shareProofItem}>
          <Text style={styles.shareProofLabel}>후기 검증</Text>
          <Text style={styles.shareProofValue}>{reviewRichCount}곳</Text>
        </View>
        <View style={styles.shareProofItem}>
          <Text style={styles.shareProofLabel}>한국인 적합</Text>
          <Text style={styles.shareProofValue}>{koreanFitAverage}%</Text>
        </View>
        <View style={styles.shareProofItem}>
          <Text style={styles.shareProofLabel}>총 이동</Text>
          <Text style={styles.shareProofValue}>{day.totalMoveTime}</Text>
        </View>
      </View>

      <View style={styles.shareBottomRow}>
        <Text style={styles.shareHint}>이 카드 아래에서 장소별 지도, 비용, 교체 후보까지 바로 확인해요.</Text>
        <Pressable accessibilityRole="button" onPress={onSave} style={styles.shareSaveButton}>
          <Text style={styles.shareSaveText}>저장</Text>
        </Pressable>
      </View>
    </View>
  );
}

function JourneyPreview({
  day,
  itinerary,
  selectedDay,
  onSelectDay
}: {
  day: Itinerary["days"][number];
  itinerary: Itinerary;
  selectedDay: number;
  onSelectDay: (day: number) => void;
}) {
  return (
    <View style={styles.journeyCard}>
      <Text style={styles.journeyStep}>3. AI 일정 생성</Text>
      <Text style={styles.journeyTitle}>망고베트남이{"\n"}당신만의 일정을 만들었어요!</Text>

      <View style={styles.journeyTabs}>
        {itinerary.days.map((item) => (
          <Pressable
            key={item.day}
            accessibilityRole="button"
            onPress={() => onSelectDay(item.day)}
            style={[styles.journeyTab, selectedDay === item.day && styles.journeyTabActive]}
          >
            <Text style={[styles.journeyTabText, selectedDay === item.day && styles.journeyTabTextActive]}>DAY {item.day}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.journeyTimeline}>
        {day.places.map((place, index) => (
          <View key={place.id} style={styles.journeyRow}>
            <View style={styles.journeyTimeCol}>
              <Text style={styles.journeyTime}>{place.time}</Text>
            </View>
            <View style={styles.journeyLineCol}>
              <View style={[styles.journeyDot, { backgroundColor: getPeriodColor(place.period) }]} />
              {index < day.places.length - 1 ? <View style={styles.journeyLine} /> : null}
            </View>
            <View style={styles.journeyCopy}>
              <Text style={styles.journeyPlace} numberOfLines={1}>
                {formatPlaceDisplayName(place.placeName)}
              </Text>
              <Text style={styles.journeyMeta} numberOfLines={1}>
                {place.category} · {place.stayTime}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function getPeriodColor(period: PlacePlan["period"]) {
  if (period === "오전") return colors.mintDark;
  if (period === "점심") return colors.yellow;
  if (period === "오후") return colors.orange;
  if (period === "저녁") return colors.blue;
  return colors.coral;
}

function CourseDecisionCard({ input, day, liveInfo }: { input: PlannerInput; day: Itinerary["days"][number]; liveInfo: LiveTravelInfo }) {
  const mealCount = day.places.filter((place) => place.category === "맛집").length;
  const restCount = day.places.filter((place) => ["카페", "마사지", "쇼핑"].includes(place.category)).length;
  const weatherReady = liveInfo.weather.status === "ready";

  return (
    <View style={styles.decisionCard}>
      <View style={styles.decisionHeader}>
        <View style={styles.decisionHeaderCopy}>
          <Text style={styles.decisionEyebrow}>코스 점검</Text>
          <Text style={styles.decisionTitle}>이 일정은 이렇게 맞췄어요</Text>
        </View>
        <Text style={styles.decisionBadge}>{getDecisionGrade(day)}</Text>
      </View>

      <View style={styles.decisionGrid}>
        <DecisionItem title="숙소 기준" value={input.accommodationArea} />
        <DecisionItem title="식사 균형" value={mealCount > 0 ? `맛집 ${mealCount}곳` : "식사 후보 확인"} />
        <DecisionItem title="휴식 구간" value={restCount > 0 ? `쉬는 곳 ${restCount}곳` : "카페 추가 추천"} />
        <DecisionItem title="날씨 반영" value={weatherReady ? `${liveInfo.weather.temperatureC}°C 기준` : "불러오는 중"} />
      </View>

      <Text style={styles.decisionCopy}>{buildDecisionCopy(input, day)}</Text>
    </View>
  );
}

function DecisionItem({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.decisionItem}>
      <Text style={styles.decisionItemTitle}>{title}</Text>
      <Text style={styles.decisionItemValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function getDecisionGrade(day: Itinerary["days"][number]) {
  if (day.intensity === "여유") return "초행 OK";
  if (day.intensity === "적당") return "균형형";
  return "빡센 코스";
}

function buildDecisionCopy(input: PlannerInput, day: Itinerary["days"][number]) {
  const hasNight = day.places.some((place) => place.period === "밤");
  if (input.companion === "혼자" || input.preferences.includes("혼자 여행")) {
    return hasNight ? "혼자 여행 기준으로 밤 이동은 Grab 확인을 전제로 넣었어요." : "혼자 움직이기 편하게 밤 이동 부담을 줄였어요.";
  }
  if (input.preferences.includes("여자끼리")) return "여자끼리 여행 기준으로 후기 많은 곳과 큰길 이동을 우선했어요.";
  if (input.companion === "커플" || input.preferences.includes("커플 여행")) return "커플 여행 기준으로 감성 카페, 야경, 사진 포인트가 섞이게 짰어요.";
  if (input.companion === "가족" || input.preferences.includes("가족 여행")) return "가족 여행 기준으로 이동이 과하게 길지 않고 검증된 장소 위주로 맞췄어요.";
  return "선택한 취향과 숙소 권역을 기준으로 무리한 이동과 카테고리 중복을 줄였어요.";
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function TrustSignal({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.trustItem}>
      <Text style={styles.trustLabel}>{label}</Text>
      <Text style={styles.trustValue}>{value}</Text>
    </View>
  );
}

function getWeatherPlanCopy(liveInfo: LiveTravelInfo) {
  if (liveInfo.weather.status !== "ready") return "날씨 데이터를 불러오는 중이에요. 그래도 야외 코스는 실내 대체로 바꿀 수 있어요.";
  const isRainy = (liveInfo.weather.precipitationMm ?? 0) > 0;
  const isHot = (liveInfo.weather.temperatureC ?? 0) >= 32;
  if (isRainy) return `${liveInfo.weather.condition} · 비가 감지돼요. 야외 관광명소와 액티비티를 실내 코스로 바꿔보세요.`;
  if (isHot) return `${liveInfo.weather.temperatureC}°C · 더운 날이에요. 오후 야외 코스를 카페/마사지로 줄이면 좋아요.`;
  return `${liveInfo.weather.temperatureC}°C · ${liveInfo.weather.condition}. 컨디션에 맞춰 실내 위주로도 조정할 수 있어요.`;
}

function PlaceTimelineItem({
  input,
  dayNumber,
  place,
  isLast,
  visited,
  favorite,
  onToggleVisited,
  onToggleFavorite,
  onRemove,
  onReplace,
  onReplaceWith,
  replacementOptions
}: {
  input: PlannerInput;
  dayNumber: number;
  place: PlacePlan;
  isLast: boolean;
  visited: boolean;
  favorite: boolean;
  onToggleVisited: () => void;
  onToggleFavorite: () => void;
  onRemove: () => void;
  onReplace: () => void;
  onReplaceWith: (replacement: string) => void;
  replacementOptions: CuratedPlace[];
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const openMap = () => {
    openGoogleMapsPlace(place, `${input.destination} Vietnam`);
  };
  const options = replacementOptions;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeCol}>
        <Text style={styles.time}>{place.time}</Text>
        <View style={[styles.dot, visited && styles.dotVisited]} />
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={[styles.placeBox, visited && styles.placeVisited]}>
        <View style={styles.placeHeader}>
          <View style={styles.placeHeaderCopy}>
            <Text style={styles.period}>
              DAY {dayNumber} · {place.period} · {place.category}
            </Text>
            <Text style={styles.placeName} numberOfLines={2}>{formatPlaceDisplayName(place.placeName)}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onToggleFavorite} style={styles.iconButton}>
            <Text style={[styles.iconText, favorite && styles.favoriteText]}>{favorite ? "♥" : "♡"}</Text>
          </Pressable>
        </View>

        <Text style={styles.placeDesc}>{place.description}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{place.stayTime}</Text>
          <Text style={styles.meta}>{place.estimatedCost}</Text>
          <Text style={styles.meta}>{place.routeMinutesFromPrevious}분 이동</Text>
          <Text style={styles.meta}>{place.difficulty}</Text>
        </View>

        <View style={styles.quickReasonBox}>
          <Text style={styles.quickReasonLabel}>왜 감?</Text>
          <Text style={styles.quickReasonText} numberOfLines={2}>{place.fitReason}</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" onPress={onToggleVisited} style={[styles.smallAction, visited && styles.smallActionActive]}>
            <Text style={[styles.smallActionText, visited && styles.smallActionTextActive]}>{visited ? "방문 완료" : "방문 체크"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={openMap} style={styles.smallActionDark}>
            <Text style={styles.smallActionDarkText}>지도 열기</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={() => setShowDetails((current) => !current)} style={styles.detailToggle}>
          <Text style={styles.detailToggleText}>{showDetails ? "상세 닫기" : "후기·체크·교체 보기"}</Text>
        </Pressable>

        {showDetails ? (
          <View style={styles.detailPanel}>
            <View style={styles.timeFitBox}>
              <Text style={styles.timeFitTitle}>시간대 적합성</Text>
              <Text style={styles.timeFitText}>{getTimeFitCopy(place)}</Text>
              <Text style={styles.timeFitSubText}>{getTimeRiskCopy(place)}</Text>
            </View>

            <View style={styles.trustGrid}>
              <TrustSignal label="평점" value={place.rating ? `${place.rating.toFixed(1)}점` : "확인 필요"} />
              <TrustSignal label="리뷰" value={place.reviewCount ? `${place.reviewCount.toLocaleString("ko-KR")}+` : "연동 예정"} />
              <TrustSignal label="한국인 적합" value={place.koreanFitScore ? `${place.koreanFitScore}%` : "보통"} />
            </View>

            <View style={styles.reliabilityBox}>
              <Text style={styles.reliabilityText}>{place.reliabilityBadge ?? "Google Maps와 한국어 후기를 같이 확인하면 더 안전해요."}</Text>
              <Text style={styles.openingHint}>{place.openingHint ?? "방문 전 영업시간 확인"}</Text>
            </View>

            <Text style={styles.tipTitle}>로컬 팁</Text>
            <Text style={styles.tipCopy}>{place.localTip}</Text>

            <Text style={styles.tipTitle}>방문 전 체크</Text>
            <View style={styles.checkList}>
              {buildPreVisitChecks(place).map((check) => (
                <View key={check} style={styles.checkPill}>
                  <Text style={styles.checkPillText}>{check}</Text>
                </View>
              ))}
            </View>

            <View style={styles.tagRow}>
              {place.matchTags.map((tag) => (
                <Text key={tag} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>

            <Text style={styles.tipTitle}>마음에 안 들면 대체</Text>
            <Text style={styles.altGuide}>같은 도시 · 같은 카테고리 우선 · 리뷰 500개 이상 기준으로 골랐어요.</Text>
            <Pressable accessibilityRole="button" onPress={() => setShowAlternatives((current) => !current)} style={styles.altToggle}>
              <Text style={styles.altToggleText}>{showAlternatives ? "대체 후보 접기" : `실제 장소 후보 보기 ${options.length}개`}</Text>
            </Pressable>
            {showAlternatives ? (
              <View style={styles.altChipRow}>
                {options.length > 0 ? (
                  options.slice(0, 6).map((replacement) => (
                    <Pressable key={replacement.id} accessibilityRole="button" onPress={() => onReplaceWith(replacement.name)} style={styles.altChip}>
                      <View style={styles.altChipHeader}>
                        <Text style={styles.altChipName} numberOfLines={2}>{formatPlaceDisplayName(replacement.name)}</Text>
                        <Text style={styles.altChipBadge}>{replacement.priceLevel}</Text>
                      </View>
                      <Text style={styles.altChipMeta} numberOfLines={1}>
                        {replacement.category} · {replacement.area ?? input.accommodationArea} · ★ {replacement.rating ? replacement.rating.toFixed(1) : "확인"}
                      </Text>
                      <Text style={styles.altChipReason} numberOfLines={2}>{buildReplacementReason(replacement, input)}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.noAltText}>아직 이 조건에 맞는 실제 장소 후보가 부족해요. 핫플 DB를 더 모으면 여기에 바로 붙일 수 있어요.</Text>
                )}
              </View>
            ) : null}

            {place.warning ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>주의: {place.warning}</Text>
              </View>
            ) : null}

            <View style={styles.editRow}>
              <Pressable accessibilityRole="button" onPress={onRemove} style={styles.editButton}>
                <Text style={styles.editButtonText}>이 장소 빼기</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onReplace} style={[styles.editButton, styles.replaceButton]}>
                <Text style={[styles.editButtonText, styles.replaceButtonText]}>자동 교체</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function buildPreVisitChecks(place: PlacePlan) {
  const checks = ["영업시간", getCategoryVisitRule(place)];
  if (place.category === "맛집") checks.push("피크 대기");
  if (place.category === "마사지" || place.reservationTip) checks.push("예약");
  if (place.category === "쇼핑" || place.category === "관광지") checks.push("현금/입장료");
  if (place.period === "밤" || place.category === "야경") checks.push("Grab 귀가");
  return Array.from(new Set(checks));
}

function getTimeFitCopy(place: PlacePlan) {
  if (place.period === "밤") {
    if (place.matchTags.includes("가라오케")) return "21시 이후 예약하고 가는 밤 코스로 맞춰뒀어요.";
    if (/부이비엔|Bui Vien|타히엔|Ta Hien|Beer Street|Walking Street/i.test(`${place.placeName} ${place.mapQuery}`)) return "밤 9시 이후부터 분위기가 살아나는 거리라 이 시간대가 맞아요.";
    return "야경·루프탑처럼 저녁 이후에 의미가 있는 코스만 넣었어요.";
  }
  if (place.period === "저녁" && place.category === "맛집") return "저녁 식사 시간에 맞춘 식당 코스예요.";
  if (place.period === "오후" && place.category === "카페") return "더운 오후에 쉬어가는 카페 코스로 맞아요.";
  if (place.period === "오후" && place.category === "마사지") return "오후 이동 뒤 체력 회복용으로 넣기 좋아요.";
  if (place.period === "점심" && place.category === "맛집") return "점심 식사 시간대에 맞춰 넣은 식당이에요.";
  if (place.period === "오전" && place.category === "액티비티") return "투어는 오전 시작이 여유로워서 앞쪽에 배치했어요.";
  return `${place.period} 시간대에 무리 없이 넣기 좋은 코스예요.`;
}

function getTimeRiskCopy(place: PlacePlan) {
  if (place.period === "밤") return "밤 이동은 도보보다 Grab Car 기준으로 생각하는 게 좋아요.";
  if (place.category === "카페") return "사진 목적이면 너무 늦은 밤보다 낮~오후 방문이 더 좋아요.";
  if (place.category === "맛집") return "식사 피크에는 대기 가능성이 있어 최근 리뷰를 확인하세요.";
  if (place.category === "마사지") return "인기 시간대는 예약 후 방문하면 실패 확률이 줄어요.";
  if (place.category === "관광지" || place.category === "액티비티") return "더운 날은 물과 그늘 휴식 시간을 같이 잡아두세요.";
  return "방문 전 Google Maps에서 영업시간과 최근 리뷰를 확인하세요.";
}

function getCategoryVisitRule(place: PlacePlan) {
  if (place.category === "맛집") return "대표 메뉴";
  if (place.category === "카페") return "좌석 여유";
  if (place.category === "마사지") return "가격표";
  if (place.category === "야경") return "귀가 동선";
  if (place.category === "쇼핑") return "가격 비교";
  if (place.category === "액티비티") return "픽업 시간";
  return "최근 리뷰";
}

function buildReplacementReason(candidate: CuratedPlace, input: PlannerInput) {
  const reasons = [
    (candidate.koreanReviewSignal?.reviewCount ?? 0) > 0 ? `한국어 후기 ${candidate.koreanReviewSignal?.reviewCount}개 확인` : "후기 많은 후보",
    candidate.priceLevel === mapBudgetToPrice(input.budget) ? `${input.budget} 예산과 맞음` : undefined,
    candidate.beginnerSafe ? "초행자도 고르기 쉬움" : undefined,
    candidate.rainyDayOk ? "비 와도 무난" : undefined,
    candidate.tags.find((tag) => input.preferences.includes(tag as PlannerInput["preferences"][number])) ? "선택 취향과 겹침" : undefined
  ].filter(Boolean) as string[];

  return reasons.slice(0, 2).join(" · ");
}

function mapBudgetToPrice(budget: PlannerInput["budget"]) {
  if (budget === "가성비") return "저렴";
  if (budget === "프리미엄") return "프리미엄";
  return "보통";
}

const styles = StyleSheet.create({
  shareCard: {
    backgroundColor: colors.ink,
    borderRadius: 30,
    padding: 18,
    marginBottom: 12,
    ...shadow
  },
  shareTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  shareTitleWrap: {
    flex: 1
  },
  shareEyebrow: {
    alignSelf: "flex-start",
    color: colors.ink,
    backgroundColor: colors.mint,
    overflow: "hidden",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  shareTitle: {
    color: colors.card,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "900",
    marginTop: 10
  },
  shareCopy: {
    color: "#D8E1DA",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 5
  },
  shareScoreBubble: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "#FFF8E4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE0A7"
  },
  shareScore: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "900"
  },
  shareScoreLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 1
  },
  shareRoute: {
    backgroundColor: "#FFF7DF",
    borderRadius: 22,
    padding: 12,
    marginTop: 14,
    gap: 8
  },
  shareRouteItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  shareRouteNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: "hidden",
    color: colors.ink,
    backgroundColor: colors.yellow,
    textAlign: "center",
    lineHeight: 26,
    fontSize: 12,
    fontWeight: "900"
  },
  shareRouteCopy: {
    flex: 1
  },
  shareRouteTime: {
    color: "#BFD0C7",
    fontSize: 11,
    fontWeight: "900"
  },
  shareRouteName: {
    color: colors.card,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 2
  },
  shareProofGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  shareProofItem: {
    flex: 1,
    minHeight: 62,
    borderRadius: 17,
    backgroundColor: colors.card,
    padding: 10,
    justifyContent: "center"
  },
  shareProofLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900"
  },
  shareProofValue: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 5
  },
  shareBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12
  },
  shareHint: {
    flex: 1,
    color: "#D8E1DA",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  shareSaveButton: {
    minWidth: 62,
    minHeight: 40,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint
  },
  shareSaveText: {
    color: colors.greenDeep,
    fontSize: 13,
    fontWeight: "900"
  },
  matchCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    ...shadow
  },
  matchTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  matchCopy: {
    flex: 1
  },
  matchLabel: {
    color: colors.mintDark,
    fontSize: 13,
    fontWeight: "900"
  },
  persona: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
    marginTop: 5
  },
  matchScore: {
    color: colors.card,
    backgroundColor: colors.mintDark,
    overflow: "hidden",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: "900",
    alignSelf: "flex-start"
  },
  strategy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 10
  },
  highlight: {
    color: colors.greenDeep,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 7
  },
  contextCard: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  decisionCard: {
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
    ...shadow
  },
  decisionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  decisionHeaderCopy: {
    flex: 1
  },
  decisionEyebrow: {
    color: colors.mintDark,
    fontSize: 12,
    fontWeight: "900"
  },
  decisionTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
    marginTop: 4
  },
  decisionBadge: {
    color: colors.card,
    backgroundColor: colors.ink,
    overflow: "hidden",
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "900"
  },
  decisionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13
  },
  decisionItem: {
    width: "48%",
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E6EFE7",
    padding: 11,
    justifyContent: "center"
  },
  decisionItemTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  decisionItemValue: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 5
  },
  decisionCopy: {
    color: colors.greenDeep,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 12
  },
  infoPill: {
    flex: 1,
    backgroundColor: "#F0FFF6",
    borderRadius: 18,
    padding: 11,
    borderWidth: 1,
    borderColor: "#CDEEDB"
  },
  infoLabel: {
    color: colors.greenDeep,
    fontSize: 11,
    fontWeight: "900"
  },
  infoValue: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 4
  },
  dayTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  dayTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line
  },
  dayTabActive: {
    backgroundColor: colors.mintDark,
    borderColor: colors.mintDark
  },
  dayTabText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  dayTabTextActive: {
    color: colors.card
  },
  journeyCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
    ...shadow
  },
  journeyStep: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center"
  },
  journeyTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 18
  },
  journeyTabs: {
    flexDirection: "row",
    gap: 7,
    marginTop: 24
  },
  journeyTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9F7F1",
    borderWidth: 1,
    borderColor: "#EFE7DA"
  },
  journeyTabActive: {
    backgroundColor: colors.card,
    borderColor: colors.mintDark,
    borderBottomWidth: 3
  },
  journeyTabText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  journeyTabTextActive: {
    color: colors.ink
  },
  journeyTimeline: {
    marginTop: 24
  },
  journeyRow: {
    flexDirection: "row",
    minHeight: 58
  },
  journeyTimeCol: {
    width: 54,
    alignItems: "flex-end",
    paddingRight: 10,
    paddingTop: 1
  },
  journeyTime: {
    color: "#B8AFA3",
    fontSize: 12,
    fontWeight: "900"
  },
  journeyLineCol: {
    width: 24,
    alignItems: "center"
  },
  journeyDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.card
  },
  journeyLine: {
    flex: 1,
    width: 3,
    backgroundColor: "#A8D7BF",
    marginTop: 2
  },
  journeyCopy: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 18
  },
  journeyPlace: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  journeyMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6
  },
  routeWarningCard: {
    backgroundColor: "#FFF1E8",
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFD7BE"
  },
  routeWarningTitle: {
    color: "#9A3412",
    fontSize: 16,
    fontWeight: "900"
  },
  routeWarningCopy: {
    color: "#9A3412",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
    fontWeight: "800"
  },
  weatherActionCard: {
    backgroundColor: "#F0FFF6",
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#CDEEDB",
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  weatherCopy: {
    flex: 1
  },
  weatherTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  weatherText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    fontWeight: "700"
  },
  weatherButton: {
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mintDark
  },
  weatherButtonText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900"
  },
  alertCard: {
    backgroundColor: "#E9F7FF",
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#CDEEFF"
  },
  alertTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  alertCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
    fontWeight: "700"
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
    ...shadow
  },
  planTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900"
  },
  planMood: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6
  },
  timeline: {
    marginTop: 18
  },
  timelineRow: {
    flexDirection: "row"
  },
  timeCol: {
    width: 58,
    alignItems: "center"
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.orange
  },
  dotVisited: {
    backgroundColor: colors.mintDark
  },
  line: {
    flex: 1,
    width: 3,
    minHeight: 132,
    backgroundColor: colors.line
  },
  placeBox: {
    flex: 1,
    backgroundColor: "#FAFCF8",
    borderRadius: 22,
    padding: 14,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#EEF2E8"
  },
  placeVisited: {
    opacity: 0.72
  },
  placeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  placeHeaderCopy: {
    flex: 1
  },
  period: {
    color: colors.mintDark,
    fontSize: 12,
    fontWeight: "900"
  },
  placeName: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 4
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card
  },
  iconText: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: "900"
  },
  favoriteText: {
    color: colors.coral
  },
  placeDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10
  },
  meta: {
    color: colors.ink,
    backgroundColor: colors.mint,
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "900"
  },
  quickReasonBox: {
    backgroundColor: "#F4F8FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE9FF",
    padding: 11,
    marginTop: 10
  },
  quickReasonLabel: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900"
  },
  quickReasonText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4
  },
  detailToggle: {
    minHeight: 38,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 9
  },
  detailToggleText: {
    color: colors.greenDeep,
    fontSize: 13,
    fontWeight: "900"
  },
  detailPanel: {
    marginTop: 10,
    paddingTop: 2
  },
  trustGrid: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10
  },
  timeFitBox: {
    backgroundColor: "#F0FFF6",
    borderRadius: 16,
    padding: 11,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#BFE8CF"
  },
  timeFitTitle: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  timeFitText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 4
  },
  timeFitSubText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3
  },
  trustItem: {
    flex: 1,
    backgroundColor: "#FFF8E7",
    borderRadius: 14,
    padding: 9,
    borderWidth: 1,
    borderColor: "#F3E1B9"
  },
  trustLabel: {
    color: "#8A5A00",
    fontSize: 10,
    fontWeight: "900"
  },
  trustValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3
  },
  reliabilityBox: {
    backgroundColor: "#F4F8FF",
    borderRadius: 16,
    padding: 11,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#DDE9FF"
  },
  reliabilityText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  openingHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: "700"
  },
  reasonBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line
  },
  reasonTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  reasonText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    fontWeight: "700"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8
  },
  tag: {
    color: colors.greenDeep,
    backgroundColor: colors.mint,
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900"
  },
  tipTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 11
  },
  tipCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
    fontWeight: "700"
  },
  checkList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 7
  },
  checkPill: {
    borderRadius: 13,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#F4F8FF",
    borderWidth: 1,
    borderColor: "#DDE9FF"
  },
  checkPillText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  altToggle: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 7
  },
  altToggleText: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  altGuide: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4
  },
  altChipRow: {
    gap: 7,
    marginTop: 8
  },
  altChip: {
    borderRadius: 17,
    padding: 11,
    backgroundColor: "#F0FFF6",
    borderWidth: 1,
    borderColor: "#BFE8CF",
    maxWidth: "100%"
  },
  altChipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start"
  },
  altChipName: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  altChipBadge: {
    color: colors.greenDeep,
    backgroundColor: colors.card,
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  altChipMeta: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    marginTop: 5
  },
  altChipReason: {
    color: colors.greenDeep,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 5
  },
  noAltText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line
  },
  warningBox: {
    backgroundColor: "#FFF1E8",
    borderRadius: 16,
    padding: 11,
    marginTop: 10
  },
  warningText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  smallAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line
  },
  smallActionActive: {
    backgroundColor: colors.mintDark,
    borderColor: colors.mintDark
  },
  smallActionText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  smallActionTextActive: {
    color: colors.card
  },
  smallActionDark: {
    flex: 1,
    minHeight: 40,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink
  },
  smallActionDarkText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900"
  },
  editRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  editButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8EF",
    borderWidth: 1,
    borderColor: "#F1DCC4"
  },
  replaceButton: {
    backgroundColor: "#F0FFF6",
    borderColor: "#BFE8CF"
  },
  editButtonText: {
    color: "#9A3412",
    fontSize: 13,
    fontWeight: "900"
  },
  replaceButtonText: {
    color: colors.greenDeep
  },
  survivalCard: {
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line
  },
  survivalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  mustKnow: {
    color: colors.greenDeep,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    fontWeight: "800"
  }
});
