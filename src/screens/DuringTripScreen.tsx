import { createElement } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "../components/AppShell";
import { CommunitySafetyActions } from "../components/CommunitySafetyActions";
import { Header } from "../components/Header";
import { curatedPlaces } from "../data/places";
import { isSupabaseConfigured, isSupabaseStorageDataUrl, subscribeSupabaseInserts, supabaseInsert, supabasePatchById, supabaseSelect, supabaseUploadDataUrl, supabaseUploadFile, supabaseUpsert } from "../services/supabaseClient";
import { loadBlockedTargetIds, saveSafetyAction } from "../storage/communitySafety";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";
import type { CuratedPlace, Destination, Itinerary, LiveTravelInfo, PlannerInput, PlacePlan } from "../types";
import { openGoogleMapsPlace, openGoogleMapsSearch } from "../utils/googleMaps";

type DuringTripScreenProps = {
  input: PlannerInput;
  itinerary: Itinerary;
  selectedDay: number;
  visitedPlaceIds: string[];
  liveInfo: LiveTravelInfo;
  memberId?: string;
  memberName?: string;
  entryMode?: "all" | "mine";
  onRequireAuth: () => void;
  onOpenMap: () => void;
  onOpenPlan: () => void;
};

type SelectedPhotoFile = {
  blob: Blob;
  name: string;
  type: string;
  previewUri: string;
};

type QuickMode = "next" | "events" | "nearby" | "food" | "grab" | "exchange" | "emergency";
type MeetupCategory = "식사동행" | "카페수다" | "투어동행" | "밤모임" | "언어교환" | "운동" | "비즈니스" | "사진산책" | "로컬정보";
type EventDateFilter = "예정된 모든 이벤트" | "오늘" | "내일" | "이번주말";
type EventInterestFilter = "새로운 이벤트" | "내 이벤트" | "사회활동" | "취미" | "스포츠" | "여행" | "비즈니스" | "언어";
type MeetupRealtimeStatus = "local" | "connecting" | "live" | "error";
type CommunityTab = "neighborhood" | "meetups";

type LocalMeetup = {
  id: string;
  title: string;
  area: string;
  time: string;
  category: MeetupCategory;
  host: string;
  seats: string;
  safety: string;
  source?: string;
  venue?: string;
  status?: string;
  price?: string;
  vibe?: string;
  beginnerLevel?: string;
  mapQuery?: string;
  chatMessages?: string[];
  photo?: string;
  scheduledAt?: string;
  hostAuthUid?: string;
};

type MeetupChatMessage = {
  id: string;
  sender: "host" | "me" | "guest" | "system";
  text: string;
  authorId?: string;
  authorName?: string;
  createdAt?: number;
};

type NeighborhoodCategory = "전체" | "질문" | "맛집" | "생활정보" | "동행" | "수다" | "도움요청";

type NeighborhoodPost = {
  id: string;
  city: Destination;
  category: Exclude<NeighborhoodCategory, "전체">;
  title: string;
  body: string;
  author: string;
  authorAuthUid?: string;
  area: string;
  timeAgo: string;
  likes: number;
  comments: number;
  verified?: boolean;
};

type NeighborhoodComment = {
  id: string;
  postId: string;
  author: string;
  authorAuthUid?: string;
  body: string;
  timeAgo: string;
  createdAt?: number;
  verified?: boolean;
};

const locationOptionsByDestination: Record<Destination, string[]> = {
  호치민: ["1군 District 1", "벤탄시장 근처", "응우옌후에", "타오디엔", "공항 근처"],
  다낭: ["미케비치", "한시장 근처", "용다리/한강", "호이안 올드타운", "공항 근처"],
  나트랑: ["쩐푸 해변", "나트랑 센터", "담시장 근처", "혼총", "공항 근처"],
  하노이: ["호안끼엠", "올드쿼터", "성요셉성당", "서호/떠이호", "공항 근처"],
  달랏: ["달랏 시내", "쑤언흐엉 호수", "달랏 야시장", "뚜옌럼 호수", "공항 근처"],
  푸꾸옥: ["즈엉동", "롱비치", "선셋타운", "옹랑", "공항 근처"]
};

const meetupDestinations: Destination[] = ["호치민", "다낭", "나트랑", "하노이", "달랏", "푸꾸옥"];

const quickActions: Array<{ id: QuickMode; title: string; caption: string; icon: string; accent: string }> = [
  { id: "next", title: "다음 이동", caption: "체크/지도", icon: "↗", accent: colors.mintDark },
  { id: "events", title: "오늘 밤 추천", caption: "검증 이벤트", icon: "N", accent: "#6D5DD3" },
  { id: "nearby", title: "코스 변경", caption: "비/피곤할 때", icon: "⇄", accent: "#168C92" },
  { id: "grab", title: "Grab 귀가", caption: "숙소까지 안전", icon: "G", accent: "#2563A8" },
  { id: "exchange", title: "VND 계산", caption: "결제 전 확인", icon: "₫", accent: "#9A6A16" },
  { id: "emergency", title: "SOS", caption: "번호/문장", icon: "!", accent: colors.coral }
];

const meetupCategories: Array<{ category: MeetupCategory; label: string; copy: string }> = [
  { category: "식사동행", label: "식사 동행", copy: "같이 먹기" },
  { category: "카페수다", label: "카페 수다", copy: "낮·대화" },
  { category: "투어동행", label: "투어 동행", copy: "반일·일일" },
  { category: "밤모임", label: "밤 모임", copy: "바·파티" },
  { category: "언어교환", label: "언어 교환", copy: "한국어·영어" },
  { category: "운동", label: "운동", copy: "러닝·요가" },
  { category: "비즈니스", label: "비즈니스", copy: "네트워킹" },
  { category: "사진산책", label: "사진 산책", copy: "스팟 투어" },
  { category: "로컬정보", label: "로컬 정보", copy: "거주자 Q&A" }
];

const eventDateFilters: EventDateFilter[] = ["예정된 모든 이벤트", "오늘", "내일", "이번주말"];
const eventInterestFilters: EventInterestFilter[] = ["새로운 이벤트", "내 이벤트", "사회활동", "취미", "스포츠", "여행", "비즈니스", "언어"];
const meetupQuickQuestions = ["정확한 위치?", "비용 확인", "현재 몇 명?", "초행자 가능?"];
const neighborhoodCategories: NeighborhoodCategory[] = ["전체", "질문", "맛집", "생활정보", "동행", "수다", "도움요청"];
const meetupChatStorageKey = "tripbuddy-meetup-chat-v2";
const localMeetupsStorageKey = "mangomap-local-meetups-v1";
const localNeighborhoodPostsStorageKey = "mangomap-neighborhood-posts-v1";
const localNeighborhoodCommentsStorageKey = "mangomap-neighborhood-comments-v1";
const meetupChatUserKey = "tripbuddy-meetup-chat-user-v1";
const attendingMeetupStorageKey = "tripbuddy-attending-meetups-v1";
const meetupRealtimeDatabaseUrl = (process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "").replace(/\/$/, "");
const meetupPhotoBucket = "mangomap-meetup-images";
const maxMeetupPhotoBytes = 4 * 1024 * 1024;

function getSubmitFailureMessage(error: unknown, fallback: string) {
  const detail = error instanceof Error ? error.message : "";
  if (/jwt expired|invalid jwt|expired/i.test(detail)) {
    return "로그인 시간이 만료됐어요. 한 번만 다시 로그인하면 대화 저장이 이어져요.";
  }
  return detail ? `${fallback} (${detail})` : fallback;
}

type SupabaseMeetupRow = {
  id: string;
  host_auth_uid?: string;
  host_name?: string;
  city?: string;
  category?: string;
  title: string;
  place_name?: string;
  meetup_date?: string;
  meetup_time?: string;
  seats_label?: string;
  safety?: string;
  price_label?: string;
  mood?: string;
  image_uri?: string | null;
  status?: string;
  created_at?: string;
};

type SupabaseMeetupMemberRow = {
  meetup_id: string;
  auth_uid: string;
  nickname?: string;
  role?: "host" | "participant";
};

type SupabaseMeetupMessageRow = {
  id: string;
  meetup_id: string;
  auth_uid: string;
  nickname: string;
  message: string;
  created_at: string;
};

type SupabaseCommunityPostRow = {
  id: string;
  author_auth_uid?: string;
  author_name?: string;
  city: string;
  category: string;
  title: string;
  body: string;
  area: string;
  likes_count?: number;
  comments_count?: number;
  created_at?: string;
};

type SupabaseCommunityCommentRow = {
  id: string;
  post_id: string;
  author_auth_uid?: string;
  author_name?: string;
  message: string;
  status?: string;
  created_at?: string;
};

type SupabaseCommunityReactionRow = {
  id?: string;
  post_id: string;
  auth_uid: string;
  reaction_type: string;
  created_at?: string;
};

function createInitialMeetupChat(event: LocalMeetup): MeetupChatMessage[] {
  return [
    {
      id: `${event.id}-seed-room`,
      sender: "system" as const,
      text: "모임방이 열렸어요. 참가자들이 들어오면 여기서 시간, 장소, 비용을 직접 맞춰요."
    }
  ];
}

function getMeetupQuickReply(event: LocalMeetup, question: string) {
  if (question === "정확한 위치?") return `${getEventVenueLine(event)} 기준으로 만나요. 출발 전 지도에서 입구 위치를 한 번 더 확인해주세요.`;
  if (question === "비용 확인") return `${getEventPrice(event)} 기준이에요. 현장 결제 조건이 있으면 대화에서 먼저 확인하고 움직이세요.`;
  if (question === "현재 몇 명?") return `현재 모집 ${getMeetupCapacityLabel(event)} 상태예요. 실제 입장 인원은 모임 카드에서 확인하면 좋아요.`;
  if (question === "초행자 가능?") return "처음 참여해도 공개 장소에서 합류하고, 귀가 Grab만 먼저 정하면 부담이 적어요.";
  return "확인했어요. 호스트가 시간, 장소, 비용을 정리해줄 거예요.";
}

function createMeetupChatChannel() {
  const BroadcastChannelConstructor = (globalThis as unknown as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
  if (!BroadcastChannelConstructor) return undefined;
  return new BroadcastChannelConstructor("tripbuddy-meetup-chat");
}

function readMeetupChatStore() {
  if (Platform.OS !== "web") return {};
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return {};

  try {
    const rawValue = storage.getItem(meetupChatStorageKey);
    return rawValue ? (JSON.parse(rawValue) as Record<string, MeetupChatMessage[]>) : {};
  } catch {
    return {};
  }
}

function writeMeetupChatStore(messagesByEventId: Record<string, MeetupChatMessage[]>) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(meetupChatStorageKey, JSON.stringify(messagesByEventId));
  } catch {
    // Ignore storage limits; chat still works for the current session.
  }
}

function readStringArrayStore(key: string) {
  if (Platform.OS !== "web") return [];
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return [];

  try {
    const rawValue = storage.getItem(key);
    const value = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStringArrayStore(key: string, values: string[]) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(values));
  } catch {
    // Ignore storage limits; the current session still keeps the state.
  }
}

function isLocalMeetup(value: unknown): value is LocalMeetup {
  if (!value || typeof value !== "object") return false;
  const meetup = value as Partial<LocalMeetup>;
  return Boolean(typeof meetup.id === "string" && typeof meetup.title === "string" && typeof meetup.area === "string" && typeof meetup.time === "string");
}

function readLocalMeetupsStore() {
  if (Platform.OS !== "web") return [];
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return [];

  try {
    const rawValue = storage.getItem(localMeetupsStorageKey);
    const value = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(value) ? value.filter(isLocalMeetup) : [];
  } catch {
    return [];
  }
}

function writeLocalMeetupsStore(values: LocalMeetup[]) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(localMeetupsStorageKey, JSON.stringify(values));
  } catch {
    // Photos can be large; keep the current session state even if storage is full.
  }
}

function isNeighborhoodPost(value: unknown): value is NeighborhoodPost {
  if (!value || typeof value !== "object") return false;
  const post = value as Partial<NeighborhoodPost>;
  return Boolean(post.id && post.city && post.category && post.title && post.body && post.author);
}

function readLocalNeighborhoodPostsStore() {
  if (Platform.OS !== "web") return [];
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return [];

  try {
    const rawValue = storage.getItem(localNeighborhoodPostsStorageKey);
    const value = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(value) ? value.filter(isNeighborhoodPost) : [];
  } catch {
    return [];
  }
}

function writeLocalNeighborhoodPostsStore(values: NeighborhoodPost[]) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(localNeighborhoodPostsStorageKey, JSON.stringify(values));
  } catch {
    // Keep the current session state if localStorage is unavailable.
  }
}

function isNeighborhoodComment(value: unknown): value is NeighborhoodComment {
  if (!value || typeof value !== "object") return false;
  const comment = value as Partial<NeighborhoodComment>;
  return Boolean(comment.id && comment.postId && comment.author && comment.body);
}

function readLocalNeighborhoodCommentsStore() {
  if (Platform.OS !== "web") return {};
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return {};

  try {
    const rawValue = storage.getItem(localNeighborhoodCommentsStorageKey);
    const value = rawValue ? JSON.parse(rawValue) : {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([postId, comments]) => [
          postId,
          Array.isArray(comments) ? comments.filter(isNeighborhoodComment) : []
        ])
        .filter(([, comments]) => comments.length > 0)
    ) as Record<string, NeighborhoodComment[]>;
  } catch {
    return {};
  }
}

function writeLocalNeighborhoodCommentsStore(values: Record<string, NeighborhoodComment[]>) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(localNeighborhoodCommentsStorageKey, JSON.stringify(values));
  } catch {
    // Keep the current session state if localStorage is unavailable.
  }
}

function getMeetupChatUser(memberName: string, memberId?: string) {
  if (memberId) return { id: memberId, name: memberName || "나" };
  if (Platform.OS !== "web") return { id: "native-user", name: memberName || "나" };
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  const fallbackId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (!storage) return { id: fallbackId, name: memberName || "나" };

  const storedId = storage.getItem(meetupChatUserKey);
  if (storedId) return { id: storedId, name: memberName || "나" };

  storage.setItem(meetupChatUserKey, fallbackId);
  return { id: fallbackId, name: memberName || "나" };
}

function isRealtimeMeetupChatEnabled() {
  return Platform.OS === "web" && (isSupabaseConfigured() || meetupRealtimeDatabaseUrl.length > 0);
}

function isFirebaseRealtimeMeetupChatEnabled() {
  return Platform.OS === "web" && !isSupabaseConfigured() && meetupRealtimeDatabaseUrl.length > 0;
}

