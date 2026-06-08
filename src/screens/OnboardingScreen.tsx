import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { BrandLogo } from "../components/BrandLogo";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, shadow } from "../styles/theme";

type OnboardingScreenProps = {
  onStart: () => void;
  onOpenPhrasebook: () => void;
  onOpenSavedTrips: () => void;
};

export function OnboardingScreen({ onStart, onOpenPhrasebook, onOpenSavedTrips }: OnboardingScreenProps) {
  return (
    <AppShell>
      <View style={styles.hero}>
        <BrandLogo size={244} />
        <Text style={styles.copy}>한국인이 검증한 베트남 현지 장소를 망고처럼 쉽게 찾아요.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Google Maps 보기 전에 빠르게 거르기</Text>
        <Text style={styles.cardCopy}>
          맛집, 카페, 마사지, 생활장소를 한국어 후기와 최근 확인 상태로 먼저 정리해요.
          여행자는 실패 확률을 줄이고, 좋은 장소는 제보로 더 정확해져요.
        </Text>
        <View style={styles.valueList}>
          <Text style={styles.valueItem}>✓ 한국인 후기와 제보 상태 기반</Text>
          <Text style={styles.valueItem}>✓ 가격대·영업시간·추천 상황 정리</Text>
          <Text style={styles.valueItem}>✓ Google Maps 길찾기로 바로 연결</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="시작하기" onPress={onStart} />
        <View style={styles.row}>
          <View style={styles.half}>
            <PrimaryButton label="베트남어" tone="light" onPress={onOpenPhrasebook} />
          </View>
          <View style={styles.half}>
            <PrimaryButton label="저장 일정" tone="light" onPress={onOpenSavedTrips} />
          </View>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 42
  },
  copy: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 27,
    textAlign: "center",
    marginTop: 12
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 20,
    marginTop: 26,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  cardCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 8
  },
  valueList: {
    backgroundColor: "#FFF4D8",
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: "#F1D9A8",
    marginTop: 14,
    gap: 7
  },
  valueItem: {
    color: colors.greenDeep,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "900"
  },
  actions: {
    gap: 12,
    paddingTop: 18,
    paddingBottom: 6
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  half: {
    flex: 1
  }
});
