import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { BrandLogo } from "./BrandLogo";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";

type WelcomePopupProps = {
  onExploreMap: () => void;
  onOpenPopularPlaces: () => void;
  onJoin: () => void;
  onClose: () => void;
};

const featureCards = [
  {
    title: "한국인 검증 장소",
    copy: "맛, 가격, 분위기, 위치를 한국인 여행자 기준으로 빠르게 확인해요."
  },
  {
    title: "후기와 제보로 최신화",
    copy: "최근 확인일, 한국어 후기, 제보 상태를 보고 실패 확률을 줄여요."
  },
  {
    title: "저장하고 후기 남기기",
    copy: "좋았던 장소를 저장하고 다음 여행자에게 짧은 팁을 남겨요."
  }
];

export function WelcomePopup({ onExploreMap, onOpenPopularPlaces, onJoin, onClose }: WelcomePopupProps) {
  const { width: measuredWidth } = useWindowDimensions();
  const windowLike = typeof globalThis.window !== "undefined" ? globalThis.window : undefined;
  const documentWidth = typeof document !== "undefined" ? document.documentElement?.clientWidth : undefined;
  const visibleWidth = Math.min(
    ...[
      documentWidth,
      windowLike?.visualViewport?.width,
      windowLike?.innerWidth,
      measuredWidth
    ].filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
  );
  const cardWidth = Platform.OS === "web" ? 324 : Math.min(Math.max(286, visibleWidth - 36), 336);
  const cardLeft = Platform.OS === "web" ? 18 : Math.max(12, (visibleWidth - cardWidth) / 2);

  return (
    <View style={[styles.overlay, Platform.OS === "web" && styles.webOverlay]}>
      <View style={[styles.card, { width: cardWidth, marginLeft: cardLeft }]}>
        <View style={styles.topRow}>
          <View style={styles.logoWrap}>
            <BrandLogo size={70} />
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>처음 오셨나요</Text>
        <Text style={styles.title}>MANGOMAP은 한국인이 검증한 베트남 현지맵이에요</Text>
        <Text style={styles.copy}>
          Google Maps의 넓은 정보에 한국어 후기와 제보 맥락을 더해, 여행자가 더 빨리 결정하게 도와줘요.
        </Text>

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
            <Text style={styles.primaryText}>탐색부터 보기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOpenPopularPlaces} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>인기 장소 보기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onJoin} style={styles.joinButton}>
            <Text style={styles.joinText}>가입하고 후기 남기기</Text>
          </Pressable>
        </View>

        <Text style={styles.note}>닫으면 다음 접속부터는 바로 탐색 화면이 열려요.</Text>
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
    alignItems: "flex-start",
    justifyContent: "center",
    paddingVertical: 18,
    backgroundColor: "rgba(31,41,55,0.42)"
  },
  webOverlay: {
    position: "fixed" as never
  },
  card: {
    width: "86%",
    maxWidth: 420,
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
    width: 82,
    height: 82,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,159,28,0.24)",
    ...shadow
  },
  closeButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
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
    marginTop: 16,
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
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    flexShrink: 1
  },
  copy: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800",
    flexShrink: 1
  },
  featureList: {
    gap: 9,
    marginTop: 16
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 72,
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
    flex: 1,
    flexShrink: 1
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
    gap: 9,
    marginTop: 16
  },
  primaryButton: {
    minHeight: 52,
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
  secondaryButton: {
    minHeight: 48,
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
    minHeight: 48,
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
    marginTop: 10,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "800"
  }
});