function getMeetupChatPath(eventId: string) {
  return eventId.replace(/[.#$/[\]]/g, "_");
}

function mergeMeetupChatMessages(currentMessages: MeetupChatMessage[], incomingMessages: MeetupChatMessage[]) {
  const merged = [...currentMessages];
  incomingMessages.forEach((message) => {
    if (!merged.some((item) => item.id === message.id)) merged.push(message);
  });
  return merged.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

function normalizeRemoteMeetupMessage(key: string, message: MeetupChatMessage, userId: string): MeetupChatMessage | null {
  if (!message?.text?.trim()) return null;
  return {
    ...message,
    id: message.id || key,
    sender: (message.authorId === userId ? "me" : message.sender === "system" || message.sender === "host" ? message.sender : "guest") as MeetupChatMessage["sender"]
  };
}

function collectRemoteMeetupMessages(data: unknown, userId: string): MeetupChatMessage[] {
  if (!data || typeof data !== "object") return [];
  const value = data as Record<string, unknown>;
  if (typeof value.text === "string") {
    const message = normalizeRemoteMeetupMessage(String(value.id ?? Date.now()), value as MeetupChatMessage, userId);
    return message ? [message] : [];
  }
  return Object.entries(value)
    .map(([key, item]) => (item && typeof item === "object" ? normalizeRemoteMeetupMessage(key, item as MeetupChatMessage, userId) : null))
    .filter((message): message is MeetupChatMessage => Boolean(message));
}

function collectRemoteMeetupMessagesFromStream(rawData: string, userId: string) {
  try {
    const payload = JSON.parse(rawData) as { path?: string; data?: unknown };
    if (!payload || typeof payload !== "object" || payload.data == null) return [];
    return collectRemoteMeetupMessages(payload.data, userId);
  } catch {
    return [];
  }
}

function formatSupabaseMeetupDate(dateValue?: string, timeValue?: string) {
  const cleanTimeValue = normalizeSupabaseMeetupTime(timeValue);
  if (!dateValue) return cleanTimeValue || "시간 조율";
  const date = new Date(`${dateValue}T00:00:00`);
  const label = Number.isNaN(date.getTime()) ? dateValue : `${date.getMonth() + 1}/${date.getDate()}`;
  return cleanTimeValue ? `${label} ${cleanTimeValue}` : label;
}

function normalizeSupabaseMeetupTime(timeValue?: string) {
  if (!timeValue) return "";
  const match = timeValue.match(/(\d{1,2}):(\d{2})/);
  if (!match) return timeValue.trim();
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function parseSupabaseMeetupDate(dateValue?: string, timeValue?: string, fallbackValue?: string) {
  const cleanTimeValue = normalizeSupabaseMeetupTime(timeValue) || "19:00";
  const dateText = dateValue || fallbackValue?.slice(0, 10);
  if (!dateText) return fallbackValue;
  const parsed = new Date(`${dateText}T${cleanTimeValue}`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return fallbackValue;
}

function fromSupabaseMeetupRow(row: SupabaseMeetupRow): LocalMeetup {
  const category = (row.category || "식사동행") as MeetupCategory;

  return {
    id: row.id,
    title: row.title,
    area: (row.city || row.place_name || "호치민") as Destination,
    time: formatSupabaseMeetupDate(row.meetup_date, row.meetup_time),
    scheduledAt: parseSupabaseMeetupDate(row.meetup_date, row.meetup_time, row.created_at),
    category,
    host: row.host_name || "MANGOMAP 호스트",
    hostAuthUid: row.host_auth_uid,
    seats: row.seats_label || "모집중",
    safety: row.safety || "공개 장소에서 만나요",
    source: "Supabase",
    venue: row.place_name || row.city || "장소 조율",
    status: row.status === "cancelled" ? "취소됨" : row.status === "closed" ? "마감" : "모집중",
    price: row.price_label || "현장 확인",
    vibe: row.mood || "편한 대화",
    photo: row.image_uri ?? undefined
  };
}

function mergeRemoteMeetups(current: LocalMeetup[], incoming: LocalMeetup[]) {
  const merged = [...current];

  incoming.forEach((meetup) => {
    const existingIndex = merged.findIndex((item) => item.id === meetup.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...meetup,
        chatMessages: merged[existingIndex].chatMessages ?? meetup.chatMessages
      };
      return;
    }

    merged.unshift(meetup);
  });

  return merged;
}

function getMeetupHostBlockIds(event: LocalMeetup) {
  return [event.hostAuthUid, event.host].filter(Boolean) as string[];
}

function toSupabaseMeetupRow(meetup: LocalMeetup, hostId: string, hostName: string) {
  const rawScheduledDate = meetup.scheduledAt ? new Date(meetup.scheduledAt) : new Date();
  const scheduledDate = Number.isNaN(rawScheduledDate.getTime()) ? new Date() : rawScheduledDate;
  const scheduledTime = formatScheduledTime(scheduledDate) || normalizeSupabaseMeetupTime(meetup.time) || "19:30";

  return {
    id: meetup.id,
    host_auth_uid: hostId,
    host_name: hostName,
    city: meetup.area,
    category: meetup.category,
    title: meetup.title,
    place_name: meetup.venue || meetup.area,
    meetup_date: scheduledDate.toISOString().slice(0, 10),
    meetup_time: scheduledTime,
    seats_label: meetup.seats,
    safety: meetup.safety,
    price_label: meetup.price,
    mood: meetup.vibe,
    image_uri: meetup.photo ?? null,
    status: "open"
  };
}

async function loadRemoteMeetups() {
  if (!isSupabaseConfigured()) return [];
  const rows = await supabaseSelect<SupabaseMeetupRow>("meetups", "select=*&status=neq.deleted&order=created_at.desc");
  return rows.map(fromSupabaseMeetupRow);
}

async function saveRemoteMeetup(meetup: LocalMeetup, hostId: string, hostName: string) {
  if (!isSupabaseConfigured()) return;
  await supabaseInsert("meetups", toSupabaseMeetupRow(meetup, hostId, hostName));
  await saveRemoteMeetupMember(meetup.id, hostId, hostName, "host").catch(() => undefined);
}

async function updateRemoteMeetupStatus(meetupId: string, status: "open" | "closed" | "cancelled" | "deleted") {
  if (!isSupabaseConfigured()) return;
  await supabasePatchById("meetups", meetupId, { status });
}

async function saveRemoteMeetupMember(meetupId: string, authUid: string, nickname: string, role: "host" | "participant" = "participant") {
  if (!isSupabaseConfigured()) return;
  await supabaseUpsert("meetup_members", {
    meetup_id: meetupId,
    auth_uid: authUid,
    nickname,
    role
  }, "meetup_id,auth_uid");
}

async function loadRemoteMeetupMemberIds(authUid?: string) {
  if (!isSupabaseConfigured() || !authUid) return [];
  const rows = await supabaseSelect<SupabaseMeetupMemberRow>(
    "meetup_members",
    `select=meetup_id&auth_uid=eq.${encodeURIComponent(authUid)}`
  );
  return rows.map((row) => row.meetup_id);
}

async function loadRemoteMeetupMemberCounts() {
  if (!isSupabaseConfigured()) return {};
  const rows = await supabaseSelect<Pick<SupabaseMeetupMemberRow, "meetup_id">>("meetup_members", "select=meetup_id");
  return rows.reduce<Record<string, number>>((result, row) => {
    result[row.meetup_id] = (result[row.meetup_id] ?? 0) + 1;
    return result;
  }, {});
}

function fromSupabaseMeetupMessageRow(row: SupabaseMeetupMessageRow, userId: string): MeetupChatMessage {
  return {
    id: row.id,
    sender: row.auth_uid === userId ? "me" : "guest",
    text: row.message,
    authorId: row.auth_uid,
    authorName: row.nickname,
    createdAt: new Date(row.created_at).getTime()
  };
}

function getRealtimeStatusCopy(status: MeetupRealtimeStatus) {
  if (status === "live") return "실시간 대화 연결됨";
  if (status === "connecting") return "실시간 연결 중";
  if (status === "error") return "실시간 연결 불안정 · 로컬 저장 병행";
  return "실시간 서버 미연결 · 현재는 이 기기에서만 대화가 저장돼요.";
}

function subscribeRemoteMeetupChat(
  eventId: string,
  userId: string,
  onMessages: (messages: MeetupChatMessage[]) => void,
  onStatusChange: (status: MeetupRealtimeStatus) => void
) {
  if (isSupabaseConfigured()) {
    return subscribeSupabaseInserts<SupabaseMeetupMessageRow>(
      "meetup_messages",
      `meetup_id=eq.${eventId}`,
      (row) => onMessages([fromSupabaseMeetupMessageRow(row, userId)]),
      onStatusChange
    );
  }

  if (!isFirebaseRealtimeMeetupChatEnabled()) return undefined;
  const EventSourceConstructor = (globalThis as unknown as { EventSource?: typeof EventSource }).EventSource;
  if (!EventSourceConstructor) return undefined;

  const source = new EventSourceConstructor(`${meetupRealtimeDatabaseUrl}/meetupChats/${getMeetupChatPath(eventId)}/messages.json`);
  const handleStreamEvent = (event: MessageEvent<string>) => {
    const messages = collectRemoteMeetupMessagesFromStream(event.data, userId);
    if (messages.length > 0) onMessages(messages);
  };

  onStatusChange("connecting");
  source.onopen = () => onStatusChange("live");
  source.onerror = () => onStatusChange("error");
  source.addEventListener("put", handleStreamEvent);
  source.addEventListener("patch", handleStreamEvent);

  return () => source.close();
}

async function fetchRemoteMeetupChat(eventId: string, userId: string) {
  if (!isRealtimeMeetupChatEnabled()) return [];
  if (isSupabaseConfigured()) {
    const rows = await supabaseSelect<SupabaseMeetupMessageRow>(
      "meetup_messages",
      `select=*&meetup_id=eq.${encodeURIComponent(eventId)}&order=created_at.asc`
    );
    return rows.map((row) => fromSupabaseMeetupMessageRow(row, userId));
  }

  const response = await fetch(`${meetupRealtimeDatabaseUrl}/meetupChats/${getMeetupChatPath(eventId)}/messages.json`);
  if (!response.ok) return [];
  const data = (await response.json()) as Record<string, MeetupChatMessage> | null;
  return collectRemoteMeetupMessages(data, userId);
}

async function sendRemoteMeetupChatMessage(eventId: string, message: MeetupChatMessage) {
  if (!isRealtimeMeetupChatEnabled()) return undefined;
  if (isSupabaseConfigured()) {
    return supabaseInsert<SupabaseMeetupMessageRow>("meetup_messages", {
      meetup_id: eventId,
      auth_uid: message.authorId || "member",
      nickname: message.authorName || "MANGOMAP",
      message: message.text
    });
    return;
  }

  await fetch(`${meetupRealtimeDatabaseUrl}/meetupChats/${getMeetupChatPath(eventId)}/messages.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message)
  });
  return undefined;
}

function getRelativeTimeLabel(createdAt?: string) {
  if (!createdAt) return "방금";
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return "방금";
  const diffMinutes = Math.max(0, Math.round((Date.now() - createdTime) / 60000));
  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.round(diffHours / 24)}일 전`;
}

function formatChatTime(value?: number | string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours >= 12 ? "오후" : "오전"} ${hours % 12 || 12}:${minutes}`;
}

function fromSupabaseCommunityPostRow(row: SupabaseCommunityPostRow): NeighborhoodPost {
  return {
    id: row.id,
    city: row.city as Destination,
    category: row.category as NeighborhoodPost["category"],
    title: row.title,
    body: row.body,
    author: row.author_name || "망고단",
    authorAuthUid: row.author_auth_uid,
    area: row.area || row.city,
    timeAgo: getRelativeTimeLabel(row.created_at),
    likes: row.likes_count ?? 0,
    comments: row.comments_count ?? 0,
    verified: Boolean(row.author_auth_uid)
  };
}

function fromSupabaseCommunityCommentRow(row: SupabaseCommunityCommentRow): NeighborhoodComment {
  return {
    id: row.id,
    postId: row.post_id,
    author: row.author_name || "망고단",
    authorAuthUid: row.author_auth_uid,
    body: row.message,
    timeAgo: getRelativeTimeLabel(row.created_at),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    verified: Boolean(row.author_auth_uid)
  };
}

function getNeighborhoodRealtimeStatusCopy(status: MeetupRealtimeStatus) {
  if (status === "live") return "댓글 실시간 연결됨";
  if (status === "connecting") return "댓글 실시간 연결 중";
  if (status === "error") return "댓글 실시간 연결 불안정 · 자동 동기화 중";
  return "실시간 서버 미연결 · 이 기기에서 먼저 표시돼요";
}

function mergeNeighborhoodComments(current: NeighborhoodComment[], incoming: NeighborhoodComment[]) {
  const merged = [...current];

  incoming.forEach((comment) => {
    const existingIndex = merged.findIndex((item) => item.id === comment.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...merged[existingIndex], ...comment };
      return;
    }

    const localIndex = merged.findIndex((item) =>
      item.id.startsWith("local-comment-") &&
      item.postId === comment.postId &&
      item.author === comment.author &&
      item.body === comment.body
    );
    if (localIndex >= 0) {
      merged[localIndex] = comment;
      return;
    }

    merged.push(comment);
  });

  return merged.sort((first, second) => (second.createdAt ?? 0) - (first.createdAt ?? 0));
}

async function loadRemoteCommunityPosts() {
  if (!isSupabaseConfigured()) return [];
  const rows = await supabaseSelect<SupabaseCommunityPostRow>("community_posts", "select=*&order=created_at.desc&limit=80");
  return rows.map(fromSupabaseCommunityPostRow);
}

async function loadRemoteCommunityComments() {
  if (!isSupabaseConfigured()) return {};
  const rows = await supabaseSelect<SupabaseCommunityCommentRow>("community_comments", "select=*&status=eq.open&order=created_at.desc&limit=200");
  return rows.reduce<Record<string, NeighborhoodComment[]>>((acc, row) => {
    const comment = fromSupabaseCommunityCommentRow(row);
    acc[comment.postId] = [...(acc[comment.postId] ?? []), comment];
    return acc;
  }, {});
}

async function loadRemoteCommunityCommentsForPost(postId: string) {
  if (!isSupabaseConfigured()) return [];
  const rows = await supabaseSelect<SupabaseCommunityCommentRow>(
    "community_comments",
    `select=*&post_id=eq.${encodeURIComponent(postId)}&status=eq.open&order=created_at.asc&limit=80`
  );
  return rows.map(fromSupabaseCommunityCommentRow);
}

async function saveRemoteCommunityPost(post: NeighborhoodPost, authorId: string, authorName: string) {
  if (!isSupabaseConfigured()) return undefined;
  return supabaseInsert<SupabaseCommunityPostRow>("community_posts", {
    id: post.id,
    author_auth_uid: authorId,
    author_name: authorName,
    city: post.city,
    category: post.category,
    title: post.title,
    body: post.body,
    area: post.area
  });
}

async function saveRemoteCommunityComment(postId: string, authorId: string, authorName: string, message: string) {
  if (!isSupabaseConfigured()) return undefined;
  return supabaseInsert<SupabaseCommunityCommentRow>("community_comments", {
    post_id: postId,
    author_auth_uid: authorId,
    author_name: authorName,
    message
  });
}

async function saveRemoteCommunityReaction(postId: string, authorId: string) {
  if (!isSupabaseConfigured()) return undefined;
  return supabaseUpsert<SupabaseCommunityReactionRow>("community_reactions", {
    post_id: postId,
    auth_uid: authorId,
    reaction_type: "helpful"
  }, "post_id,auth_uid");
}

async function deleteRemoteCommunityPost(postId: string) {
  if (!isSupabaseConfigured()) return undefined;
  return supabasePatchById<SupabaseCommunityPostRow>("community_posts", postId, {
    status: "deleted"
  });
}

async function deleteRemoteCommunityComment(commentId: string) {
  if (!isSupabaseConfigured()) return undefined;
  return supabasePatchById<SupabaseCommunityCommentRow>("community_comments", commentId, {
    status: "deleted"
  });
}

function broadcastMeetupChatMessage(eventId: string, message: MeetupChatMessage) {
  const channel = createMeetupChatChannel();
  if (!channel) return;
  channel.postMessage({ eventId, message });
  channel.close();
}

export function DuringTripScreen({
  input,
  itinerary,
  selectedDay,
  visitedPlaceIds,
  liveInfo,
  memberId,
  memberName,
  entryMode = "all",
  onRequireAuth,
  onOpenMap,
  onOpenPlan
}: DuringTripScreenProps) {
  const [selectedDestination, setSelectedDestination] = useState<Destination>(input.destination);
  const location = locationOptionsByDestination[selectedDestination][0];
  const [activeMode, setActiveMode] = useState<QuickMode>("next");
  const [exchangeAmount, setExchangeAmount] = useState(100000);
  const [meetupTitle, setMeetupTitle] = useState("");
  const [meetupPhoto, setMeetupPhoto] = useState("");
  const [meetupPhotoFile, setMeetupPhotoFile] = useState<SelectedPhotoFile | null>(null);
  const [meetupPhotoStatus, setMeetupPhotoStatus] = useState("");
  const [meetupSubmitting, setMeetupSubmitting] = useState(false);
  const [meetupDateValue, setMeetupDateValue] = useState(() => getDateInputValue(new Date()));
  const [meetupTimeValue, setMeetupTimeValue] = useState("19:30");
  const [meetupSeats, setMeetupSeats] = useState("");
  const [meetupPrice, setMeetupPrice] = useState("");
  const [meetupVibe, setMeetupVibe] = useState("");
  const [meetupCategory, setMeetupCategory] = useState<MeetupCategory>("식사동행");
  const [meetupOpen, setMeetupOpen] = useState(false);
  const [localMeetups, setLocalMeetups] = useState<LocalMeetup[]>(() => readLocalMeetupsStore());
  const [createdMeetupId, setCreatedMeetupId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [eventDateFilter, setEventDateFilter] = useState<EventDateFilter>("예정된 모든 이벤트");
  const [eventInterestFilter, setEventInterestFilter] = useState<EventInterestFilter>("새로운 이벤트");
  const [communityTab, setCommunityTab] = useState<CommunityTab>(entryMode === "mine" ? "meetups" : "neighborhood");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<NeighborhoodCategory>("전체");
  const [neighborhoodComposerOpen, setNeighborhoodComposerOpen] = useState(false);
  const [neighborhoodTitle, setNeighborhoodTitle] = useState("");
  const [neighborhoodBody, setNeighborhoodBody] = useState("");
  const [neighborhoodCategory, setNeighborhoodCategory] = useState<NeighborhoodPost["category"]>("질문");
  const [likedNeighborhoodPostIds, setLikedNeighborhoodPostIds] = useState<string[]>([]);
  const [localNeighborhoodPosts, setLocalNeighborhoodPosts] = useState<NeighborhoodPost[]>(() => readLocalNeighborhoodPostsStore());
  const [neighborhoodCommentsByPostId, setNeighborhoodCommentsByPostId] = useState<Record<string, NeighborhoodComment[]>>(() => readLocalNeighborhoodCommentsStore());
  const [activeNeighborhoodPostId, setActiveNeighborhoodPostId] = useState<string | null>(null);
  const [neighborhoodCommentDrafts, setNeighborhoodCommentDrafts] = useState<Record<string, string>>({});
  const [neighborhoodMenuPostId, setNeighborhoodMenuPostId] = useState<string | null>(null);
  const [neighborhoodMenuCommentId, setNeighborhoodMenuCommentId] = useState<string | null>(null);
  const [neighborhoodStatus, setNeighborhoodStatus] = useState("");
  const [neighborhoodRealtimeStatus, setNeighborhoodRealtimeStatus] = useState<MeetupRealtimeStatus>(() => (isSupabaseConfigured() ? "connecting" : "local"));
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [attendingEventIds, setAttendingEventIds] = useState<string[]>(() => readStringArrayStore(attendingMeetupStorageKey));
  const [remoteAttendingEventIds, setRemoteAttendingEventIds] = useState<string[]>([]);
  const [meetupMemberCounts, setMeetupMemberCounts] = useState<Record<string, number>>({});
  const [blockedMeetupIds, setBlockedMeetupIds] = useState<string[]>([]);
  const [blockedMeetupProfileIds, setBlockedMeetupProfileIds] = useState<string[]>([]);
  const [chatMessagesByEventId, setChatMessagesByEventId] = useState<Record<string, MeetupChatMessage[]>>(() => readMeetupChatStore());
  const [chatDraftsByEventId, setChatDraftsByEventId] = useState<Record<string, string>>({});
  const [unreadMeetupIds, setUnreadMeetupIds] = useState<string[]>([]);
  const [meetupChatToast, setMeetupChatToast] = useState<{ id: string; title: string; body: string } | null>(null);
  const [meetupActionStatus, setMeetupActionStatus] = useState("");
  const [meetupRealtimeStatus, setMeetupRealtimeStatus] = useState<MeetupRealtimeStatus>(() => (isRealtimeMeetupChatEnabled() ? "connecting" : "local"));
  const chatUser = useMemo(() => getMeetupChatUser(memberName ?? "나", memberId), [memberId, memberName]);

  useEffect(() => {
    Promise.all([loadBlockedTargetIds("meetup"), loadBlockedTargetIds("profile", memberId ?? memberName)])
      .then(([meetupIds, profileIds]) => {
        setBlockedMeetupIds(meetupIds);
        setBlockedMeetupProfileIds(profileIds);
      })
      .catch(() => {
        setBlockedMeetupIds([]);
        setBlockedMeetupProfileIds([]);
      });
  }, [memberId, memberName]);

  useEffect(() => {
    writeMeetupChatStore(chatMessagesByEventId);
  }, [chatMessagesByEventId]);

  useEffect(() => {
    if (!meetupChatToast) return;
    const timerId = globalThis.setTimeout(() => setMeetupChatToast(null), 2600);
    return () => globalThis.clearTimeout(timerId);
  }, [meetupChatToast]);

  useEffect(() => {
    if (typeof CustomEvent === "undefined") return;
    globalThis.dispatchEvent?.(
      new CustomEvent("mangomap:tab-badge", {
        detail: { screen: "travel", count: unreadMeetupIds.length }
      })
    );
  }, [unreadMeetupIds.length]);

  useEffect(() => {
    writeLocalMeetupsStore(localMeetups);
  }, [localMeetups]);

  useEffect(() => {
    writeLocalNeighborhoodPostsStore(localNeighborhoodPosts);
  }, [localNeighborhoodPosts]);

  useEffect(() => {
    writeLocalNeighborhoodCommentsStore(neighborhoodCommentsByPostId);
  }, [neighborhoodCommentsByPostId]);

  useEffect(() => {
    let active = true;
    Promise.all([loadRemoteCommunityPosts(), loadRemoteCommunityComments()])
      .then(([posts, comments]) => {
        if (!active) return;
        if (posts.length > 0) {
          setLocalNeighborhoodPosts((current) => {
            const currentIds = new Set(current.map((post) => post.id));
            return [...posts.filter((post) => !currentIds.has(post.id)), ...current];
          });
        }
        if (Object.keys(comments).length > 0) {
          setNeighborhoodCommentsByPostId((current) => ({ ...current, ...comments }));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeNeighborhoodPostId) {
      setNeighborhoodRealtimeStatus(isSupabaseConfigured() ? "connecting" : "local");
      return;
    }

    if (!isSupabaseConfigured()) {
      setNeighborhoodRealtimeStatus("local");
      return;
    }

    let active = true;
    const applyComments = (comments: NeighborhoodComment[]) => {
      if (!active || comments.length === 0) return;
      setNeighborhoodCommentsByPostId((current) => {
        const merged = mergeNeighborhoodComments(current[activeNeighborhoodPostId] ?? [], comments);
        setLocalNeighborhoodPosts((posts) =>
          posts.map((post) => (post.id === activeNeighborhoodPostId ? { ...post, comments: Math.max(post.comments, merged.length) } : post))
        );
        return { ...current, [activeNeighborhoodPostId]: merged };
      });
    };
    const syncComments = () => {
      loadRemoteCommunityCommentsForPost(activeNeighborhoodPostId)
        .then(applyComments)
        .catch(() => {
          if (active) setNeighborhoodRealtimeStatus("error");
        });
    };

    setNeighborhoodRealtimeStatus("connecting");
    const unsubscribe = subscribeSupabaseInserts<SupabaseCommunityCommentRow>(
      "community_comments",
      `post_id=eq.${activeNeighborhoodPostId}`,
      (row) => {
        if (row.status && row.status !== "open") return;
        applyComments([fromSupabaseCommunityCommentRow(row)]);
      },
      (status) => {
        if (active) setNeighborhoodRealtimeStatus(status);
      }
    );
    syncComments();
    const intervalId = globalThis.setInterval(syncComments, unsubscribe ? 10000 : 3000);

    return () => {
      active = false;
      unsubscribe?.();
      globalThis.clearInterval(intervalId);
    };
  }, [activeNeighborhoodPostId]);

  useEffect(() => {
    let active = true;
    const applyRemoteMeetups = (meetups: LocalMeetup[]) => {
      if (!active || meetups.length === 0) return;
      setLocalMeetups((current) => mergeRemoteMeetups(current, meetups));
    };
    const syncMeetups = () => {
      loadRemoteMeetups()
        .then(applyRemoteMeetups)
        .catch(() => undefined);
    };
    const unsubscribe = isSupabaseConfigured()
      ? subscribeSupabaseInserts<SupabaseMeetupRow>(
          "meetups",
          "status=eq.open",
          (row) => applyRemoteMeetups([fromSupabaseMeetupRow(row)])
        )
      : undefined;
    syncMeetups();
    const intervalId = globalThis.setInterval(syncMeetups, unsubscribe ? 15000 : 5000);
    return () => {
      active = false;
      unsubscribe?.();
      globalThis.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    writeStringArrayStore(attendingMeetupStorageKey, attendingEventIds);
  }, [attendingEventIds]);

  useEffect(() => {
    let active = true;
    if (!memberId) {
      setRemoteAttendingEventIds([]);
      return () => {
        active = false;
      };
    }

    const syncMemberships = () => {
      loadRemoteMeetupMemberIds(memberId)
        .then((ids) => {
          if (active) setRemoteAttendingEventIds(ids);
        })
        .catch(() => {
          if (active) setRemoteAttendingEventIds([]);
        });
    };

    syncMemberships();
    const intervalId = globalThis.setInterval(syncMemberships, 15000);
    return () => {
      active = false;
      globalThis.clearInterval(intervalId);
    };
  }, [memberId]);

  useEffect(() => {
    let active = true;
    const syncMemberCounts = () => {
      loadRemoteMeetupMemberCounts()
        .then((counts) => {
          if (active) setMeetupMemberCounts(counts);
        })
        .catch(() => {
          if (active) setMeetupMemberCounts({});
        });
    };
    syncMemberCounts();
    const intervalId = globalThis.setInterval(syncMemberCounts, 12000);
    return () => {
      active = false;
      globalThis.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const channel = createMeetupChatChannel();
    if (!channel) return;
    channel.onmessage = (event: MessageEvent<{ eventId?: string; message?: MeetupChatMessage }>) => {
      const eventId = event.data?.eventId;
      const message = event.data?.message;
      if (!eventId || !message) return;
      if (message.authorId && blockedMeetupProfileIds.includes(message.authorId)) return;
      setChatMessagesByEventId((current) => {
        const messages = current[eventId] ?? [];
        if (messages.some((item) => item.id === message.id)) return current;
        return { ...current, [eventId]: [...messages, message] };
      });
    };
    return () => channel.close();
  }, [blockedMeetupProfileIds]);

  useEffect(() => {
    if (!activeChatId) return;
    setUnreadMeetupIds((current) => current.filter((id) => id !== activeChatId));
  }, [activeChatId]);

  useEffect(() => {
    if (!isRealtimeMeetupChatEnabled()) return;
    const unsubscribe = subscribeSupabaseInserts<SupabaseMeetupMessageRow>(
      "meetup_messages",
      "",
      (row) => {
        const message = fromSupabaseMeetupMessageRow(row, chatUser.id);
        if (message.authorId && blockedMeetupProfileIds.includes(message.authorId)) return;
        setChatMessagesByEventId((current) => ({
          ...current,
          [row.meetup_id]: mergeMeetupChatMessages(current[row.meetup_id] ?? [], [message])
        }));
        if (message.sender === "me") return;
        if (row.meetup_id === activeChatId) return;
        setMeetupChatToast({
          id: message.id,
          title: row.meetup_id === activeChatId ? "새 메시지" : "모임 새 메시지",
          body: `${message.authorName ?? "참가자"}: ${message.text}`
        });
        if (row.meetup_id !== activeChatId) {
          setUnreadMeetupIds((current) => (current.includes(row.meetup_id) ? current : [row.meetup_id, ...current]));
        }
      }
    );
    return () => unsubscribe?.();
  }, [activeChatId, blockedMeetupProfileIds, chatUser.id]);

  useEffect(() => {
    if (!activeChatId) {
      setMeetupRealtimeStatus(isRealtimeMeetupChatEnabled() ? "connecting" : "local");
      return;
    }
    if (!isRealtimeMeetupChatEnabled()) {
      setMeetupRealtimeStatus("local");
      return;
    }
    let active = true;
    const applyRemoteMessages = (messages: MeetupChatMessage[]) => {
      if (!active || messages.length === 0) return;
      setChatMessagesByEventId((current) => ({
        ...current,
        [activeChatId]: mergeMeetupChatMessages(current[activeChatId] ?? [], messages)
      }));
    };

    const unsubscribeStream = subscribeRemoteMeetupChat(activeChatId, chatUser.id, applyRemoteMessages, (status) => {
      if (active) setMeetupRealtimeStatus(status);
    });

    const syncChat = () => {
      fetchRemoteMeetupChat(activeChatId, chatUser.id)
        .then((messages) => {
          applyRemoteMessages(messages);
        })
        .catch(() => {
          if (active) setMeetupRealtimeStatus("error");
        });
    };

    syncChat();
    const intervalId = globalThis.setInterval(syncChat, unsubscribeStream ? 9000 : 2500);
    return () => {
      active = false;
      unsubscribeStream?.();
      globalThis.clearInterval(intervalId);
    };
  }, [activeChatId, chatUser.id]);

  useEffect(() => {
    setSelectedDestination(input.destination);
  }, [input.destination]);

  useEffect(() => {
    if (entryMode === "mine") setCommunityTab("meetups");
  }, [entryMode]);

  const day = itinerary.days.find((item) => item.day === selectedDay) ?? itinerary.days[0];
  const nextPlace = day.places.find((place) => !visitedPlaceIds.includes(place.id)) ?? day.places[0];
  const recommendedPlaces = useMemo(() => pickNearNowPlaces(day.places, nextPlace), [day.places, nextPlace]);
  const nearbyHotplaces = useMemo(
    () => pickNearbyHotplaces(selectedDestination, location, nextPlace.category),
    [selectedDestination, location, nextPlace.category]
  );
  const weeklyEvents = useMemo(
    () => [...localMeetups, ...getWeeklyEvents(selectedDestination)],
    [selectedDestination, localMeetups]
  );
  const filteredEvents = useMemo(() => filterEvents(weeklyEvents, eventDateFilter, eventInterestFilter), [weeklyEvents, eventDateFilter, eventInterestFilter]);
  const visibleEvents = useMemo(
    () => (entryMode === "mine"
      ? filteredEvents.filter(
          (event) =>
            attendingEventIds.includes(event.id) ||
            remoteAttendingEventIds.includes(event.id) ||
            (memberId ? event.hostAuthUid === memberId : false)
        )
      : filteredEvents
    ).filter(
      (event) =>
        isMeetupRecentlyVisible(event) &&
        !blockedMeetupIds.includes(event.id) &&
        !getMeetupHostBlockIds(event).some((id) => blockedMeetupProfileIds.includes(id))
    ),
    [attendingEventIds, blockedMeetupIds, blockedMeetupProfileIds, entryMode, filteredEvents, memberId, remoteAttendingEventIds]
  );
  const activeChatEvent = activeChatId ? weeklyEvents.find((event) => event.id === activeChatId) : undefined;
  const activeChatEventBlocked = activeChatEvent
    ? blockedMeetupIds.includes(activeChatEvent.id) || getMeetupHostBlockIds(activeChatEvent).some((id) => blockedMeetupProfileIds.includes(id))
    : false;
  const visibleMeetupChatMessages = activeChatEvent
    ? (chatMessagesByEventId[activeChatEvent.id] ?? createInitialMeetupChat(activeChatEvent)).filter(
        (message) => !message.authorId || !blockedMeetupProfileIds.includes(message.authorId)
      )
    : [];
  const communityOwnerIds = useMemo(() => [memberId, memberName].filter((value): value is string => Boolean(value)), [memberId, memberName]);
  const allNeighborhoodPosts = useMemo(
    () => [...localNeighborhoodPosts, ...getNeighborhoodSeedPosts(selectedDestination)],
    [localNeighborhoodPosts, selectedDestination]
  );
  const activeNeighborhoodPost = activeNeighborhoodPostId
    ? allNeighborhoodPosts.find((post) => post.id === activeNeighborhoodPostId && !blockedMeetupProfileIds.includes(post.authorAuthUid ?? post.author))
    : undefined;

  useEffect(() => {
    if (!activeChatEventBlocked) return;
    setActiveChatId(null);
  }, [activeChatEventBlocked]);

  useEffect(() => {
    if (!activeNeighborhoodPostId || activeNeighborhoodPost) return;
    setActiveNeighborhoodPostId(null);
  }, [activeNeighborhoodPost?.id, activeNeighborhoodPostId]);

  const openPlaceMap = (place: PlacePlan) => {
    openGoogleMapsPlace(place, selectedDestination);
  };

  const openNearbyFood = () => {
    openGoogleMapsSearch(`${selectedDestination} ${location} 맛집`);
  };

  const openGoogleSearch = (query: string) => {
    openGoogleMapsSearch(query);
  };

  const openGrabHelp = () => {
    openGoogleMapsSearch(`${location} to ${nextPlace.mapQuery}`);
  };

  const ensureMeetupChat = (event: LocalMeetup) => {
    setChatMessagesByEventId((current) => {
      if (current[event.id]?.length) return current;
      return {
        ...current,
        [event.id]: createInitialMeetupChat(event)
      };
    });
  };

  const addMeetupChatMessage = async (eventId: string, message: Omit<MeetupChatMessage, "id">) => {
    const nextMessage = {
      ...message,
      id: `${eventId}-${Date.now()}-${Math.random()}`,
      authorId: message.authorId ?? chatUser.id,
      authorName: message.authorName ?? chatUser.name,
      createdAt: Date.now()
    };
    const remoteMessage = isSupabaseConfigured() ? await sendRemoteMeetupChatMessage(eventId, nextMessage) : undefined;
    const savedMessage = remoteMessage ? fromSupabaseMeetupMessageRow(remoteMessage, chatUser.id) : nextMessage;
    setChatMessagesByEventId((current) => ({
      ...current,
      [eventId]: mergeMeetupChatMessages(current[eventId] ?? [], [savedMessage])
    }));
    broadcastMeetupChatMessage(eventId, savedMessage);
    return savedMessage;
  };

  const ensureRemoteMeetupMembership = async (event: LocalMeetup) => {
    if (!memberName || !isSupabaseConfigured()) return;
    const userId = memberId ?? memberName;
    await saveRemoteMeetupMember(event.id, userId, memberName);
    setRemoteAttendingEventIds((current) => (current.includes(event.id) ? current : [...current, event.id]));
    setAttendingEventIds((current) => (current.includes(event.id) ? current : [...current, event.id]));
  };

  const requestAttendMeetup = async (event: LocalMeetup) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    setMeetupActionStatus("");
    const alreadyAttending = attendingEventIds.includes(event.id) || remoteAttendingEventIds.includes(event.id);
    if (!alreadyAttending && !canOpenMeetupRoom(event, false)) {
      setMeetupActionStatus("마감되었거나 종료된 모임이라 새로 입장할 수 없어요.");
      return;
    }
    setActiveChatId(event.id);
    ensureMeetupChat(event);
    try {
      if (!alreadyAttending) {
        await ensureRemoteMeetupMembership(event);
        setRemoteAttendingEventIds((current) => (current.includes(event.id) ? current : [...current, event.id]));
        setAttendingEventIds((current) => (current.includes(event.id) ? current : [...current, event.id]));
        setMeetupMemberCounts((current) => ({
          ...current,
          [event.id]: Math.max((current[event.id] ?? 0) + 1, 1)
        }));
        await addMeetupChatMessage(event.id, {
          sender: "me",
          text: "방 입장했어요. 시간과 만나는 위치 확인 부탁드려요."
        });
      }
    } catch (error) {
      setMeetupActionStatus(getSubmitFailureMessage(error, "방 입장 또는 메시지 저장에 실패했어요. 잠시 후 다시 시도해주세요."));
    }
  };

  const closeMeetup = async (event: LocalMeetup) => {
    if (!memberName || !isMeetupHost(event, memberId, memberName)) {
      onRequireAuth();
      return;
    }
    setMeetupActionStatus("");
    setLocalMeetups((current) =>
      current.map((item) => (item.id === event.id ? { ...item, status: "마감" } : item))
    );
    try {
      await updateRemoteMeetupStatus(event.id, "closed");
    } catch (error) {
      setMeetupActionStatus(getSubmitFailureMessage(error, "모임 마감 상태를 서버에 저장하지 못했어요."));
    }
  };

  const cancelMeetup = async (event: LocalMeetup) => {
    if (!memberName || !isMeetupHost(event, memberId, memberName)) {
      onRequireAuth();
      return;
    }
    setMeetupActionStatus("");
    setLocalMeetups((current) =>
      current.map((item) => (item.id === event.id ? { ...item, status: "취소" } : item))
    );
    try {
      await updateRemoteMeetupStatus(event.id, "cancelled");
    } catch (error) {
      setMeetupActionStatus(getSubmitFailureMessage(error, "모임 취소 상태를 서버에 저장하지 못했어요."));
    }
  };

  const deleteMeetup = async (event: LocalMeetup) => {
    if (!memberName || !isMeetupHost(event, memberId, memberName)) {
      onRequireAuth();
      return;
    }
    setMeetupActionStatus("");
    setLocalMeetups((current) => current.filter((item) => item.id !== event.id));
    setAttendingEventIds((current) => current.filter((id) => id !== event.id));
    setRemoteAttendingEventIds((current) => current.filter((id) => id !== event.id));
    setChatMessagesByEventId((current) => Object.fromEntries(Object.entries(current).filter(([eventId]) => eventId !== event.id)));
    try {
      await updateRemoteMeetupStatus(event.id, "deleted");
    } catch (error) {
      setMeetupActionStatus(getSubmitFailureMessage(error, "모임 삭제 상태를 서버에 저장하지 못했어요."));
    }
  };

  const sendQuickMeetupQuestion = async (event: LocalMeetup, question: string) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    setMeetupActionStatus("");
    ensureMeetupChat(event);
    try {
      await ensureRemoteMeetupMembership(event);
      await addMeetupChatMessage(event.id, { sender: "me", text: question });
    } catch (error) {
      setMeetupActionStatus(getSubmitFailureMessage(error, "메시지를 보내지 못했어요. 방 입장 상태를 확인해주세요."));
    }
  };

  const sendMeetupChatDraft = async (event: LocalMeetup) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    const text = (chatDraftsByEventId[event.id] ?? "").trim();
    if (!text) return;
    setMeetupActionStatus("");
    ensureMeetupChat(event);
    try {
      await ensureRemoteMeetupMembership(event);
      await addMeetupChatMessage(event.id, { sender: "me", text });
      setChatDraftsByEventId((current) => ({ ...current, [event.id]: "" }));
    } catch (error) {
      setMeetupActionStatus(getSubmitFailureMessage(error, "메시지를 보내지 못했어요. 방 입장 상태를 확인해주세요."));
    }
  };

  const toggleNeighborhoodPost = (postId: string) => {
    setNeighborhoodMenuPostId(null);
    setNeighborhoodMenuCommentId(null);
    setActiveNeighborhoodPostId(postId);
  };

  const toggleNeighborhoodLike = async (postId: string) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    if (likedNeighborhoodPostIds.includes(postId)) return;
    setNeighborhoodStatus("");
    setLikedNeighborhoodPostIds((current) => [postId, ...current]);
    setLocalNeighborhoodPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, likes: post.likes + 1 } : post))
    );
    try {
      await saveRemoteCommunityReaction(postId, memberId ?? memberName);
    } catch {
      setNeighborhoodStatus("공감은 이 기기에 먼저 반영됐어요. 서버 동기화는 잠시 후 다시 시도돼요.");
    }
  };

  const submitNeighborhoodComment = async (postId: string) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    const body = (neighborhoodCommentDrafts[postId] ?? "").trim();
    if (body.length < 1) return;
    setNeighborhoodStatus("");
    const localComment: NeighborhoodComment = {
      id: `local-comment-${Date.now()}`,
      postId,
      author: memberName,
      authorAuthUid: memberId ?? memberName,
      body,
      createdAt: Date.now(),
      timeAgo: "방금",
      verified: true
    };
    setNeighborhoodCommentsByPostId((current) => ({
      ...current,
      [postId]: mergeNeighborhoodComments(current[postId] ?? [], [localComment])
    }));
    setLocalNeighborhoodPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, comments: post.comments + 1 } : post))
    );
    setNeighborhoodCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setActiveNeighborhoodPostId(postId);
    try {
      const remoteComment = await saveRemoteCommunityComment(postId, memberId ?? memberName, memberName, body);
      if (remoteComment) {
        const normalized = fromSupabaseCommunityCommentRow(remoteComment);
        setNeighborhoodCommentsByPostId((current) => ({
          ...current,
          [postId]: mergeNeighborhoodComments(current[postId] ?? [], [normalized])
        }));
      }
    } catch {
      setNeighborhoodStatus("댓글은 이 기기에 먼저 저장됐어요. Supabase 테이블을 만든 뒤 다시 동기화할 수 있어요.");
    }
  };

  const deleteNeighborhoodPost = async (post: NeighborhoodPost) => {
    const ownerId = post.authorAuthUid ?? post.author;
    if (!memberName || !communityOwnerIds.includes(ownerId)) {
      onRequireAuth();
      return;
    }
    setNeighborhoodStatus("");
    setNeighborhoodMenuPostId(null);
    setNeighborhoodMenuCommentId(null);
    setActiveNeighborhoodPostId(null);
    setLocalNeighborhoodPosts((current) => current.filter((item) => item.id !== post.id));
    setNeighborhoodCommentsByPostId((current) => {
      const next = { ...current };
      delete next[post.id];
      return next;
    });
    try {
      await deleteRemoteCommunityPost(post.id);
      setNeighborhoodStatus("게시글을 삭제했어요.");
    } catch {
      setNeighborhoodStatus("내 화면에서는 삭제했어요. 서버 반영은 Supabase 연결 상태를 확인해주세요.");
    }
  };

  const reportNeighborhoodPost = async (post: NeighborhoodPost) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    setNeighborhoodMenuPostId(null);
    await saveSafetyAction({
      id: `report-community-post-${post.id}-${Date.now()}`,
      type: "report",
      targetType: "community_post",
      targetId: post.id,
      targetName: post.title,
      reporterId: memberId ?? memberName,
      reason: "커뮤니티 게시글 신고",
      createdAt: new Date().toISOString()
    });
    setNeighborhoodStatus("신고가 접수됐어요. 운영자가 확인할게요.");
  };

  const blockNeighborhoodAuthor = async (post: NeighborhoodPost) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    const targetId = post.authorAuthUid ?? post.author;
    setNeighborhoodMenuPostId(null);
    await saveSafetyAction({
      id: `block-community-profile-${targetId}-${Date.now()}`,
      type: "block",
      targetType: "profile",
      targetId,
      targetName: post.author,
      reporterId: memberId ?? memberName,
      reason: "커뮤니티 사용자 차단",
      createdAt: new Date().toISOString()
    });
    setBlockedMeetupProfileIds((current) => (current.includes(targetId) ? current : [targetId, ...current]));
    if (activeNeighborhoodPostId === post.id) setActiveNeighborhoodPostId(null);
    setNeighborhoodStatus(`${post.author}님의 글을 숨겼어요.`);
  };

  const deleteNeighborhoodComment = async (comment: NeighborhoodComment) => {
    const ownerId = comment.authorAuthUid ?? comment.author;
    if (!memberName || !communityOwnerIds.includes(ownerId)) {
      onRequireAuth();
      return;
    }
    setNeighborhoodStatus("");
    setNeighborhoodMenuCommentId(null);
    setNeighborhoodCommentsByPostId((current) => ({
      ...current,
      [comment.postId]: (current[comment.postId] ?? []).filter((item) => item.id !== comment.id)
    }));
    setLocalNeighborhoodPosts((current) =>
      current.map((post) => (post.id === comment.postId ? { ...post, comments: Math.max(0, post.comments - 1) } : post))
    );
    try {
      await deleteRemoteCommunityComment(comment.id);
      setNeighborhoodStatus("댓글을 삭제했어요.");
    } catch {
      setNeighborhoodStatus("내 화면에서는 댓글을 삭제했어요. 서버 반영은 Supabase 연결 상태를 확인해주세요.");
    }
  };

  const reportNeighborhoodComment = async (comment: NeighborhoodComment) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    setNeighborhoodMenuCommentId(null);
    await saveSafetyAction({
      id: `report-community-comment-${comment.id}-${Date.now()}`,
      type: "report",
      targetType: "community_comment",
      targetId: comment.id,
      targetName: comment.body.slice(0, 40),
      reporterId: memberId ?? memberName,
      reason: "커뮤니티 댓글 신고",
      createdAt: new Date().toISOString()
    });
    setNeighborhoodStatus("댓글 신고가 접수됐어요. 운영자가 확인할게요.");
  };

  const blockNeighborhoodCommentAuthor = async (comment: NeighborhoodComment) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    const targetId = comment.authorAuthUid ?? comment.author;
    setNeighborhoodMenuCommentId(null);
    await saveSafetyAction({
      id: `block-community-comment-profile-${targetId}-${Date.now()}`,
      type: "block",
      targetType: "profile",
      targetId,
      targetName: comment.author,
      reporterId: memberId ?? memberName,
      reason: "커뮤니티 댓글 사용자 차단",
      createdAt: new Date().toISOString()
    });
    setBlockedMeetupProfileIds((current) => (current.includes(targetId) ? current : [targetId, ...current]));
    setNeighborhoodStatus(`${comment.author}님의 댓글을 숨겼어요.`);
  };

  if (activeChatEvent) {
    const attending = attendingEventIds.includes(activeChatEvent.id) || remoteAttendingEventIds.includes(activeChatEvent.id);
    return (
      <MeetupChatRoomScreen
        event={activeChatEvent}
        destination={selectedDestination}
        attending={attending}
        memberCount={getMeetupCurrentMemberCount(activeChatEvent, meetupMemberCounts, attending)}
        chatMessages={visibleMeetupChatMessages}
        chatDraft={chatDraftsByEventId[activeChatEvent.id] ?? ""}
        realtimeStatus={meetupRealtimeStatus}
        actionStatus={meetupActionStatus}
        chatToast={meetupChatToast}
        memberId={memberId}
        memberName={memberName}
        onRequireAuth={onRequireAuth}
        onBack={() => setActiveChatId(null)}
        onSendQuickMessage={sendQuickMeetupQuestion}
        onSetChatDraft={(text) => setChatDraftsByEventId((current) => ({ ...current, [activeChatEvent.id]: text }))}
        onSendChatDraft={() => sendMeetupChatDraft(activeChatEvent)}
        onBlockMeetup={(targetId) => {
          setBlockedMeetupProfileIds((current) => (current.includes(targetId) ? current : [targetId, ...current]));
          setActiveChatId(null);
        }}
      />
    );
  }

  if (activeNeighborhoodPost) {
    const comments = neighborhoodCommentsByPostId[activeNeighborhoodPost.id] ?? [];
    const draft = neighborhoodCommentDrafts[activeNeighborhoodPost.id] ?? "";
    const liked = likedNeighborhoodPostIds.includes(activeNeighborhoodPost.id);
    const isOwner = communityOwnerIds.includes(activeNeighborhoodPost.authorAuthUid ?? activeNeighborhoodPost.author);
    return (
      <NeighborhoodPostDetailScreen
        post={activeNeighborhoodPost}
        comments={comments.filter((comment) => !blockedMeetupProfileIds.includes(comment.authorAuthUid ?? comment.author))}
        draft={draft}
        liked={liked}
        isOwner={isOwner}
        menuOpen={neighborhoodMenuPostId === activeNeighborhoodPost.id}
        activeCommentMenuId={neighborhoodMenuCommentId}
        ownerIds={communityOwnerIds}
        memberName={memberName}
        statusMessage={neighborhoodStatus}
        realtimeStatus={neighborhoodRealtimeStatus}
        onBack={() => {
          setNeighborhoodMenuPostId(null);
          setActiveNeighborhoodPostId(null);
        }}
        onToggleMenu={() => setNeighborhoodMenuPostId((current) => (current === activeNeighborhoodPost.id ? null : activeNeighborhoodPost.id))}
        onCloseMenu={() => setNeighborhoodMenuPostId(null)}
        onDeletePost={() => deleteNeighborhoodPost(activeNeighborhoodPost)}
        onReportPost={() => reportNeighborhoodPost(activeNeighborhoodPost)}
        onBlockAuthor={() => blockNeighborhoodAuthor(activeNeighborhoodPost)}
        onToggleCommentMenu={(commentId) => setNeighborhoodMenuCommentId((current) => (current === commentId ? null : commentId))}
        onCloseCommentMenu={() => setNeighborhoodMenuCommentId(null)}
        onDeleteComment={deleteNeighborhoodComment}
        onReportComment={reportNeighborhoodComment}
        onBlockCommentAuthor={blockNeighborhoodCommentAuthor}
        onToggleLike={() => toggleNeighborhoodLike(activeNeighborhoodPost.id)}
        onSetDraft={(text) => setNeighborhoodCommentDrafts((current) => ({ ...current, [activeNeighborhoodPost.id]: text }))}
        onSubmitComment={() => submitNeighborhoodComment(activeNeighborhoodPost.id)}
      />
    );
  }

  return (
    <AppShell withBottomNav backgroundColor="#FFF7DF">
      <Header
        eyebrow="커뮤니티"
        title={`${input.destination} 여행자 커뮤니티`}
        subtitle="생활톡으로 먼저 물어보고, 마음 맞으면 모임방에서 같이 움직여요."
        compactMascot
        dark
      />

      {meetupChatToast ? (
        <View style={styles.chatToast}>
          <Text style={styles.chatToastTitle}>{meetupChatToast.title}</Text>
          <Text style={styles.chatToastBody} numberOfLines={1}>{meetupChatToast.body}</Text>
        </View>
      ) : null}

      <View style={styles.currentCard}>
        <Text style={styles.cardStep}>{entryMode === "mine" ? "내 모임" : "여행자 커뮤니티"}</Text>
        <Text style={styles.cardSubcopy}>
          {entryMode === "mine" ? "내가 입장한 모임과 대화방을 확인해요." : "생활톡은 가볍게 둘러보고, 실제 만남은 모임에서 방입장해요."}
        </Text>
        <View style={styles.destinationChips}>
          {meetupDestinations.map((destination) => (
            <Pressable
              key={destination}
              accessibilityRole="button"
              onPress={() => setSelectedDestination(destination)}
              style={[styles.destinationChip, selectedDestination === destination && styles.destinationChipActive]}
            >
              <Text style={[styles.destinationChipText, selectedDestination === destination && styles.destinationChipTextActive]}>{destination}</Text>
            </Pressable>
          ))}
        </View>

        {entryMode !== "mine" ? (
          <View style={styles.communityTabBar}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCommunityTab("neighborhood")}
              style={[styles.communityTabButton, communityTab === "neighborhood" && styles.communityTabButtonActive]}
            >
              <Text style={[styles.communityTabLabel, communityTab === "neighborhood" && styles.communityTabLabelActive]}>생활톡</Text>
              <Text style={[styles.communityTabCaption, communityTab === "neighborhood" && styles.communityTabCaptionActive]}>질문·정보·수다</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCommunityTab("meetups")}
              style={[styles.communityTabButton, communityTab === "meetups" && styles.communityTabButtonActive]}
            >
              {unreadMeetupIds.length > 0 ? (
                <Text style={styles.communityUnreadCaption}>새 메시지 {unreadMeetupIds.length}</Text>
              ) : null}
              <Text style={[styles.communityTabLabel, communityTab === "meetups" && styles.communityTabLabelActive]}>모임</Text>
              <Text style={[styles.communityTabCaption, communityTab === "meetups" && styles.communityTabCaptionActive]}>방입장·번개</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {entryMode !== "mine" && communityTab === "neighborhood" ? (
        <NeighborhoodLifePanel
          destination={selectedDestination}
          posts={allNeighborhoodPosts}
          activeCategory={neighborhoodFilter}
          likedPostIds={likedNeighborhoodPostIds}
          ownerIds={communityOwnerIds}
          blockedAuthorIds={blockedMeetupProfileIds}
          commentsByPostId={neighborhoodCommentsByPostId}
          menuPostId={neighborhoodMenuPostId}
          composerOpen={neighborhoodComposerOpen}
          draftTitle={neighborhoodTitle}
          draftBody={neighborhoodBody}
          draftCategory={neighborhoodCategory}
          memberName={memberName}
          statusMessage={neighborhoodStatus}
          onSetCategory={setNeighborhoodFilter}
          onTogglePost={toggleNeighborhoodPost}
          onToggleMenu={(postId) => setNeighborhoodMenuPostId((current) => (current === postId ? null : postId))}
          onCloseMenu={() => setNeighborhoodMenuPostId(null)}
          onDeletePost={deleteNeighborhoodPost}
          onReportPost={reportNeighborhoodPost}
          onBlockAuthor={blockNeighborhoodAuthor}
          onToggleComposer={() => {
            if (!memberName) {
              onRequireAuth();
              return;
            }
            setNeighborhoodComposerOpen((current) => !current);
          }}
          onSetDraftTitle={setNeighborhoodTitle}
          onSetDraftBody={setNeighborhoodBody}
          onSetDraftCategory={setNeighborhoodCategory}
          onToggleLike={toggleNeighborhoodLike}
          onSubmitPost={async () => {
            if (!memberName) {
              onRequireAuth();
              return;
            }
            const title = neighborhoodTitle.trim();
            const body = neighborhoodBody.trim();
            if (title.length < 2 || body.length < 2) return;
            setNeighborhoodStatus("");
            const nextPost: NeighborhoodPost = {
              id: `community-${Date.now()}`,
              city: selectedDestination,
              category: neighborhoodCategory,
                title,
                body,
                author: memberName,
                authorAuthUid: memberId ?? memberName,
                area: location,
              timeAgo: "방금",
              likes: 0,
              comments: 0,
              verified: true
            };
            setLocalNeighborhoodPosts((current) => [
              nextPost,
              ...current
            ]);
            setNeighborhoodTitle("");
            setNeighborhoodBody("");
            setNeighborhoodComposerOpen(false);
            setActiveNeighborhoodPostId(nextPost.id);
            try {
              const remotePost = await saveRemoteCommunityPost(nextPost, memberId ?? memberName, memberName);
              if (remotePost) {
                const normalized = fromSupabaseCommunityPostRow(remotePost);
                setLocalNeighborhoodPosts((current) =>
                  current.map((post) => (post.id === nextPost.id ? normalized : post))
                );
              }
            } catch {
              setNeighborhoodStatus("생활톡은 이 기기에 먼저 저장됐어요. Supabase community_posts 테이블을 만들면 서버에도 올라가요.");
            }
          }}
        />
      ) : null}

      {entryMode === "mine" || communityTab === "meetups" ? (
        <UpcomingEventsPanel
          destination={selectedDestination}
          location={location}
          events={visibleEvents}
          mineOnly={entryMode === "mine"}
          activeDateFilter={eventDateFilter}
          activeInterestFilter={eventInterestFilter}
          savedEventIds={savedEventIds}
          attendingEventIds={attendingEventIds}
          remoteAttendingEventIds={remoteAttendingEventIds}
          meetupMemberCounts={meetupMemberCounts}
          chatMessagesByEventId={chatMessagesByEventId}
          chatDraftsByEventId={chatDraftsByEventId}
          meetupTitle={meetupTitle}
          meetupPhoto={meetupPhoto}
          meetupDateValue={meetupDateValue}
          meetupTimeValue={meetupTimeValue}
          meetupSeats={meetupSeats}
          meetupPrice={meetupPrice}
          meetupVibe={meetupVibe}
          meetupCategory={meetupCategory}
          meetupOpen={meetupOpen}
          meetupPhotoStatus={meetupPhotoStatus}
          meetupSubmitting={meetupSubmitting}
          createdMeetupId={createdMeetupId}
          activeChatId={activeChatId}
          unreadEventIds={unreadMeetupIds}
          realtimeStatus={meetupRealtimeStatus}
          memberName={memberName}
          onSetDateFilter={setEventDateFilter}
          onSetInterestFilter={setEventInterestFilter}
          onSetMeetupTitle={setMeetupTitle}
          onSetMeetupPhoto={(photo, file) => {
            setMeetupPhotoStatus("");
            setMeetupPhoto(photo);
            setMeetupPhotoFile(file ?? null);
          }}
          onSetMeetupPhotoStatus={setMeetupPhotoStatus}
          onSetMeetupDateValue={setMeetupDateValue}
          onSetMeetupTimeValue={setMeetupTimeValue}
          onSetMeetupSeats={setMeetupSeats}
          onSetMeetupPrice={setMeetupPrice}
          onSetMeetupVibe={setMeetupVibe}
          onSetMeetupCategory={setMeetupCategory}
          onToggleMeetupOpen={() => setMeetupOpen((current) => !current)}
          onToggleSave={(eventId) =>
            setSavedEventIds((current) =>
              current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]
            )
          }
          onToggleAttend={requestAttendMeetup}
          onCloseMeetup={closeMeetup}
          onCancelMeetup={cancelMeetup}
          onDeleteMeetup={deleteMeetup}
          onCreateMeetup={async () => {
          if (!memberName) {
            onRequireAuth();
            return;
          }
          const title = meetupTitle.trim();
          if (title.length < 3) return;
          setMeetupSubmitting(true);
          setMeetupPhotoStatus("");
          let uploadedPhoto = meetupPhotoFile ? "" : meetupPhoto.trim();
          try {
            if (meetupPhotoFile) {
              setMeetupPhotoStatus("사진 업로드 중...");
              uploadedPhoto = await supabaseUploadFile(meetupPhotoBucket, meetupPhotoFile.blob, {
                folder: `${selectedDestination}/${memberId ?? memberName}`,
                fileNamePrefix: "meetup",
                fileName: meetupPhotoFile.name,
                contentType: meetupPhotoFile.type,
                maxBytes: maxMeetupPhotoBytes
              });
            } else if (uploadedPhoto && isSupabaseStorageDataUrl(uploadedPhoto)) {
              uploadedPhoto = await supabaseUploadDataUrl(meetupPhotoBucket, uploadedPhoto, {
                folder: `${selectedDestination}/${memberId ?? memberName}`,
                fileNamePrefix: "meetup",
                maxBytes: maxMeetupPhotoBytes
              });
            }
            const meetupTime = buildMeetupTimeLabel(meetupDateValue, meetupTimeValue);
            const nextMeetup: LocalMeetup = {
              id: `local-${Date.now()}`,
              title,
              area: selectedDestination,
              time: meetupTime,
              scheduledAt: parseMeetupDateInput(meetupTime)?.toISOString(),
              category: meetupCategory,
              host: "여행자 제안",
              hostAuthUid: memberId ?? memberName,
              seats: meetupSeats.trim() || getDefaultSeats(meetupCategory),
              safety: getDefaultSafety(meetupCategory),
              source: "사용자 등록",
              venue: `${selectedDestination} 시내`,
              status: "방 생성됨",
              price: meetupPrice.trim() || getDefaultPrice(meetupCategory),
              vibe: meetupVibe.trim() || getDefaultVibe(meetupCategory),
              photo: uploadedPhoto || getDefaultMeetupPhoto(selectedDestination, meetupCategory),
              chatMessages: [`방장: ${formatMeetupCategoryLabel(meetupCategory)} 제안 올렸어요. 시간과 만나는 장소 먼저 맞춰요.`, "참여자: 공개 장소에서 만나면 참여할게요."]
            };

            if (isSupabaseConfigured()) {
              await saveRemoteMeetup(nextMeetup, memberId ?? memberName, memberName);
            }

            setLocalMeetups((current) => [nextMeetup, ...current]);
            setMeetupMemberCounts((current) => ({ ...current, [nextMeetup.id]: 1 }));
            setRemoteAttendingEventIds((current) => (current.includes(nextMeetup.id) ? current : [nextMeetup.id, ...current]));
            setAttendingEventIds((current) => (current.includes(nextMeetup.id) ? current : [nextMeetup.id, ...current]));
            setCreatedMeetupId(nextMeetup.id);
            setEventDateFilter("예정된 모든 이벤트");
            setEventInterestFilter("새로운 이벤트");
            setMeetupTitle("");
            setMeetupPhoto("");
            setMeetupPhotoFile(null);
            setMeetupPhotoStatus("");
            setMeetupDateValue(getDateInputValue(new Date()));
            setMeetupTimeValue("19:30");
            setMeetupSeats("");
            setMeetupPrice("");
            setMeetupVibe("");
            setMeetupOpen(false);
          } catch (error) {
            setMeetupPhotoStatus(
              getSubmitFailureMessage(
                error,
                isSupabaseConfigured()
                  ? "모임방을 서버에 만들지 못했어요. 잠시 후 다시 시도해주세요."
                  : "사진 업로드에 실패했어요."
              )
            );
          } finally {
            setMeetupSubmitting(false);
          }
          }}
          onOpenChat={(event) => {
            ensureMeetupChat(event);
            setUnreadMeetupIds((current) => current.filter((id) => id !== event.id));
            setActiveChatId((current) => (current === event.id ? null : event.id));
          }}
          onSendQuickMessage={sendQuickMeetupQuestion}
          onSetChatDraft={(eventId, text) => setChatDraftsByEventId((current) => ({ ...current, [eventId]: text }))}
          onSendChatDraft={sendMeetupChatDraft}
        />
      ) : null}

    </AppShell>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusItem}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

function InfoPill({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoCaption} numberOfLines={2}>{caption}</Text>
    </View>
  );
}

function PhotoFilePicker({ onPick, onError }: { onPick: (photo: SelectedPhotoFile) => void; onError: (message: string) => void }) {
  if (Platform.OS !== "web") {
    return (
      <View style={styles.filePickerFallback}>
        <Text style={styles.filePickerFallbackText}>사진 URL을 입력해주세요</Text>
      </View>
    );
  }

  return createElement("input", {
    type: "file",
    accept: "image/*",
    onChange: (event: { target?: { files?: FileList; value?: string } }) => {
      const file = event.target?.files?.[0];
      if (!file) return;
      if (file.size > maxMeetupPhotoBytes) {
        onError("사진은 4MB 이하만 올릴 수 있어요.");
        if (event.target) event.target.value = "";
        return;
      }
      const finishPick = (previewUri: string) => {
        onError("");
        onPick({
          blob: file,
          name: file.name,
          type: file.type || "image/jpeg",
          previewUri
        });
      };
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        finishPick(URL.createObjectURL(file));
      } else {
        const reader = new FileReader();
        reader.onload = () => finishPick(String(reader.result ?? ""));
        reader.readAsDataURL(file);
      }
      if (event.target) event.target.value = "";
    },
    style: {
      flex: 1,
      minWidth: 0,
      minHeight: 46,
      borderRadius: 16,
      border: "1px solid #F1D9A8",
      background: "#FFFFFF",
      color: "#10231C",
      fontWeight: 800,
      fontSize: 13,
      padding: "10px 12px"
    }
  });
}

function DateTimeInput({ type, value, onChange }: { type: "date" | "time"; value: string; onChange: (value: string) => void }) {
  if (Platform.OS !== "web") {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={type === "date" ? "YYYY-MM-DD" : "HH:MM"}
        placeholderTextColor={colors.muted}
        style={styles.meetupPickerInputFallback}
      />
    );
  }

  return createElement("input", {
    type,
    value,
    onChange: (event: { target?: { value?: string } }) => onChange(event.target?.value ?? ""),
    style: {
      width: "100%",
      minHeight: 48,
      borderRadius: 16,
      border: "1px solid #D8E6DC",
      background: "#FFFFFF",
      color: "#10231C",
      fontWeight: 800,
      fontSize: 14,
      padding: "10px 12px",
      boxSizing: "border-box"
    }
  });
}

function NeighborhoodLifePanel({
  destination,
  posts,
  activeCategory,
  likedPostIds,
  ownerIds,
  blockedAuthorIds,
  commentsByPostId,
  menuPostId,
  composerOpen,
  draftTitle,
  draftBody,
  draftCategory,
  memberName,
  statusMessage,
  onSetCategory,
  onTogglePost,
  onToggleMenu,
  onCloseMenu,
  onDeletePost,
  onReportPost,
  onBlockAuthor,
  onToggleComposer,
  onSetDraftTitle,
  onSetDraftBody,
  onSetDraftCategory,
  onToggleLike,
  onSubmitPost
}: {
  destination: Destination;
  posts: NeighborhoodPost[];
  activeCategory: NeighborhoodCategory;
  likedPostIds: string[];
  ownerIds: string[];
  blockedAuthorIds: string[];
  commentsByPostId: Record<string, NeighborhoodComment[]>;
  menuPostId: string | null;
  composerOpen: boolean;
  draftTitle: string;
  draftBody: string;
  draftCategory: NeighborhoodPost["category"];
  memberName?: string;
  statusMessage?: string;
  onSetCategory: (category: NeighborhoodCategory) => void;
  onTogglePost: (postId: string) => void;
  onToggleMenu: (postId: string) => void;
  onCloseMenu: () => void;
  onDeletePost: (post: NeighborhoodPost) => void | Promise<void>;
  onReportPost: (post: NeighborhoodPost) => void | Promise<void>;
  onBlockAuthor: (post: NeighborhoodPost) => void | Promise<void>;
  onToggleComposer: () => void;
  onSetDraftTitle: (title: string) => void;
  onSetDraftBody: (body: string) => void;
  onSetDraftCategory: (category: NeighborhoodPost["category"]) => void;
  onToggleLike: (postId: string) => void | Promise<void>;
  onSubmitPost: () => void | Promise<void>;
}) {
  const visiblePosts = posts
    .filter((post) => post.city === destination)
    .filter((post) => !blockedAuthorIds.includes(post.authorAuthUid ?? post.author))
    .filter((post) => activeCategory === "전체" || post.category === activeCategory)
    .slice(0, 5);
  const disabledSubmit = draftTitle.trim().length < 2 || draftBody.trim().length < 2;

  return (
    <View style={styles.neighborhoodPanel}>
      <View style={styles.neighborhoodHeader}>
        <View style={styles.neighborhoodHeaderCopy}>
          <Text style={styles.neighborhoodEyebrow}>동네생활</Text>
          <Text style={styles.neighborhoodTitle}>{destination} 여행자 생활톡</Text>
          <Text style={styles.neighborhoodSubcopy}>현지 질문, 맛집 후기, 같이 갈 사람을 여행자끼리 빠르게 나눠요.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onToggleComposer} style={styles.neighborhoodWriteButton}>
          <Text style={styles.neighborhoodWriteText}>{composerOpen ? "닫기" : "글쓰기"}</Text>
        </Pressable>
      </View>

      <View style={styles.neighborhoodStatsRow}>
        <NeighborhoodStat label="오늘 글" value={`${posts.filter((post) => post.city === destination).length}개`} />
        <NeighborhoodStat label="댓글" value={`${posts.reduce((sum, post) => (post.city === destination ? sum + post.comments : sum), 0)}개`} />
        <NeighborhoodStat label="공감" value={`${posts.reduce((sum, post) => (post.city === destination ? sum + post.likes : sum), 0)}개`} />
      </View>

      <View style={styles.neighborhoodCategoryRow}>
        {neighborhoodCategories.map((category) => (
          <Pressable
            key={category}
            accessibilityRole="button"
            onPress={() => onSetCategory(category)}
            style={[styles.neighborhoodChip, activeCategory === category && styles.neighborhoodChipActive]}
          >
            <Text style={[styles.neighborhoodChipText, activeCategory === category && styles.neighborhoodChipTextActive]}>{category}</Text>
          </Pressable>
        ))}
      </View>

      {composerOpen ? (
        <View style={styles.neighborhoodComposer}>
          <Text style={styles.neighborhoodComposerTitle}>{memberName ? `${memberName}님, 어떤 정보가 필요해요?` : "로그인 후 글을 올릴 수 있어요"}</Text>
          <View style={styles.neighborhoodDraftCategoryRow}>
            {neighborhoodCategories.filter((category): category is NeighborhoodPost["category"] => category !== "전체").map((category) => (
              <Pressable
                key={category}
                accessibilityRole="button"
                onPress={() => onSetDraftCategory(category)}
                style={[styles.neighborhoodDraftChip, draftCategory === category && styles.neighborhoodDraftChipActive]}
              >
                <Text style={[styles.neighborhoodDraftChipText, draftCategory === category && styles.neighborhoodDraftChipTextActive]}>{category}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={draftTitle}
            onChangeText={onSetDraftTitle}
            placeholder="예: 1군 혼밥하기 좋은 곳 있을까요?"
            placeholderTextColor="#9A8A6A"
            style={styles.neighborhoodInput}
          />
          <TextInput
            value={draftBody}
            onChangeText={onSetDraftBody}
            placeholder="상황을 짧게 적으면 댓글이 더 잘 달려요."
            placeholderTextColor="#9A8A6A"
            style={[styles.neighborhoodInput, styles.neighborhoodTextarea]}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            onPress={onSubmitPost}
            disabled={disabledSubmit}
            style={[styles.neighborhoodSubmitButton, disabledSubmit && styles.neighborhoodSubmitButtonDisabled]}
          >
            <Text style={styles.neighborhoodSubmitText}>생활톡 올리기</Text>
          </Pressable>
        </View>
      ) : null}

      {statusMessage ? <Text style={styles.neighborhoodStatusText}>{statusMessage}</Text> : null}

      {visiblePosts.length > 0 ? (
        <View style={styles.neighborhoodFeed}>
          {visiblePosts.map((post) => {
            const liked = likedPostIds.includes(post.id);
            const menuOpen = menuPostId === post.id;
            const isOwner = ownerIds.includes(post.authorAuthUid ?? post.author);
            const comments = commentsByPostId[post.id] ?? [];
            return (
              <View key={post.id} style={styles.neighborhoodPostCard}>
                <View style={styles.neighborhoodPostTopLine}>
                  <Pressable accessibilityRole="button" onPress={() => onTogglePost(post.id)} style={styles.neighborhoodPostMainTap}>
                    <View style={styles.neighborhoodPostMetaRow}>
                      <Text style={styles.neighborhoodPostCategory}>{post.category}</Text>
                      <Text style={styles.neighborhoodPostArea} numberOfLines={1}>{post.area} · {post.timeAgo}</Text>
                    </View>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => onToggleMenu(post.id)} style={styles.neighborhoodMoreButton}>
                    <Text style={styles.neighborhoodMoreText}>···</Text>
                  </Pressable>
                </View>
                <Pressable accessibilityRole="button" onPress={() => onTogglePost(post.id)}>
                  <Text style={styles.neighborhoodPostTitle}>{post.title}</Text>
                  <Text style={styles.neighborhoodPostBody} numberOfLines={2}>{post.body}</Text>
                </Pressable>
                {menuOpen ? (
                  <View style={styles.neighborhoodActionSheet}>
                    <View style={styles.neighborhoodActionSheetHeader}>
                      <Text style={styles.neighborhoodActionSheetTitle}>{isOwner ? "내 생활톡 관리" : "이 글 관리"}</Text>
                      <Pressable accessibilityRole="button" onPress={onCloseMenu} style={styles.neighborhoodActionClose}>
                        <Text style={styles.neighborhoodActionCloseText}>닫기</Text>
                      </Pressable>
                    </View>
                    {isOwner ? (
                      <Pressable accessibilityRole="button" onPress={() => onDeletePost(post)} style={styles.neighborhoodSheetRowDanger}>
                        <Text style={styles.neighborhoodSheetIcon}>−</Text>
                        <View style={styles.neighborhoodSheetCopy}>
                          <Text style={styles.neighborhoodSheetTitleDanger}>게시글 삭제</Text>
                          <Text style={styles.neighborhoodSheetCaption}>생활톡과 댓글 목록에서 이 글을 숨겨요.</Text>
                        </View>
                      </Pressable>
                    ) : (
                      <>
                        <Pressable accessibilityRole="button" onPress={() => onReportPost(post)} style={styles.neighborhoodSheetRow}>
                          <Text style={styles.neighborhoodSheetIcon}>!</Text>
                          <View style={styles.neighborhoodSheetCopy}>
                            <Text style={styles.neighborhoodSheetTitle}>신고하기</Text>
                            <Text style={styles.neighborhoodSheetCaption}>광고, 욕설, 위험한 만남을 운영자에게 알려요.</Text>
                          </View>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => onBlockAuthor(post)} style={styles.neighborhoodSheetRow}>
                          <Text style={styles.neighborhoodSheetIcon}>×</Text>
                          <View style={styles.neighborhoodSheetCopy}>
                            <Text style={styles.neighborhoodSheetTitle}>이 사용자 글 숨기기</Text>
                            <Text style={styles.neighborhoodSheetCaption}>앞으로 이 작성자의 글과 대화를 숨겨요.</Text>
                          </View>
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : null}
                <View style={styles.neighborhoodPostFooter}>
                  <View style={styles.neighborhoodAuthorRow}>
                    <View style={styles.neighborhoodAvatar}>
                      <Text style={styles.neighborhoodAvatarText}>{post.author.slice(0, 1)}</Text>
                    </View>
                    <Text style={styles.neighborhoodAuthor} numberOfLines={1}>
                      {post.author}{post.verified ? " · 인증" : ""}
                    </Text>
                  </View>
                  <View style={styles.neighborhoodActionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onToggleLike(post.id)}
                      style={[styles.neighborhoodLikeButton, liked && styles.neighborhoodLikeButtonActive]}
                    >
                      <Text style={[styles.neighborhoodLikeText, liked && styles.neighborhoodLikeTextActive]}>
                        도움돼요 {post.likes + (liked ? 1 : 0)}
                      </Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => onTogglePost(post.id)} style={styles.neighborhoodCommentButton}>
                      <Text style={styles.neighborhoodCommentText}>댓글 {Math.max(post.comments, comments.length)}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.neighborhoodEmpty}>
          <Text style={styles.neighborhoodEmptyTitle}>아직 올라온 생활톡이 없어요</Text>
          <Text style={styles.neighborhoodEmptyCopy}>첫 질문을 올리면 같은 도시에 있는 여행자들이 답하기 쉬워요.</Text>
        </View>
      )}
    </View>
  );
}

function NeighborhoodStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.neighborhoodStat}>
      <Text style={styles.neighborhoodStatLabel}>{label}</Text>
      <Text style={styles.neighborhoodStatValue}>{value}</Text>
    </View>
  );
}

function NeighborhoodPostDetailScreen({
  post,
  comments,
  draft,
  liked,
  isOwner,
  menuOpen,
  activeCommentMenuId,
  ownerIds,
  memberName,
  statusMessage,
  realtimeStatus,
  onBack,
  onToggleMenu,
  onCloseMenu,
  onDeletePost,
  onReportPost,
  onBlockAuthor,
  onToggleCommentMenu,
  onCloseCommentMenu,
  onDeleteComment,
  onReportComment,
  onBlockCommentAuthor,
  onToggleLike,
  onSetDraft,
  onSubmitComment
}: {
  post: NeighborhoodPost;
  comments: NeighborhoodComment[];
  draft: string;
  liked: boolean;
  isOwner: boolean;
  menuOpen: boolean;
  activeCommentMenuId: string | null;
  ownerIds: string[];
  memberName?: string;
  statusMessage?: string;
  realtimeStatus: MeetupRealtimeStatus;
  onBack: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onDeletePost: () => void | Promise<void>;
  onReportPost: () => void | Promise<void>;
  onBlockAuthor: () => void | Promise<void>;
  onToggleCommentMenu: (commentId: string) => void;
  onCloseCommentMenu: () => void;
  onDeleteComment: (comment: NeighborhoodComment) => void | Promise<void>;
  onReportComment: (comment: NeighborhoodComment) => void | Promise<void>;
  onBlockCommentAuthor: (comment: NeighborhoodComment) => void | Promise<void>;
  onToggleLike: () => void | Promise<void>;
  onSetDraft: (text: string) => void;
  onSubmitComment: () => void | Promise<void>;
}) {
  const recentComments = [...comments].sort((first, second) => (second.createdAt ?? 0) - (first.createdAt ?? 0));

  return (
    <AppShell withBottomNav backgroundColor="#FFF7DF">
      <View style={styles.neighborhoodDetailHeader}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.roomBackButton}>
          <Text style={styles.roomBackText}>‹</Text>
        </Pressable>
        <View style={styles.roomHeaderCopy}>
          <Text style={styles.roomEyebrow}>생활톡</Text>
          <Text style={styles.roomTitle} numberOfLines={1}>{post.title}</Text>
          <Text style={styles.roomMeta} numberOfLines={1}>{post.area} · {post.timeAgo}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onToggleMenu} style={styles.neighborhoodDetailMoreButton}>
          <Text style={styles.neighborhoodMoreText}>···</Text>
        </Pressable>
      </View>

      {menuOpen ? (
        <View style={styles.neighborhoodDetailActionSheet}>
          <View style={styles.neighborhoodActionSheetHeader}>
            <Text style={styles.neighborhoodActionSheetTitle}>{isOwner ? "내 생활톡 관리" : "이 글 관리"}</Text>
            <Pressable accessibilityRole="button" onPress={onCloseMenu} style={styles.neighborhoodActionClose}>
              <Text style={styles.neighborhoodActionCloseText}>닫기</Text>
            </Pressable>
          </View>
          {isOwner ? (
            <Pressable accessibilityRole="button" onPress={onDeletePost} style={styles.neighborhoodSheetRowDanger}>
              <Text style={styles.neighborhoodSheetIcon}>−</Text>
              <View style={styles.neighborhoodSheetCopy}>
                <Text style={styles.neighborhoodSheetTitleDanger}>게시글 삭제</Text>
                <Text style={styles.neighborhoodSheetCaption}>생활톡과 댓글 목록에서 이 글을 숨겨요.</Text>
              </View>
            </Pressable>
          ) : (
            <>
              <Pressable accessibilityRole="button" onPress={onReportPost} style={styles.neighborhoodSheetRow}>
                <Text style={styles.neighborhoodSheetIcon}>!</Text>
                <View style={styles.neighborhoodSheetCopy}>
                  <Text style={styles.neighborhoodSheetTitle}>신고하기</Text>
                  <Text style={styles.neighborhoodSheetCaption}>광고, 욕설, 위험한 만남을 운영자에게 알려요.</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onBlockAuthor} style={styles.neighborhoodSheetRow}>
                <Text style={styles.neighborhoodSheetIcon}>×</Text>
                <View style={styles.neighborhoodSheetCopy}>
                  <Text style={styles.neighborhoodSheetTitle}>이 사용자 글 숨기기</Text>
                  <Text style={styles.neighborhoodSheetCaption}>앞으로 이 작성자의 글과 대화를 숨겨요.</Text>
                </View>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {statusMessage ? <Text style={styles.neighborhoodStatusText}>{statusMessage}</Text> : null}

      <View style={styles.neighborhoodDetailPost}>
        <View style={styles.neighborhoodPostMetaRow}>
          <Text style={styles.neighborhoodPostCategory}>{post.category}</Text>
          <Text style={styles.neighborhoodPostArea} numberOfLines={1}>{post.area} · {post.timeAgo}</Text>
        </View>
        <Text style={styles.neighborhoodDetailTitle}>{post.title}</Text>
        <Text style={styles.neighborhoodDetailBody}>{post.body}</Text>
        <View style={styles.neighborhoodDetailAuthorRow}>
          <View style={styles.neighborhoodAvatar}>
            <Text style={styles.neighborhoodAvatarText}>{post.author.slice(0, 1)}</Text>
          </View>
          <View style={styles.neighborhoodDetailAuthorCopy}>
            <Text style={styles.neighborhoodAuthor} numberOfLines={1}>{post.author}{post.verified ? " · 인증" : ""}</Text>
            <Text style={styles.neighborhoodDetailAuthorSub}>여행자 생활톡 작성자</Text>
          </View>
        </View>
        <View style={styles.neighborhoodDetailActionRow}>
          <Pressable accessibilityRole="button" onPress={onToggleLike} style={[styles.neighborhoodDetailLikeButton, liked && styles.neighborhoodLikeButtonActive]}>
            <Text style={[styles.neighborhoodLikeText, liked && styles.neighborhoodLikeTextActive]}>도움돼요 {post.likes + (liked ? 1 : 0)}</Text>
          </Pressable>
          <Text style={styles.neighborhoodCommentText}>댓글 {Math.max(post.comments, comments.length)}</Text>
        </View>
      </View>

      <View style={styles.neighborhoodDetailComments}>
        <View style={styles.neighborhoodDetailSectionHeader}>
          <Text style={styles.neighborhoodDetailSectionTitle}>댓글</Text>
          <Text style={styles.neighborhoodRealtimeText}>{getNeighborhoodRealtimeStatusCopy(realtimeStatus)}</Text>
        </View>
        {recentComments.length > 0 ? (
          recentComments.map((comment) => {
            const commentMenuOpen = activeCommentMenuId === comment.id;
            const commentOwner = ownerIds.includes(comment.authorAuthUid ?? comment.author);
            return (
              <View key={comment.id} style={styles.neighborhoodCommentBlock}>
                <View style={styles.neighborhoodCommentRow}>
                  <View style={styles.neighborhoodCommentAvatar}>
                    <Text style={styles.neighborhoodCommentAvatarText}>{comment.author.slice(0, 1)}</Text>
                  </View>
                  <View style={styles.neighborhoodCommentBubble}>
                    <View style={styles.neighborhoodCommentTopLine}>
                      <Text style={styles.neighborhoodCommentAuthor} numberOfLines={1}>
                        {comment.author}{comment.verified ? " · 인증" : ""} · {comment.timeAgo}
                      </Text>
                      <Pressable accessibilityRole="button" onPress={() => onToggleCommentMenu(comment.id)} style={styles.neighborhoodCommentMoreButton}>
                        <Text style={styles.neighborhoodCommentMoreText}>···</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.neighborhoodCommentBody}>{comment.body}</Text>
                  </View>
                </View>
                {commentMenuOpen ? (
                  <View style={styles.neighborhoodCommentActionSheet}>
                    <View style={styles.neighborhoodActionSheetHeader}>
                      <Text style={styles.neighborhoodActionSheetTitle}>{commentOwner ? "내 댓글 관리" : "댓글 관리"}</Text>
                      <Pressable accessibilityRole="button" onPress={onCloseCommentMenu} style={styles.neighborhoodActionClose}>
                        <Text style={styles.neighborhoodActionCloseText}>닫기</Text>
                      </Pressable>
                    </View>
                    {commentOwner ? (
                      <Pressable accessibilityRole="button" onPress={() => onDeleteComment(comment)} style={styles.neighborhoodSheetRowDanger}>
                        <Text style={styles.neighborhoodSheetIcon}>−</Text>
                        <View style={styles.neighborhoodSheetCopy}>
                          <Text style={styles.neighborhoodSheetTitleDanger}>댓글 삭제</Text>
                          <Text style={styles.neighborhoodSheetCaption}>이 댓글을 생활톡에서 숨겨요.</Text>
                        </View>
                      </Pressable>
                    ) : (
                      <>
                        <Pressable accessibilityRole="button" onPress={() => onReportComment(comment)} style={styles.neighborhoodSheetRow}>
                          <Text style={styles.neighborhoodSheetIcon}>!</Text>
                          <View style={styles.neighborhoodSheetCopy}>
                            <Text style={styles.neighborhoodSheetTitle}>댓글 신고</Text>
                            <Text style={styles.neighborhoodSheetCaption}>광고, 욕설, 위험한 내용을 운영자에게 알려요.</Text>
                          </View>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => onBlockCommentAuthor(comment)} style={styles.neighborhoodSheetRow}>
                          <Text style={styles.neighborhoodSheetIcon}>×</Text>
                          <View style={styles.neighborhoodSheetCopy}>
                            <Text style={styles.neighborhoodSheetTitle}>이 사용자 댓글 숨기기</Text>
                            <Text style={styles.neighborhoodSheetCaption}>앞으로 이 작성자의 글과 댓글을 숨겨요.</Text>
                          </View>
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.neighborhoodDetailEmptyComment}>
            <Text style={styles.neighborhoodEmptyTitle}>아직 댓글이 없어요</Text>
            <Text style={styles.neighborhoodEmptyCopy}>첫 답변을 남기면 여행자가 바로 참고할 수 있어요.</Text>
          </View>
        )}
      </View>

      <View style={styles.neighborhoodDetailComposer}>
        <TextInput
          value={draft}
          onChangeText={onSetDraft}
          placeholder={memberName ? "댓글 입력" : "로그인 후 댓글을 남길 수 있어요"}
          placeholderTextColor="#9A8A6A"
          style={styles.neighborhoodDetailCommentInput}
          multiline
        />
        <Pressable
          accessibilityRole="button"
          onPress={onSubmitComment}
          disabled={!draft.trim()}
          style={[styles.neighborhoodDetailCommentSubmit, !draft.trim() && styles.neighborhoodCommentSubmitDisabled]}
        >
          <Text style={styles.neighborhoodCommentSubmitText}>등록</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

function UpcomingEventsPanel({
  destination,
  location,
  events,
  activeDateFilter,
  activeInterestFilter,
  mineOnly,
  savedEventIds,
  attendingEventIds,
  remoteAttendingEventIds,
  meetupMemberCounts,
  chatMessagesByEventId,
  chatDraftsByEventId,
  meetupTitle,
  meetupPhoto,
  meetupDateValue,
  meetupTimeValue,
  meetupSeats,
  meetupPrice,
  meetupVibe,
  meetupCategory,
  meetupOpen,
  meetupPhotoStatus,
  meetupSubmitting,
  createdMeetupId,
  activeChatId,
  unreadEventIds,
  realtimeStatus,
  memberId,
  memberName,
  onSetDateFilter,
  onSetInterestFilter,
  onSetMeetupTitle,
  onSetMeetupPhoto,
  onSetMeetupPhotoStatus,
  onSetMeetupDateValue,
  onSetMeetupTimeValue,
  onSetMeetupSeats,
  onSetMeetupPrice,
  onSetMeetupVibe,
  onSetMeetupCategory,
  onToggleMeetupOpen,
  onToggleSave,
  onToggleAttend,
  onCloseMeetup,
  onCancelMeetup,
  onDeleteMeetup,
  onCreateMeetup,
  onOpenChat,
  onSendQuickMessage,
  onSetChatDraft,
  onSendChatDraft
}: {
  destination: Destination;
  location: string;
  events: LocalMeetup[];
  activeDateFilter: EventDateFilter;
  activeInterestFilter: EventInterestFilter;
  mineOnly?: boolean;
  savedEventIds: string[];
  attendingEventIds: string[];
  remoteAttendingEventIds: string[];
  meetupMemberCounts: Record<string, number>;
  chatMessagesByEventId: Record<string, MeetupChatMessage[]>;
  chatDraftsByEventId: Record<string, string>;
  meetupTitle: string;
  meetupPhoto: string;
  meetupDateValue: string;
  meetupTimeValue: string;
  meetupSeats: string;
  meetupPrice: string;
  meetupVibe: string;
  meetupCategory: MeetupCategory;
  meetupOpen: boolean;
  meetupPhotoStatus: string;
  meetupSubmitting: boolean;
  createdMeetupId: string | null;
  activeChatId: string | null;
  unreadEventIds: string[];
  realtimeStatus: MeetupRealtimeStatus;
  memberId?: string;
  memberName?: string;
  onSetDateFilter: (filter: EventDateFilter) => void;
  onSetInterestFilter: (filter: EventInterestFilter) => void;
  onSetMeetupTitle: (title: string) => void;
  onSetMeetupPhoto: (photo: string, file?: SelectedPhotoFile) => void;
  onSetMeetupPhotoStatus: (message: string) => void;
  onSetMeetupDateValue: (date: string) => void;
  onSetMeetupTimeValue: (time: string) => void;
  onSetMeetupSeats: (seats: string) => void;
  onSetMeetupPrice: (price: string) => void;
  onSetMeetupVibe: (vibe: string) => void;
  onSetMeetupCategory: (category: MeetupCategory) => void;
  onToggleMeetupOpen: () => void;
  onToggleSave: (eventId: string) => void;
  onToggleAttend: (event: LocalMeetup) => void;
  onCloseMeetup: (event: LocalMeetup) => void;
  onCancelMeetup: (event: LocalMeetup) => void;
  onDeleteMeetup: (event: LocalMeetup) => void;
  onCreateMeetup: () => void;
  onOpenChat: (event: LocalMeetup) => void;
  onSendQuickMessage: (event: LocalMeetup, question: string) => void;
  onSetChatDraft: (eventId: string, text: string) => void;
  onSendChatDraft: (event: LocalMeetup) => void;
}) {
  const featuredEvent = events[0];
  const listEvents = featuredEvent ? events.slice(1) : events;
  const createdMeetup = createdMeetupId ? events.find((event) => event.id === createdMeetupId) : undefined;
  const [visibleEventCount, setVisibleEventCount] = useState(4);
  const visibleListEvents = listEvents.slice(0, visibleEventCount);
  const hiddenEventCount = Math.max(0, listEvents.length - visibleEventCount);
  const isAttendingEvent = (eventId: string) => attendingEventIds.includes(eventId) || remoteAttendingEventIds.includes(eventId);

  useEffect(() => {
    setVisibleEventCount(4);
  }, [destination, location, activeDateFilter, activeInterestFilter]);

  return (
    <View style={styles.upcomingPanel}>
      <View style={styles.meetupHero}>
        <View style={styles.meetupHeroTop}>
          <View>
            <Text style={styles.upcomingEyebrow}>{mineOnly ? "내 모임" : "이벤트 피드"}</Text>
            <Text style={styles.upcomingTitle}>{mineOnly ? "내가 입장한 모임" : `${destination} 예정된 모임`}</Text>
          </View>
          <Text style={styles.meetupBadge}>{events.length}개</Text>
        </View>
        <Text style={styles.upcomingCopy}>
          {mineOnly ? "방입장한 모임과 대화방만 모아서 보여줘요." : "날짜와 관심사를 고르면 지금 참여할 만한 모임만 추려서 보여줘요."}
        </Text>
        <View style={styles.meetupSearchBox}>
          <Text style={styles.meetupSearchIcon}>⌕</Text>
          <Text style={styles.meetupSearchText}>{mineOnly ? "내가 참여 중인 모임만 표시 중" : `${destination} 이벤트, 모임, 번개 검색`}</Text>
        </View>
        <View style={styles.meetupAccessRow}>
          <Text style={styles.meetupAccessText}>{memberName ? `${memberName}님은 방입장과 대화가 가능해요.` : "목록은 바로 볼 수 있고, 방입장과 대화는 인증 로그인 후 가능해요."}</Text>
        </View>
      </View>

      {!mineOnly ? (
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>일정</Text>
          <View style={styles.filterRow}>
          {eventDateFilters.map((filter) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              onPress={() => onSetDateFilter(filter)}
              style={[styles.filterChip, activeDateFilter === filter && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeDateFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
          </View>
        </View>

      ) : null}

      {!mineOnly ? (
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>관심사</Text>
          <View style={styles.filterRow}>
          {eventInterestFilters.map((filter) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              onPress={() => onSetInterestFilter(filter)}
              style={[styles.filterChip, activeInterestFilter === filter && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeInterestFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
          </View>
        </View>
      ) : null}

      {events.length === 0 ? (
        <View style={styles.eventEmpty}>
          <Text style={styles.eventEmptyTitle}>조건에 맞는 행사가 아직 없어요</Text>
          <Text style={styles.eventEmptyCopy}>{mineOnly ? "아직 방입장한 모임이 없어요. 모임 탭에서 관심 있는 방에 먼저 입장해보세요." : "필터를 전체로 바꾸거나, 직접 번개를 만들어보세요."}</Text>
        </View>
      ) : null}

      {createdMeetup ? (
        <View style={styles.createdMeetupCard}>
          <View style={styles.createdMeetupIcon}>
            <Text style={styles.createdMeetupIconText}>✓</Text>
          </View>
          <View style={styles.createdMeetupCopy}>
            <Text style={styles.createdMeetupTitle}>방이 생성됐어요</Text>
            <Text style={styles.createdMeetupText} numberOfLines={2}>{createdMeetup.title}</Text>
            <Text style={styles.createdMeetupMeta}>{createdMeetup.time} · {createdMeetup.area}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => onToggleAttend(createdMeetup)} style={styles.createdMeetupButton}>
            <Text style={styles.createdMeetupButtonText}>방입장</Text>
          </Pressable>
        </View>
      ) : null}

      {featuredEvent ? (
        <View style={styles.featuredMeetupCard}>
          <View style={styles.featuredLabelRow}>
            <Text style={styles.featuredLabel}>이번 주 추천</Text>
            <Text style={styles.featuredSource}>{featuredEvent.source ?? "거주자 추천"}</Text>
          </View>
          <MeetupEventCard
            event={featuredEvent}
            destination={destination}
            saved={savedEventIds.includes(featuredEvent.id)}
            attending={isAttendingEvent(featuredEvent.id)}
            activeChatId={activeChatId}
            hasUnread={unreadEventIds.includes(featuredEvent.id)}
            realtimeStatus={realtimeStatus}
            memberCount={getMeetupCurrentMemberCount(featuredEvent, meetupMemberCounts, isAttendingEvent(featuredEvent.id))}
            memberId={memberId}
            memberName={memberName}
            chatMessages={chatMessagesByEventId[featuredEvent.id] ?? createInitialMeetupChat(featuredEvent)}
            chatDraft={chatDraftsByEventId[featuredEvent.id] ?? ""}
            onToggleSave={onToggleSave}
            onToggleAttend={onToggleAttend}
            onCloseMeetup={onCloseMeetup}
            onCancelMeetup={onCancelMeetup}
            onDeleteMeetup={onDeleteMeetup}
            onOpenChat={onOpenChat}
            onSendQuickMessage={onSendQuickMessage}
            onSetChatDraft={onSetChatDraft}
            onSendChatDraft={onSendChatDraft}
            featured
            highlighted={featuredEvent.id === createdMeetupId}
          />
        </View>
      ) : null}

      {visibleListEvents.map((event) => (
        <MeetupEventCard
          key={event.id}
          event={event}
          destination={destination}
          saved={savedEventIds.includes(event.id)}
          attending={isAttendingEvent(event.id)}
          activeChatId={activeChatId}
          hasUnread={unreadEventIds.includes(event.id)}
          realtimeStatus={realtimeStatus}
          memberCount={getMeetupCurrentMemberCount(event, meetupMemberCounts, isAttendingEvent(event.id))}
          memberId={memberId}
          memberName={memberName}
          chatMessages={chatMessagesByEventId[event.id] ?? createInitialMeetupChat(event)}
          chatDraft={chatDraftsByEventId[event.id] ?? ""}
          onToggleSave={onToggleSave}
          onToggleAttend={onToggleAttend}
          onCloseMeetup={onCloseMeetup}
          onCancelMeetup={onCancelMeetup}
          onDeleteMeetup={onDeleteMeetup}
          onOpenChat={onOpenChat}
          onSendQuickMessage={onSendQuickMessage}
          onSetChatDraft={onSetChatDraft}
          onSendChatDraft={onSendChatDraft}
          highlighted={event.id === createdMeetupId}
        />
      ))}

      {hiddenEventCount > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => setVisibleEventCount((current) => current + 4)} style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>모임 {hiddenEventCount}개 더 보기</Text>
        </Pressable>
      ) : null}

      {!mineOnly ? (
        <Pressable accessibilityRole="button" onPress={onToggleMeetupOpen} style={styles.panelPrimaryButton}>
          <Text style={styles.panelPrimaryText}>{meetupOpen ? "닫기" : "모임 만들기"}</Text>
        </Pressable>
      ) : null}

      {meetupOpen && !mineOnly ? (
        <View style={styles.meetupForm}>
          <Text style={styles.meetupLabel}>어떤 모임인가요?</Text>
          <View style={styles.meetupCategoryGrid}>
            {meetupCategories.map((item) => (
              <Pressable
                key={item.category}
                accessibilityRole="button"
                onPress={() => onSetMeetupCategory(item.category)}
                style={[styles.meetupCategoryChip, meetupCategory === item.category && styles.meetupCategoryChipActive]}
              >
                <Text style={[styles.meetupCategoryLabel, meetupCategory === item.category && styles.meetupCategoryLabelActive]}>{item.label}</Text>
                <Text style={[styles.meetupCategoryCopy, meetupCategory === item.category && styles.meetupCategoryCopyActive]}>{item.copy}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.meetupLabel}>모임 제목을 적어주세요</Text>
          <TextInput
            value={meetupTitle}
            onChangeText={onSetMeetupTitle}
            placeholder={getMeetupPlaceholder(meetupCategory)}
            placeholderTextColor={colors.muted}
            style={styles.meetupInput}
          />
          <Text style={styles.meetupLabelWithGap}>사진</Text>
          <View style={styles.meetupPhotoRow}>
            {meetupPhoto.trim() ? (
              <View style={styles.meetupPhotoPreviewWrap}>
                <Image source={{ uri: meetupPhoto.trim() }} style={styles.meetupPhotoPreview} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onSetMeetupPhoto("");
                    onSetMeetupPhotoStatus("");
                  }}
                  style={styles.meetupPhotoRemoveButton}
                >
                  <Text style={styles.meetupPhotoRemoveText}>삭제</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.meetupPhotoPlaceholder}>
                <Text style={styles.meetupPhotoPlaceholderText}>사진</Text>
              </View>
            )}
            <PhotoFilePicker onPick={(photo) => onSetMeetupPhoto(photo.previewUri, photo)} onError={onSetMeetupPhotoStatus} />
          </View>
          {meetupPhotoStatus ? <Text style={styles.meetupPhotoStatusText}>{meetupPhotoStatus}</Text> : null}
          <Text style={styles.meetupLabelWithGap}>날짜/시간</Text>
          <View style={styles.meetupDatePickerGrid}>
            <View style={styles.meetupPickerField}>
              <Text style={styles.meetupPickerLabel}>날짜</Text>
              <DateTimeInput type="date" value={meetupDateValue} onChange={onSetMeetupDateValue} />
            </View>
            <View style={styles.meetupPickerField}>
              <Text style={styles.meetupPickerLabel}>시간</Text>
              <DateTimeInput type="time" value={meetupTimeValue} onChange={onSetMeetupTimeValue} />
            </View>
          </View>
          <Text style={styles.meetupSelectedDateText}>선택됨 · {formatMeetupDateSelection(meetupDateValue, meetupTimeValue)}</Text>
          <View style={styles.meetupDetailGrid}>
            <View style={styles.meetupDetailField}>
              <Text style={styles.meetupLabel}>인원수</Text>
              <TextInput
                value={meetupSeats}
                onChangeText={onSetMeetupSeats}
                placeholder={getDefaultSeats(meetupCategory)}
                placeholderTextColor={colors.muted}
                style={styles.meetupInput}
              />
            </View>
            <View style={styles.meetupDetailField}>
              <Text style={styles.meetupLabel}>가격</Text>
              <TextInput
                value={meetupPrice}
                onChangeText={onSetMeetupPrice}
                placeholder={getDefaultPrice(meetupCategory)}
                placeholderTextColor={colors.muted}
                style={styles.meetupInput}
              />
            </View>
          </View>
          <Text style={styles.meetupLabelWithGap}>분위기</Text>
          <TextInput
            value={meetupVibe}
            onChangeText={onSetMeetupVibe}
            placeholder={getDefaultVibe(meetupCategory)}
            placeholderTextColor={colors.muted}
            style={styles.meetupInput}
          />
          <Text style={styles.meetupHint}>좋은 모임은 시간, 공개 장소, 예상 비용, 모집 인원이 분명해야 참여율이 올라가요.</Text>
          <Pressable accessibilityRole="button" onPress={onCreateMeetup} disabled={meetupSubmitting} style={[styles.createMeetupButton, meetupSubmitting && styles.createMeetupButtonDisabled]}>
            <Text style={styles.createMeetupText}>{meetupSubmitting ? "업로드 중" : "모임 등록하기"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function MeetupEventCard({
  event,
  destination,
  saved,
  attending,
  activeChatId,
  hasUnread,
  realtimeStatus,
  memberCount,
  memberId,
  memberName,
  chatMessages,
  chatDraft,
  onToggleSave,
  onToggleAttend,
  onCloseMeetup,
  onCancelMeetup,
  onDeleteMeetup,
  onOpenChat,
  onSendQuickMessage,
  onSetChatDraft,
  onSendChatDraft,
  featured,
  highlighted
}: {
  event: LocalMeetup;
  destination: Destination;
  saved: boolean;
  attending: boolean;
  activeChatId: string | null;
  hasUnread?: boolean;
  realtimeStatus: MeetupRealtimeStatus;
  memberCount: number;
  memberId?: string;
  memberName?: string;
  chatMessages: MeetupChatMessage[];
  chatDraft: string;
  onToggleSave: (eventId: string) => void;
  onToggleAttend: (event: LocalMeetup) => void;
  onCloseMeetup: (event: LocalMeetup) => void;
  onCancelMeetup: (event: LocalMeetup) => void;
  onDeleteMeetup: (event: LocalMeetup) => void;
  onOpenChat: (event: LocalMeetup) => void;
  onSendQuickMessage: (event: LocalMeetup, question: string) => void;
  onSetChatDraft: (eventId: string, text: string) => void;
  onSendChatDraft: (event: LocalMeetup) => void;
  featured?: boolean;
  highlighted?: boolean;
}) {
  const date = getEventDateParts(event);
  const lifecycleLabel = getMeetupLifecycleLabel(event);
  const canEnter = canOpenMeetupRoom(event, attending);
  const hostViewing = isMeetupHost(event, memberId, memberName);
  const recruitmentCopy = getMeetupRecruitmentCopy(event, memberCount);
  return (
    <View key={event.id} style={[styles.upcomingEventCard, featured && styles.upcomingEventCardFeatured, highlighted && styles.upcomingEventCardCreated, attending && styles.upcomingEventCardAttending]}>
      {event.photo ? <Image source={{ uri: event.photo }} style={styles.meetupCardPhoto} /> : null}
      <View style={styles.meetupCardTop}>
        <View style={styles.eventDateBox}>
          <Text style={styles.eventDateDay}>{date.day}</Text>
          <Text style={styles.eventDateTime}>{date.time}</Text>
        </View>
        <View style={styles.eventTitleWrap}>
          <View style={styles.eventCategoryRow}>
            <Text style={styles.eventCategory}>{formatMeetupCategoryLabel(event.category)}</Text>
            <Text style={[styles.eventStatus, lifecycleLabel !== "모집중" && styles.eventStatusClosed]}>{lifecycleLabel}</Text>
            {hasUnread ? <Text style={styles.unreadChatPill}>새 메시지</Text> : null}
          </View>
          <Text style={[styles.eventTitle, styles.upcomingEventTitle]}>{event.title}</Text>
          <Text style={styles.eventVenue}>{getEventVenueLine(event)}</Text>
        </View>
      </View>

      <View style={styles.meetupGroupRow}>
        <Text style={styles.meetupGroupName}>{event.host}</Text>
        <Text style={styles.meetupDot}>·</Text>
        <Text style={styles.meetupGroupMeta}>{recruitmentCopy}</Text>
      </View>

      <View style={styles.attendeeRow}>
        <View style={styles.avatarStack}>
          {getAvatarInitials(event).map((initial, index) => (
            <View key={`${event.id}-${initial}-${index}`} style={[styles.avatarBubble, { marginLeft: index === 0 ? 0 : -7 }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.attendeeText}>{getAttendeeCopy(event, memberCount)}</Text>
      </View>

      <View style={styles.eventInfoGrid}>
        <EventMetric label="입장/모집" value={recruitmentCopy} />
        <EventMetric label="가격" value={getEventPrice(event)} />
        <EventMetric label="분위기" value={getEventVibe(event)} />
      </View>

      <View style={styles.eventActionRow}>
        <Pressable accessibilityRole="button" onPress={() => onToggleSave(event.id)} style={styles.eventSoftButton}>
          <Text style={styles.eventSoftText} numberOfLines={1}>{saved ? "저장됨" : "저장"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onToggleAttend(event)}
          disabled={!canEnter}
          style={[styles.eventDarkButton, attending && styles.eventAttendButtonActive, !canEnter && styles.eventDarkButtonDisabled]}
        >
          <Text style={[styles.eventDarkText, attending && styles.eventAttendTextActive, !canEnter && styles.eventDarkTextDisabled]} numberOfLines={1}>
            {attending ? "대화방 보기" : canEnter ? "방입장" : lifecycleLabel}
          </Text>
        </Pressable>
      </View>

      {hostViewing ? (
        <View style={styles.hostMeetupActions}>
          {lifecycleLabel === "모집중" ? (
            <Pressable accessibilityRole="button" onPress={() => onCloseMeetup(event)} style={styles.closeMeetupButton}>
              <Text style={styles.closeMeetupButtonText}>모집 마감하기</Text>
            </Pressable>
          ) : null}
          {lifecycleLabel !== "취소" && lifecycleLabel !== "종료" ? (
            <Pressable accessibilityRole="button" onPress={() => onCancelMeetup(event)} style={styles.cancelMeetupButton}>
              <Text style={styles.cancelMeetupButtonText}>취소하기</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => onDeleteMeetup(event)} style={styles.deleteMeetupButton}>
            <Text style={styles.deleteMeetupButtonText}>삭제</Text>
          </Pressable>
        </View>
      ) : null}

      {attending ? (
        <View style={styles.attendNotice}>
          <Text style={styles.attendNoticeText}>대화방에 입장했어요. 시간, 장소, 비용을 확인한 뒤 같이 움직이면 됩니다.</Text>
          <Pressable accessibilityRole="button" onPress={() => openGoogleMapsSearch(getEventMapQuery(event, destination))} style={styles.attendMapLink}>
            <Text style={styles.attendMapLinkText}>장소 확인</Text>
          </Pressable>
        </View>
      ) : null}

      {activeChatId === event.id ? (
        <View style={styles.chatBox}>
          <View style={styles.chatHeaderRow}>
            <View>
              <Text style={styles.chatTitle}>모임 대화방</Text>
              <Text style={styles.chatStatus}>
                {attending ? getRealtimeStatusCopy(realtimeStatus) : "참여 전 확인용"}
              </Text>
            </View>
            <Text style={styles.chatRoomBadge}>{formatMeetupCategoryLabel(event.category)}</Text>
          </View>
          <View style={styles.chatRoomInfo}>
            <View style={styles.chatMemberPill}>
              <Text style={styles.chatMemberRole}>호스트</Text>
              <Text style={styles.chatMemberName} numberOfLines={1}>{event.host}</Text>
            </View>
            <View style={styles.chatMemberPill}>
              <Text style={styles.chatMemberRole}>{attending ? "내 상태" : "입장 전"}</Text>
              <Text style={styles.chatMemberName} numberOfLines={1}>{attending ? "방 입장 완료" : "확인만 가능"}</Text>
            </View>
            <View style={styles.chatMemberPill}>
              <Text style={styles.chatMemberRole}>참가자</Text>
              <Text style={styles.chatMemberName} numberOfLines={1}>{recruitmentCopy}</Text>
            </View>
          </View>
          {chatMessages.map((message) => (
            <View key={message.id} style={[styles.chatBubble, message.sender === "me" && styles.chatBubbleMe, message.sender === "system" && styles.chatBubbleSystem]}>
              <Text style={[styles.chatSender, message.sender === "me" && styles.chatSenderMe]}>
                {message.sender === "me" ? message.authorName ?? "나" : message.sender === "host" ? "호스트" : message.sender === "guest" ? message.authorName ?? "참가자" : "안내"}
              </Text>
              <Text style={[styles.chatMessageText, message.sender === "me" && styles.chatMessageTextMe]}>{message.text}</Text>
              <Text style={[styles.chatTimeText, message.sender === "me" && styles.chatTimeTextMe]}>{formatChatTime(message.createdAt)}</Text>
            </View>
          ))}
          <View style={styles.quickQuestionWrap}>
            {meetupQuickQuestions.map((question) => (
              <Pressable key={question} accessibilityRole="button" onPress={() => onSendQuickMessage(event, question)} style={styles.quickQuestionChip}>
                <Text style={styles.quickQuestionText}>{question}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.chatComposer}>
            <TextInput
              value={chatDraft}
              onChangeText={(text) => onSetChatDraft(event.id, text)}
              placeholder="메시지 입력"
              placeholderTextColor="#7A8B84"
              style={styles.chatComposerInput}
              multiline
            />
            <Pressable accessibilityRole="button" onPress={() => onSendChatDraft(event)} style={[styles.chatSendButton, !chatDraft.trim() && styles.chatSendButtonDisabled]}>
              <Text style={styles.chatSendButtonText}>전송</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EventMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.eventMetric}>
      <Text style={styles.eventMetricLabel}>{label}</Text>
      <Text style={styles.eventMetricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function MeetupChatRoomScreen({
  event,
  destination,
  attending,
  memberCount,
  chatMessages,
  chatDraft,
  realtimeStatus,
  actionStatus,
  chatToast,
  memberId,
  memberName,
  onRequireAuth,
  onBack,
  onSendQuickMessage,
  onSetChatDraft,
  onSendChatDraft,
  onBlockMeetup
}: {
  event: LocalMeetup;
  destination: Destination;
  attending: boolean;
  memberCount: number;
  chatMessages: MeetupChatMessage[];
  chatDraft: string;
  realtimeStatus: MeetupRealtimeStatus;
  actionStatus: string;
  chatToast?: { id: string; title: string; body: string } | null;
  memberId?: string;
  memberName?: string;
  onRequireAuth: () => void;
  onBack: () => void;
  onSendQuickMessage: (event: LocalMeetup, question: string) => void;
  onSetChatDraft: (text: string) => void;
  onSendChatDraft: () => void;
  onBlockMeetup: (eventId: string) => void;
}) {
  const chatScrollRef = useRef<ScrollView | null>(null);
  const recruitmentCopy = getMeetupRecruitmentCopy(event, memberCount);

  useEffect(() => {
    chatScrollRef.current?.scrollToEnd({ animated: false });
  }, [chatMessages.length]);

  return (
    <AppShell withBottomNav backgroundColor="#FFF7DF">
      <View style={styles.roomHeader}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.roomBackButton}>
          <Text style={styles.roomBackText}>‹</Text>
        </Pressable>
        <View style={styles.roomHeaderCopy}>
          <Text style={styles.roomEyebrow}>{formatMeetupCategoryLabel(event.category)} 대화방</Text>
          <Text style={styles.roomTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.roomMeta} numberOfLines={1}>{getEventVenueLine(event)} · {event.time}</Text>
        </View>
      </View>

      {chatToast ? (
        <View style={styles.chatToast}>
          <Text style={styles.chatToastTitle}>{chatToast.title}</Text>
          <Text style={styles.chatToastBody} numberOfLines={1}>{chatToast.body}</Text>
        </View>
      ) : null}

      <View style={styles.roomInfoGrid}>
        <View style={styles.chatMemberPill}>
          <Text style={styles.chatMemberRole}>호스트</Text>
          <Text style={styles.chatMemberName} numberOfLines={1}>{event.host}</Text>
        </View>
        <View style={styles.chatMemberPill}>
          <Text style={styles.chatMemberRole}>내 상태</Text>
          <Text style={styles.chatMemberName} numberOfLines={1}>{attending ? "방 입장 완료" : "확인 중"}</Text>
        </View>
        <View style={styles.chatMemberPill}>
          <Text style={styles.chatMemberRole}>참가자</Text>
          <Text style={styles.chatMemberName} numberOfLines={1}>{recruitmentCopy}</Text>
        </View>
      </View>

      <CommunitySafetyActions
        reporterId={memberId ?? memberName}
        targetType="meetup"
        targetId={event.id}
        targetName={event.title}
        blockTargetType="profile"
        blockTargetId={event.hostAuthUid ?? event.host}
        onRequireAuth={onRequireAuth}
        onBlock={onBlockMeetup}
      />

      <View style={styles.roomNotice}>
        <Text style={styles.roomNoticeText}>
          {getRealtimeStatusCopy(realtimeStatus)}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => openGoogleMapsSearch(getEventMapQuery(event, destination))} style={styles.roomMapButton}>
          <Text style={styles.roomMapButtonText}>장소 확인</Text>
        </Pressable>
      </View>

      <View style={styles.roomChatPanel}>
        <ScrollView
          ref={chatScrollRef}
          style={styles.roomChatScroll}
          contentContainerStyle={styles.roomChatScrollContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
        >
        {chatMessages.length === 0 ? (
          <View style={styles.roomEmptyChat}>
            <Text style={styles.roomEmptyChatTitle}>아직 대화가 없어요</Text>
            <Text style={styles.roomEmptyChatCopy}>방에 들어온 여행자들이 시간, 장소, 비용을 여기서 맞출 수 있어요.</Text>
          </View>
        ) : null}
        {chatMessages.map((message, index) => (
          <View key={message.id} style={[styles.chatBubble, index > 0 && chatMessages[index - 1]?.sender === message.sender && message.sender !== "system" && styles.chatBubbleGrouped, message.sender === "me" && styles.chatBubbleMe, message.sender === "system" && styles.chatBubbleSystem]}>
            {index === 0 || chatMessages[index - 1]?.sender !== message.sender || message.sender === "system" ? <Text style={[styles.chatSender, message.sender === "me" && styles.chatSenderMe]}>
              {message.sender === "me" ? message.authorName ?? "나" : message.sender === "host" ? "호스트" : message.sender === "guest" ? message.authorName ?? "참가자" : "안내"}
            </Text> : null}
            <Text style={[styles.chatMessageText, message.sender === "me" && styles.chatMessageTextMe]}>{message.text}</Text>
            {index === chatMessages.length - 1 || chatMessages[index + 1]?.sender !== message.sender || message.sender === "system" ? <Text style={[styles.chatTimeText, message.sender === "me" && styles.chatTimeTextMe]}>{formatChatTime(message.createdAt)}</Text> : null}
          </View>
        ))}
        </ScrollView>
      </View>

      <View style={styles.quickQuestionWrap}>
        {meetupQuickQuestions.map((question) => (
          <Pressable key={question} accessibilityRole="button" onPress={() => onSendQuickMessage(event, question)} style={styles.quickQuestionChip}>
            <Text style={styles.quickQuestionText}>{question}</Text>
          </Pressable>
        ))}
      </View>

      {actionStatus ? <Text style={styles.roomActionStatus}>{actionStatus}</Text> : null}

      <View style={styles.roomComposer}>
        <TextInput
          value={chatDraft}
          onChangeText={onSetChatDraft}
          placeholder="메시지 입력"
          placeholderTextColor="#7A8B84"
          style={styles.roomComposerInput}
          multiline
        />
        <Pressable accessibilityRole="button" onPress={onSendChatDraft} style={[styles.roomSendButton, !chatDraft.trim() && styles.chatSendButtonDisabled]}>
          <Text style={styles.roomSendButtonText} numberOfLines={1}>전송</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

function ModePanel({
  mode,
  places,
  nearbyHotplaces,
  nextPlace,
  liveInfo,
  destination,
  location,
  exchangeAmount,
  events,
  meetupTitle,
  meetupOpen,
  activeChatId,
  onSetExchangeAmount,
  onSetMeetupTitle,
  onToggleMeetupOpen,
  onCreateMeetup,
  onOpenChat,
  onOpenPlace,
  onOpenNearbyFood,
  onOpenGoogleSearch,
  onOpenGrabHelp
}: {
  mode: QuickMode;
  places: PlacePlan[];
  nearbyHotplaces: CuratedPlace[];
  nextPlace: PlacePlan;
  liveInfo: LiveTravelInfo;
  destination: Destination;
  location: string;
  exchangeAmount: number;
  events: LocalMeetup[];
  meetupTitle: string;
  meetupOpen: boolean;
  activeChatId: string | null;
  onSetExchangeAmount: (amount: number) => void;
  onSetMeetupTitle: (title: string) => void;
  onToggleMeetupOpen: () => void;
  onCreateMeetup: () => void;
  onOpenChat: (eventId: string) => void;
  onOpenPlace: (place: PlacePlan) => void;
  onOpenNearbyFood: () => void;
  onOpenGoogleSearch: (query: string) => void;
  onOpenGrabHelp: () => void;
}) {
  if (mode === "events") {
    return (
      <Panel title="오늘 밤 쓸만한 것만">
        <Text style={styles.panelCopy}>광고성 제보와 애매한 모임은 빼고, 공식 일정·거주자 추천·공개 장소 기준을 통과한 후보만 보여줘요.</Text>

        <View style={styles.safetyBox}>
          <Text style={styles.safetyTitle}>입장 전 확인</Text>
          <Text style={styles.safetyCopy}>공개 장소 · 귀가 Grab · 입장료/드레스코드 · 과음/2차 강요 없음 기준으로 걸러요.</Text>
        </View>

        {events.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventTopRow}>
              <View style={styles.eventTitleWrap}>
                <Text style={styles.eventCategory}>{formatMeetupCategoryLabel(event.category)}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
              </View>
              <Text style={styles.eventTime}>{event.time}</Text>
            </View>
            <View style={styles.eventMetaRow}>
              <Text style={styles.eventMeta}>{event.area}</Text>
              {event.venue ? <Text style={styles.eventMeta}>{event.venue}</Text> : null}
              <Text style={styles.eventMeta}>{event.seats}</Text>
              <Text style={styles.eventMeta}>{event.host}</Text>
              {event.status ? <Text style={styles.eventStatus}>{event.status}</Text> : null}
            </View>
            {event.source ? <Text style={styles.eventSource}>확인 근거 · {event.source}</Text> : null}
            <View style={styles.eventActionRow}>
              <Pressable accessibilityRole="button" style={styles.eventSoftButton}>
                <Text style={styles.eventSoftText}>후보 저장</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => onOpenChat(event.id)} style={styles.eventDarkButton}>
                <Text style={styles.eventDarkText}>방입장</Text>
              </Pressable>
            </View>
            {activeChatId === event.id ? (
              <View style={styles.chatBox}>
                <Text style={styles.chatTitle}>참여자 대화</Text>
                {(event.chatMessages ?? ["참여 전 만나는 장소와 비용을 확인하세요."]).map((message) => (
                  <Text key={message} style={styles.chatMessage}>{message}</Text>
                ))}
                <View style={styles.chatInputFake}>
                  <Text style={styles.chatInputText}>방장이 장소 확정 후 입장 승인</Text>
                </View>
              </View>
            ) : null}
          </View>
        ))}

        <Pressable accessibilityRole="button" onPress={onToggleMeetupOpen} style={styles.panelPrimaryButton}>
          <Text style={styles.panelPrimaryText}>{meetupOpen ? "번개 만들기 닫기" : "내 번개 만들기"}</Text>
        </Pressable>

        {meetupOpen ? (
          <View style={styles.meetupForm}>
            <Text style={styles.meetupLabel}>어떤 모임을 만들까요?</Text>
            <TextInput
              value={meetupTitle}
              onChangeText={onSetMeetupTitle}
              placeholder="예: 오늘 8시 타오디엔 저녁 같이 먹을 분"
              placeholderTextColor={colors.muted}
              style={styles.meetupInput}
            />
            <Text style={styles.meetupHint}>공개 장소, 예상 비용, 만나는 시간을 적어야 다른 여행자가 안심하고 참여할 수 있어요.</Text>
            <Pressable accessibilityRole="button" onPress={onCreateMeetup} style={styles.createMeetupButton}>
              <Text style={styles.createMeetupText}>등록하기</Text>
            </Pressable>
          </View>
        ) : null}
      </Panel>
    );
  }

  if (mode === "next") {
    return (
      <Panel title="가기 전 체크리스트">
        <ChecklistItem title="영업시간 확인" copy={nextPlace.openingHint ?? "Google Maps에서 오늘 영업 여부를 확인하세요."} />
        <ChecklistItem title="비용 준비" copy={`${nextPlace.estimatedCost} 정도로 보고, 소액 VND를 준비하세요.`} />
        <ChecklistItem title="현장 팁" copy={nextPlace.localTip} />
        {nextPlace.warning ? <ChecklistItem title="주의" copy={nextPlace.warning} danger /> : null}
        <Pressable accessibilityRole="button" onPress={() => onOpenPlace(nextPlace)} style={styles.panelPrimaryButton}>
          <Text style={styles.panelPrimaryText}>다음 장소 지도 열기</Text>
        </Pressable>
      </Panel>
    );
  }

  if (mode === "exchange") {
    const krw = liveInfo.exchange.krwToVnd ? Math.round(exchangeAmount / liveInfo.exchange.krwToVnd) : undefined;
    return (
      <Panel title="환율 계산기">
        <View style={styles.amountRow}>
          {[100000, 500000, 1000000].map((amount) => (
            <Pressable
              key={amount}
              accessibilityRole="button"
              onPress={() => onSetExchangeAmount(amount)}
              style={[styles.amountButton, exchangeAmount === amount && styles.amountButtonActive]}
            >
              <Text style={[styles.amountText, exchangeAmount === amount && styles.amountTextActive]}>
                {formatVnd(amount)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.exchangeResult}>
          <Text style={styles.exchangeLabel}>한국돈으로 대략</Text>
          <Text style={styles.exchangeValue}>{krw ? `${krw.toLocaleString("ko-KR")}원` : "환율 불러오는 중"}</Text>
        </View>
      </Panel>
    );
  }

  if (mode === "emergency") {
    return (
      <Panel title="긴급 도움">
        <EmergencyLine title="경찰" number="113" />
        <EmergencyLine title="소방" number="114" />
        <EmergencyLine title="응급" number="115" />
        <View style={styles.emergencyPhrase}>
          <Text style={styles.emergencyPhraseLabel}>보여줄 문장</Text>
          <Text style={styles.emergencyPhraseText}>Xin hãy giúp tôi. Tôi cần người nói tiếng Hàn.</Text>
          <Text style={styles.emergencyPhraseSub}>도와주세요. 한국어 가능한 분이 필요해요.</Text>
        </View>
      </Panel>
    );
  }

  if (mode === "grab") {
    return (
      <Panel title="Grab 타기 전 확인">
        <RouteLine label="출발" value="현재 위치/숙소" />
        <RouteLine label="도착" value={nextPlace.placeName} />
        <View style={styles.grabTips}>
          <ChecklistItem title="목적지 이름" copy={nextPlace.mapQuery} />
          <ChecklistItem title="탑승 체크" copy="앱 번호판과 실제 번호판이 같은지 확인하고, 기사에게 현금 추가요금을 바로 주지 마세요." />
          <ChecklistItem title="밤 이동" copy="밤에는 Grab Bike보다 Grab Car가 편하고, 도착지는 호텔/가게 이름으로 찍는 게 안전해요." />
        </View>
        <Pressable accessibilityRole="button" onPress={onOpenGrabHelp} style={styles.panelPrimaryButton}>
          <Text style={styles.panelPrimaryText}>동선 확인하고 Grab에 입력하기</Text>
        </Pressable>
      </Panel>
    );
  }

  if (mode === "food") {
    return (
      <Panel title="뭐 먹을지 바로 찾기">
        <Text style={styles.panelCopy}>{destination} 기준으로 상황별 검색을 바로 열어요.</Text>
        <SearchOption
          title="한국인 추천 맛집"
          copy="실패 확률 낮은 식당부터 보기"
          onPress={onOpenNearbyFood}
        />
        <SearchOption
          title="쌀국수 / 반미"
          copy="가볍게 한 끼 먹을 때"
          onPress={() => onOpenGoogleSearch(`${destination} ${location} 쌀국수 반미 맛집`)}
        />
        <SearchOption
          title="한식 / 한국식 중식"
          copy="입맛 리셋이 필요할 때"
          onPress={() => onOpenGoogleSearch(`${destination} ${location} 한식당 짬뽕 짜장면`)}
        />
        <SearchOption
          title="카페"
          copy="더위 피하거나 쉬어갈 때"
          onPress={() => onOpenGoogleSearch(`${destination} ${location} 카페`)}
        />
      </Panel>
    );
  }

  return (
    <Panel title="지금 위치에서 바꾸기 좋은 후보">
      <Text style={styles.panelCopy}>일정이 빡세거나 날씨가 애매하면 근처 핫플로 바로 바꾸세요.</Text>
      {nearbyHotplaces.map((place) => (
        <Pressable key={place.id} accessibilityRole="button" onPress={() => openGoogleMapsPlace(place, destination)} style={styles.hotplaceRow}>
          <View style={styles.hotplaceRank}>
            <Text style={styles.hotplaceRankText}>{nearbyHotplaces.indexOf(place) + 1}</Text>
          </View>
          <View style={styles.placeCopy}>
            <Text style={styles.placeName}>{formatPlaceName(place.name)}</Text>
            <Text style={styles.placeMeta}>
              {place.category} · {place.area ?? inferAreaLabel(place)} · {place.rating ? `★ ${place.rating.toFixed(1)}` : "평점 확인"}
            </Text>
            <Text style={styles.hotplaceReason}>{buildHotplaceReason(place)}</Text>
          </View>
          <Text style={styles.placeOpen}>지도</Text>
        </Pressable>
      ))}
      {nearbyHotplaces.length === 0 ? places.map((place) => (
        <Pressable key={place.id} accessibilityRole="button" onPress={() => onOpenPlace(place)} style={styles.placeRow}>
          <View style={styles.placeNumber}>
            <Text style={styles.placeNumberText}>{places.indexOf(place) + 1}</Text>
          </View>
          <View style={styles.placeCopy}>
            <Text style={styles.placeName}>{place.placeName}</Text>
            <Text style={styles.placeMeta}>{place.time} · {place.category} · {place.routeMinutesFromPrevious}분 이동</Text>
          </View>
          <Text style={styles.placeOpen}>지도</Text>
        </Pressable>
      )) : null}
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChecklistItem({ title, copy, danger }: { title: string; copy: string; danger?: boolean }) {
  return (
    <View style={[styles.checkItem, danger && styles.checkItemDanger]}>
      <Text style={[styles.checkTitle, danger && styles.checkTitleDanger]}>{title}</Text>
      <Text style={styles.checkCopy}>{copy}</Text>
    </View>
  );
}

function RouteLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.routeLine}>
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeValue}>{value}</Text>
    </View>
  );
}

function SearchOption({ title, copy, onPress }: { title: string; copy: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.searchOption}>
      <View style={styles.searchCopy}>
        <Text style={styles.searchTitle}>{title}</Text>
        <Text style={styles.searchSub}>{copy}</Text>
      </View>
      <Text style={styles.searchOpen}>검색</Text>
    </Pressable>
  );
}

function EmergencyLine({ title, number }: { title: string; number: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${number}`)} style={styles.emergencyLine}>
      <Text style={styles.emergencyTitle}>{title}</Text>
      <Text style={styles.emergencyNumber}>{number}</Text>
    </Pressable>
  );
}

function getNeighborhoodSeedPosts(destination: Destination): NeighborhoodPost[] {
  const cityArea = locationOptionsByDestination[destination][0];
  const shared: NeighborhoodPost[] = [
    {
      id: `${destination}-neighborhood-sim-card`,
      city: destination,
      category: "생활정보",
      title: "공항 도착해서 유심이랑 환전 먼저 해도 될까요?",
      body: "첫날 동선이 빠듯하면 공항에서는 최소 금액만 처리하고, 시내에서 가격 비교하는 흐름이 제일 편했어요.",
      author: "망고가이드",
      area: "공항 근처",
      timeAgo: "12분 전",
      likes: 18,
      comments: 7,
      verified: true
    },
    {
      id: `${destination}-neighborhood-solo-food`,
      city: destination,
      category: "맛집",
      title: `${cityArea} 근처 혼밥하기 편한 곳 추천받아요`,
      body: "혼자 들어가도 부담 없는 식당, 주문 쉬운 곳 위주로 알려주면 바로 저장해둘게요.",
      author: "혼행러",
      area: cityArea,
      timeAgo: "31분 전",
      likes: 12,
      comments: 9
    },
    {
      id: `${destination}-neighborhood-grab`,
      city: destination,
      category: "질문",
      title: "밤에 Grab 잡을 때 어디서 기다리는 게 안전해요?",
      body: "사람 많은 입구나 호텔 로비 앞처럼 기사와 서로 찾기 쉬운 지점을 먼저 정하는 게 좋아요.",
      author: "초행자",
      area: "시내권",
      timeAgo: "1시간 전",
      likes: 24,
      comments: 11,
      verified: true
    },
    {
      id: `${destination}-neighborhood-cafe-work`,
      city: destination,
      category: "수다",
      title: "비 오는 날 카페에서 쉬는 코스 어때요?",
      body: "콘센트, 화장실, 좌석 간격 괜찮은 카페 있으면 같이 공유해요. 사진 찍기 좋은 곳도 좋아요.",
      author: "카페러버",
      area: cityArea,
      timeAgo: "2시간 전",
      likes: 15,
      comments: 6
    },
    {
      id: `${destination}-neighborhood-companion`,
      city: destination,
      category: "동행",
      title: "오늘 저녁 야시장 같이 둘러볼 분?",
      body: "공개 장소에서 만나고 각자 결제 기준이면 부담 없이 1시간 정도만 같이 봐도 좋아요.",
      author: "여행자",
      area: "야시장 근처",
      timeAgo: "3시간 전",
      likes: 9,
      comments: 5
    }
  ];

  const citySpecific: Record<Destination, NeighborhoodPost[]> = {
    호치민: [
      {
        id: "hcm-neighborhood-bui-vien",
        city: "호치민",
        category: "질문",
        title: "부이비엔 처음 가면 몇 시쯤이 적당해요?",
        body: "너무 늦게보다는 저녁 먹고 21~22시 사이에 분위기만 보고 Grab으로 귀가하는 흐름이 좋아요.",
        author: "1군거주",
        area: "부이비엔",
        timeAgo: "8분 전",
        likes: 21,
        comments: 13,
        verified: true
      },
      {
        id: "hcm-neighborhood-thao-dien",
        city: "호치민",
        category: "맛집",
        title: "타오디엔 브런치랑 카페 묶어서 갈 만한 루트",
        body: "식당 하나만 찍기보다 브런치, 카페, 마사지까지 묶으면 2군 하루 코스로 훨씬 자연스러워요.",
        author: "타오디엔러",
        area: "타오디엔",
        timeAgo: "45분 전",
        likes: 27,
        comments: 8,
        verified: true
      }
    ],
    다낭: [
      {
        id: "danang-neighborhood-mykhe",
        city: "다낭",
        category: "수다",
        title: "미케비치 아침 산책 시간대 추천",
        body: "해 뜨고 바로 나가면 덜 덥고 사진도 잘 나와요. 8시 넘으면 금방 더워져요.",
        author: "다낭한달살이",
        area: "미케비치",
        timeAgo: "18분 전",
        likes: 19,
        comments: 4,
        verified: true
      }
    ],
    나트랑: [
      {
        id: "nhatrang-neighborhood-island",
        city: "나트랑",
        category: "도움요청",
        title: "섬투어 예약 전 확인할 것 있나요?",
        body: "픽업 위치, 포함 식사, 장비 상태, 우천 취소 기준을 먼저 확인하면 실패 확률이 줄어요.",
        author: "나트랑초행",
        area: "쩐푸 해변",
        timeAgo: "25분 전",
        likes: 16,
        comments: 6
      }
    ],
    하노이: [
      {
        id: "hanoi-neighborhood-old-quarter",
        city: "하노이",
        category: "질문",
        title: "올드쿼터에서 캐리어 끌고 이동 괜찮나요?",
        body: "골목이 좁고 보도가 끊기는 곳이 많아서 숙소 앞 드롭 가능한지 먼저 확인하는 게 편해요.",
        author: "호안끼엠",
        area: "올드쿼터",
        timeAgo: "36분 전",
        likes: 14,
        comments: 5,
        verified: true
      }
    ],
    달랏: [
      {
        id: "dalat-neighborhood-night-market",
        city: "달랏",
        category: "맛집",
        title: "달랏 야시장 간식 뭐가 괜찮아요?",
        body: "날씨가 선선해서 따뜻한 간식 위주가 좋아요. 가격 먼저 확인하고 주문하면 편해요.",
        author: "달랏좋아",
        area: "달랏 야시장",
        timeAgo: "1시간 전",
        likes: 11,
        comments: 4
      }
    ],
    푸꾸옥: [
      {
        id: "phuquoc-neighborhood-sunset",
        city: "푸꾸옥",
        category: "동행",
        title: "선셋타운 노을 보러 같이 갈 분?",
        body: "사진 찍고 저녁만 각자 결제로 가볍게 움직이면 좋겠어요. 공개 장소에서 만나요.",
        author: "노을러",
        area: "선셋타운",
        timeAgo: "52분 전",
        likes: 13,
        comments: 7
      }
    ]
  };

  return [...(citySpecific[destination] ?? []), ...shared];
}

function getWeeklyEvents(destination: Destination): LocalMeetup[] {
  const eventArea = `${destination} 전역`;
  const common: LocalMeetup[] = [
    {
      id: `${destination}-resident-food`,
      title: "로컬 맛집 같이 가기",
      area: eventArea,
      time: "오늘 19:30",
      category: "식사동행",
      host: "현지 거주자",
      seats: "3~5명",
      safety: "리뷰 많은 공개 식당만 후보로 두고 비용은 각자 결제",
      source: "거주자 추천",
      venue: "리뷰 500+ 식당 후보",
      status: "검증 번개",
      chatMessages: ["방장: 메뉴판과 가격 확인되는 식당만 고를게요.", "참여자: 더치페이 기준이면 참여할게요."]
    },
    {
      id: `${destination}-cafe-chat`,
      title: "카페에서 여행 정보 나누기",
      area: eventArea,
      time: "오늘 15:30",
      category: "카페수다",
      host: "여행자 제안",
      seats: "2~4명",
      safety: "밝은 시간대 공개 카페에서 만남",
      source: "사용자 등록",
      venue: "카페 후보",
      status: "가볍게 참여",
      chatMessages: ["방장: 콘센트 있고 찾기 쉬운 카페로 볼게요.", "참여자: 1시간 정도 가볍게 참여 가능해요."]
    },
    {
      id: `${destination}-massage-reset`,
      title: "컨디션 회복 코스 정보 공유",
      area: eventArea,
      time: "내일 16:00",
      category: "로컬정보",
      host: "거주자 추천",
      seats: "2~4명",
      safety: "가격표와 예약 가능 시간만 공유하고 방문 여부는 각자 결정",
      source: "거주자 추천",
      venue: "후기 많은 스파 후보",
      status: "로컬 정보",
      chatMessages: ["방장: 60분/90분 가격 먼저 확인해둘게요.", "참여자: 팁 포함 여부도 같이 보면 좋아요."]
    },
    {
      id: `${destination}-morning-run`,
      title: "아침 산책·러닝 모임",
      area: eventArea,
      time: "내일 07:30",
      category: "운동",
      host: "여행자 제안",
      seats: "2~6명",
      safety: "밝은 시간대 공개 산책로만 이동, 무리한 속도 금지",
      source: "커뮤니티 제보",
      venue: "공개 산책로",
      status: "스포츠",
      chatMessages: ["방장: 걷기 반 러닝 반으로 가볍게 할게요.", "참여자: 물이랑 편한 신발 챙겨요."]
    },
    {
      id: `${destination}-business-coffee`,
      title: "여행자·거주자 커피 네트워킹",
      area: eventArea,
      time: "이번주 금 10:30",
      category: "비즈니스",
      host: "커뮤니티 호스트",
      seats: "4~10명",
      safety: "공개 카페에서 명함 없이도 가볍게 대화",
      source: "커뮤니티 제보",
      venue: "카페 후보",
      status: "비즈니스",
      chatMessages: ["운영자: 여행, 일, 현지 생활 이야기 편하게 나눠요.", "참여자: 처음 와도 자기소개 짧게만 하면 돼요."]
    },
    {
      id: `${destination}-language-exchange`,
      title: "한국어·영어·베트남어 언어교류",
      area: eventArea,
      time: "내일 20:00",
      category: "언어교환",
      host: "언어교류 모임",
      seats: "자유참여",
      safety: "공개 카페/바에서 진행, 첫 방문자는 초반 시간 추천",
      source: "커뮤니티 제보",
      venue: "언어교류 장소",
      status: "언어",
      chatMessages: ["운영자: 영어가 서툴러도 괜찮아요.", "참여자: 처음 가는 분끼리 입구에서 만나요."]
    }
  ];

  const cityEvents: Record<Destination, LocalMeetup[]> = {
    호치민: [
      {
      id: "hcm-luu-club-weekend",
      title: "Luu Club 금요일 DJ/댄스 파티",
      area: "빈탄 Pham Viet Chanh",
      time: "이번주 금 22:00",
      category: "밤모임",
        host: "공식 이벤트",
        seats: "무료입장 후보",
        safety: "22시 시작. 저녁 먹고 이동하면 자연스럽고 귀가는 Grab Car 추천",
        source: "Resident Advisor",
        venue: "Luu Bar",
        status: "공식 일정",
        chatMessages: ["운영자: 22시 시작이라 저녁 먹고 이동하는 흐름이 좋아요.", "참여자: 택시는 같이 잡고 귀가해요."]
      },
      {
        id: "hcm-mundo-lingo",
        title: "타오디엔 언어교류 네트워킹",
        area: "타오디엔",
        time: "목요일 20:00",
        category: "언어교환",
        host: "Mundo Lingo",
        seats: "자유참여",
        safety: "공개 바/카페 모임. 처음이면 20시쯤 들어가면 분위기 잡기 좋아요",
        source: "Meetup",
        venue: "The Green Box",
        status: "매주 목요일",
        chatMessages: ["운영자: 영어가 서툴러도 가볍게 참여 가능한 분위기예요.", "참여자: 처음 가는 분끼리 입구에서 만나요."]
      },
      {
      id: "hcm-bui-vien-night",
      title: "부이비엔 가기 전 1군 맥주 한잔",
      area: "1군 District 1",
      time: "오늘 21:30",
      category: "밤모임",
        host: "호치민 거주자",
        seats: "2~6명",
        safety: "귀가는 Grab Car 기준, 과음/2차 강요 금지",
        source: "거주자 추천",
        venue: "공개 펍",
        status: "초행자 추천",
        chatMessages: ["방장: 1차만 가볍게 보고 23시 전후 해산해요.", "참여자: 부이비엔은 21시 이후가 더 살아나요."]
      },
      {
        id: "hcm-thao-dien-expat",
        title: "타오디엔 신상 맛집 같이 가기",
        area: "타오디엔",
        time: "내일 12:30",
        category: "식사동행",
        host: "2군 거주자",
        seats: "2~4명",
        safety: "예약 가능한 식당만 진행",
        source: "거주자 추천",
        venue: "예약 식당",
        status: "예약 추천",
        chatMessages: ["방장: 웨스턴/타이/브런치 중 투표로 고를게요.", "참여자: 타오디엔 카페까지 묶으면 좋아요."]
      },
      {
        id: "hcm-karaoke-night",
        title: "1군 밤 모임: 루프탑·라이브바 후보 같이 보기",
        area: "1군 District 1",
        time: "오늘 22:30",
        category: "밤모임",
        host: "호치민 거주자",
        seats: "2~6명",
        safety: "공개 장소, 입장료, 귀가 Grab을 먼저 확인",
        source: "거주자 추천",
        venue: "1군 공개 바 후보",
        status: "귀가 체크",
        chatMessages: ["방장: 공개 장소 위주로 후보 올릴게요.", "참여자: 귀가 Grab 잡기 쉬운 곳이면 참여할게요."]
      },
      {
        id: "hcm-massage-rain",
        title: "비 오는 날 실내 대체 코스 정보 공유",
        area: "응우옌후에",
        time: "오늘 15:00",
        category: "로컬정보",
        host: "호치민 거주자",
        seats: "2~4명",
        safety: "후기, 가격표, 이동 동선만 공유하고 방문은 각자 결정",
        source: "거주자 추천",
        venue: "실내 코스 후보",
        status: "로컬 정보",
        chatMessages: ["방장: 비 올 때 덜 피곤한 실내 코스 위주로 볼게요.", "참여자: 이동 짧은 곳이면 좋아요."]
      }
    ],
    다낭: [
      {
        id: "danang-beach-bar",
        title: "미케비치 선셋 바 번개",
        area: "미케비치",
        time: "이번주 금 18:30",
        category: "밤모임",
        host: "다낭 거주자",
        seats: "2~6명",
        safety: "해변 공개 바에서만 진행, 귀가 차량 각자 확인",
        source: "거주자 추천",
        venue: "해변 바",
        status: "선셋 추천",
        chatMessages: ["방장: 해 지기 전에 만나서 사진 찍고 이동해요.", "참여자: 비 오면 실내 바로 바꿔요."]
      },
      {
        id: "danang-dragon-bridge",
        title: "용다리 야경 보고 미케비치 맥주",
        area: "용다리/한강",
        time: "토요일 20:30",
        category: "밤모임",
        host: "다낭 거주자",
        seats: "2~5명",
        safety: "강변 공개 장소에서만 이동",
        source: "거주자 추천",
        venue: "한강 강변",
        status: "주말 추천",
        chatMessages: ["방장: 용다리 보고 바로 Grab으로 이동해요.", "참여자: 주말이면 사람 많아서 일찍 만나요."]
      },
      {
        id: "danang-hoian",
        title: "호이안 야시장 동행 모집",
        area: "호이안 올드타운",
        time: "오늘 17:00",
        category: "투어동행",
        host: "다낭 거주자",
        seats: "2~4명",
        safety: "왕복 이동 수단 사전 공유",
        source: "거주자 추천",
        venue: "호이안 올드타운",
        status: "차량 확인",
        chatMessages: ["방장: 왕복 차량비 먼저 맞춰요.", "참여자: 야시장 보고 21시쯤 돌아오면 좋겠어요."]
      }
    ],
    나트랑: [
      {
        id: "nhatrang-beach-club",
        title: "쩐푸 해변 비치클럽 번개",
        area: "쩐푸 해변",
        time: "이번주 금 20:30",
        category: "밤모임",
        host: "나트랑 거주자",
        seats: "2~5명",
        safety: "입장료와 테이블 최소금액 사전 확인",
        source: "거주자 추천",
        venue: "해변 클럽 후보",
        status: "금요일 밤",
        chatMessages: ["방장: 입장료 있는 곳이면 먼저 공유할게요.", "참여자: 2차 강요 없이 1차만 가요."]
      },
      {
        id: "nhatrang-rooftop",
        title: "스카이라이트 루프탑 같이 가기",
        area: "쩐푸 해변",
        time: "오늘 21:00",
        category: "밤모임",
        host: "나트랑 거주자",
        seats: "2~4명",
        safety: "입장료·드레스코드 사전 확인",
        source: "거주자 추천",
        venue: "Skylight",
        status: "루프탑 추천",
        chatMessages: ["방장: 드레스코드랑 입장료 확인하고 올릴게요.", "참여자: 해변 쪽 숙소면 같이 이동해요."]
      },
      {
        id: "nhatrang-mudbath",
        title: "머드온천 반일 동행",
        area: "나트랑 센터",
        time: "내일 10:00",
        category: "투어동행",
        host: "나트랑 거주자",
        seats: "2~5명",
        safety: "픽업 장소와 비용을 먼저 공유",
        source: "거주자 추천",
        venue: "머드온천 후보",
        status: "오전 추천",
        chatMessages: ["방장: 오전 픽업 가능한 곳으로 볼게요.", "참여자: 수건/갈아입을 옷 챙겨요."]
      }
    ],
    하노이: [
      {
        id: "hanoi-live-music",
        title: "올드쿼터 라이브뮤직 바",
        area: "올드쿼터",
        time: "이번주 금 20:30",
        category: "밤모임",
        host: "하노이 거주자",
        seats: "2~5명",
        safety: "공개 바에서만 진행, 귀가 동선 공유",
        source: "거주자 제보",
        venue: "라이브뮤직 바 후보",
        status: "라이브 추천",
        chatMessages: ["방장: 너무 시끄러운 곳보다 초행자도 편한 곳으로 볼게요.", "참여자: 1차만 가볍게 참여해요."]
      },
      {
        id: "hanoi-beer-street",
        title: "타히엔 맥주거리 초행자 모임",
        area: "올드쿼터",
        time: "오늘 21:00",
        category: "밤모임",
        host: "하노이 거주자",
        seats: "2~6명",
        safety: "귀가 Grab 확인 후 해산",
        source: "거주자 추천",
        venue: "타히엔 맥주거리",
        status: "초행자 추천",
        chatMessages: ["방장: 21시 이후 분위기 보고 너무 붐비면 근처 바로 옮겨요.", "참여자: 현금 조금 챙겨요."]
      },
      {
        id: "hanoi-egg-coffee",
        title: "올드쿼터 감성 카페 투어",
        area: "호안끼엠",
        time: "오늘 14:00",
        category: "카페수다",
        host: "하노이 거주자",
        seats: "2~4명",
        safety: "도보 동선 짧은 카페만 진행",
        source: "거주자 추천",
        venue: "호안끼엠 카페",
        status: "낮 코스",
        chatMessages: ["방장: 사진 좋은 카페 1곳, 디저트 1곳 정도로 짧게 가요.", "참여자: 도보 15분 안쪽이면 좋아요."]
      }
    ],
    달랏: [
      {
        id: "dalat-nightmarket",
        title: "달랏 야시장 간식 동행",
        area: "달랏 야시장",
        time: "오늘 19:30",
        category: "식사동행",
        host: "달랏 거주자",
        seats: "2~5명",
        safety: "야시장 공개 동선만 이동, 가격 확인 후 각자 결제",
        source: "거주자 추천",
        venue: "달랏 야시장",
        status: "초행자 추천",
        chatMessages: ["방장: 반짱느엉이랑 딸기 디저트 위주로 볼게요.", "참여자: 밤에는 겉옷 챙기면 좋아요."]
      },
      {
        id: "dalat-cafe-photo",
        title: "전망 좋은 달랏 카페 같이 가기",
        area: "쑤언흐엉 호수",
        time: "내일 14:00",
        category: "사진산책",
        host: "달랏 거주자",
        seats: "2~4명",
        safety: "택시 이동 가능한 카페만 진행",
        source: "거주자 추천",
        venue: "전망 카페 후보",
        status: "사진 코스",
        chatMessages: ["방장: 사진 잘 나오는 좌석 있는 곳으로 고를게요.", "참여자: 카페 1곳만 짧게 가도 좋아요."]
      },
      {
        id: "dalat-maze-bar",
        title: "달랏 밤 산책 후 바 한잔",
        area: "달랏 시내",
        time: "이번주 금 21:00",
        category: "밤모임",
        host: "달랏 거주자",
        seats: "2~5명",
        safety: "공개 바에서 1차만 진행, 귀가 차량 확인",
        source: "거주자 추천",
        venue: "시내 바 후보",
        status: "밤 코스",
        chatMessages: ["방장: 늦게까지 무리하지 않고 1차만 가요.", "참여자: 달랏 밤은 선선해서 겉옷 추천."]
      }
    ],
    푸꾸옥: [
      {
        id: "phuquoc-beach-party",
        title: "롱비치 선셋 DJ 바",
        area: "롱비치",
        time: "이번주 토 19:30",
        category: "밤모임",
        host: "푸꾸옥 거주자",
        seats: "2~6명",
        safety: "해변 바 공개석만 진행, 귀가 차량 사전 확인",
        source: "거주자 추천",
        venue: "롱비치 바 후보",
        status: "선셋 추천",
        chatMessages: ["방장: 선셋 보고 바로 음악 있는 바로 이동해요.", "참여자: 숙소가 멀면 귀가 차량 먼저 잡아요."]
      },
      {
        id: "phuquoc-sunset",
        title: "선셋타운 노을 같이 보기",
        area: "선셋타운",
        time: "오늘 17:30",
        category: "사진산책",
        host: "푸꾸옥 거주자",
        seats: "2~5명",
        safety: "공개 전망 포인트에서만 만남",
        source: "거주자 추천",
        venue: "선셋타운",
        status: "노을 추천",
        chatMessages: ["방장: 노을 시간 맞춰서 17:20쯤 만나요.", "참여자: 사진 찍고 야시장까지 묶어도 좋아요."]
      },
      {
        id: "phuquoc-nightmarket",
        title: "즈엉동 야시장 해산물 동행",
        area: "즈엉동",
        time: "오늘 19:00",
        category: "식사동행",
        host: "푸꾸옥 거주자",
        seats: "2~4명",
        safety: "가격 확인 후 각자 결제",
        source: "거주자 추천",
        venue: "즈엉동 야시장",
        status: "해산물 추천",
        chatMessages: ["방장: 해산물 가격 먼저 확인하고 주문해요.", "참여자: 현금 챙기고 메뉴 같이 골라요."]
      }
    ]
  };

  return [...cityEvents[destination], ...common]
    .map((event) => withEventDefaults(event, destination))
    .slice(0, 8);
}

function withEventDefaults(event: LocalMeetup, destination: Destination): LocalMeetup {
  return {
    price: getEventPrice(event),
    vibe: getEventVibe(event),
    beginnerLevel: getEventLevel(event),
    mapQuery: getEventMapQuery(event, destination),
    ...event
  };
}

function filterEvents(events: LocalMeetup[], dateFilter: EventDateFilter, interestFilter: EventInterestFilter) {
  return events
    .filter((event) => matchEventDate(event, dateFilter))
    .filter((event) => matchEventInterest(event, interestFilter));
}

function matchEventDate(event: LocalMeetup, filter: EventDateFilter) {
  if (filter === "예정된 모든 이벤트") return true;
  const scheduledDate = getScheduledEventDate(event);
  if (scheduledDate) {
    if (filter === "오늘") return isSameCalendarDay(scheduledDate, new Date());
    if (filter === "내일") return isSameCalendarDay(scheduledDate, addDays(new Date(), 1));
    return isWeekendDate(scheduledDate) && getCalendarDayDiff(scheduledDate, new Date()) >= 0 && getCalendarDayDiff(scheduledDate, new Date()) <= 6;
  }
  if (filter === "오늘") return event.time.includes("오늘");
  if (filter === "내일") return event.time.includes("내일");
  return /이번주말|이번주|금|토|일|주말/.test(event.time);
}

function matchEventInterest(event: LocalMeetup, filter: EventInterestFilter) {
  if (filter === "새로운 이벤트") return true;
  if (filter === "내 이벤트") return event.id.startsWith("local-");
  if (filter === "사회활동") return isAnyEventCategory(event, ["식사동행", "카페수다", "밤모임", "로컬정보"]);
  if (filter === "취미") return isAnyEventCategory(event, ["카페수다", "사진산책", "로컬정보"]);
  if (filter === "스포츠") return /스포츠|운동|러닝|산책|풋살|요가|서핑|골프|테니스|등산|자전거/i.test(`${event.title} ${event.category} ${event.venue ?? ""} ${event.status ?? ""}`);
  if (filter === "여행") return isAnyEventCategory(event, ["투어동행", "식사동행", "사진산책"]) || /투어|야시장|선셋|해변|올드타운|온천|노을|동행/i.test(event.title);
  if (filter === "비즈니스") return isAnyEventCategory(event, ["비즈니스"]) || /네트워킹|비즈니스|창업|교류|세미나|컨퍼런스/i.test(`${event.title} ${event.host} ${event.source ?? ""} ${event.status ?? ""}`);
  return /언어|language|lingo|exchange/i.test(`${event.title} ${event.host} ${event.source ?? ""} ${event.status ?? ""}`);
}

function isAnyEventCategory(event: LocalMeetup, categories: LocalMeetup["category"][]) {
  return categories.includes(event.category);
}

function getEventDateParts(event: LocalMeetup) {
  const scheduledDate = getScheduledEventDate(event);
  if (scheduledDate) {
    return {
      day: formatScheduledDay(scheduledDate),
      time: formatScheduledTime(scheduledDate)
    };
  }

  const time = event.time.match(/\d{1,2}:\d{2}/)?.[0] ?? "시간 확인";
  let day = "일정";
  if (event.time.includes("오늘")) day = "오늘";
  else if (event.time.includes("내일")) day = "내일";
  else if (event.time.includes("이번주말")) day = "주말";
  else if (event.time.includes("금")) day = "금";
  else if (event.time.includes("토")) day = "토";
  else if (event.time.includes("일")) day = "일";
  else if (event.time.includes("목")) day = "목";
  else if (event.time.includes("수")) day = "수";
  else if (event.time.includes("화")) day = "화";
  else if (event.time.includes("월")) day = "월";
  return { day, time };
}

function parseMeetupDateInput(input: string, now = new Date()) {
  const text = input.trim();
  if (!text) return undefined;

  const timeMatch = text.match(/(\d{1,2})[:시](?:\s*(\d{2}))?/);
  const hour = clampNumber(timeMatch ? Number(timeMatch[1]) : 19, 0, 23);
  const minute = clampNumber(timeMatch?.[2] ? Number(timeMatch[2]) : 0, 0, 59);
  const base = startOfLocalDay(now);

  const isoMatch = text.match(/(20\d{2})[-/.년\s]+(\d{1,2})[-/.월\s]+(\d{1,2})/);
  if (isoMatch) return makeLocalDate(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), hour, minute, now);

  const monthDayMatch = text.match(/(\d{1,2})\s*(?:월|\/|\.)\s*(\d{1,2})\s*(?:일)?/);
  if (monthDayMatch) {
    let date = makeLocalDate(now.getFullYear(), Number(monthDayMatch[1]) - 1, Number(monthDayMatch[2]), hour, minute, now);
    if (date.getTime() < now.getTime() - 60 * 60 * 1000) {
      date = makeLocalDate(now.getFullYear() + 1, Number(monthDayMatch[1]) - 1, Number(monthDayMatch[2]), hour, minute, now);
    }
    return date;
  }

  if (text.includes("오늘")) return withTime(base, hour, minute);
  if (text.includes("내일")) return withTime(addDays(base, 1), hour, minute);
  if (/이번주말|주말/.test(text)) return withTime(getNearestWeekendDate(base), hour, minute);

  const weekdayIndex = getMentionedWeekdayIndex(text);
  if (weekdayIndex !== undefined) return withTime(getNextWeekdayDate(base, weekdayIndex), hour, minute);

  return withTime(base, hour, minute);
}

