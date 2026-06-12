import type { CuratedPlace } from "../types";
import { isSupabaseConfigured, supabaseInsert, supabaseRest, supabaseRpc, supabaseSelect, supabaseUpsert } from "./supabaseClient";

export type SavedPlaceRecord = {
  id: string;
  auth_uid: string;
  place_id: string;
  place_name: string;
  city?: string;
  category?: string;
  created_at: string;
};

export type PlaceReviewRecord = {
  id: string;
  place_id: string;
  auth_uid: string;
  nickname: string;
  rating: number;
  content: string;
  visit_status?: string;
  tags?: string[];
  photo_urls?: string[];
  source?: string;
  status?: string;
  helpful_count?: number;
  created_at: string;
  updated_at?: string;
};

export type CheckinRecord = {
  id: string;
  place_id: string;
  auth_uid: string;
  nickname?: string;
  status?: string;
  created_at: string;
};

export type PointTransactionRecord = {
  id: string;
  auth_uid: string;
  points: number;
  source_type: string;
  source_id?: string;
  reason: string;
  status: "posted" | "cancelled" | string;
  created_at: string;
};

export type EngagementSummary = {
  savedCount: number;
  reviewCount: number;
  checkinCount: number;
  pointBalance: number;
  badgeLabel: string;
  recentReviews: PlaceReviewRecord[];
  recentCheckins: CheckinRecord[];
};

export const emptyEngagementSummary: EngagementSummary = {
  savedCount: 0,
  reviewCount: 0,
  checkinCount: 0,
  pointBalance: 0,
  badgeLabel: "망고 새싹",
  recentReviews: [],
  recentCheckins: []
};

function canUseRemote(memberId?: string) {
  return isSupabaseConfigured() && Boolean(memberId);
}

function encodeFilter(value: string) {
  return encodeURIComponent(value);
}

function getBadgeLabel(summary: Pick<EngagementSummary, "pointBalance" | "reviewCount" | "checkinCount">) {
  if (summary.pointBalance >= 5000 || summary.reviewCount >= 20 || summary.checkinCount >= 15) return "망고 마스터";
  if (summary.pointBalance >= 2000 || summary.reviewCount >= 8 || summary.checkinCount >= 5) return "현지인급";
  if (summary.pointBalance >= 700 || summary.reviewCount >= 3 || summary.checkinCount >= 2) return "여행 탐험가";
  return "망고 새싹";
}

export async function loadRemoteSavedPlaceIds(memberId?: string) {
  if (!canUseRemote(memberId)) return [];
  const rows = await supabaseSelect<SavedPlaceRecord>(
    "saved_places",
    `select=place_id&auth_uid=eq.${encodeFilter(memberId ?? "")}&order=created_at.desc`
  );
  return rows.map((row) => row.place_id);
}

export async function upsertRemoteSavedPlace(place: CuratedPlace, memberId?: string) {
  if (!canUseRemote(memberId)) return undefined;
  return supabaseUpsert<SavedPlaceRecord>(
    "saved_places",
    {
      auth_uid: memberId,
      place_id: place.id,
      place_name: place.name,
      city: place.city,
      category: place.category,
      updated_at: new Date().toISOString()
    },
    "auth_uid,place_id"
  );
}

export async function deleteRemoteSavedPlace(placeId: string, memberId?: string) {
  if (!canUseRemote(memberId)) return;
  await supabaseRest<unknown>(
    `/rest/v1/saved_places?auth_uid=eq.${encodeFilter(memberId ?? "")}&place_id=eq.${encodeFilter(placeId)}`,
    { method: "DELETE" }
  );
}

export async function loadRemoteReviews(placeId: string) {
  if (!isSupabaseConfigured()) return [];
  return supabaseSelect<PlaceReviewRecord>(
    "reviews",
    `select=*&place_id=eq.${encodeFilter(placeId)}&status=in.(published,approved)&order=created_at.desc`
  );
}

export async function loadMyReviews(memberId?: string) {
  if (!canUseRemote(memberId)) return [];
  return supabaseSelect<PlaceReviewRecord>(
    "reviews",
    `select=*&auth_uid=eq.${encodeFilter(memberId ?? "")}&order=created_at.desc`
  );
}

export async function submitRemoteReview(input: {
  place: CuratedPlace;
  memberId?: string;
  nickname: string;
  rating: number;
  content: string;
  tags?: string[];
  photoUrls?: string[];
}) {
  if (!canUseRemote(input.memberId)) return undefined;
  return supabaseUpsert<PlaceReviewRecord>(
    "reviews",
    {
      place_id: input.place.id,
      place_name: input.place.name,
      auth_uid: input.memberId,
      nickname: input.nickname,
      rating: input.rating,
      content: input.content,
      visit_status: "방문 완료",
      tags: input.tags ?? [],
      photo_urls: input.photoUrls ?? [],
      source: "user",
      status: "published",
      updated_at: new Date().toISOString()
    },
    "place_id,auth_uid"
  );
}

export async function createRemoteCheckin(input: {
  place: CuratedPlace;
  memberId?: string;
  nickname?: string;
  method?: "manual" | "qr";
}) {
  if (!canUseRemote(input.memberId)) return undefined;
  return supabaseInsert<CheckinRecord>("checkins", {
    place_id: input.place.id,
    place_name: input.place.name,
    auth_uid: input.memberId,
    nickname: input.nickname,
    method: input.method ?? "manual",
    status: "verified_mock"
  });
}

export async function loadMyCheckins(memberId?: string) {
  if (!canUseRemote(memberId)) return [];
  return supabaseSelect<CheckinRecord>(
    "checkins",
    `select=*&auth_uid=eq.${encodeFilter(memberId ?? "")}&order=created_at.desc`
  );
}

export async function loadMyPointTransactions(memberId?: string) {
  if (!canUseRemote(memberId)) return [];
  return supabaseSelect<PointTransactionRecord>(
    "point_transactions",
    `select=*&auth_uid=eq.${encodeFilter(memberId ?? "")}&order=created_at.desc`
  );
}

export function calculatePointBalance(transactions: PointTransactionRecord[]) {
  return transactions.reduce((total, row) => total + (row.status === "posted" ? Number(row.points) || 0 : 0), 0);
}

export async function awardPointsOnce(sourceType: string, sourceId: string, points: number, reason: string) {
  if (!isSupabaseConfigured()) return;
  await supabaseRpc("award_my_points_once", {
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_points: points,
    p_reason: reason
  }).catch(() => undefined);
}

export async function loadEngagementSummary(memberId?: string): Promise<EngagementSummary> {
  if (!canUseRemote(memberId)) return emptyEngagementSummary;

  const [savedPlaceIds, reviews, checkins, points] = await Promise.all([
    loadRemoteSavedPlaceIds(memberId),
    loadMyReviews(memberId),
    loadMyCheckins(memberId),
    loadMyPointTransactions(memberId)
  ]);
  const pointBalance = calculatePointBalance(points);
  const summary = {
    savedCount: savedPlaceIds.length,
    reviewCount: reviews.length,
    checkinCount: checkins.length,
    pointBalance,
    badgeLabel: "망고 새싹",
    recentReviews: reviews.slice(0, 3),
    recentCheckins: checkins.slice(0, 3)
  };
  return {
    ...summary,
    badgeLabel: getBadgeLabel(summary)
  };
}
