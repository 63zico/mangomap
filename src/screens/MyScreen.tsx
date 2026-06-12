import { Pressable, StyleSheet, Text, View } from "react-native";

import { createElement, useState } from "react";
import { Image, Platform, TextInput } from "react-native";

import { AppShell } from "../components/AppShell";
import { Header } from "../components/Header";
import type { EngagementSummary } from "../services/mangomapEngagementService";
import { confirmSupabasePhoneTrustOtp, isSupabaseAuthConfigured, sendSupabasePhoneOtp } from "../services/supabaseAuthService";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";
import type { PlaceReport } from "../types";
import type { AuthProvider, MemberProfile } from "../types/auth";
import { getPlaceReportStatusLabel, getPlaceReportViewCount } from "../utils/placeReportRewards";
import { deletePlaceReservationInquiry, loadPlaceReservationInquiries, type PlaceReservationInquiry } from "../utils/placeReservationInquiries";

type MyScreenProps = {
  savedPlaceCount: number;
  placeReports: PlaceReport[];
  memberProfile?: MemberProfile;
  memberName?: string;
  memberProvider?: AuthProvider;
  memberIdentity?: string;
  memberTemperature: number;
  engagementSummary?: EngagementSummary;
  onOpenSaved: () => void;
  onOpenPlaces: () => void;
  onOpenReport: () => void;
  onOpenMeetups: () => void;
  onOpenMarketplace: () => void;
  onRequireAuth: () => void;
  onUpdateProfile: (updates: Partial<MemberProfile>) => void;
  onVerifyPhone?: (phone: string, phoneVerifiedAt: string) => void;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void>;
};

function getAuthProviderLabel(provider?: AuthProvider) {
  if (provider === "phone") return "전화번호";
  if (provider === "kakao") return "카카오";
  if (provider === "google") return "Google";
  return "닉네임";
}

function getAuthIdentity(provider?: AuthProvider, identity?: string) {
  if (!identity) return undefined;
  if (provider === "phone") {
    const digits = identity.replace(/\D/g, "");
    return digits.length >= 4 ? `끝자리 ${digits.slice(-4)}` : identity;
  }

  return identity;
}

function getExplorerLevel(savedPlaceCount: number, reportCount: number, approvedReportCount: number) {
  const score = savedPlaceCount * 2 + reportCount * 4 + approvedReportCount * 12;
  if (score >= 80) return { title: "🥭 망고 마스터", copy: "여행자들이 믿고 볼 수 있는 장소 품질을 꾸준히 만드는 단계예요." };
  if (score >= 36) return { title: "🥭 현지인급", copy: "저장과 제보가 쌓여 베트남 여행 동선을 잘 아는 단계예요." };
  if (score >= 12) return { title: "🥭 여행 탐험가", copy: "좋은 장소를 저장하고 검증된 정보를 모아가는 단계예요." };
  return { title: "🥭 망고 새싹", copy: "가고 싶은 장소를 저장하고 첫 제보를 남기면 레벨이 올라가요." };
}

const profileInterestOptions = ["맛집", "카페", "루프탑", "마사지", "관광명소", "현지생활"];
const travelStyleOptions = ["초행자", "현지맛집", "밤거리", "느긋한 일정", "사진 위주"];

type ProfileDraft = {
  nickname: string;
  avatarUri: string;
  bio: string;
  homeBase: string;
  travelStyle: string;
  interestTags: string[];
};

type SettingsDetailKey =
  | "blocked"
  | "safety"
  | "notifications"
  | "notice"
  | "support"
  | "terms"
  | "privacy"
  | "version";

const settingsDetailContent: Record<SettingsDetailKey, { title: string; subtitle: string; rows: { title: string; copy: string }[] }> = {
  blocked: {
    title: "차단 회원 관리",
    subtitle: "신고하거나 차단한 사용자의 후기와 제보는 최대한 보이지 않게 처리돼요.",
    rows: [
      { title: "차단 목록", copy: "후기와 제보에서 차단한 사용자가 여기에 모여요." },
      { title: "숨김 처리", copy: "차단한 사용자의 후기와 댓글은 목록에서 제외돼요." },
      { title: "해제 기능", copy: "차단 해제는 서버 차단 목록 연동 후 사용할 수 있게 준비 중이에요." }
    ]
  },
  safety: {
    title: "장소 신뢰 가이드",
    subtitle: "망고베트남은 한국인 여행자가 바로 판단할 수 있도록 검증 상태를 분리해서 보여줘요.",
    rows: [
      { title: "확인됨", copy: "주소, 카테고리, Google Maps 연결을 확인한 장소예요." },
      { title: "제보됨", copy: "여행자가 올린 정보이며 운영자 검토 전까지 분리해서 표시해요." },
      { title: "정보 수정", copy: "영업시간, 폐업, 이전, 가격 변동은 제보 후 검토합니다." }
    ]
  },
  notifications: {
    title: "알림 설정",
    subtitle: "저장한 장소, 후기, 제보 상태 변경을 앱 안 배지와 토스트로 먼저 보여줘요.",
    rows: [
      { title: "저장 장소", copy: "영업시간이나 주소가 바뀌면 알림 후보로 관리해요." },
      { title: "후기 댓글", copy: "내가 쓴 후기와 댓글 반응을 알려주는 구조를 준비 중이에요." },
      { title: "푸시 알림", copy: "앱스토어/플레이스토어 패키징 후 기기 푸시 권한을 연결할 예정이에요." }
    ]
  },
  notice: {
    title: "공지사항",
    subtitle: "망고베트남 운영 공지와 업데이트 기록을 모아둘 공간이에요.",
    rows: [
      { title: "현재 버전", copy: "망고베트남의 베트남 현지 장소 가이드를 테스트 중이에요." },
      { title: "최근 개선", copy: "장소 상세, 한국어 후기, 제보, 저장 흐름을 중심으로 정리했어요." },
      { title: "다음 예정", copy: "제보 승인 관리, 업체 혜택, 장소별 공유 화면을 정리할 예정이에요." }
    ]
  },
  support: {
    title: "고객센터",
    subtitle: "오류, 제휴, 신고 문의는 운영자가 확인할 수 있는 채널로 연결해야 해요.",
    rows: [
      { title: "오류 신고", copy: "장소 위치 오류, 로그인 문제, 후기/제보 저장 실패 화면을 캡처해서 문의하면 빨라요." },
      { title: "장소 제보", copy: "허위 정보, 악성 후기, 부적절한 사진은 제보 후 운영자 검토로 관리해요." },
      { title: "문의 채널", copy: "출시 전에는 운영자 카카오톡 채널 또는 이메일 연결을 추가하는 것이 좋아요." }
    ]
  },
  terms: {
    title: "이용약관",
    subtitle: "망고베트남을 안전하게 쓰기 위한 기본 이용 규칙이에요.",
    rows: [
      { title: "커뮤니티", copy: "허위 정보, 광고성 도배, 타인 비방, 개인정보 노출은 제한돼요." },
      { title: "장소 후기", copy: "방문하지 않은 장소를 확정적으로 단정하거나 악의적으로 비방하면 제한될 수 있어요." },
      { title: "장소 제보", copy: "주소, 영업시간, 폐업 여부는 검토 후 지도에 반영돼요." }
    ]
  },
  privacy: {
    title: "개인정보 처리방침",
    subtitle: "로그인, 프로필, 저장 장소, 후기, 제보 데이터는 서비스 제공 목적에 맞춰 사용돼요.",
    rows: [
      { title: "수집 정보", copy: "소셜 로그인 식별자, 닉네임, 프로필, 저장 장소, 후기와 제보가 저장될 수 있어요." },
      { title: "보관 목적", copy: "장소 추천 품질 개선, 신고 처리, 서비스 안전 관리에 사용돼요." },
      { title: "삭제 요청", copy: "설정 하단 계정 관리에서 삭제 요청을 남기면 운영자 확인 후 처리돼요." }
    ]
  },
  version: {
    title: "버전정보",
    subtitle: "현재 앱 빌드와 연결 상태를 확인해요.",
    rows: [
      { title: "앱 이름", copy: "망고베트남" },
      { title: "버전", copy: "1.0.0" },
      { title: "서버", copy: "Supabase 인증, 데이터베이스, 스토리지 연동 테스트 중" }
    ]
  }
};

