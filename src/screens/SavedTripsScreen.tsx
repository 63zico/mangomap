import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { Header } from "../components/Header";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, shadow } from "../styles/theme";
import type { CuratedPlace, SavedTrip } from "../types";

type SavedTripsScreenProps = {
  trips: SavedTrip[];
  savedPlaces: CuratedPlace[];
  onBack: () => void;
  onSelect: (trip: SavedTrip) => void;
  onToggleSavedPlace: (placeId: string) => void;
};

export function SavedTripsScreen({ trips, savedPlaces, onBack, onSelect, onToggleSavedPlace }: SavedTripsScreenProps) {
  return (
    <AppShell withBottomNav backgroundColor="#FFF7DF">
      <Header eyebrow="저장" title="찜한 스팟" subtitle="다시 가보고 싶은 장소만 모아뒀어요." compactMascot dark />

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>저장한 장소</Text>
          <Text style={styles.summaryValue}>{savedPlaces.length}곳</Text>
        </View>
        <Text style={styles.summaryBadge}>장소 보관함</Text>
      </View>

      {savedPlaces.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 찜한 장소가 없어요</Text>
          <Text style={styles.emptyCopy}>핫플 탭에서 맛집, 카페, 숨은 장소를 찜해두면 여기에 모여요.</Text>
          <PrimaryButton label="홈으로 가기" onPress={onBack} />
        </View>
      ) : null}

      {savedPlaces.length > 0
        ? savedPlaces.map((place) => (
            <View key={place.id} style={styles.placeCard}>
              <View style={styles.cardHeader}>
                <View style={styles.placeCopy}>
                  <Text style={styles.meta}>{place.category} · {place.priceLevel}</Text>
                  <Text style={styles.title}>{place.name}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => onToggleSavedPlace(place.id)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>해제</Text>
                </Pressable>
              </View>
              <Text style={styles.copy} numberOfLines={2}>{place.oneLine}</Text>
              <View style={styles.stats}>
                <Text style={styles.stat}>{place.rating ? `평점 ${place.rating.toFixed(1)}` : "평점 확인"}</Text>
                <Text style={styles.stat}>{place.rainyDayOk ? "비오는날 가능" : "날씨 확인"}</Text>
                <Text style={styles.stat}>{place.bestTime.join(" · ")}</Text>
              </View>
            </View>
          ))
        : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    minHeight: 84,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)",
    padding: 15,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    ...shadow
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 4
  },
  summaryBadge: {
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "900"
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 22
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  placeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.20)",
    ...shadow
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  placeCopy: {
    flex: 1
  },
  meta: {
    color: "#FFC233",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7
  },
  badge: {
    color: colors.greenDeep,
    backgroundColor: colors.mint,
    overflow: "hidden",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900",
    alignSelf: "flex-start"
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  stat: {
    color: colors.ink,
    backgroundColor: "rgba(255,194,51,0.10)",
    overflow: "hidden",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  open: {
    color: colors.mintDark,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 12
  },
  removeButton: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,107,122,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,122,0.28)"
  },
  removeButtonText: {
    color: "#FF8A98",
    fontSize: 12,
    fontWeight: "900"
  }
});
