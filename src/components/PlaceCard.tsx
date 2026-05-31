import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, neonShadow, sunsetGlow } from "../styles/theme";
import type { PlacePlan } from "../types";
import { openGoogleMapsPlace } from "../utils/googleMaps";

type PlaceCardProps = {
  place: PlacePlan;
};

export function PlaceCard({ place }: PlaceCardProps) {
  const openMap = () => {
    openGoogleMapsPlace(place, "Vietnam");
  };

  return (
    <View style={styles.card}>
      <View style={styles.periodPill}>
        <Text style={styles.period}>{place.period}</Text>
      </View>
      <Text style={styles.name}>{place.placeName}</Text>
      <Text style={styles.description}>{place.description}</Text>
      <View style={styles.metaGrid}>
        <Info label="체류" value={place.stayTime} />
        <Info label="비용" value={place.estimatedCost} />
      </View>
      <View style={styles.tipBox}>
        <Text style={styles.tipLabel}>이동 팁</Text>
        <Text style={styles.tip}>{place.moveTip}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={openMap} style={styles.mapButton}>
        <Text style={styles.mapText}>구글맵 열기</Text>
      </Pressable>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    ...neonShadow
  },
  periodPill: {
    alignSelf: "flex-start",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,194,51,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.26)"
  },
  period: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: "900"
  },
  name: {
    color: colors.nightText,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 12
  },
  description: {
    color: colors.nightMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  metaGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  info: {
    flex: 1,
    backgroundColor: "#FFF7DF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)"
  },
  infoLabel: {
    color: colors.nightMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  infoValue: {
    color: colors.nightText,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4
  },
  tipBox: {
    backgroundColor: "rgba(255,122,0,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.22)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12
  },
  tipLabel: {
    color: colors.sunset,
    fontSize: 12,
    fontWeight: "900"
  },
  tip: {
    color: colors.nightText,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4
  },
  mapButton: {
    minHeight: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    backgroundColor: colors.sunset,
    ...sunsetGlow
  },
  mapText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: "900"
  }
});