function getScheduledEventDate(event: LocalMeetup) {
  if (!event.scheduledAt) return undefined;
  const date = new Date(event.scheduledAt);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getMeetupLifecycleStatus(event: LocalMeetup) {
  const statusText = `${event.status ?? ""}`.toLowerCase();
  if (/삭제|deleted/.test(statusText)) return "deleted";
  if (/취소|cancel/.test(statusText)) return "cancelled";
  const scheduledDate = getScheduledEventDate(event);
  if (scheduledDate && scheduledDate.getTime() < Date.now() - 2 * 60 * 60 * 1000) return "ended";
  if (/마감|closed/.test(statusText)) return "closed";
  return "open";
}

function getMeetupLifecycleLabel(event: LocalMeetup) {
  const status = getMeetupLifecycleStatus(event);
  if (status === "deleted") return "삭제";
  if (status === "cancelled") return "취소";
  if (status === "ended") return "종료";
  if (status === "closed") return "마감";
  return "모집중";
}

function canOpenMeetupRoom(event: LocalMeetup, attending: boolean) {
  const status = getMeetupLifecycleStatus(event);
  return attending || status === "open";
}

function isMeetupHost(event: LocalMeetup, memberId?: string, memberName?: string) {
  const ownerIds = [memberId, memberName].filter(Boolean);
  return ownerIds.some((id) => id === event.hostAuthUid || id === event.host);
}

function isMeetupRecentlyVisible(event: LocalMeetup) {
  const lifecycle = getMeetupLifecycleStatus(event);
  if (lifecycle === "deleted") return false;
  const scheduledDate = getScheduledEventDate(event);
  if (!scheduledDate) return lifecycle !== "ended";
  return scheduledDate.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function formatScheduledDay(date: Date, now = new Date()) {
  const diff = getCalendarDayDiff(date, now);
  if (diff === -1) return "어제";
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff >= 2 && diff <= 6 && isWeekendDate(date)) return "주말";
  if (diff >= 2 && diff <= 6) return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatScheduledTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getMentionedWeekdayIndex(text: string) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const index = weekdays.findIndex((day) => new RegExp(`(^|\\s|이번주|다음주)${day}(요일)?(?=\\s|요일|\\d|$)`).test(text));
  return index >= 0 ? index : undefined;
}

function getNextWeekdayDate(base: Date, weekdayIndex: number) {
  const diff = (weekdayIndex - base.getDay() + 7) % 7;
  return addDays(base, diff);
}

function getNearestWeekendDate(base: Date) {
  const day = base.getDay();
  if (day === 0 || day === 6) return base;
  return addDays(base, 6 - day);
}

function getCalendarDayDiff(date: Date, now: Date) {
  const target = startOfLocalDay(date).getTime();
  const source = startOfLocalDay(now).getTime();
  return Math.round((target - source) / 86400000);
}

function isSameCalendarDay(left: Date, right: Date) {
  return getCalendarDayDiff(left, right) === 0;
}

function isWeekendDate(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function withTime(date: Date, hour: number, minute: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
}

function makeLocalDate(year: number, month: number, day: number, hour: number, minute: number, fallback: Date) {
  const date = new Date(year, month, day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? withTime(fallback, hour, minute) : date;
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getAvatarInitials(event: LocalMeetup) {
  const source = [event.host, event.category, event.area, event.title]
    .map((item) => item.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 1))
    .filter(Boolean);
  return (source.length >= 3 ? source : [...source, "나", "현", "여"]).slice(0, 3);
}

function getAttendeeCopy(event: LocalMeetup, memberCount = 0) {
  const count = Math.max(0, memberCount);
  const capacity = getMeetupCapacityLabel(event);
  return `${count}명 입장 · 모집 ${capacity}`;
}

function getMeetupCapacityLabel(event: LocalMeetup) {
  const numbers = event.seats.match(/\d+/g)?.map((value) => Number(value)).filter(Number.isFinite) ?? [];
  const capacity = numbers.length > 0 ? Math.max(...numbers) : undefined;
  return capacity ? `${capacity}명` : event.seats;
}

function getMeetupCurrentMemberCount(event: LocalMeetup, memberCounts: Record<string, number>, attending: boolean) {
  const remoteCount = memberCounts[event.id] ?? 0;
  return Math.max(remoteCount, attending ? 1 : 0);
}

function getMeetupRecruitmentCopy(event: LocalMeetup, memberCount: number) {
  return `입장 ${memberCount}명 / 모집 ${getMeetupCapacityLabel(event)}`;
}

function formatMeetupCategoryLabel(category: MeetupCategory) {
  return meetupCategories.find((item) => item.category === category)?.label ?? category;
}

function getMeetupPlaceholder(category: MeetupCategory) {
  if (category === "식사동행") return "예: 오늘 7시 1군에서 저녁 같이 먹을 분";
  if (category === "카페수다") return "예: 오후 3시 카페에서 여행 정보 나눠요";
  if (category === "투어동행") return "예: 내일 호이안 반일투어 같이 갈 분";
  if (category === "밤모임") return "예: 금요일 밤 루프탑/라이브바 같이 갈 분";
  if (category === "언어교환") return "예: 한국어·영어·베트남어 가볍게 연습해요";
  if (category === "운동") return "예: 내일 아침 강변 러닝/산책 같이 해요";
  if (category === "비즈니스") return "예: 현지 창업/일 이야기 커피챗";
  if (category === "사진산책") return "예: 노을 시간 사진 스팟 같이 걸어요";
  return "예: 호치민 초행자 질문/동선 공유해요";
}

function getDefaultMeetupTime(category: MeetupCategory) {
  if (category === "카페수다" || category === "사진산책" || category === "로컬정보") return "오늘 15:00";
  if (category === "밤모임") return "오늘 21:00";
  if (category === "운동") return "내일 07:30";
  if (category === "비즈니스") return "이번주 금 10:30";
  if (category === "언어교환") return "내일 20:00";
  if (category === "투어동행") return "내일 09:00";
  return "오늘 19:30";
}

function buildMeetupTimeLabel(dateValue: string, timeValue: string) {
  return `${dateValue || getDateInputValue(new Date())} ${timeValue || "19:30"}`;
}

function formatMeetupDateSelection(dateValue: string, timeValue: string) {
  const parsed = parseMeetupDateInput(buildMeetupTimeLabel(dateValue, timeValue));
  if (!parsed) return "날짜 확인";
  return `${formatScheduledDay(parsed)} ${formatScheduledTime(parsed)}`;
}

function getDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDefaultSeats(category: MeetupCategory) {
  if (category === "밤모임" || category === "운동") return "2~6명";
  if (category === "비즈니스" || category === "언어교환") return "4~10명";
  if (category === "투어동행") return "2~5명";
  return "2~4명";
}

function getDefaultSafety(category: MeetupCategory) {
  if (category === "밤모임") return "공개 장소, 귀가 Grab, 입장료를 먼저 확인";
  if (category === "투어동행") return "왕복 이동수단과 비용을 사전에 공유";
  if (category === "운동") return "밝은 시간대 공개 코스에서 무리 없이 진행";
  if (category === "언어교환") return "공개 카페/바에서 진행하고 첫 방문자는 초반 시간 추천";
  if (category === "비즈니스") return "공개 카페에서 가볍게 자기소개 후 진행";
  return "공개 장소에서 만나고 비용은 각자 결제";
}

function getDefaultPrice(category: MeetupCategory) {
  if (category === "밤모임") return "입장료 확인";
  if (category === "투어동행") return "사전 공유";
  if (category === "카페수다" || category === "비즈니스" || category === "언어교환") return "음료 각자";
  if (category === "운동" || category === "사진산책" || category === "로컬정보") return "무료/소액";
  return "각자 결제";
}

function getDefaultVibe(category: MeetupCategory) {
  if (category === "밤모임") return "밤 분위기";
  if (category === "카페수다") return "가볍게 수다";
  if (category === "투어동행") return "반일 동행";
  if (category === "언어교환") return "언어 교류";
  if (category === "운동") return "건강한 활동";
  if (category === "비즈니스") return "네트워킹";
  if (category === "사진산책") return "사진 산책";
  if (category === "로컬정보") return "정보 나눔";
  return "식사 동행";
}

function getDefaultMeetupPhoto(destination: Destination, category: MeetupCategory) {
  const key = `${destination}-${category}`;
  const images = [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80"
  ];
  const seed = Array.from(key).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return images[seed % images.length];
}

function getDefaultLevel(category: MeetupCategory) {
  if (category === "밤모임") return "귀가 체크";
  if (category === "투어동행") return "이동 확인";
  if (category === "운동") return "난이도 확인";
  return "초행자 가능";
}

function getEventPrice(event: LocalMeetup) {
  if (event.price) return event.price;
  if (event.category === "밤모임") return "입장료 확인";
  if (event.category === "투어동행") return "사전 공유";
  if (event.category === "카페수다") return "음료 각자";
  if (event.category === "비즈니스") return "각자 결제";
  if (event.category === "운동") return "무료/소액";
  return "각자 결제";
}

function getEventVibe(event: LocalMeetup) {
  if (event.vibe) return event.vibe;
  if (event.category === "밤모임") return "음악/대화";
  if (event.category === "투어동행") return "반나절 동행";
  if (event.category === "카페수다") return "느긋한 만남";
  if (event.category === "언어교환") return "언어 교류";
  if (event.category === "비즈니스") return "정보 교류";
  if (event.category === "운동") return "가볍게 활동";
  if (event.category === "사진산책") return "사진 산책";
  if (event.category === "로컬정보") return "현지 정보";
  return "식사 동행";
}

function getEventLevel(event: LocalMeetup) {
  if (event.beginnerLevel) return event.beginnerLevel;
  if (event.category === "밤모임") return "귀가 체크";
  if (event.category === "투어동행") return "이동 확인";
  if (event.category === "운동") return "난이도 확인";
  if (event.category === "언어교환") return "초행자 쉬움";
  if (event.category === "비즈니스") return "가볍게 가능";
  return "초행자 쉬움";
}

function getEventVenueLine(event: LocalMeetup) {
  if (!event.venue || event.venue === event.area) return event.area;
  return `${event.venue} · ${event.area}`;
}

function getEventMapQuery(event: LocalMeetup, destination: Destination) {
  if (event.mapQuery) return event.mapQuery;
  return `${event.venue ?? event.title} ${event.area} ${destination}`;
}

function pickNearNowPlaces(places: PlacePlan[], nextPlace?: PlacePlan) {
  const filtered = places.filter((place) => place.id !== nextPlace?.id);
  return [nextPlace, ...filtered].filter(Boolean).slice(0, 3) as PlacePlan[];
}

function pickNearbyHotplaces(destination: Destination, location: string, nextCategory: PlacePlan["category"]) {
  const targetArea = normalizeArea(location);
  const preferredCategories = getAlternativeCategories(nextCategory);
  const scoredPlaces = curatedPlaces
    .filter((place) => place.city === destination)
    .map((place) => ({ place, score: scoreNearbyHotplace(place, targetArea, preferredCategories) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const selected: CuratedPlace[] = [];
  const categoryCounts = new Map<string, number>();

  for (const item of scoredPlaces) {
    const currentCount = categoryCounts.get(item.place.category) ?? 0;
    if (currentCount >= 2) continue;
    selected.push(item.place);
    categoryCounts.set(item.place.category, currentCount + 1);
    if (selected.length >= 4) break;
  }

  return selected.length >= 3 ? selected : scoredPlaces.slice(0, 4).map((item) => item.place);
}

function scoreNearbyHotplace(place: CuratedPlace, targetArea: string, preferredCategories: string[]) {
  const area = normalizeArea(place.area ?? inferAreaLabel(place));
  const sameArea = area === targetArea;
  let score = sameArea ? 40 : 6;
  if (preferredCategories.includes(place.category)) score += 18;
  if (place.rainyDayOk) score += 7;
  if (place.beginnerSafe) score += 8;
  if (place.hiddenGem) score += 4;
  score += (place.rating ?? 0) * 4;
  score += Math.min(place.userRatingCount ?? 0, 3000) / 500;
  return score;
}

function getAlternativeCategories(category: PlacePlan["category"]) {
  if (category === "맛집") return ["카페", "마사지", "사진명소", "맛집"];
  if (category === "카페") return ["카페", "맛집", "마사지"];
  if (category === "마사지") return ["마사지", "카페"];
  if (category === "쇼핑") return ["쇼핑", "카페", "맛집"];
  if (category === "야경") return ["바/루프탑", "카페"];
  if (category === "관광지") return ["사진명소", "카페", "맛집"];
  return ["카페", "맛집", "마사지"];
}

function inferAreaLabel(place: CuratedPlace) {
  const text = `${place.name} ${place.id}`.toLowerCase();
  if (hasKeyword(text, ["thao dien", "an phu", "estella", "song hành", "doya"])) return "타오디엔";
  if (hasKeyword(text, ["phu my hung", "district 7", "cobi"])) return "푸미흥/7군";
  if (hasKeyword(text, ["de tham", "bui vien", "pham ngu lao"])) return "부이비엔";
  if (hasKeyword(text, ["ben thanh", "old market", "market", "saigon centre", "takashimaya"])) return "벤탄시장";
  if (hasKeyword(text, ["dong khoi", "nguyen hue", "bitexco", "opera", "notre dame", "post office"])) return "응우옌후에";
  if (hasKeyword(text, ["landmark 81", "binh thanh"])) return "빈탄";
  if (hasKeyword(text, ["cho lon", "binh tay", "an dong"])) return "차이나타운";
  if (hasKeyword(text, ["airport", "tan son nhat"])) return "공항 근처";
  return "시내권";
}

function normalizeArea(area: string) {
  const text = area.toLowerCase();
  if (hasKeyword(text, ["타오디엔", "thao dien", "2군", "an phu"])) return "타오디엔";
  if (hasKeyword(text, ["벤탄", "1군", "district 1"])) return "벤탄시장";
  if (hasKeyword(text, ["응우옌후에", "동코이", "nguyen hue", "dong khoi"])) return "응우옌후에";
  if (hasKeyword(text, ["부이비엔", "팜응라오", "bui vien", "pham ngu lao"])) return "부이비엔";
  if (hasKeyword(text, ["푸미흥", "7군", "district 7"])) return "푸미흥/7군";
  if (hasKeyword(text, ["공항", "airport", "tan son nhat"])) return "공항 근처";
  return area;
}

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildHotplaceReason(place: CuratedPlace) {
  const tags = place.tags;
  const name = place.name.toLowerCase();

  if (tags.includes("쌀국수")) return getStableReason(place.id, [
    "가볍게 한 끼 먹기 좋아서 일정이 밀릴 때 부담이 적어요.",
    "국물 메뉴라 더위에 지친 뒤에도 비교적 편하게 먹기 좋아요.",
    "회전이 빠른 편이라 오래 머물기 애매할 때 넣기 좋아요."
  ]);
  if (tags.includes("반미")) return getStableReason(place.id, [
    "오래 앉지 않고 빠르게 먹고 이동하기 좋은 후보예요.",
    "간단히 포장해서 다음 동선으로 넘어가기 좋아요.",
    "배는 고픈데 식사 시간을 길게 쓰기 싫을 때 맞아요."
  ]);
  if (tags.includes("길거리음식") || tags.includes("시장")) return getStableReason(place.id, [
    "시장 동선에 붙이기 좋아서 로컬 느낌을 살릴 수 있어요.",
    "짧게 둘러보고 먹기 좋아서 벤탄 근처 대체 코스로 무난해요.",
    "관광지 느낌과 식사를 한 번에 해결하기 좋은 후보예요."
  ]);
  if (tags.includes("한식당") || tags.includes("한국식중식") || name.includes("jjam")) return getStableReason(place.id, [
    "입맛이 지쳤을 때 리셋용으로 넣기 좋은 선택이에요.",
    "매콤하고 익숙한 메뉴가 필요할 때 대체하기 좋아요.",
    "일행 중 베트남 음식이 안 맞는 사람이 있을 때 안전한 카드예요."
  ]);
  if (tags.includes("채식가능")) return getStableReason(place.id, [
    "메뉴 선택 폭이 넓어서 일행 취향이 갈릴 때 무난해요.",
    "가벼운 메뉴를 고르기 쉬워서 더운 날에도 부담이 적어요.",
    "식사 제한이 있는 일행과 같이 가기 좋은 후보예요."
  ]);
  if (place.category === "카페") return getStableReason(place.id, [
    "더위 피하면서 쉬어가기 좋아서 중간 휴식 코스로 잘 맞아요.",
    "일정 사이에 앉아서 충전하기 좋은 대체지예요.",
    "사진도 남기고 체력도 아끼기 좋은 쉬는 코스예요."
  ]);
  if (place.category === "마사지") return getStableReason(place.id, [
    "많이 걸은 날 체력 회복용으로 넣기 좋은 후보예요.",
    "비가 오거나 너무 더울 때 실내 대체 코스로 좋아요.",
    "다음 야간 일정 전에 쉬어가기 좋은 선택이에요."
  ]);
  if (place.category === "바/루프탑") return "저녁 이후 분위기 전환이 필요할 때 쓰기 좋아요.";
  if (place.category === "사진명소") return "동선이 밋밋할 때 사진 포인트로 짧게 끼우기 좋아요.";
  if (place.category === "쇼핑") return "비 오거나 더울 때 실내 대체 코스로 쓰기 좋아요.";
  if (place.hiddenGem) return "일정이 너무 뻔할 때 넣기 좋은 숨은 후보예요.";
  if (place.beginnerSafe) return getStableReason(place.id, [
    "후기가 많고 주문 난이도가 낮아서 초행자 일정에 넣기 좋아요.",
    "위치와 접근성이 무난해서 첫 방문 대체지로 부담이 적어요.",
    "한국인 여행자가 참고하기 쉬운 정보가 있어 실패 확률을 낮춰줘요."
  ]);
  return getStableReason(place.id, [
    "현재 위치에서 대체하기 좋은 후보예요.",
    "동선이 꼬였을 때 짧게 끼우기 좋은 선택지예요.",
    "주변 일정과 묶어서 보기 좋은 후보예요."
  ]);
}

function formatPlaceName(name: string) {
  return name
    .replace(/\s+-\s*(vietnamese cuisine|vietnamese food|vegetarian food|vegan food).*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getStableReason(value: string, reasons: string[]) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return reasons[hash % reasons.length];
}

function formatWeather(liveInfo: LiveTravelInfo) {
  if (liveInfo.weather.status !== "ready") return "확인 중";
  return `${liveInfo.weather.temperatureC}°C · ${liveInfo.weather.condition}`;
}

function formatExchange(liveInfo: LiveTravelInfo) {
  if (liveInfo.exchange.status !== "ready" || !liveInfo.exchange.krwToVnd) return "확인 중";
  return `100,000 VND ≈ ${Math.round(100000 / liveInfo.exchange.krwToVnd).toLocaleString("ko-KR")}원`;
}

function formatVnd(value: number) {
  if (value >= 1000000) return `${value / 1000000}M VND`;
  return `${value.toLocaleString("ko-KR")} VND`;
}

function buildContextTitle(liveInfo: LiveTravelInfo) {
  if ((liveInfo.weather.precipitationMm ?? 0) > 0) return "비가 오고 있어요";
  if ((liveInfo.weather.temperatureC ?? 0) >= 32) return "지금 꽤 더워요";
  return "지금 바로 움직여도 좋아요";
}

function buildContextTip(liveInfo: LiveTravelInfo, nextPlace: PlacePlan) {
  if ((liveInfo.weather.precipitationMm ?? 0) > 0) return "실내 코스나 카페를 먼저 보고, 이동은 Grab Car가 편해요.";
  if ((liveInfo.weather.temperatureC ?? 0) >= 32) return "야외 이동은 짧게, 중간에 카페나 마사지 휴식을 넣는 게 좋아요.";
  return `${nextPlace.placeName}까지 이동 전 Google Maps와 Grab 시간을 같이 확인해보세요.`;
}

function getPrepLabel(place: PlacePlan) {
  if (place.reservationTip) return "예약";
  if (place.warning) return "주의";
  if (place.category === "맛집") return "대기";
  if (place.category === "쇼핑" || place.category === "관광지") return "현금";
  return "확인";
}

const styles = StyleSheet.create({
  currentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 17,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    ...shadow
  },
  cardStep: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 5
  },
  cardSubcopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginBottom: 13
  },
  destinationChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#FFF4D8",
    borderRadius: 22,
    padding: 5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFE1A8"
  },
  destinationChip: {
    minHeight: 38,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  destinationChipActive: {
    backgroundColor: "#FFC233",
    borderColor: "#FFC233"
  },
  destinationChipText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "900"
  },
  destinationChipTextActive: {
    color: colors.ink
  },
  communityTabBar: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 5,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)"
  },
  communityTabButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 8
  },
  communityTabButtonActive: {
    backgroundColor: "#FFC233",
    ...sunsetGlow
  },
  communityTabLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "900"
  },
  communityTabLabelActive: {
    color: colors.ink
  },
  communityTabCaption: {
    color: "#9A8A6A",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3
  },
  communityTabCaptionActive: {
    color: "rgba(27,18,8,0.74)"
  },
  communityUnreadCaption: {
    color: colors.card,
    backgroundColor: "#FF7A00",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 3
  },
  nowPanel: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 14,
    ...shadow
  },
  nowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  nowCopy: {
    flex: 1
  },
  nowLabel: {
    color: colors.mintDark,
    fontSize: 12,
    fontWeight: "900"
  },
  nowTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    marginTop: 5
  },
  nowMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5
  },
  mapMiniButton: {
    borderRadius: 18,
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  mapMiniText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900"
  },
  nowTip: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 12
  },
  nowActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  statusStrip: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  statusItem: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E8EFE6",
    padding: 10
  },
  statusLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900"
  },
  statusValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4
  },
  softButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint
  },
  softButtonText: {
    color: colors.greenDeep,
    fontSize: 14,
    fontWeight: "900"
  },
  darkButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink
  },
  darkButtonText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "900"
  },
  liveGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  infoPill: {
    flex: 1,
    minHeight: 110,
    borderRadius: 22,
    padding: 14,
    backgroundColor: "#F3F8FF",
    borderWidth: 1,
    borderColor: "#DDEBFA"
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  infoValue: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 7
  },
  infoCaption: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 6
  },
  neighborhoodPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 17,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)",
    marginTop: 14,
    ...shadow
  },
  neighborhoodHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  neighborhoodHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  neighborhoodEyebrow: {
    alignSelf: "flex-start",
    color: "#FF8A00",
    backgroundColor: "rgba(255,138,0,0.12)",
    overflow: "hidden",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  neighborhoodTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 8
  },
  neighborhoodSubcopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 5
  },
  neighborhoodWriteButton: {
    minHeight: 42,
    borderRadius: 18,
    backgroundColor: "#FFC233",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...sunsetGlow
  },
  neighborhoodWriteText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  neighborhoodStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  neighborhoodStat: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 10,
    justifyContent: "center"
  },
  neighborhoodStatLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900"
  },
  neighborhoodStatValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4
  },
  neighborhoodCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  neighborhoodChip: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.18)",
    backgroundColor: "#FFFDF6",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  neighborhoodChipActive: {
    backgroundColor: "#FFC233",
    borderColor: "#FFC233"
  },
  neighborhoodChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  neighborhoodChipTextActive: {
    color: colors.ink
  },
  neighborhoodComposer: {
    backgroundColor: "#FFF7DF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)",
    padding: 13,
    marginTop: 14
  },
  neighborhoodComposerTitle: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  neighborhoodDraftCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 11
  },
  neighborhoodDraftChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.18)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  neighborhoodDraftChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  neighborhoodDraftChipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  neighborhoodDraftChipTextActive: {
    color: "#FFFFFF"
  },
  neighborhoodInput: {
    minHeight: 48,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.18)",
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 10
  },
  neighborhoodTextarea: {
    minHeight: 86,
    textAlignVertical: "top"
  },
  neighborhoodSubmitButton: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: "#FF8A00",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
    ...sunsetGlow
  },
  neighborhoodSubmitButtonDisabled: {
    opacity: 0.45
  },
  neighborhoodSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  neighborhoodStatusText: {
    color: "#A16207",
    backgroundColor: "#FFF7DF",
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 12
  },
  neighborhoodFeed: {
    gap: 10,
    marginTop: 14
  },
  neighborhoodPostCard: {
    backgroundColor: "#FFFDF6",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 13
  },
  neighborhoodPostTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  neighborhoodPostMainTap: {
    flex: 1,
    minWidth: 0
  },
  neighborhoodPostMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  neighborhoodMoreButton: {
    width: 34,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)"
  },
  neighborhoodMoreText: {
    color: "#8A5A00",
    fontSize: 17,
    lineHeight: 18,
    fontWeight: "900"
  },
  neighborhoodPostCategory: {
    color: "#FF8A00",
    backgroundColor: "rgba(255,138,0,0.12)",
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  neighborhoodPostArea: {
    flex: 1,
    minWidth: 0,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  neighborhoodPostTitle: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 9
  },
  neighborhoodPostBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 5
  },
  neighborhoodActionSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    padding: 10,
    marginTop: 12,
    ...shadow
  },
  neighborhoodActionSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E7C8"
  },
  neighborhoodActionSheetTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  neighborhoodActionClose: {
    borderRadius: 13,
    backgroundColor: "#FFF7DF",
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  neighborhoodActionCloseText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  neighborhoodSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F7EED8"
  },
  neighborhoodSheetRowDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 11
  },
  neighborhoodSheetIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: "center",
    lineHeight: 30,
    overflow: "hidden",
    color: "#8A5A00",
    backgroundColor: "#FFF1BD",
    fontSize: 14,
    fontWeight: "900"
  },
  neighborhoodSheetCopy: {
    flex: 1,
    minWidth: 0
  },
  neighborhoodSheetTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  neighborhoodSheetTitleDanger: {
    color: "#D83A1E",
    fontSize: 13,
    fontWeight: "900"
  },
  neighborhoodSheetCaption: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 3
  },
  neighborhoodPostFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12
  },
  neighborhoodAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
    minWidth: 0
  },
  neighborhoodAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFC233"
  },
  neighborhoodAvatarText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  neighborhoodAuthor: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  neighborhoodActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  neighborhoodLikeButton: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  neighborhoodLikeButtonActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  neighborhoodLikeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  neighborhoodLikeTextActive: {
    color: "#FFFFFF"
  },
  neighborhoodCommentText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  neighborhoodCommentButton: {
    minHeight: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  neighborhoodCommentsPanel: {
    backgroundColor: "#FFF7DF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 11,
    marginTop: 12,
    gap: 9
  },
  neighborhoodCommentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  neighborhoodCommentBlock: {
    gap: 8
  },
  neighborhoodCommentAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE3A6",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)"
  },
  neighborhoodCommentAvatarText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  neighborhoodCommentBubble: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.10)"
  },
  neighborhoodCommentTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  neighborhoodCommentAuthor: {
    flex: 1,
    minWidth: 0,
    color: "#8A5A00",
    fontSize: 10,
    fontWeight: "900"
  },
  neighborhoodCommentMoreButton: {
    width: 28,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF"
  },
  neighborhoodCommentMoreText: {
    color: "#8A5A00",
    fontSize: 14,
    lineHeight: 15,
    fontWeight: "900"
  },
  neighborhoodCommentBody: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 3
  },
  neighborhoodCommentActionSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    padding: 10,
    marginLeft: 34
  },
  neighborhoodNoCommentText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800"
  },
  neighborhoodCommentComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8
  },
  neighborhoodCommentInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 88,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    paddingHorizontal: 11,
    paddingVertical: 9,
    textAlignVertical: "top"
  },
  neighborhoodCommentSubmit: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: "#FFC233",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  neighborhoodCommentSubmitDisabled: {
    opacity: 0.45
  },
  neighborhoodCommentSubmitText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  neighborhoodEmpty: {
    borderRadius: 18,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 14,
    marginTop: 14
  },
  neighborhoodEmptyTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  neighborhoodEmptyCopy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 5
  },
  neighborhoodDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 12,
    ...shadow
  },
  neighborhoodDetailMoreButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)"
  },
  neighborhoodDetailActionSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    padding: 12,
    marginTop: 12,
    ...shadow
  },
  neighborhoodDetailPost: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 17,
    marginTop: 12,
    ...shadow
  },
  neighborhoodDetailTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "900",
    marginTop: 12
  },
  neighborhoodDetailBody: {
    color: "#4B5563",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "800",
    marginTop: 12
  },
  neighborhoodDetailAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: "#F3E7C8",
    paddingTop: 13,
    marginTop: 15
  },
  neighborhoodDetailAuthorCopy: {
    flex: 1,
    minWidth: 0
  },
  neighborhoodDetailAuthorSub: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3
  },
  neighborhoodDetailActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 14
  },
  neighborhoodDetailLikeButton: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  neighborhoodDetailComments: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 14,
    gap: 10,
    marginTop: 12
  },
  neighborhoodDetailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  neighborhoodDetailSectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  neighborhoodRealtimeText: {
    flexShrink: 1,
    color: "#9A6A16",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "right"
  },
  neighborhoodDetailEmptyComment: {
    backgroundColor: "#FFF7DF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.12)",
    padding: 13
  },
  neighborhoodDetailComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    padding: 10,
    marginTop: 12,
    marginBottom: 10,
    ...shadow
  },
  neighborhoodDetailCommentInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 104,
    borderRadius: 18,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top"
  },
  neighborhoodDetailCommentSubmit: {
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: "#FFC233",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  upcomingPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 17,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    marginTop: 14,
    ...shadow
  },
  upcomingHeader: {
    gap: 6
  },
  upcomingEyebrow: {
    alignSelf: "flex-start",
    color: "#FFC233",
    backgroundColor: "rgba(255,194,51,0.13)",
    overflow: "hidden",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  upcomingTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900"
  },
  upcomingCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800"
  },
  meetupHero: {
    backgroundColor: "#FFF3C4",
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.20)"
  },
  meetupHeroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  meetupBadge: {
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "900"
  },
  meetupSearchBox: {
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    marginTop: 12
  },
  meetupSearchIcon: {
    color: "#FFC233",
    fontSize: 14,
    fontWeight: "900"
  },
  meetupSearchText: {
    flex: 1,
    minWidth: 0,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  meetupAccessRow: {
    borderRadius: 16,
    backgroundColor: "rgba(255,194,51,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 10
  },
  meetupAccessText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  filterSection: {
    marginTop: 14
  },
  filterSectionTitle: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    marginLeft: 2
  },
  filterChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    backgroundColor: "#FFF7DF",
    paddingHorizontal: 13,
    paddingVertical: 9
  },
  filterChipActive: {
    backgroundColor: "#FFC233",
    borderColor: "#FFC233"
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  filterTextActive: {
    color: colors.ink
  },
  upcomingEventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    marginTop: 12
  },
  upcomingEventCardFeatured: {
    backgroundColor: "#FFF3C4",
    borderColor: "rgba(255,194,51,0.25)"
  },
  upcomingEventCardCreated: {
    borderColor: "#FFC233",
    borderWidth: 2,
    backgroundColor: "#FFF7DF"
  },
  upcomingEventCardAttending: {
    borderColor: "#FFC233",
    backgroundColor: "#FFF1BD"
  },
  meetupCardPhoto: {
    width: "100%",
    height: 142,
    borderRadius: 18,
    backgroundColor: "#FFF7DF",
    marginBottom: 12
  },
  featuredMeetupCard: {
    backgroundColor: "#FFF3C4",
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    marginTop: 12
  },
  featuredLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 3
  },
  featuredLabel: {
    color: "#FFC233",
    fontSize: 12,
    fontWeight: "900"
  },
  featuredSource: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right"
  },
  eventCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  meetupCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11
  },
  eventDateBox: {
    width: 54,
    minHeight: 58,
    borderRadius: 17,
    backgroundColor: "#FFC233",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8
  },
  eventDateDay: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  eventDateTime: {
    color: "#FFF3C4",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4
  },
  eventCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  eventVenue: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 5
  },
  meetupGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10
  },
  meetupGroupName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  meetupDot: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  meetupGroupMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 10
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 1
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,194,51,0.16)",
    borderWidth: 2,
    borderColor: "#EBD8A6",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#FFC233",
    fontSize: 11,
    fontWeight: "900"
  },
  attendeeText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  eventInfoGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  eventMetric: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    padding: 10,
    justifyContent: "center"
  },
  eventMetricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900"
  },
  eventMetricValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5
  },
  eventEmpty: {
    backgroundColor: "#FFF7DF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    marginTop: 12
  },
  eventEmptyTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  eventEmptyCopy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 5
  },
  createdMeetupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 20,
    backgroundColor: "rgba(255,194,51,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.34)",
    padding: 12,
    marginTop: 12
  },
  createdMeetupIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFC233"
  },
  createdMeetupIconText: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  createdMeetupCopy: {
    flex: 1,
    minWidth: 0
  },
  createdMeetupTitle: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "900"
  },
  createdMeetupText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 3
  },
  createdMeetupMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3
  },
  createdMeetupButton: {
    minHeight: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    paddingHorizontal: 12,
    ...sunsetGlow
  },
  createdMeetupButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  loadMoreButton: {
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)",
    marginTop: 12
  },
  loadMoreText: {
    color: "#FFC233",
    fontSize: 13,
    fontWeight: "900"
  },
  actionPanel: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginTop: 14,
    ...shadow
  },
  actionPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 3,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0EC"
  },
  actionPanelTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  actionPanelMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  actionList: {
    gap: 0
  },
  actionRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1EE"
  },
  actionRowActive: {
    backgroundColor: "#F8FFFA",
    marginHorizontal: -6,
    paddingHorizontal: 9,
    borderRadius: 14,
    borderBottomColor: "transparent"
  },
  actionIndex: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F5F2",
    borderWidth: 1,
    borderColor: "#E6E9E2"
  },
  actionIndexActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  actionIndexText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  actionIndexTextActive: {
    color: colors.card
  },
  actionCopy: {
    flex: 1,
    minWidth: 0
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  actionCaption: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4
  },
  actionArrow: {
    color: "#B1B7AF",
    fontSize: 20,
    fontWeight: "900"
  },
  actionArrowActive: {
    color: colors.ink
  },
  assistantBubble: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#FFF7EA",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFE0B1",
    marginTop: 14
  },
  bubbleCopy: {
    flex: 1
  },
  bubbleTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  bubbleText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 5
  },
  mascotMini: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: "#BFE6CF"
  },
  mascotHat: {
    color: colors.greenDeep,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20
  },
  mascotFace: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18
  },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 14,
    ...shadow
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 11
  },
  panelCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800",
    marginTop: 6
  },
  panelPrimaryButton: {
    minHeight: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    marginTop: 12,
    ...sunsetGlow
  },
  panelPrimaryText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "900"
  },
  safetyBox: {
    backgroundColor: "#F4F8FF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DDE9FF",
    marginTop: 10
  },
  safetyTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  safetyCopy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4
  },
  eventCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.18)",
    marginTop: 10,
    ...shadow
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  eventTitleWrap: {
    flex: 1
  },
  eventCategory: {
    alignSelf: "flex-start",
    color: colors.greenDeep,
    backgroundColor: colors.mint,
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  eventTitle: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 7
  },
  upcomingEventTitle: {
    color: colors.ink
  },
  eventTime: {
    color: "#FFF7F0",
    backgroundColor: colors.sunset,
    overflow: "hidden",
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900"
  },
  eventMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  eventMeta: {
    color: colors.muted,
    backgroundColor: "#F8FAF8",
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  eventStatus: {
    color: "#6B21A8",
    backgroundColor: "#F4EFFF",
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  eventStatusClosed: {
    color: "#7C2D12",
    backgroundColor: "#FFE7D1"
  },
  unreadChatPill: {
    color: colors.card,
    backgroundColor: "#FF7A00",
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  eventSource: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 8
  },
  eventSafety: {
    color: "#8A5A00",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 8
  },
  eventActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  eventSoftButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F3"
  },
  eventSoftText: {
    color: "#E11D48",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  eventDarkButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    ...sunsetGlow
  },
  eventDarkButtonDisabled: {
    backgroundColor: "#E5D6B0",
    shadowOpacity: 0,
    elevation: 0
  },
  eventDarkText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  eventDarkTextDisabled: {
    color: "#7A6A4C"
  },
  eventAttendButtonActive: {
    backgroundColor: colors.cyan
  },
  eventAttendTextActive: {
    color: colors.ink
  },
  closeMeetupButton: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },
  hostMeetupActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8
  },
  closeMeetupButtonText: {
    color: "#8A5A00",
    fontSize: 11,
    fontWeight: "900"
  },
  cancelMeetupButton: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: "#FFF0F3",
    borderWidth: 1,
    borderColor: "#FFD2DD",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelMeetupButtonText: {
    color: "#BE123C",
    fontSize: 11,
    fontWeight: "900"
  },
  deleteMeetupButton: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  deleteMeetupButtonText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900"
  },
  attendNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,194,51,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.28)",
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginTop: 10
  },
  attendNoticeText: {
    flex: 1,
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  attendMapLink: {
    minHeight: 30,
    borderRadius: 999,
    backgroundColor: "#FFC233",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  attendMapLinkText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  chatBox: {
    backgroundColor: "#FFF1BD",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBD8A6",
    padding: 12,
    marginTop: 10
  },
  chatTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8
  },
  chatStatus: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 3
  },
  chatRoomBadge: {
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  chatRoomInfo: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 8
  },
  chatToast: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: "#2B1700",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.42)",
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#FF8A00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4
  },
  chatToastTitle: {
    color: "#FFC233",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 3
  },
  chatToastBody: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900"
  },
  chatMemberPill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    paddingHorizontal: 9,
    paddingVertical: 8
  },
  chatMemberRole: {
    color: colors.greenDeep,
    fontSize: 10,
    fontWeight: "900"
  },
  chatMemberName: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3
  },
  chatBubble: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    backgroundColor: colors.card,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    shadowColor: "#B77900",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2
  },
  chatBubbleGrouped: {
    marginTop: 3,
    paddingVertical: 8
  },
  chatBubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: "#FFD43B",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 6
  },
  chatBubbleSystem: {
    alignSelf: "center",
    maxWidth: "92%",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18
  },
  chatSender: {
    color: colors.greenDeep,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 3
  },
  chatSenderMe: {
    color: colors.ink,
    textAlign: "right"
  },
  chatMessageText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  chatMessageTextMe: {
    color: colors.ink
  },
  chatTimeText: {
    color: "rgba(67,81,95,0.62)",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    marginTop: 4
  },
  chatTimeTextMe: {
    color: "rgba(43,23,0,0.62)",
    textAlign: "right"
  },
  chatMessage: {
    color: colors.muted,
    backgroundColor: colors.card,
    overflow: "hidden",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 7
  },
  quickQuestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 11
  },
  quickQuestionChip: {
    maxWidth: "100%",
    borderRadius: 999,
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  quickQuestionText: {
    color: colors.greenDeep,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15
  },
  chatInputFake: {
    minHeight: 40,
    borderRadius: 16,
    backgroundColor: "#FFF4D8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9
  },
  chatInputText: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  chatComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 10
  },
  chatComposerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 92,
    borderRadius: 16,
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  chatSendButton: {
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: colors.mintDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13
  },
  chatSendButtonDisabled: {
    opacity: 0.48
  },
  chatSendButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF1BD",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,159,28,0.26)",
    padding: 13,
    ...shadow
  },
  roomBackButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.20)"
  },
  roomBackText: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "900"
  },
  roomHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  roomEyebrow: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  roomTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
    marginTop: 3
  },
  roomMeta: {
    color: "#7A5A00",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 3
  },
  roomInfoGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  roomNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,194,51,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12
  },
  roomNoticeText: {
    flex: 1,
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  roomMapButton: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: "#FFC233",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  roomMapButtonText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  roomChatPanel: {
    minHeight: 320,
    maxHeight: 430,
    borderRadius: 24,
    backgroundColor: "#F7E5B4",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    padding: 13,
    marginTop: 12
  },
  roomChatScroll: {
    maxHeight: 404
  },
  roomChatScrollContent: {
    paddingBottom: 8
  },
  roomEmptyChat: {
    minHeight: 150,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
    padding: 18
  },
  roomEmptyChatTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center"
  },
  roomEmptyChatCopy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6
  },
  roomComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1D9A8",
    padding: 8
  },
  roomActionStatus: {
    color: "#E11D48",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 10
  },
  roomComposerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 15,
    backgroundColor: "#FFF7DF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  roomSendButton: {
    minWidth: 56,
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...sunsetGlow
  },
  roomSendButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  meetupForm: {
    backgroundColor: "#F7FFF9",
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: "#BFE8CF",
    marginTop: 10
  },
  meetupLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  meetupLabelWithGap: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 12
  },
  meetupCategoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 12
  },
  meetupCategoryChip: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: 18,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E2ECE2",
    paddingHorizontal: 11,
    paddingVertical: 10
  },
  meetupCategoryChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  meetupCategoryLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  meetupCategoryLabelActive: {
    color: colors.card
  },
  meetupCategoryCopy: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3
  },
  meetupCategoryCopyActive: {
    color: "#D8E7DD"
  },
  meetupInput: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 12,
    marginTop: 9
  },
  meetupPhotoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 9
  },
  meetupPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8"
  },
  meetupPhotoPlaceholderText: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  meetupPhotoPreview: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: "#FFF4D8"
  },
  meetupPhotoPreviewWrap: {
    position: "relative"
  },
  meetupPhotoRemoveButton: {
    position: "absolute",
    right: -6,
    top: -6,
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F3",
    borderWidth: 1,
    borderColor: "#FDB5C4"
  },
  meetupPhotoRemoveText: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "900"
  },
  meetupPhotoStatusText: {
    color: "#E11D48",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 8
  },
  meetupDatePickerGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 9
  },
  meetupPickerField: {
    flex: 1,
    minWidth: 0
  },
  meetupPickerLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6
  },
  meetupPickerInputFallback: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 12
  },
  meetupSelectedDateText: {
    color: colors.greenDeep,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 8
  },
  meetupDetailGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  meetupDetailField: {
    flex: 1,
    minWidth: 0
  },
  filePickerFallback: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  filePickerFallbackText: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  meetupHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 7
  },
  createMeetupButton: {
    minHeight: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    marginTop: 10,
    ...sunsetGlow
  },
  createMeetupButtonDisabled: {
    opacity: 0.58
  },
  createMeetupText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900"
  },
  checkItem: {
    borderRadius: 18,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E8EFE6",
    padding: 13,
    marginTop: 8
  },
  checkItemDanger: {
    backgroundColor: "#FFF1E8",
    borderColor: "#FFD0BF"
  },
  checkTitle: {
    color: colors.greenDeep,
    fontSize: 13,
    fontWeight: "900"
  },
  checkTitleDanger: {
    color: colors.coral
  },
  checkCopy: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 5
  },
  routeLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#F8FAF8",
    padding: 12,
    marginTop: 8
  },
  routeLabel: {
    minWidth: 38,
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  routeValue: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  grabTips: {
    marginTop: 3
  },
  searchOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAF8",
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E8EFE6",
    marginTop: 9
  },
  searchCopy: {
    flex: 1
  },
  searchTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  searchSub: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 4
  },
  searchOpen: {
    color: colors.card,
    backgroundColor: colors.mintDark,
    overflow: "hidden",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "900"
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAF8",
    borderRadius: 18,
    padding: 12,
    marginTop: 8
  },
  hotplaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFDF8",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EFE4D6",
    marginTop: 9
  },
  hotplaceRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.orange
  },
  hotplaceRankText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "900"
  },
  hotplaceReason: {
    color: colors.greenDeep,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 5
  },
  placeNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mintDark
  },
  placeNumberText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "900"
  },
  placeCopy: {
    flex: 1
  },
  placeName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  placeMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  placeOpen: {
    color: colors.card,
    backgroundColor: colors.ink,
    overflow: "hidden",
    borderRadius: 13,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  amountRow: {
    flexDirection: "row",
    gap: 8
  },
  amountButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: colors.line
  },
  amountButtonActive: {
    backgroundColor: colors.mint,
    borderColor: colors.mintDark
  },
  amountText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  amountTextActive: {
    color: colors.greenDeep
  },
  exchangeResult: {
    borderRadius: 20,
    backgroundColor: "#FFF4CC",
    padding: 15,
    marginTop: 12
  },
  exchangeLabel: {
    color: "#7C5B00",
    fontSize: 12,
    fontWeight: "900"
  },
  exchangeValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6
  },
  emergencyLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF1E8",
    borderRadius: 16,
    padding: 13,
    marginTop: 8
  },
  emergencyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  emergencyNumber: {
    color: colors.coral,
    fontSize: 16,
    fontWeight: "900"
  },
  emergencyPhrase: {
    borderRadius: 18,
    backgroundColor: "#F8FAF8",
    padding: 13,
    marginTop: 8
  },
  emergencyPhraseLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  emergencyPhraseText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 5
  },
  emergencyPhraseSub: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4
  }
});
