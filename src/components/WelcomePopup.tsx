import { Pressable, StyleSheet, Text, View } from "react-native";

import { BrandLogo } from "./BrandLogo";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";

type WelcomePopupProps = {
  onExploreMap: () => void;
  onOpenMeetups: () => void;
  onJoin: () => void;
  onClose: () => void;
};

const featureCards = [
  {
    title: "맛집·마사지·카페 찾기",
    copy: "호치민부터 다낭까지 여행자가 바로 갈 만한 장소를 지도에서 골라요."
  },
  {
    title: "번개모임 입장하기",
    copy: "식사, 카페, 이동 동행을 방처럼 들어가서 사람들과 맞춰요."
  },
  {
    title: "중고장터 보기",
    copy: "유심, 티켓, 여행용품을 읽고 필요하면 1:1 거래방으로 문의해요."
  }
];

export function WelcomePopup({ onExploreMap, onOpenMeetups, onJoin, onClose }: WelcomePopupProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.logoWrap}>
            <BrandLogo size={74} />
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>처음 오셨나요</Text>
        <Text style={styles.title}>MANGOMAP은 베트남 여행자를 위한 현지맵이에요</Text>
        <Text style={styles.copy}>장소 찾기, 번개모임, 중고장터를 한 화면에서 자연스럽게 이어가요.</Text>

        <View style={styles.featureList}>
          {featureCards.map((feature, index) => (
            <View key={feature.title} style={styles.featureCard}>
              <Text style={styles.featureNumber}>{index + 1}</Text>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureText}>{feature.copy}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onExploreMap} style={styles.primaryButton}>
            <Text style={styles.primaryText}>탐색칸 보기</Text>
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable accessibilityRole="button" onPress={onOpenMeetups} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>모임 둘러보기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onJoin} style={styles.joinButton}>
              <Text style={styles.joinText}>가입하고 시작</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.note}>닫으면 다음 접속부터는 바로 지도가 열려요.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(31,41,55,0.42)"
  },
  card: {
    width: "100%",
    maxWidth: 540,
    borderRadius: 30,
    padding: 18,
    backgroundColor: "rgba(255,247,223,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,159,28,0.34)",
    ...neonShadow
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  logoWrap: {
    width: 86,
    height: 86,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,159,28,0.24)",
    ...shadow
  },
  closeButton: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(138,90,0,0.16)"
  },
  closeText: {
    color: colors.greenDeep,
    fontSize: 13,
    fontWeight: "900"
  },
  eyebrow: {
    alignSelf: "flex-start",
    marginTop: 18,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingVertical: 6,
    color: colors.greenDeep,
    backgroundColor: "rgba(255,212,59,0.3)",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    marginTop: 12,
    color: colors.ink,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "900"
  },
  copy: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800"
  },
  featureList: {
    gap: 9,
    marginTop: 17
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 76,
    borderRadius: 22,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(235,216,166,0.95)",
    ...shadow
  },
  featureNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 34,
    color: "#FFFFFF",
    backgroundColor: colors.sunset,
    fontSize: 15,
    fontWeight: "900"
  },
  featureCopy: {
    flex: 1
  },
  featureTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  featureText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  actions: {
    gap: 10,
    marginTop: 18
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    ...sunsetGlow
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,159,28,0.24)"
  },
  secondaryText: {
    color: colors.greenDeep,
    fontSize: 14,
    fontWeight: "900"
  },
  joinButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cyan,
    borderWidth: 1,
    borderColor: "rgba(138,90,0,0.14)"
  },
  joinText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  note: {
    marginTop: 11,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "800"
  }
});
