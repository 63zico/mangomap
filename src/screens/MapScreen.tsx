import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { AppShell } from "../components/AppShell";
import { Header } from "../components/Header";
import { colors, shadow, sunsetGlow } from "../styles/theme";
import type { Destination, Itinerary, PlacePlan, PlannerInput } from "../types";
import { buildGoogleMapsDirectionsUrl, openGoogleMapsPlace, openGoogleMapsUrl } from "../utils/googleMaps";

type MapScreenProps = {
  itinerary: Itinerary;
  selectedDay: number;
  input: PlannerInput;
  onSelectDay: (day: number) => void;
};

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const cityMapFocus: Record<Destination, { center: string; zoom: string; aliases: string[] }> = {
  호치민: { center: "10.7769,106.7009", zoom: "13", aliases: ["ho chi minh", "saigon", "hồ chí minh"] },
  다낭: { center: "16.0544,108.2022", zoom: "13", aliases: ["da nang", "đà nẵng"] },
  나트랑: { center: "12.2388,109.1967", zoom: "13", aliases: ["nha trang", "khánh hòa"] },
  하노이: { center: "21.0278,105.8342", zoom: "13", aliases: ["hanoi", "ha noi", "hà nội"] },
  달랏: { center: "11.9404,108.4583", zoom: "13", aliases: ["da lat", "dalat", "đà lạt"] },
  푸꾸옥: { center: "10.2899,103.9840", zoom: "12", aliases: ["phu quoc", "phú quốc"] }
};