function createProfileDraft(profile?: MemberProfile, fallbackName = ""): ProfileDraft {
  return {
    nickname: profile?.nickname ?? fallbackName,
    avatarUri: profile?.avatarUri ?? "",
    bio: profile?.bio ?? "",
    homeBase: profile?.homeBase ?? "",
    travelStyle: profile?.travelStyle ?? "",
    interestTags: profile?.interestTags ?? []
  };
}

function PhotoFilePicker({ onPick }: { onPick: (photo: string) => void }) {
  if (Platform.OS !== "web") {
    return (
      <View style={styles.filePickerFallback}>
        <Text style={styles.filePickerFallbackText}>사진 선택</Text>
      </View>
    );
  }

  return createElement("input", {
    type: "file",
    accept: "image/*",
    onChange: (event: { target?: { files?: FileList; value?: string } }) => {
      const file = event.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onPick(String(reader.result ?? ""));
      reader.readAsDataURL(file);
      if (event.target) event.target.value = "";
    },
    style: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      borderRadius: 16,
      border: "1px solid rgba(255,194,51,0.26)",
      background: "rgba(255,255,255,0.08)",
      color: colors.ink,
      fontWeight: 800,
      fontSize: 13,
      padding: "10px 12px"
    }
  });
}

export function MyScreen({
  savedPlaceCount,
  placeReports,
  memberProfile,
  memberName,
  memberProvider,
  memberIdentity,
  memberTemperature,
  engagementSummary,
  onOpenSaved,
  onOpenPlaces,
  onOpenReport,
  onOpenMeetups,
  onOpenMarketplace,
  onRequireAuth,
  onUpdateProfile,
  onVerifyPhone,
  onLogout,
  onDeleteAccount
}: MyScreenProps) {
  const pendingReports = placeReports.filter((report) => String(report.status) === "검토중").length;
  const reflectionWaitingReports = placeReports.filter((report) => report.mapReflectionStatus === "지도 반영 대기").length;
  const approvedReports = placeReports.filter((report) => String(report.status) === "승인" || String(report.status) === "승인됨").length;
  const rejectedReports = placeReports.filter((report) => String(report.status) === "반려").length;
  const reportViewCount = placeReports.reduce((total, report) => total + getPlaceReportViewCount(report), 0);
  const contributionImpactCount = reportViewCount + approvedReports * 5;
  const hasContributionActivity = placeReports.length > 0 || savedPlaceCount > 0;
  const explorerLevel = getExplorerLevel(savedPlaceCount, placeReports.length, approvedReports);
  const displayName = memberName ?? "비회원";
  const myTemperature = memberName ? `${memberTemperature.toFixed(1)}°C` : "-";
  const mangoTemperatureTitle = memberName ? `망고온도 ${myTemperature}` : "가입하면 망고온도가 생겨요";
  const mangoTemperatureCopy = memberName
    ? "정확한 장소 제보와 한국어 후기가 쌓이면 올라가는 망고베트남의 대표 신뢰 지표예요."
    : "장소 제보와 한국어 후기 활동이 하나의 신뢰 온도로 쌓여요.";
  const authProviderLabel = getAuthProviderLabel(memberProvider);
  const authIdentity = getAuthIdentity(memberProvider, memberIdentity);
  const profileComplete = Boolean(memberProfile?.avatarUri || memberProfile?.bio || memberProfile?.homeBase || memberProfile?.travelStyle || memberProfile?.interestTags?.length);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => createProfileDraft(memberProfile, displayName));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDetailKey, setSettingsDetailKey] = useState<SettingsDetailKey | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(memberProfile?.phone ?? "");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const phoneVerified = Boolean(memberProfile?.phoneVerifiedAt);
  const activitySummary = engagementSummary ?? {
    savedCount: savedPlaceCount,
    reviewCount: 0,
    checkinCount: 0,
    pointBalance: 0,
    badgeLabel: "망고 새싹",
    recentReviews: [],
    recentCheckins: []
  };
  const [reservationInquiries, setReservationInquiries] = useState<PlaceReservationInquiry[]>(() => loadPlaceReservationInquiries());

  const refreshReservationInquiries = () => {
    setReservationInquiries(loadPlaceReservationInquiries());
  };

  const removeReservationInquiry = (id: string) => {
    deletePlaceReservationInquiry(id);
    refreshReservationInquiries();
  };

  const openProfileEditor = () => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    setProfileDraft(createProfileDraft(memberProfile, displayName));
    setProfileEditorOpen(true);
  };

  const updateProfileDraft = <Key extends keyof ProfileDraft>(key: Key, value: ProfileDraft[Key]) => {
    setProfileDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleInterestTag = (tag: string) => {
    setProfileDraft((current) => ({
      ...current,
      interestTags: current.interestTags.includes(tag) ? current.interestTags.filter((item) => item !== tag) : [...current.interestTags, tag]
    }));
  };

  const saveProfile = () => {
    onUpdateProfile({
      nickname: profileDraft.nickname.trim() || displayName,
      avatarUri: profileDraft.avatarUri.trim() || undefined,
      bio: profileDraft.bio.trim() || undefined,
      homeBase: profileDraft.homeBase.trim() || undefined,
      travelStyle: profileDraft.travelStyle.trim() || undefined,
      interestTags: profileDraft.interestTags
    });
    setProfileEditorOpen(false);
  };

  const requestDeleteAccount = async () => {
    setDeleteBusy(true);
    await onDeleteAccount();
    setDeleteBusy(false);
    setDeleteConfirmOpen(false);
  };

  const requestPhoneOtp = async () => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    const normalizedPhone = phoneDraft.trim();
    if (normalizedPhone.length < 8) {
      setPhoneStatus("국가번호를 포함한 전화번호를 입력해주세요. 예: +821012345678");
      return;
    }
    if (!isSupabaseAuthConfigured()) {
      setPhoneStatus("Supabase 전화 인증 설정이 아직 연결되지 않았어요.");
      return;
    }

    setPhoneBusy(true);
    setPhoneStatus("");
    try {
      await sendSupabasePhoneOtp(normalizedPhone);
      setPhoneOtpSent(true);
      setPhoneStatus("인증번호를 보냈어요. 문자로 받은 6자리를 입력해주세요.");
    } catch {
      setPhoneStatus("인증번호를 보내지 못했어요. Supabase SMS Provider 설정을 확인해주세요.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const confirmPhoneOtp = async () => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    if (phoneCode.trim().length < 4) {
      setPhoneStatus("문자로 받은 인증번호를 입력해주세요.");
      return;
    }

    setPhoneBusy(true);
    setPhoneStatus("");
    try {
      const result = await confirmSupabasePhoneTrustOtp(phoneCode.trim());
      onVerifyPhone?.(result.phone, result.phoneVerifiedAt);
      setPhoneOtpSent(false);
      setPhoneCode("");
      setPhoneStatus("전화번호 인증이 완료됐어요. 이제 후기와 제보 신뢰 표시를 강화할 수 있어요.");
    } catch {
      setPhoneStatus("인증번호가 맞지 않거나 만료됐어요. 다시 확인해주세요.");
    } finally {
      setPhoneBusy(false);
    }
  };

  if (settingsOpen) {
    const settingsDetail = settingsDetailKey ? settingsDetailContent[settingsDetailKey] : null;

    return (
      <AppShell withBottomNav backgroundColor="#FFF7DF">
        <View style={styles.settingsHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (settingsDetailKey) {
                setSettingsDetailKey(null);
                return;
              }
              setSettingsOpen(false);
            }}
            style={styles.settingsBackButton}
          >
            <Text style={styles.settingsBackText}>‹</Text>
          </Pressable>
          <Text style={styles.settingsTitle}>{settingsDetail ? settingsDetail.title : "설정"}</Text>
          <View style={styles.settingsHeaderSpacer} />
        </View>

        {settingsDetail ? (
          <View style={styles.settingsDetailCard}>
            <Text style={styles.settingsDetailSubtitle}>{settingsDetail.subtitle}</Text>
            <View style={styles.settingsDetailList}>
              {settingsDetail.rows.map((row) => (
                <InfoRow key={row.title} title={row.title} copy={row.copy} />
              ))}
            </View>
          </View>
        ) : (
          <>

        <View style={styles.settingsGroup}>
          <Text style={styles.settingsGroupTitle}>계정</Text>
          <SettingsRow
            title="회원 정보 설정"
            value={memberName ? displayName : "로그인 필요"}
            onPress={
              memberName
                ? () => {
                    setSettingsOpen(false);
                    openProfileEditor();
                  }
                : onRequireAuth
            }
          />
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.settingsGroupTitle}>관리</Text>
          <SettingsRow title="제보한 장소 관리" value="검토중·승인 상태" onPress={onOpenReport} />
          <SettingsRow title="차단 회원 관리" value="숨김·해제 안내" onPress={() => setSettingsDetailKey("blocked")} />
          <SettingsRow title="장소 신뢰 가이드" value="후기·제보 기준" onPress={() => setSettingsDetailKey("safety")} />
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.settingsGroupTitle}>알림</Text>
          <SettingsRow title="알림 설정" value="후기·제보·저장 장소" onPress={() => setSettingsDetailKey("notifications")} />
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.settingsGroupTitle}>앱 정보</Text>
          <SettingsRow title="공지사항" value="망고베트남" onPress={() => setSettingsDetailKey("notice")} />
          <SettingsRow title="고객센터" value="문의하기" onPress={() => setSettingsDetailKey("support")} />
          <SettingsRow title="이용약관" onPress={() => setSettingsDetailKey("terms")} />
          <SettingsRow title="개인정보 처리방침" onPress={() => setSettingsDetailKey("privacy")} />
          <SettingsRow title="버전정보" value="1.0.0" onPress={() => setSettingsDetailKey("version")} />
        </View>

        {memberName ? (
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>로그인</Text>
            <SettingsRow title={`로그아웃 (${displayName})`} onPress={onLogout} />
          </View>
        ) : null}

        {memberName ? (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>계정 관리</Text>
            <Text style={styles.dangerZoneCopy}>탈퇴와 개인정보 삭제 요청은 운영자 확인 후 처리돼요.</Text>
            {deleteConfirmOpen ? (
              <View style={styles.deleteConfirmBox}>
                <Text style={styles.deleteConfirmText}>정말 계정 삭제를 요청할까요?</Text>
                <View style={styles.deleteActionRow}>
                  <Pressable accessibilityRole="button" onPress={() => setDeleteConfirmOpen(false)} style={styles.deleteCancelButton}>
                    <Text style={styles.deleteCancelText}>취소</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={deleteBusy} onPress={requestDeleteAccount} style={styles.deleteConfirmButton}>
                    <Text style={styles.deleteConfirmButtonText}>{deleteBusy ? "요청 중" : "삭제 요청"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setDeleteConfirmOpen(true)} style={styles.dangerLink}>
                <Text style={styles.dangerLinkText}>계정 삭제 요청</Text>
              </Pressable>
            )}
          </View>
        ) : null}
          </>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell withBottomNav backgroundColor="#FFF7DF">
      <Header
        eyebrow="마이"
        title="내 활동"
        subtitle="찜한 스팟, 제보, 한국어 후기를 한 곳에서 관리해요."
        compactMascot
        dark
      />

      <View style={styles.profile}>
        <Pressable accessibilityRole="button" disabled={!memberName} onPress={openProfileEditor} style={styles.avatar}>
          {memberProfile?.avatarUri ? (
            <Image source={{ uri: memberProfile.avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          )}
          {memberName ? (
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>⚙</Text>
            </View>
          ) : null}
        </Pressable>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{displayName}</Text>
          {memberName ? <Text style={styles.authBadge}>{authProviderLabel} 인증{authIdentity ? ` · ${authIdentity}` : ""}</Text> : null}
          <Text style={styles.copy}>
            {memberName
              ? memberProfile?.bio ?? "장소 제보와 한국어 후기를 남길 수 있는 인증 계정이에요."
              : "지도와 탐색은 바로 볼 수 있고, 후기와 제보는 카카오/Google 로그인 후 이용해요."}
          </Text>
          {memberName && (memberProfile?.homeBase || memberProfile?.travelStyle) ? (
            <View style={styles.profileMetaRow}>
              {memberProfile.homeBase ? <Text style={styles.profileMeta}>{memberProfile.homeBase}</Text> : null}
              {memberProfile.travelStyle ? <Text style={styles.profileMeta}>{memberProfile.travelStyle}</Text> : null}
            </View>
          ) : null}
          {memberName && memberProfile?.interestTags?.length ? (
            <View style={styles.profileTagRow}>
              {memberProfile.interestTags.slice(0, 4).map((tag) => (
                <View key={tag} style={styles.profileTag}>
                  <Text style={styles.profileTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {memberName ? (
          <View style={styles.profileActions}>
            <Pressable accessibilityRole="button" onPress={openProfileEditor} style={styles.profileEditButton}>
              <Text style={styles.profileEditText}>{profileComplete ? "수정" : "등록"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setSettingsOpen(true)} style={styles.logoutButton}>
              <Text style={styles.logoutText}>설정</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.profileActions}>
            <Pressable accessibilityRole="button" onPress={onRequireAuth} style={styles.profileEditButton}>
              <Text style={styles.profileEditText}>가입하기</Text>
            </Pressable>
          </View>
        )}
      </View>

      {false ? (
        <View style={[styles.phoneTrustCard, phoneVerified && styles.phoneTrustCardVerified]}>
          <View style={styles.phoneTrustHeader}>
            <View>
              <Text style={styles.phoneTrustEyebrow}>후기 신뢰 인증</Text>
              <Text style={styles.phoneTrustTitle}>{phoneVerified ? "전화번호 인증 완료" : "전화번호 인증이 필요해요"}</Text>
              <Text style={styles.phoneTrustCopy}>
                {phoneVerified
                  ? "장소 후기와 제보 신뢰 표시를 더 강하게 사용할 수 있어요."
                  : "구글/카카오 로그인은 가입용이고, 전화번호는 신뢰 제보가 필요할 때만 쓰는 보조 인증이에요."}
              </Text>
            </View>
            <Text style={styles.phoneTrustBadge}>{phoneVerified ? "인증됨" : "필요"}</Text>
          </View>
          {!phoneVerified ? (
            <View style={styles.phoneTrustForm}>
              <TextInput
                value={phoneDraft}
                onChangeText={setPhoneDraft}
                placeholder="+821012345678"
                placeholderTextColor="#8B7350"
                keyboardType="phone-pad"
                style={styles.phoneInput}
              />
              <Pressable accessibilityRole="button" disabled={phoneBusy} onPress={requestPhoneOtp} style={styles.phoneOtpButton}>
                <Text style={styles.phoneOtpButtonText}>{phoneOtpSent ? "다시 받기" : "인증번호 받기"}</Text>
              </Pressable>
              {phoneOtpSent ? (
                <View style={styles.phoneCodeRow}>
                  <TextInput
                    value={phoneCode}
                    onChangeText={setPhoneCode}
                    placeholder="인증번호 6자리"
                    placeholderTextColor="#8B7350"
                    keyboardType="number-pad"
                    style={styles.phoneCodeInput}
                  />
                  <Pressable accessibilityRole="button" disabled={phoneBusy} onPress={confirmPhoneOtp} style={styles.phoneConfirmButton}>
                    <Text style={styles.phoneConfirmButtonText}>확인</Text>
                  </Pressable>
                </View>
              ) : null}
              {phoneStatus ? <Text style={styles.phoneStatusText}>{phoneStatus}</Text> : null}
            </View>
          ) : (
            <Text style={styles.phoneVerifiedText}>{memberProfile?.phone ? `${memberProfile?.phone} · ` : ""}{memberProfile?.phoneVerifiedAt?.slice(0, 10)} 인증</Text>
          )}
        </View>
      ) : null}

      {profileEditorOpen && memberName ? (
        <View style={styles.profileEditor}>
          <View style={styles.profileEditorHeader}>
            <View>
              <Text style={styles.profileEditorEyebrow}>프로필</Text>
              <Text style={styles.profileEditorTitle}>{profileComplete ? "내 프로필 수정" : "내 프로필 등록"}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setProfileEditorOpen(false)} style={styles.profileEditorClose}>
              <Text style={styles.profileEditorCloseText}>닫기</Text>
            </Pressable>
          </View>

          <Text style={styles.formLabel}>프로필 사진</Text>
          <View style={styles.photoInputRow}>
            {profileDraft.avatarUri ? (
              <Image source={{ uri: profileDraft.avatarUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>{displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <PhotoFilePicker onPick={(photo) => updateProfileDraft("avatarUri", photo)} />
          </View>

          <Text style={styles.formLabel}>닉네임</Text>
          <TextInput
            value={profileDraft.nickname}
            onChangeText={(value) => updateProfileDraft("nickname", value)}
            placeholder="예: 호치민 하이"
            placeholderTextColor="#7E95A4"
            style={styles.textInput}
          />

          <Text style={styles.formLabel}>한줄소개</Text>
          <TextInput
            value={profileDraft.bio}
            onChangeText={(value) => updateProfileDraft("bio", value)}
            placeholder="예: 1군 맛집이랑 밤거리 같이 보는 여행자"
            placeholderTextColor="#7E95A4"
            style={[styles.textInput, styles.multilineInput]}
            multiline
          />

          <View style={styles.formTwoColumn}>
            <View style={styles.formColumn}>
              <Text style={styles.formLabel}>주 활동지역</Text>
              <TextInput
                value={profileDraft.homeBase}
                onChangeText={(value) => updateProfileDraft("homeBase", value)}
                placeholder="예: 호치민 1군"
                placeholderTextColor="#7E95A4"
                style={styles.textInput}
              />
            </View>
            <View style={styles.formColumn}>
              <Text style={styles.formLabel}>여행 스타일</Text>
              <TextInput
                value={profileDraft.travelStyle}
                onChangeText={(value) => updateProfileDraft("travelStyle", value)}
                placeholder="예: 밤거리·맛집"
                placeholderTextColor="#7E95A4"
                style={styles.textInput}
              />
            </View>
          </View>

          <Text style={styles.formLabel}>관심사</Text>
          <View style={styles.chipRow}>
            {profileInterestOptions.map((tag) => {
              const active = profileDraft.interestTags.includes(tag);
              return (
                <Pressable key={tag} accessibilityRole="button" onPress={() => toggleInterestTag(tag)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.formLabel}>빠른 스타일</Text>
          <View style={styles.chipRow}>
            {travelStyleOptions.map((style) => (
              <Pressable key={style} accessibilityRole="button" onPress={() => updateProfileDraft("travelStyle", style)} style={[styles.chip, profileDraft.travelStyle === style && styles.chipActive]}>
                <Text style={[styles.chipText, profileDraft.travelStyle === style && styles.chipTextActive]}>{style}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable accessibilityRole="button" onPress={saveProfile} style={styles.saveProfileButton}>
            <Text style={styles.saveProfileText}>프로필 저장</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.rewardLoopCard}>
        <View style={styles.rewardLoopHeader}>
          <View>
            <Text style={styles.rewardLoopEyebrow}>MANGO VIETNAM LOOP</Text>
            <Text style={styles.rewardLoopTitle}>{memberName ? activitySummary.badgeLabel : "로그인하면 활동이 쌓여요"}</Text>
            <Text style={styles.rewardLoopCopy}>저장, 후기, 체크인을 포인트 원장으로 기록해 재방문 이유를 만듭니다.</Text>
          </View>
          <View style={styles.rewardPointBadge}>
            <Text style={styles.rewardPointValue}>{activitySummary.pointBalance.toLocaleString("ko-KR")}P</Text>
            <Text style={styles.rewardPointLabel}>보유</Text>
          </View>
        </View>
        <View style={styles.rewardMetricRow}>
          <RewardMetric label="저장" value={`${activitySummary.savedCount}곳`} />
          <RewardMetric label="후기" value={`${activitySummary.reviewCount}개`} />
          <RewardMetric label="체크인" value={`${activitySummary.checkinCount}회`} />
        </View>
        <View style={styles.rewardRuleRow}>
          <Text style={styles.rewardRule}>저장 +50P</Text>
          <Text style={styles.rewardRule}>후기 +200P</Text>
          <Text style={styles.rewardRule}>체크인 +500P</Text>
        </View>
      </View>

      <View style={styles.activityOverviewCard}>
        <View style={styles.activityOverviewTop}>
          <View style={styles.activityOverviewCopy}>
            <Text style={styles.activityOverviewEyebrow}>내 망고베트남</Text>
            <Text style={styles.activityOverviewTitle}>{memberName ? explorerLevel.title : "저장과 제보를 한 곳에서 관리"}</Text>
            <Text style={styles.activityOverviewText}>
              {memberName
                ? explorerLevel.copy
                : "로그인하면 찜한 장소, 스팟 제보, 한국어 후기를 관리할 수 있어요."}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => setSettingsOpen(true)} style={styles.activitySettingsButton}>
            <Text style={styles.activitySettingsText}>설정</Text>
          </Pressable>
        </View>

        <View style={styles.activityMetricRow}>
          <View style={styles.activityMetric}>
            <Text style={styles.activityMetricLabel}>저장</Text>
            <Text style={styles.activityMetricValue}>{savedPlaceCount}곳</Text>
          </View>
          <View style={styles.activityMetric}>
            <Text style={styles.activityMetricLabel}>제보</Text>
            <Text style={styles.activityMetricValue}>{placeReports.length}건</Text>
          </View>
          <View style={styles.activityMetric}>
            <Text style={styles.activityMetricLabel}>지도 반영</Text>
            <Text style={styles.activityMetricValue}>{approvedReports}건</Text>
          </View>
        </View>

        {placeReports.length > 0 ? (
          <View style={styles.activityRecentReport}>
            <View style={styles.activityRecentCopy}>
              <Text style={styles.activityRecentLabel}>최근 제보</Text>
              <Text style={styles.activityRecentTitle} numberOfLines={1}>{placeReports[0].name}</Text>
            </View>
            <Text style={styles.activityRecentBadge}>{getPlaceReportStatusLabel(placeReports[0])}</Text>
          </View>
        ) : null}

        <View style={styles.activityActionList}>
          <Pressable accessibilityRole="button" onPress={onOpenPlaces} style={styles.activityActionRow}>
            <View>
              <Text style={styles.activityActionTitle}>장소 찾기</Text>
              <Text style={styles.activityActionCopy}>검증된 맛집, 카페, 마사지 보기</Text>
            </View>
            <Text style={styles.activityActionArrow}>›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={savedPlaceCount > 0 ? onOpenSaved : onOpenPlaces} style={styles.activityActionRow}>
            <View>
              <Text style={styles.activityActionTitle}>찜한 장소</Text>
              <Text style={styles.activityActionCopy}>{savedPlaceCount > 0 ? "저장한 장소 다시 보기" : "마음에 드는 장소를 저장해보세요"}</Text>
            </View>
            <Text style={styles.activityActionArrow}>›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOpenReport} style={styles.activityActionRow}>
            <View>
              <Text style={styles.activityActionTitle}>스팟 제보</Text>
              <Text style={styles.activityActionCopy}>새 장소나 잘못된 정보 알려주기</Text>
            </View>
            <Text style={styles.activityActionArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.reservationInboxCard}>
        <View style={styles.reservationInboxHeader}>
          <View style={styles.reservationInboxCopy}>
            <Text style={styles.reservationInboxEyebrow}>예약 문의 관리</Text>
            <Text style={styles.reservationInboxTitle}>저장한 예약 문의 초안</Text>
            <Text style={styles.reservationInboxText}>장소 상세에서 날짜와 인원을 남기면 여기에서 다시 확인할 수 있어요.</Text>
          </View>
          <View style={styles.reservationInboxBadge}>
            <Text style={styles.reservationInboxBadgeValue}>{reservationInquiries.length}</Text>
            <Text style={styles.reservationInboxBadgeLabel}>건</Text>
          </View>
        </View>
        {reservationInquiries.length > 0 ? (
          <View style={styles.reservationInquiryList}>
            {reservationInquiries.slice(0, 4).map((inquiry) => (
              <View key={inquiry.id} style={styles.reservationInquiryCard}>
                <View style={styles.reservationInquiryTop}>
                  <View style={styles.reservationInquiryTitleWrap}>
                    <Text style={styles.reservationInquiryPlace} numberOfLines={1}>{inquiry.placeName}</Text>
                    <Text style={styles.reservationInquiryMeta}>{inquiry.city} · {formatReservationInquiryDate(inquiry.createdAt)}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${inquiry.placeName} 예약 문의 초안 삭제`} onPress={() => removeReservationInquiry(inquiry.id)} style={styles.reservationInquiryDelete}>
                    <Text style={styles.reservationInquiryDeleteText}>삭제</Text>
                  </Pressable>
                </View>
                <Text style={styles.reservationInquiryDraft} numberOfLines={2}>{inquiry.draft}</Text>
                <Text style={styles.reservationInquiryStatus}>아직 전송 전 초안이에요. 제휴 예약 연결 시 바로 이어질 수 있어요.</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.reservationInboxEmpty}>
            <Text style={styles.reservationInboxEmptyTitle}>아직 문의 초안이 없어요</Text>
            <Text style={styles.reservationInboxEmptyText}>검증 TOP 장소에서 예약 날짜, 인원, 요청사항을 먼저 남겨보세요.</Text>
            <Pressable accessibilityRole="button" onPress={onOpenPlaces} style={styles.reservationInboxEmptyButton}>
              <Text style={styles.reservationInboxEmptyButtonText}>검증 장소 보기</Text>
            </Pressable>
          </View>
        )}
      </View>

      {false ? (
        <>
      <View style={[styles.statsGrid, styles.hiddenBlock]}>
        <StatCard label="찜한 스팟" value={`${savedPlaceCount}곳`} />
        <StatCard label="스팟 제보" value={`${placeReports.length}건`} />
        <StatCard label="망고온도" value={myTemperature} />
      </View>

      <View style={[styles.mangoLevelCard, styles.hiddenBlock]}>
        <View style={styles.mangoLevelTop}>
          <View>
            <Text style={styles.mangoLevelEyebrow}>망고베트남 신뢰</Text>
            <Text style={styles.mangoLevelTitle}>{mangoTemperatureTitle}</Text>
          </View>
          <Text style={styles.mangoLevelBadge}>{memberName ? "대표 지표" : "시작"}</Text>
        </View>
        <Text style={styles.mangoLevelCopy}>{mangoTemperatureCopy}</Text>
        <View style={styles.mangoRuleGrid}>
          <View style={styles.mangoRuleCard}>
            <Text style={styles.mangoRuleValue}>+0.2°C</Text>
            <Text style={styles.mangoRuleLabel}>한국어 후기</Text>
          </View>
          <View style={styles.mangoRuleCard}>
            <Text style={styles.mangoRuleValue}>+0.3°C</Text>
            <Text style={styles.mangoRuleLabel}>스팟 제보</Text>
          </View>
        </View>
        <View style={styles.mangoMissionRow}>
          {hasContributionActivity ? (
            <>
              <Text style={styles.mangoMissionPill}>제보 조회 {contributionImpactCount}명</Text>
              <Text style={styles.mangoMissionPill}>지도 반영 {approvedReports}건</Text>
              <Text style={styles.mangoMissionPill}>내 제보 {placeReports.length}건</Text>
            </>
          ) : (
            <>
              <Text style={styles.mangoMissionPill}>온도 시작점</Text>
              <Text style={styles.mangoMissionPill}>첫 후기 대기</Text>
              <Text style={styles.mangoMissionPill}>첫 제보 대기</Text>
            </>
          )}
        </View>
      </View>

      <View style={[styles.quickGrid, styles.hiddenBlock]}>
        <ActionCard
          title="찜한 스팟"
          copy={savedPlaceCount > 0 ? "저장한 장소 다시 보기" : "마음에 드는 스팟 저장하기"}
          badge={`${savedPlaceCount}곳`}
          actionLabel={savedPlaceCount > 0 ? "저장 목록 보기" : "장소 둘러보기"}
          onPress={savedPlaceCount > 0 ? onOpenSaved : onOpenPlaces}
        />
        <ActionCard
          title="스팟 제보"
          copy="새 장소·영업시간·주소 수정 제보"
          badge="제보"
          actionLabel="제보하러 가기"
          onPress={onOpenReport}
        />
        <ActionCard
          title="한국어 후기"
          copy="방문 팁과 가격·분위기 기록"
          badge={memberName ? "작성" : "가입 필요"}
          actionLabel="후기 남기기"
          onPress={onOpenPlaces}
        />
        <ActionCard
          title="지도에서 찾기"
          copy="검증된 맛집·카페·마사지 보기"
          badge="탐색"
          actionLabel="장소 보기"
          onPress={onOpenPlaces}
        />
      </View>

      <View style={[styles.reportStatusCard, styles.hiddenBlock]}>
        <View style={styles.reportStatusHeader}>
          <View>
            <Text style={styles.reportStatusEyebrow}>내 제보 현황</Text>
            <Text style={styles.reportStatusTitle}>{placeReports.length > 0 ? `총 ${placeReports.length}건 제보` : "아직 제보한 스팟이 없어요"}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onOpenReport} style={styles.reportStatusButton}>
            <Text style={styles.reportStatusButtonText}>{placeReports.length > 0 ? "관리" : "제보"}</Text>
          </Pressable>
        </View>
        {placeReports.length > 0 ? (
          <View style={styles.reportSummaryRow}>
            <Text style={styles.reportSummaryPill}>검토중 {pendingReports}건</Text>
            <Text style={styles.reportSummaryPill}>반영 대기 {reflectionWaitingReports}건</Text>
            <Text style={styles.reportSummaryPill}>승인 {approvedReports}건</Text>
            {rejectedReports > 0 ? <Text style={styles.reportSummaryPill}>반려 {rejectedReports}건</Text> : null}
            <Text style={styles.reportSummaryPill}>기여 영향 {contributionImpactCount}명</Text>
            <Text style={styles.reportSummaryPill}>조회 {reportViewCount}명</Text>
          </View>
        ) : null}
        {placeReports.length > 0 ? (
          <View style={styles.reportList}>
            {placeReports.slice(0, 3).map((report) => (
              <View key={report.id} style={styles.reportItem}>
                <View style={styles.reportItemCopy}>
                  <Text style={styles.reportName} numberOfLines={1}>{report.name}</Text>
                  <Text style={styles.reportMeta} numberOfLines={1}>{report.city ?? "호치민"} · {report.category} · {report.area}</Text>
                </View>
                <View style={styles.reportImpact}>
                  <Text style={styles.reportBadge}>{getPlaceReportStatusLabel(report)}</Text>
                  <Text style={styles.reportImpactText}>{getPlaceReportViewCount(report)}명 봄</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.reportEmptyCopy}>좋았던 맛집, 마사지, 카페, 가라오케를 올리면 검토중 상태로 여기서 확인할 수 있어요.</Text>
        )}
      </View>

      <View style={[styles.noticeCard, styles.hiddenBlock]}>
        <Text style={styles.noticeEyebrow}>장소 신뢰 기준</Text>
        <InfoRow title="확인됨" copy="주소·카테고리·Google Maps 연결을 확인한 장소예요." />
        <InfoRow title="한국어 후기" copy="한국인 여행자가 가격, 분위기, 접근성을 남기면 신뢰도가 올라가요." />
        <InfoRow title="스팟 제보" copy="여행자가 직접 올린 장소는 검토중 상태로 분리해서 관리해요." />
      </View>
        </>
      ) : null}
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ActionCard({
  title,
  copy,
  badge,
  actionLabel,
  onPress
}: {
  title: string;
  copy: string;
  badge: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionCard}>
      <View style={styles.actionTop}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionBadge}>{badge}</Text>
      </View>
      <Text style={styles.actionCopy}>{copy}</Text>
      <Text style={styles.actionLink}>{actionLabel}</Text>
    </Pressable>
  );
}

function SettingsRow({ title, value, onPress }: { title: string; value?: string; onPress?: () => void }) {
  const content = (
    <>
      <Text style={styles.settingsRowTitle}>{title}</Text>
      <View style={styles.settingsRowRight}>
        {value ? <Text style={styles.settingsRowValue} numberOfLines={1}>{value}</Text> : null}
        <Text style={styles.settingsChevron}>›</Text>
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.settingsRow}>{content}</View>;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.settingsRow}>
      {content}
    </Pressable>
  );
}

function RewardMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rewardMetric}>
      <Text style={styles.rewardMetricLabel}>{label}</Text>
      <Text style={styles.rewardMetricValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoDot} />
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{copy}</Text>
      </View>
    </View>
  );
}

function formatReservationInquiryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금 저장";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

const styles = StyleSheet.create({
  reservationInboxCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.30)",
    ...shadow
  },
  reservationInboxHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14
  },
  reservationInboxCopy: {
    flex: 1
  },
  reservationInboxEyebrow: {
    color: "#B77900",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  reservationInboxTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    marginTop: 3
  },
  reservationInboxText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 5
  },
  reservationInboxBadge: {
    minWidth: 54,
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF2C2",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.50)"
  },
  reservationInboxBadgeValue: {
    color: "#271400",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900"
  },
  reservationInboxBadgeLabel: {
    color: "#8A5A00",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  reservationInquiryList: {
    marginTop: 14,
    gap: 10
  },
  reservationInquiryCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FFE3A3"
  },
  reservationInquiryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  reservationInquiryTitleWrap: {
    flex: 1
  },
  reservationInquiryPlace: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  reservationInquiryMeta: {
    color: "#8A5A00",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 2
  },
  reservationInquiryDelete: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)"
  },
  reservationInquiryDeleteText: {
    color: "#7A4C00",
    fontSize: 12,
    fontWeight: "900"
  },
  reservationInquiryDraft: {
    color: "#374151",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 10
  },
  reservationInquiryStatus: {
    color: "#0B7A45",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    marginTop: 8
  },
  reservationInboxEmpty: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)"
  },
  reservationInboxEmptyTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  reservationInboxEmptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 4
  },
  reservationInboxEmptyButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD43B",
    marginTop: 12
  },
  reservationInboxEmptyButtonText: {
    color: "#271400",
    fontSize: 13,
    fontWeight: "900"
  },
  settingsHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  settingsBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)"
  },
  settingsBackText: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "900"
  },
  settingsTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  settingsHeaderSpacer: {
    width: 44
  },
  settingsGroup: {
    marginBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.12)",
    ...shadow
  },
  settingsGroupTitle: {
    color: "#8A5A00",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    backgroundColor: "rgba(255,194,51,0.16)",
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 11
  },
  settingsRow: {
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(18,32,51,0.06)"
  },
  settingsRowTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  settingsRowRight: {
    maxWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8
  },
  settingsRowValue: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  settingsChevron: {
    color: "rgba(18,32,51,0.38)",
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "400"
  },
  settingsDetailCard: {
    borderRadius: 26,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.12)",
    ...shadow
  },
  settingsDetailSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800"
  },
  settingsDetailList: {
    marginTop: 16,
    gap: 10
  },
  dangerZone: {
    marginTop: 4,
    marginBottom: 22,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.10)"
  },
  dangerZoneTitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  dangerZoneCopy: {
    color: "rgba(107,114,128,0.82)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4
  },
  dangerLink: {
    alignSelf: "flex-start",
    marginTop: 12,
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,122,69,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,122,69,0.18)"
  },
  dangerLinkText: {
    color: "rgba(255,122,69,0.72)",
    fontSize: 12,
    fontWeight: "900"
  },
  profile: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,178,0,0.34)",
    ...neonShadow
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "rgba(255,194,51,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.30)",
    position: "relative"
  },
  avatarImage: {
    width: 62,
    height: 62,
    borderRadius: 23,
    backgroundColor: "rgba(255,194,51,0.10)"
  },
  avatarText: {
    color: "#FFC233",
    fontSize: 28,
    fontWeight: "900"
  },
  avatarEditBadge: {
    position: "absolute",
    right: -5,
    bottom: -5,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...shadow
  },
  avatarEditIcon: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900"
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  name: {
    color: "#122033",
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900"
  },
  authBadge: {
    alignSelf: "flex-start",
    color: "#122033",
    backgroundColor: "#FFD43B",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6
  },
  copy: {
    color: "#43515F",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    fontWeight: "900"
  },
  profileMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8
  },
  profileMeta: {
    color: "#122033",
    backgroundColor: "#FFF1B8",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900"
  },
  profileTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8
  },
  profileTag: {
    backgroundColor: "#FFB000",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D78300",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  profileTagText: {
    color: "#2B1700",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  profileActions: {
    gap: 7,
    alignItems: "stretch"
  },
  profileEditButton: {
    minHeight: 38,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cyan,
    ...neonShadow
  },
  profileEditText: {
    color: colors.midnight,
    fontSize: 12,
    fontWeight: "900"
  },
  logoutButton: {
    minHeight: 38,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,122,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.32)"
  },
  logoutText: {
    color: colors.sunset,
    fontSize: 12,
    fontWeight: "900"
  },
  phoneTrustCard: {
    marginTop: 12,
    borderRadius: 24,
    padding: 15,
    backgroundColor: "#FFF3C8",
    borderWidth: 1,
    borderColor: "rgba(255,178,0,0.42)",
    ...shadow
  },
  phoneTrustCardVerified: {
    backgroundColor: "#F3FFF7",
    borderColor: "rgba(28,169,102,0.30)"
  },
  phoneTrustHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  phoneTrustEyebrow: {
    color: colors.sunset,
    fontSize: 12,
    fontWeight: "900"
  },
  phoneTrustTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 4
  },
  phoneTrustCopy: {
    color: "#43515F",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 5
  },
  phoneTrustBadge: {
    color: colors.midnight,
    backgroundColor: colors.cyan,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900"
  },
  phoneTrustForm: {
    gap: 8,
    marginTop: 12
  },
  phoneInput: {
    minHeight: 48,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.24)",
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    paddingHorizontal: 13
  },
  phoneOtpButton: {
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    ...sunsetGlow
  },
  phoneOtpButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  phoneCodeRow: {
    flexDirection: "row",
    gap: 8
  },
  phoneCodeInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.24)",
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    paddingHorizontal: 13
  },
  phoneConfirmButton: {
    minWidth: 76,
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cyan
  },
  phoneConfirmButtonText: {
    color: colors.midnight,
    fontSize: 13,
    fontWeight: "900"
  },
  phoneStatusText: {
    color: colors.sunset,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "900"
  },
  phoneVerifiedText: {
    color: colors.greenDeep,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 10
  },
  accountSafetyCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.50)",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.10)",
    gap: 9
  },
  accountSafetyCopy: {
    gap: 3
  },
  accountSafetyTitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  accountSafetyText: {
    color: "rgba(107,114,128,0.82)",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800"
  },
  deleteRequestButton: {
    alignSelf: "flex-start",
    minHeight: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,122,69,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,122,69,0.18)",
    paddingHorizontal: 10
  },
  deleteRequestText: {
    color: "rgba(255,122,69,0.78)",
    fontSize: 11,
    fontWeight: "900"
  },
  deleteConfirmBox: {
    borderRadius: 16,
    padding: 10,
    backgroundColor: "rgba(255,247,223,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,122,69,0.18)"
  },
  deleteConfirmText: {
    color: colors.nightText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  deleteActionRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 10
  },
  deleteCancelButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(122,80,0,0.14)"
  },
  deleteCancelText: {
    color: colors.nightText,
    fontSize: 12,
    fontWeight: "900"
  },
  deleteConfirmButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    ...sunsetGlow
  },
  deleteConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900"
  },
  profileEditor: {
    marginTop: 14,
    borderRadius: 26,
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.28)",
    ...shadow
  },
  profileEditorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4
  },
  profileEditorEyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "900"
  },
  profileEditorTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  profileEditorClose: {
    minHeight: 34,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  profileEditorCloseText: {
    color: colors.nightText,
    fontSize: 12,
    fontWeight: "900"
  },
  formLabel: {
    color: colors.nightText,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 13,
    marginBottom: 7
  },
  textInput: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    color: colors.nightText,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  multilineInput: {
    minHeight: 76,
    textAlignVertical: "top"
  },
  photoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  photoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,194,51,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.30)"
  },
  photoPlaceholderText: {
    color: colors.cyan,
    fontSize: 26,
    fontWeight: "900"
  },
  photoPreview: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "rgba(255,194,51,0.10)"
  },
  filePickerFallback: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  filePickerFallbackText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "900"
  },
  formTwoColumn: {
    flexDirection: "row",
    gap: 10
  },
  formColumn: {
    flex: 1,
    minWidth: 0
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)"
  },
  chipActive: {
    backgroundColor: "rgba(255,194,51,0.16)",
    borderColor: "rgba(255,194,51,0.52)"
  },
  chipText: {
    color: colors.nightMuted,
    fontSize: 12,
    fontWeight: "900"
  },
  chipTextActive: {
    color: colors.ink
  },
  saveProfileButton: {
    minHeight: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    marginTop: 15,
    ...sunsetGlow
  },
  saveProfileText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  hiddenBlock: {
    display: "none"
  },
  rewardLoopCard: {
    marginTop: 14,
    borderRadius: 28,
    backgroundColor: "#3B1D00",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.40)",
    padding: 18,
    gap: 14,
    ...shadow
  },
  rewardLoopHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  rewardLoopEyebrow: {
    color: "#FFD43B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  rewardLoopTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 4
  },
  rewardLoopCopy: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 6
  },
  rewardPointBadge: {
    minWidth: 76,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFD43B",
    alignItems: "center"
  },
  rewardPointValue: {
    color: "#2B1700",
    fontSize: 15,
    fontWeight: "900"
  },
  rewardPointLabel: {
    color: "#6F4B00",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2
  },
  rewardMetricRow: {
    flexDirection: "row",
    gap: 8
  },
  rewardMetric: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  rewardMetricLabel: {
    color: "#FFD43B",
    fontSize: 12,
    fontWeight: "900"
  },
  rewardMetricValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4
  },
  rewardRuleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  rewardRule: {
    color: "#2B1700",
    backgroundColor: "#FFE89A",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900"
  },
  activityOverviewCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 18,
    gap: 16,
    ...shadow
  },
  activityOverviewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  activityOverviewCopy: {
    flex: 1,
    minWidth: 0
  },
  activityOverviewEyebrow: {
    color: "#FF9F1C",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  activityOverviewTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 4
  },
  activityOverviewText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 6
  },
  activitySettingsButton: {
    minWidth: 58,
    minHeight: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3C4",
    borderWidth: 1,
    borderColor: "#FFD43B",
    paddingHorizontal: 12
  },
  activitySettingsText: {
    color: "#8A5A00",
    fontSize: 13,
    fontWeight: "900"
  },
  activityMetricRow: {
    flexDirection: "row",
    gap: 8
  },
  activityMetric: {
    flex: 1,
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F0D89A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center"
  },
  activityMetricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  activityMetricValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  activityRecentReport: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#063F28",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  activityRecentCopy: {
    flex: 1,
    minWidth: 0
  },
  activityRecentLabel: {
    color: "#FFD43B",
    fontSize: 12,
    fontWeight: "900"
  },
  activityRecentTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3
  },
  activityRecentBadge: {
    color: "#063F28",
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: "#FFD43B",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  activityActionList: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(18,32,51,0.08)"
  },
  activityActionRow: {
    minHeight: 66,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(18,32,51,0.06)"
  },
  activityActionTitle: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900"
  },
  activityActionCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 3
  },
  activityActionArrow: {
    color: "#B77900",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900"
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  statCard: {
    flex: 1,
    minHeight: 74,
    borderRadius: 20,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    padding: 12,
    justifyContent: "center"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  statValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 5
  },
  quickGrid: {
    gap: 10,
    marginTop: 14
  },
  mangoLevelCard: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: "#2B1700",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.34)",
    padding: 15,
    ...neonShadow
  },
  mangoLevelTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  mangoLevelEyebrow: {
    color: "#FFC233",
    fontSize: 12,
    fontWeight: "900"
  },
  mangoLevelTitle: {
    color: "#FFF7DF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 4
  },
  mangoLevelBadge: {
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  mangoLevelCopy: {
    color: "rgba(255,247,223,0.82)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 10
  },
  mangoRuleGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13
  },
  mangoRuleCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "rgba(255,247,223,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 8,
    justifyContent: "center"
  },
  mangoRuleValue: {
    color: "#FFC233",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  mangoRuleLabel: {
    color: "#FFF7DF",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    marginTop: 3
  },
  mangoMissionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  mangoMissionPill: {
    color: "#FFF7DF",
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  actionCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.20)",
    ...shadow
  },
  actionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  actionTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  actionBadge: {
    color: colors.ink,
    backgroundColor: colors.cyan,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  actionCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 6
  },
  actionLink: {
    color: "#FFC233",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10
  },
  reportStatusCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    ...shadow
  },
  reportStatusHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  reportStatusEyebrow: {
    color: "#FFC233",
    fontSize: 12,
    fontWeight: "900"
  },
  reportStatusTitle: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
    marginTop: 4
  },
  reportStatusButton: {
    minHeight: 34,
    borderRadius: 14,
    backgroundColor: colors.sunset,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    ...sunsetGlow
  },
  reportStatusButtonText: {
    color: "#FFF7F0",
    fontSize: 12,
    fontWeight: "900"
  },
  reportSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  reportSummaryPill: {
    color: "#8A5200",
    backgroundColor: "#FFF4CC",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  reportList: {
    gap: 8,
    marginTop: 12
  },
  reportItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 17,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 11
  },
  reportItemCopy: {
    flex: 1,
    minWidth: 0
  },
  reportName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  reportMeta: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 3
  },
  reportBadge: {
    color: "#FFF7F0",
    backgroundColor: "rgba(255,122,0,0.24)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  reportImpact: {
    alignItems: "flex-end",
    gap: 5
  },
  reportImpactText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900"
  },
  reportEmptyCopy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 10
  },
  noticeCard: {
    marginTop: 14,
    backgroundColor: "#0D2A38",
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)"
  },
  noticeEyebrow: {
    alignSelf: "flex-start",
    color: "#FFF7F0",
    backgroundColor: colors.sunset,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 5
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)"
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neonPink,
    marginTop: 7
  },
  infoCopy: {
    flex: 1
  },
  infoTitle: {
    color: "#FFF7DF",
    fontSize: 14,
    fontWeight: "900"
  },
  infoText: {
    color: "rgba(255,247,223,0.82)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 3
  }
});
