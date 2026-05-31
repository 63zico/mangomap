import { StyleSheet, Text, TextInput, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { Header } from "../components/Header";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, shadow } from "../styles/theme";
import type { Itinerary, PlannerInput } from "../types";

type GuideScreenProps = {
  input: PlannerInput;
  itinerary: Itinerary;
  selectedDay: number;
};

const prompts = ["비 오면 일정 바꿔줘", "부모님 힘들 때 줄여줘", "시장 흥정 문장", "Grab 기사에게 보여줄 말"];

export function GuideScreen({ input, itinerary, selectedDay }: GuideScreenProps) {
  const day = itinerary.days.find((item) => item.day === selectedDay) ?? itinerary.days[0];
  const lunch = day.places.find((place) => place.period === "점심");
  const night = day.places.find((place) => place.period === "밤");

  return (
    <AppShell withBottomNav>
      <Header
        eyebrow="AI 가이드"
        title="현재 일정 기준으로 바로 답해요"
        subtitle={`${input.destination} DAY ${day.day} · ${day.intensity} 일정 · 총 이동 ${day.totalMoveTime}`}
        compactMascot
      />

      <View style={styles.contextCard}>
        <Text style={styles.contextTitle}>오늘 AI가 알고 있는 정보</Text>
        <Text style={styles.contextText}>취향: {input.preferences.join(", ")}</Text>
        <Text style={styles.contextText}>점심 후보: {lunch?.placeName ?? "추천 준비 중"}</Text>
        <Text style={styles.contextText}>밤 일정: {night?.placeName ?? "추천 준비 중"}</Text>
      </View>

      <View style={styles.chatCard}>
        <View style={styles.bubbleFriend}>
          <Text style={styles.friendText}>
            지금 코스는 {day.totalMoveTime} 정도 이동해요. 더우면 오후 일정을 마사지나 카페로 바꾸면 체력 부담이 줄어요.
          </Text>
        </View>
        <View style={styles.bubbleMe}>
          <Text style={styles.meText}>비가 오면 어떻게 바꿔?</Text>
        </View>
        <View style={styles.bubbleFriend}>
          <Text style={styles.friendText}>{day.rainyPlan} 특히 {day.places[2]?.placeName} 대신 {day.places[2]?.rainyAlternative}.</Text>
        </View>
      </View>

      <View style={styles.promptGrid}>
        {prompts.map((prompt) => (
          <View key={prompt} style={styles.promptChip}>
            <Text style={styles.promptText}>{prompt}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sosCard}>
        <Text style={styles.sosTitle}>바로 보여주기</Text>
        <Text style={styles.sosLine}>기사님, 여기로 가주세요: Làm ơn chở tôi đến địa chỉ này.</Text>
        <Text style={styles.sosLine}>조금 천천히 말해주세요: Làm ơn nói chậm hơn.</Text>
      </View>

      <View style={styles.inputCard}>
        <TextInput placeholder="상황을 입력하세요..." placeholderTextColor={colors.muted} style={styles.input} />
        <PrimaryButton label="AI에게 묻기" onPress={() => undefined} />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  contextCard: {
    backgroundColor: "#EAF9EF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#CBEED8"
  },
  contextTitle: {
    color: colors.greenDeep,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 7
  },
  contextText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800"
  },
  chatCard: {
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  bubbleFriend: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    backgroundColor: colors.mint,
    borderRadius: 22,
    borderBottomLeftRadius: 8,
    padding: 14,
    marginBottom: 12
  },
  bubbleMe: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    backgroundColor: colors.ink,
    borderRadius: 22,
    borderBottomRightRadius: 8,
    padding: 14,
    marginBottom: 12
  },
  friendText: {
    color: colors.greenDeep,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800"
  },
  meText: {
    color: colors.card,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800"
  },
  promptGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  promptChip: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line
  },
  promptText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  sosCard: {
    backgroundColor: "#FFF4CC",
    borderRadius: 24,
    padding: 16,
    marginTop: 14
  },
  sosTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  sosLine: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    fontWeight: "800"
  },
  inputCard: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#F8FAF8",
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700"
  }
});
