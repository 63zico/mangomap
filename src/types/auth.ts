export type AuthProvider = "phone" | "kakao" | "google" | "nickname";

export type MemberProfile = {
  id: string;
  authUid?: string;
  nickname: string;
  provider: AuthProvider;
  phone?: string;
  phoneVerifiedAt?: string;
  email?: string;
  avatarUri?: string;
  bio?: string;
  homeBase?: string;
  travelStyle?: string;
  interestTags?: string[];
  verifiedAt: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
  privacyVersion?: string;
  accountStatus?: "active" | "deletion_requested";
  deletionRequestedAt?: string;
};

export type AuthJoinPayload = {
  authUid?: string;
  nickname: string;
  provider: AuthProvider;
  phone?: string;
  email?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
  privacyVersion?: string;
};
