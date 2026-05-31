export const legalConfig = {
  termsVersion: "2026-05-27",
  privacyVersion: "2026-05-27",
  pendingConsentStorageKey: "mangomap-pending-legal-consent-v1",
  supportEmail: "support@mangomap.app",
  termsTitle: "MANGOMAP 이용약관",
  privacyTitle: "개인정보 처리방침",
  shortConsentText: "MANGOMAP 이용약관, 개인정보 처리방침, 커뮤니티 안전 수칙에 동의합니다.",
  communitySafetyText: "모임, 채팅, 중고거래에서는 신고/차단/삭제 정책이 적용되며 위험 거래와 불법 콘텐츠는 제한됩니다."
};

export type LegalConsent = {
  termsAcceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
};

export function createLegalConsent(now = new Date()): LegalConsent {
  return {
    termsAcceptedAt: now.toISOString(),
    termsVersion: legalConfig.termsVersion,
    privacyVersion: legalConfig.privacyVersion
  };
}

function getWebStorage() {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as unknown as { localStorage?: Storage }).localStorage;
}

export function savePendingLegalConsent(consent: LegalConsent) {
  const storage = getWebStorage();
  storage?.setItem(legalConfig.pendingConsentStorageKey, JSON.stringify(consent));
}

export function consumePendingLegalConsent(): LegalConsent | undefined {
  const storage = getWebStorage();
  if (!storage) return undefined;

  try {
    const rawValue = storage.getItem(legalConfig.pendingConsentStorageKey);
    storage.removeItem(legalConfig.pendingConsentStorageKey);
    return rawValue ? JSON.parse(rawValue) as LegalConsent : undefined;
  } catch {
    storage.removeItem(legalConfig.pendingConsentStorageKey);
    return undefined;
  }
}
