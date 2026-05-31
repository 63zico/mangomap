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
        <Text style={styles.copy}>베트남 여행자 지도, 모임, 장터를 망고처럼 쉽게 찾아요.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>검색 대신 바로 쓸 수 있게</Text>
        <Text style={styles.cardCopy}>
          한국인 후기 많은 핫플, 숙소 기준 동선, 날씨 대체, 밤 이동 팁, 현지 번개까지 초행자 기준으로 정리해요.
        </Text>
        <View style={styles.valueList}>
          <Text style={styles.valueItem}>✓ 한국어 후기와 리뷰수 기준 핫플</Text>
          <Text style={styles.valueItem}>✓ 비 오거나 더울 때 바로 대체</Text>
          <Text style={styles.valueItem}>✓ 여행 중 동행/이벤트까지 확인</Text>
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