export function MapScreen({ itinerary, selectedDay, input, onSelectDay }: MapScreenProps) {
  const day = itinerary.days.find((item) => item.day === selectedDay) ?? itinerary.days[0];

  const openRoute = () => {
    openGoogleMapsUrl(buildGoogleRouteUrl(input, day.places));
  };

  return (
    <AppShell withBottomNav>
      <Header
        eyebrow="지도 & 동선"
        title={`DAY ${day.day} 이동 루트`}
        subtitle="복잡한 설명보다 먼저 실제 지도와 번호 순서가 보이게 정리했어요."
        compactMascot
      />

      <View style={styles.dayTabs}>
        {itinerary.days.map((item) => (
          <Pressable
            key={item.day}
            accessibilityRole="button"
            onPress={() => onSelectDay(item.day)}
            style={[styles.dayTab, day.day === item.day && styles.dayTabActive]}
          >
            <Text style={[styles.dayTabText, day.day === item.day && styles.dayTabTextActive]}>DAY {item.day}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.mapCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.stepTitle}>4. 지도 & 동선</Text>
            <Text style={styles.stepSubtitle}>{input.accommodationArea} 출발 기준</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{googleMapsApiKey ? "Google 지도" : "미리보기"}</Text>
          </View>
        </View>

        <RouteMapPreview input={input} places={day.places} />

        {day.places.some(isBroadTourPlace) ? (
          <View style={styles.mapNotice}>
            <Text style={styles.mapNoticeText}>근교 투어/푸드투어는 실제 목적지보다 숙소 근처 픽업·미팅 기준으로 표시했어요.</Text>
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryPill label="장소" value={`${day.places.length}곳`} />
          <SummaryPill label="이동" value={day.totalMoveTime} />
          <SummaryPill label="예산" value={day.totalCost} />
        </View>

        <View style={styles.stopList}>
          {day.places.map((place, index) => (
            <RouteStop key={place.id} place={place} index={index} isLast={index === day.places.length - 1} />
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={openRoute} style={styles.routeButton}>
          <Text style={styles.routeButtonText}>Google Maps에서 전체 루트 열기</Text>
        </Pressable>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>이동 전에 이것만 확인</Text>
        <Text style={styles.tipText}>Google Maps 예상 시간과 Grab 예상 요금을 같이 비교하세요.</Text>
        <Text style={styles.tipText}>밤에는 도보 이동보다 Grab Car로 숙소 앞까지 이동하는 편이 좋아요.</Text>
        {day.routeWarning ? <Text style={styles.warningText}>{day.routeWarning}</Text> : null}
      </View>
    </AppShell>
  );
}

function RouteMapPreview({ input, places }: { input: PlannerInput; places: PlacePlan[] }) {
  const [mapFailed, setMapFailed] = useState(false);
  const staticMapUrl = googleMapsApiKey ? buildStaticMapUrl(input, places, googleMapsApiKey) : undefined;

  if (staticMapUrl && !mapFailed) {
    return (
      <ImageBackground
        source={{ uri: staticMapUrl }}
        imageStyle={styles.mapImage}
        onError={() => setMapFailed(true)}
        style={styles.mapPreview}
      >
        <View style={styles.mapOverlay}>
          <Text style={styles.mapOverlayText}>번호 순서대로 이동</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.fallbackMap}>
      <View style={[styles.fakeRoad, styles.fakeRoadOne]} />
      <View style={[styles.fakeRoad, styles.fakeRoadTwo]} />
      <View style={[styles.fakeRoad, styles.fakeRoadThree]} />
      <View style={styles.fakeRouteOne} />
      <View style={styles.fakeRouteTwo} />
      {places.slice(0, 5).map((place, index) => {
        const pin = fallbackPins[index % fallbackPins.length];
        return (
          <View key={place.id} style={[styles.fakePin, { left: `${pin.left}%`, top: `${pin.top}%` }]}>
            <Text style={styles.fakePinText}>{index + 1}</Text>
          </View>
        );
      })}
      <Text style={styles.fallbackCopy}>Google Static Maps API가 꺼져 있으면 이 미리보기가 표시돼요.</Text>
    </View>
  );
}

function RouteStop({ place, index, isLast }: { place: PlacePlan; index: number; isLast: boolean }) {
  const openPlace = () => {
    openGoogleMapsPlace(place, "Vietnam");
  };

  return (
    <Pressable accessibilityRole="button" onPress={openPlace} style={styles.stopRow}>
      <View style={styles.stopRail}>
        <View style={[styles.stopNumber, index === 0 && styles.stopNumberFirst]}>
          <Text style={styles.stopNumberText}>{index + 1}</Text>
        </View>
        {!isLast ? <View style={styles.stopLine} /> : null}
      </View>
      <View style={styles.stopCopy}>
        <Text style={styles.stopName} numberOfLines={1}>{place.placeName}</Text>
        <Text style={styles.stopMeta}>{place.time} · {place.period} · {place.category}</Text>
        <Text style={styles.stopMove}>{place.routeMinutesFromPrevious}분 이동 · {place.stayTime}</Text>
      </View>
      <Text style={styles.stopOpen}>지도</Text>
    </Pressable>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function buildStaticMapUrl(input: PlannerInput, places: PlacePlan[], apiKey: string) {
  const focus = cityMapFocus[input.destination];
  const params = new URLSearchParams({
    size: "640x520",
    scale: "2",
    maptype: "roadmap",
    language: "ko",
    region: "VN",
    center: focus.center,
    zoom: focus.zoom,
    key: apiKey
  });

  const routePoints = places.slice(0, 5).map((place) => getStaticMapPoint(input, place));
  routePoints.forEach((point, index) => {
    const color = index === 0 ? "orange" : "green";
    params.append("markers", `color:${color}|label:${index + 1}|${point}`);
  });

  if (routePoints.length >= 2) {
    params.append("path", `color:0x16A565ff|weight:5|${routePoints.join("|")}`);
  } else {
    params.set("center", `${input.destination} ${input.accommodationArea}`);
    params.set("zoom", "13");
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function buildGoogleRouteUrl(input: PlannerInput, places: PlacePlan[]) {
  const routePoints = [`${input.destination} ${input.accommodationArea}`, ...places.map((place) => getStaticMapPoint(input, place))];
  return buildGoogleMapsDirectionsUrl(routePoints);
}

function getStaticMapPoint(input: PlannerInput, place: PlacePlan) {
  if (isBroadTourPlace(place)) {
    return `${input.destination} ${input.accommodationArea} 투어 픽업 미팅 포인트`;
  }

  const query = place.mapQuery.trim();
  const lowerQuery = query.toLowerCase();
  const focus = cityMapFocus[input.destination];
  const hasCity = focus.aliases.some((alias) => lowerQuery.includes(alias));
  return hasCity ? `${query} Vietnam` : `${query} ${input.destination} Vietnam`;
}

function isBroadTourPlace(place: PlacePlan) {
  const text = `${place.placeName} ${place.mapQuery}`.toLowerCase();
  return (
    place.category === "액티비티" &&
    /tour|투어|mekong|cu chi|halong|ha long|ninh binh|trang an|ba na|hoi an|hopping|snorkeling|motorbike food/.test(text)
  );
}

const fallbackPins = [
  { left: 24, top: 18 },
  { left: 42, top: 42 },
  { left: 60, top: 32 },
  { left: 38, top: 70 },
  { left: 74, top: 58 }
];

const styles = StyleSheet.create({
  dayTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
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
  mapCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  stepSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5
  },
  badge: {
    borderRadius: 15,
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeText: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  mapPreview: {
    height: 300,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "#EAF0EA",
    borderWidth: 1,
    borderColor: "#DDE4DC"
  },
  mapImage: {
    borderRadius: 22
  },
  mapOverlay: {
    alignSelf: "flex-start",
    margin: 12,
    borderRadius: 16,
    backgroundColor: "rgba(31,42,55,0.86)",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  mapOverlayText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "900"
  },
  mapNotice: {
    backgroundColor: "#FFF7E8",
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#F4D9A9",
    marginTop: 9
  },
  mapNoticeText: {
    color: "#8A4B00",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  fallbackMap: {
    height: 300,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#EEF3EF",
    borderWidth: 1,
    borderColor: "#DDE4DC",
    position: "relative"
  },
  fakeRoad: {
    position: "absolute",
    height: 11,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)"
  },
  fakeRoadOne: {
    width: "110%",
    left: "-8%",
    top: "25%",
    transform: [{ rotate: "-12deg" }]
  },
  fakeRoadTwo: {
    width: "92%",
    left: "12%",
    top: "55%",
    transform: [{ rotate: "18deg" }]
  },
  fakeRoadThree: {
    width: "88%",
    left: "14%",
    top: "72%",
    transform: [{ rotate: "-26deg" }]
  },
  fakeRouteOne: {
    position: "absolute",
    width: 6,
    height: 150,
    left: "43%",
    top: "21%",
    borderRadius: 999,
    backgroundColor: colors.greenDeep,
    transform: [{ rotate: "-32deg" }]
  },
  fakeRouteTwo: {
    position: "absolute",
    width: 6,
    height: 128,
    left: "57%",
    top: "41%",
    borderRadius: 999,
    backgroundColor: colors.greenDeep,
    transform: [{ rotate: "48deg" }]
  },
  fakePin: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mintDark,
    borderWidth: 3,
    borderColor: colors.card,
    ...shadow
  },
  fakePinText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900"
  },
  fallbackCopy: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    color: colors.muted,
    backgroundColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "800"
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13
  },
  summaryPill: {
    flex: 1,
    minHeight: 66,
    borderRadius: 18,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E6EFE7",
    padding: 11,
    justifyContent: "center"
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
  stopList: {
    borderRadius: 22,
    backgroundColor: "#FFFDFC",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginTop: 13
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 62
  },
  stopRail: {
    width: 34,
    alignItems: "center"
  },
  stopNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mintDark
  },
  stopNumberFirst: {
    backgroundColor: colors.orange
  },
  stopNumberText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "900"
  },
  stopLine: {
    width: 3,
    flex: 1,
    minHeight: 36,
    backgroundColor: "#A8D7BF"
  },
  stopCopy: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 12
  },
  stopName: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900"
  },
  stopMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 3
  },
  stopMove: {
    color: colors.greenDeep,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 2
  },
  stopOpen: {
    color: colors.card,
    backgroundColor: colors.ink,
    overflow: "hidden",
    borderRadius: 13,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8
  },
  routeButton: {
    minHeight: 52,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    marginTop: 14,
    ...sunsetGlow
  },
  routeButtonText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: "900"
  },
  tipCard: {
    backgroundColor: "#FFF7EA",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE0B1",
    marginTop: 14
  },
  tipTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 7
  },
  tipText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 4
  },
  warningText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 8
  }
});
