import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { createLegalConsent, legalConfig, savePendingLegalConsent } from "../config/legal";
import { isSupabaseAuthConfigured, openSupabaseOAuth } from "../services/supabaseAuthService";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";
import type { AuthJoinPayload } from "../types/auth";

type SocialProvider = "kakao" | "google";

type AuthRequiredScreenProps = {
  title: string;
  copy: string;
  onJoin: (payload: AuthJoinPayload) => void;
  onClose?: () => void;
};

const authMethods: { id: SocialProvider; label: string; copy: string; badge: string }[] = [
  {
    id: "kakao",
    label: "카카오로 계속하기",
    copy: "한국 유저에게 가장 익숙한 로그인",
    badge: "추천"
  },
  {
    id: "google",
    label: "Google로 계속하기",
    copy: "해외 체류자와 안드로이드 유저에게 편한 로그인",
    badge: "공용"
  }
];

export function AuthRequiredScreen({ title, copy, onClose }: AuthRequiredScreenProps) {
  const [mode, setMode] = useState<SocialProvider>("google");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(() =>
    isSupabaseAuthConfigured()
      ? ""
      : "Supabase URL/Anon Key가 연결되어야 카카오와 Google 로그인을 사용할 수 있어요."
  );

  const supabaseReady = isSupabaseAuthConfigured();
  const selectedMethod = authMethods.find((method) => method.id === mode) ?? authMethods[0];
  const canSubmit = supabaseReady && termsAccepted && !loading;

  const startSocialLogin = () => {
    if (!termsAccepted) {
      setStatus("가입 전에 이용약관과 개인정보 처리방침 동의가 필요해요.");
      return;
    }

    if (!supabaseReady) {
      setStatus("Supabase 인증 설정이 아직 연결되지 않았어요. 환경변수와 OAuth Provider 설정을 먼저 확인해주세요.");
      return;
    }

    setLoading(true);
    savePendingLegalConsent(createLegalConsent());
    openSupabaseOAuth(mode);
    setStatus(`${selectedMethod.label} 화면으로 이동해요. 인증 후 망고베트남으로 돌아오면 가입이 완료돼요.`);
    setLoading(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.badge}>소셜 로그인</Text>
          {onClose ? (
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closePill}>
              <Text style={styles.closePillText}>닫기</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{copy}</Text>

        <View style={styles.methodGrid}>
          {authMethods.map((method) => {
            const active = method.id === mode;
            return (
              <Pressable
                accessibilityRole="button"
                key={method.id}
                onPress={() => {
                  setMode(method.id);
                  setStatus("");
                }}
                style={[
                  styles.methodButton,
                  active && styles.methodButtonActive,
                  method.id === "kakao" && styles.kakaoMethod,
                  method.id === "google" && styles.googleMethod
                ]}
              >
                <View style={styles.methodTop}>
                  <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>{method.label}</Text>
                  <Text style={[styles.methodBadge, active && styles.methodBadgeActive]}>{method.badge}</Text>
                </View>
                <Text style={[styles.methodCopy, active && styles.methodCopyActive]}>{method.copy}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
          onPress={() => setTermsAccepted((current) => !current)}
          style={[styles.termsBox, termsAccepted && styles.termsBoxActive]}
        >
          <View style={[styles.termsCheck, termsAccepted && styles.termsCheckActive]}>
            <Text style={styles.termsCheckText}>{termsAccepted ? "✓" : ""}</Text>
          </View>
          <View style={styles.termsCopy}>
            <Text style={styles.termsTitle}>{legalConfig.shortConsentText}</Text>
            <Text style={styles.termsDescription}>{legalConfig.communitySafetyText}</Text>
          </View>
        </Pressable>

        {status ? <Text style={styles.status}>{status}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={startSocialLogin}
          style={[
            styles.button,
            mode === "kakao" && styles.kakaoButton,
            mode === "google" && styles.googleButton,
            !canSubmit && styles.buttonDisabled
          ]}
        >
          <Text style={[styles.buttonText, mode === "kakao" && styles.kakaoButtonText, mode === "google" && styles.googleButtonText]}>
            {loading ? "연결 중" : selectedMethod.label}
          </Text>
        </Pressable>

        <Text style={styles.note}>
          지도와 스팟 탐색은 가입 없이 볼 수 있고, 모임/중고장터/채팅은 소셜 로그인 후 사용할 수 있어요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    flex: 1,
    backgroundColor: "rgba(255,247,223,0.96)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18
  },
  card: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.32)",
    padding: 18,
    ...neonShadow
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  badge: {
    alignSelf: "flex-start",
    color: colors.cyan,
    backgroundColor: "rgba(255,194,51,0.14)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  closePill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)"
  },
  closePillText: {
    color: colors.nightText,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.nightText,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 12
  },
  copy: {
    color: colors.nightMuted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800",
    marginTop: 8
  },
  methodGrid: {
    gap: 10,
    marginTop: 17
  },
  methodButton: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    ...shadow
  },
  methodButtonActive: {
    transform: [{ translateY: -1 }]
  },
  kakaoMethod: {
    backgroundColor: "#FEE500",
    borderColor: "rgba(55,35,0,0.16)"
  },
  googleMethod: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(122,80,0,0.16)"
  },
  methodTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  methodLabel: {
    color: colors.nightText,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900"
  },
  methodLabelActive: {
    color: "#1F2A37"
  },
  methodBadge: {
    color: "#6B7280",
    backgroundColor: "rgba(255,255,255,0.72)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900"
  },
  methodBadgeActive: {
    color: colors.sunset
  },
  methodCopy: {
    color: colors.nightMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 5
  },
  methodCopyActive: {
    color: "#4B5563"
  },
  termsBox: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)"
  },
  termsBoxActive: {
    backgroundColor: "rgba(255,194,51,0.16)",
    borderColor: "rgba(255,194,51,0.58)"
  },
  termsCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(122,80,0,0.28)",
    backgroundColor: "#FFFFFF"
  },
  termsCheckActive: {
    backgroundColor: colors.sunset,
    borderColor: colors.sunset
  },
  termsCheckText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  termsCopy: {
    flex: 1,
    minWidth: 0
  },
  termsTitle: {
    color: colors.nightText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  termsDescription: {
    color: colors.nightMuted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 3
  },
  status: {
    color: colors.sunset,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 11
  },
  button: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    ...sunsetGlow
  },
  kakaoButton: {
    backgroundColor: "#FEE500"
  },
  googleButton: {
    backgroundColor: colors.sunset
  },
  buttonDisabled: {
    opacity: 0.45
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "900"
  },
  kakaoButtonText: {
    color: "#1F2A37"
  },
  googleButtonText: {
    color: "#FFFFFF"
  },
  note: {
    color: colors.nightMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center"
  }
});
