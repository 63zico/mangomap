import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { Chip } from "../components/Chip";
import { PlaceCard } from "../components/PlaceCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { TopBar } from "../components/TopBar";
import { colors, shadow } from "../styles/theme";
import type { Itinerary, PlannerInput, SavedTrip } from "../types";

type ItineraryResultScreenProps = {
  input: PlannerInput;
  itinerary: Itinerary;
  savedTrips: SavedTrip[];
  onBack: () => void;
  onSave: () => Promise<void>;
  onOpenPhrasebook: () => void;
  onOpenSavedTrips: () => void;
};

export function ItineraryResultScreen({
  input,
  itinerary,
  savedTrips,
  onBack,
  onSave,
  onOpenPhrasebook,
  onOpenSavedTrips
}: ItineraryResultScreenProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const dayPlan = itinerary.days.find((day) => day.day === selectedDay) ?? itinerary.days[0];
  const isSaved = useMemo(
    () => savedTrips.some((trip) => trip.itinerary.summary === itinerary.summary && trip.title.includes(input.destination)),
    [input.destination, itinerary.summary, savedTrips]
  );

  const handleSave = async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
  };

  return (
    <AppShell>
      <TopBar title="AI 추천 일정" onBack={onBack} rightLabel="저장목록" onRightPress={onOpenSavedTrips} />
      <View style={styles.summaryCard}>
        <Text style={styles.kicker}>{input.destination} · {input.duration} · {input.budget}</Text>
        <Text style={styles.summary}>{itinerary.summary}</Text>
      </View>

      <View style={styles.days}>
        {itinerary.days.map((day) => (
          <Chip
            key={day.day}
            label={`Day ${day.day}`}
            selected={selectedDay === day.day}
            onPress={() => setSelectedDay(day.day)}
          />
        ))}
      </View>

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>Day {dayPlan.day}. {dayPlan.title}</Text>
        <Text style={styles.dayMood}>{dayPlan.mood}</Text>
      </View>

      {dayPlan.places.map((place) => (
        <PlaceCard key={`${dayPlan.day}-${place.period}-${place.placeName}`} place={place} />
      ))}

      <View style={styles.footer}>
        <PrimaryButton
          label={isSaved ? "저장 완료" : saving ? "저장 중..." : "마음에 드는 일정 저장"}
          tone={isSaved ? "light" : "coral"}
          disabled={saving}
          onPress={handleSave}
        />
        <PrimaryButton label="베트남어 도움말 보기" tone="light" onPress={onOpenPhrasebook} />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  kicker: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900"
  },
  summary: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "800",
    marginTop: 8
  },
  days: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18
  },
  dayHeader: {
    marginVertical: 12
  },
  dayTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "900"
  },
  dayMood: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 5
  },
  footer: {
    gap: 12,
    marginTop: 8,
    marginBottom: 16
  }
});
