import { isSupabaseConfigured, supabaseInsert, supabaseUpsert } from "../services/supabaseClient";
import type { MemberProfile } from "../types/auth";

export async function syncMemberProfileToSupabase(profile: MemberProfile, mannerTemperature: number) {
  if (!isSupabaseConfigured()) return;

  await supabaseUpsert("profiles", {
    auth_uid: profile.authUid ?? profile.id,
    nickname: profile.nickname,
    provider: profile.provider,
    phone: profile.phone ?? null,
    phone_verified_at: profile.phoneVerifiedAt ?? null,
    email: profile.email ?? null,
    avatar_uri: profile.avatarUri ?? null,
    bio: profile.bio ?? null,
    travel_style: profile.travelStyle ?? null,
    interest_tags: profile.interestTags ?? [],
    terms_accepted_at: profile.termsAcceptedAt ?? null,
    terms_version: profile.termsVersion ?? null,
    privacy_version: profile.privacyVersion ?? null,
    account_status: profile.accountStatus ?? "active",
    deletion_requested_at: profile.deletionRequestedAt ?? null,
    manner_temperature: mannerTemperature,
    updated_at: new Date().toISOString()
  }, "auth_uid");
}

export async function requestMemberAccountDeletion(profile: MemberProfile, requestedAt = new Date().toISOString()) {
  if (!isSupabaseConfigured()) return;

  await supabaseUpsert("profiles", {
    auth_uid: profile.authUid ?? profile.id,
    nickname: profile.nickname,
    provider: profile.provider,
    account_status: "deletion_requested",
    deletion_requested_at: requestedAt,
    updated_at: requestedAt
  }, "auth_uid");

  await supabaseInsert("account_deletion_requests", {
    auth_uid: profile.authUid ?? profile.id,
    nickname: profile.nickname,
    provider: profile.provider,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    requested_at: requestedAt,
    status: "pending"
  });
}
