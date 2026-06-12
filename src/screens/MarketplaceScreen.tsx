import { createElement, useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { CommunitySafetyActions } from "../components/CommunitySafetyActions";
import { Header } from "../components/Header";
import { hasSupabaseSession, isSupabaseConfigured, isSupabaseStorageDataUrl, subscribeSupabaseInserts, supabaseInsert, supabasePatchById, supabaseSelect, supabaseUploadDataUrl, supabaseUploadFile, supabaseUpsert } from "../services/supabaseClient";
import { loadBlockedTargetIds } from "../storage/communitySafety";
import { colors, neonShadow, shadow, sunsetGlow } from "../styles/theme";
import type { Destination, PlannerInput } from "../types";

type MarketplaceScreenProps = {
  input: PlannerInput;
  memberId?: string;
  memberName?: string;
  memberTemperature: number;
  entryMode?: "all" | "trading";
  onRequireAuth: () => void;
};

type MarketViewMode = "all" | "selling" | "trading" | "reviews" | "help";

type MarketItem = {
  id: string;
  city?: Destination;
  title: string;
  price: string;
  area: string;
  status: string;
  seller: string;
  note: string;
  tags: string[];
  photo?: string;
  photos?: string[];
  sellerTemp?: number;
  sellerBadge?: string;
  sellerMemberName?: string;
  sellerAuthUid?: string;
};

type MarketDraft = {
  title: string;
  category: string;
  condition: string;
  price: string;
  photo: string;
  photos: string[];
  description: string;
  location: string;
  contact: string;
};

type SelectedPhotoFile = {
  blob: Blob;
  name: string;
  type: string;
  previewUri: string;
};

type MarketChatMessage = {
  id: string;
  sender: "seller" | "buyer" | "system";
  text: string;
  authorId?: string;
  createdAt?: string;
};

type TradeInquiryStatus = "inquiry" | "completed" | "reviewed";
type TradeRealtimeStatus = "local" | "connecting" | "live" | "error";

type TradeInquiry = {
  id: string;
  itemId: string;
  buyerName: string;
  sellerName: string;
  buyerAuthUid?: string;
  status: TradeInquiryStatus;
  createdAt: string;
  completedAt?: string;
  reviewedAt?: string;
};

type TradeRating = "good" | "ok" | "bad";

type TradeReview = {
  itemId: string;
  threadId: string;
  buyerName: string;
  rating: TradeRating;
  sellerDelta: number;
  memberDelta: number;
  completedAt: string;
};

type SupabaseMarketItemRow = {
  id: string;
  seller_auth_uid?: string;
  seller_name: string;
  city?: string;
  title: string;
  description: string;
  location: string;
  price_label: string;
  contact?: string | null;
  image_uri?: string | null;
  status: string;
  created_at?: string;
};

type SupabaseMarketInquiryRow = {
  id: string;
  item_id: string;
  buyer_auth_uid: string;
  buyer_name: string;
  status: string;
  created_at: string;
};

type SupabaseMarketMessageRow = {
  id: string;
  inquiry_id: string;
  auth_uid: string;
  nickname: string;
  message: string;
  created_at: string;
};

type SupabaseTradeReviewRow = {
  id: string;
  item_id: string;
  seller_auth_uid: string;
  buyer_auth_uid: string;
  reviewer_auth_uid: string;
  score: number;
  tags?: string[];
  comment?: string | null;
  created_at?: string;
};

function getTradeRealtimeStatusCopy(status: TradeRealtimeStatus) {
  if (status === "live") return "실시간 거래방 연결됨";
  if (status === "connecting") return "실시간 거래방 연결 중";
  if (status === "error") return "실시간 연결 불안정 · 새로고침하면 다시 동기화돼요";
  return "현재 기기 기준 대화";
}

const tradingMarketStorageKey = "tripbuddy-trading-market-items-v1";
const localMarketItemsStorageKey = "tripbuddy-local-market-items-v1";
const marketChatStorageKey = "tripbuddy-market-chat-messages-v1";
const tradeInquiryStorageKey = "tripbuddy-market-trade-inquiries-v1";
const completedTradeStorageKey = "tripbuddy-completed-market-threads-v1";
const tradeReviewStorageKey = "tripbuddy-trade-reviews-v1";
const marketDestinations: Destination[] = ["호치민", "다낭", "나트랑", "하노이", "달랏", "푸꾸옥"];
const marketPhotoBucket = "mangomap-market-images";
const maxMarketPhotoBytes = 4 * 1024 * 1024;
const maxMarketPhotoCount = 10;
const marketCategoryOptions = [
  "패션의류",
  "화장품",
  "뷰티",
  "출산/유아품",
  "전자제품",
  "가구/인테리어",
  "게임",
  "리빙/생활",
  "반려동물/취미",
  "도서",
  "티켓",
  "여행",
  "오토바이",
  "무료나눔"
];
const marketConditionOptions = ["새상품", "사용감 적음", "사용감 있음", "확인 필요"];
const marketCategoryFilterOptions = ["전체", ...marketCategoryOptions];
const tradePraiseOptions = ["친절하고 매너가 좋아요", "시간 약속을 잘 지켜요", "응답이 빨라요"];
type MarketPriceUnit = "동" | "원" | "협의";

function getSubmitFailureMessage(error: unknown, fallback: string) {
  const detail = error instanceof Error ? error.message : "";
  if (/jwt expired|invalid jwt|expired/i.test(detail)) {
    return "로그인 시간이 만료됐어요. 한 번만 다시 로그인하면 거래 대화 저장이 이어져요.";
  }
  if (/row-level security|violates row-level security/i.test(detail)) {
    return "서버 저장 권한 정책이 막고 있어요. Supabase SQL Editor에서 market_items RLS 수정 SQL을 한 번 실행해야 다른 브라우저에도 보여요.";
  }
  return detail ? `${fallback} (${detail})` : fallback;
}

function formatMarketPriceLabel(value: string, unit: MarketPriceUnit) {
  if (unit === "협의") return "가격협의";
  const normalized = value.trim();
  if (!normalized) return "가격협의";
  const digitsOnly = normalized.replace(/[^\d]/g, "");
  if (digitsOnly && digitsOnly.length === normalized.replace(/[,.\s]/g, "").length) {
    return `${Number(digitsOnly).toLocaleString("ko-KR")}${unit}`;
  }
  if (normalized.includes("동") || normalized.includes("원")) return normalized;
  return `${normalized}${unit}`;
}

const marketItemsByDestination: Record<Destination, MarketItem[]> = {
  호치민: [
    {
      id: "hcm-sim",
      title: "비엣텔 데이터 유심",
      price: "60,000동",
      area: "1군",
      status: "오늘 가능",
      seller: "1군 여행자",
      sellerTemp: 39.2,
      sellerBadge: "응답 빠름",
      note: "개통 확인했고 데이터 4일 정도 남아 있어요. 동행자용이나 서브폰용으로 쓰기 좋아요.",
      tags: ["유심", "데이터", "직거래"]
    },
    {
      id: "hcm-rain",
      title: "우비 2개 + 휴대용 방수팩",
      price: "40,000동",
      area: "벤탄시장",
      status: "가격내림",
      seller: "내일 출국",
      sellerTemp: 37.8,
      sellerBadge: "시간 정확",
      note: "스콜 대비용으로 샀고 한 번만 사용했어요.",
      tags: ["우비", "방수", "출국정리"]
    },
    {
      id: "hcm-adapter",
      title: "멀티 어댑터 + C타입 케이블",
      price: "70,000동",
      area: "타오디엔",
      status: "상태좋음",
      seller: "장기여행자",
      sellerTemp: 41.1,
      sellerBadge: "거래 후기 좋음",
      note: "한국 플러그와 USB-C를 같이 쓸 수 있는 여행용 세트예요.",
      tags: ["충전", "어댑터", "케이블"]
    }
  ],
  다낭: [
    {
      id: "danang-ticket",
      title: "바나힐 셔틀 왕복권 1장",
      price: "180,000동",
      area: "미케비치",
      status: "오늘 가능",
      seller: "미케비치 숙소",
      sellerTemp: 38.5,
      sellerBadge: "현장 확인",
      note: "일정 변경으로 넘겨요. 예약자명 변경 가능 여부 먼저 확인 필요.",
      tags: ["투어권", "바나힐", "확인필수"]
    },
    {
      id: "danang-pack",
      title: "방수팩 2개 + 미니 선풍기",
      price: "65,000동",
      area: "한시장",
      status: "묶음",
      seller: "공항 가는 중",
      sellerTemp: 36.9,
      sellerBadge: "신규 판매",
      note: "호이안 야시장, 해변 이동할 때 챙기기 좋아요.",
      tags: ["해변", "방수", "선풍기"]
    }
  ],
  나트랑: [
    {
      id: "nhatrang-waterproof",
      title: "스노클링 방수팩 2개",
      price: "50,000동",
      area: "쩐푸 해변",
      status: "오늘 가능",
      seller: "호핑투어 종료",
      sellerTemp: 40.4,
      sellerBadge: "친절 거래",
      note: "물샘 없는지 현장에서 같이 확인 가능해요.",
      tags: ["호핑", "방수팩", "해변"]
    },
    {
      id: "nhatrang-cash",
      title: "남은 베트남 동 소액 교환",
      price: "환율협의",
      area: "나트랑 센터",
      status: "소액",
      seller: "체크아웃 전",
      sellerTemp: 37.4,
      sellerBadge: "소액 거래",
      note: "택시비나 간식 살 정도만 필요한 분에게 좋아요.",
      tags: ["환전", "소액", "현금"]
    }
  ],
  하노이: [
    {
      id: "hanoi-pillow",
      title: "하롱베이 투어 목베개",
      price: "45,000동",
      area: "올드쿼터",
      status: "상태좋음",
      seller: "올드쿼터",
      sellerTemp: 39.7,
      sellerBadge: "상태 설명 꼼꼼",
      note: "장거리 버스에서 한 번 사용했어요. 커버 분리 세탁 가능.",
      tags: ["투어", "목베개", "장거리"]
    },
    {
      id: "hanoi-umbrella",
      title: "접이식 우산 + 손난로",
      price: "55,000동",
      area: "호안끼엠",
      status: "오늘 가능",
      seller: "서호 이동 전",
      sellerTemp: 36.8,
      sellerBadge: "오늘 거래",
      note: "하노이 비 오는 날 산책용으로 챙기기 좋아요.",
      tags: ["우산", "비오는날", "산책"]
    }
  ],
  달랏: [
    {
      id: "dalat-jacket",
      title: "얇은 바람막이 L",
      price: "90,000동",
      area: "달랏 야시장",
      status: "급처",
      seller: "내일 이동",
      note: "달랏 저녁에 딱 좋아요. 저녁 거래 희망.",
      tags: ["겉옷", "야시장", "저녁"]
    },
    {
      id: "dalat-holder",
      title: "오토바이 휴대폰 거치대",
      price: "80,000동",
      area: "쑤언흐엉 호수",
      status: "상태좋음",
      seller: "카페투어 끝",
      note: "렌트 바이크 지도 볼 때 편했어요. 고정 상태 확인 가능.",
      tags: ["바이크", "지도", "거치대"]
    }
  ],
  푸꾸옥: [
    {
      id: "phuquoc-sun",
      title: "선크림 새 제품 + 알로에젤",
      price: "120,000동",
      area: "롱비치",
      status: "미개봉",
      seller: "롱비치 숙소",
      note: "여분으로 산 제품이라 해변 일정 있는 분에게 좋아요.",
      tags: ["해변", "선크림", "새제품"]
    },
    {
      id: "phuquoc-pickup",
      title: "공항 픽업 예약 양도",
      price: "협의",
      area: "즈엉동",
      status: "시간조율",
      seller: "선셋타운 이동",
      note: "예약 변경 가능 여부를 기사와 같이 확인하고 넘길게요.",
      tags: ["공항", "이동", "확인필수"]
    }
  ]
};

function PhotoFilePicker({
  compact,
  count,
  onPick,
  onError
}: {
  compact?: boolean;
  count: number;
  onPick: (photos: SelectedPhotoFile[]) => void;
  onError: (message: string) => void;
}) {
  if (Platform.OS !== "web") {
    return (
      <View style={[styles.filePickerFallback, compact && styles.filePickerFallbackCompact]}>
        <Text style={styles.filePickerFallbackText}>카메라 {count}/{maxMarketPhotoCount}</Text>
      </View>
    );
  }

  const handleChange = (event: { target?: { files?: FileList; value?: string } }) => {
      const files = Array.from(event.target?.files ?? []).slice(0, maxMarketPhotoCount);
      if (files.length === 0) return;
      if (files.some((file) => file.size > maxMarketPhotoBytes)) {
        onError("사진은 4MB 이하만 올릴 수 있어요.");
        if (event.target) event.target.value = "";
        return;
      }
      const finishPick = (photos: SelectedPhotoFile[]) => {
        onError("");
        onPick(photos);
      };
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        finishPick(files.map((file) => ({
          blob: file,
          name: file.name,
          type: file.type || "image/jpeg",
          previewUri: URL.createObjectURL(file)
        })));
      } else {
        Promise.all(files.map((file) => new Promise<SelectedPhotoFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            blob: file,
            name: file.name,
            type: file.type || "image/jpeg",
            previewUri: String(reader.result ?? "")
          });
          reader.readAsDataURL(file);
        }))).then(finishPick);
      }
      if (event.target) event.target.value = "";
  };

  return createElement("label", {
    style: {
      width: compact ? 112 : "100%",
      minHeight: compact ? 38 : 46,
      borderRadius: compact ? 999 : 16,
      border: "1px solid #F6C765",
      background: compact ? "#FFF7DF" : "#FFFFFF",
      color: "#10231C",
      fontWeight: 900,
      fontSize: compact ? 12 : 13,
      padding: compact ? "8px 10px" : "10px 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      cursor: "pointer",
      boxSizing: "border-box",
      boxShadow: compact ? "0 8px 18px rgba(255, 194, 51, 0.14)" : "none"
    }
  }, [
    createElement("input", {
      key: "input",
      type: "file",
      accept: "image/*",
      multiple: true,
      onChange: handleChange,
      style: { display: "none" }
    }),
    createElement("span", { key: "camera", style: { fontWeight: 900 } }, "카메라"),
    createElement("span", { key: "count", style: { color: "#6B7280", fontWeight: 900 } }, `${count}/${maxMarketPhotoCount}`)
  ]);
}

function getSellerTemperature(item: MarketItem) {
  if (typeof item.sellerTemp === "number") return item.sellerTemp;
  return 36.5;
}

function getSellerBadge(item: MarketItem) {
  if (item.sellerBadge) return item.sellerBadge;
  const temp = getSellerTemperature(item);
  if (temp >= 40) return "후기 좋음";
  if (temp >= 38) return "응답 안정";
  if (temp >= 37) return "거래 가능";
  return "신규 판매";
}

function getMarketItemPhoto(item: MarketItem) {
  const firstPhoto = item.photos?.find((photo) => photo.trim());
  if (firstPhoto) return firstPhoto.trim();
  if (item.photo?.trim()) return item.photo.trim();
  return `https://picsum.photos/seed/tripbuddy-${encodeURIComponent(item.id)}/240/240`;
}

function getMarketItemPhotos(item: MarketItem) {
  const photos = item.photos?.filter((photo) => photo.trim()) ?? [];
  if (photos.length > 0) return photos;
  return item.photo?.trim() ? [item.photo.trim()] : [];
}

function getTemperatureTone(temp: number) {
  if (temp >= 40) return "#0E9F6E";
  if (temp >= 38) return "#00BFB4";
  if (temp >= 37) return "#C58A00";
  return "#6B7280";
}

function getTemperatureProgress(temp: number) {
  return Math.max(8, Math.min(100, ((temp - 30) / 25) * 100));
}

function isMarketItemInCategory(item: MarketItem, category: string) {
  if (category === "전체") return true;
  const normalized = category.replace(/\s/g, "");
  const haystack = [item.title, item.note, item.status, ...item.tags].join(" ").replace(/\s/g, "");
  return haystack.includes(normalized);
}

function roundTemperature(value: number) {
  return Math.round(value * 10) / 10;
}

function getTradeRatingCopy(rating: TradeRating) {
  if (rating === "good") return "좋았어요";
  if (rating === "ok") return "보통이에요";
  return "문제가 있었어요";
}

function getTradeTemperatureDeltas(rating: TradeRating) {
  if (rating === "good") return { sellerDelta: 0.4, memberDelta: 0.2 };
  if (rating === "ok") return { sellerDelta: 0.1, memberDelta: 0.1 };
  return { sellerDelta: -0.7, memberDelta: -0.2 };
}

function getAdjustedSellerTemperature(item: MarketItem, review?: TradeReview) {
  return roundTemperature(getSellerTemperature(item) + (review?.sellerDelta ?? 0));
}

function getAdjustedSellerBadge(item: MarketItem, review?: TradeReview) {
  if (!review) return getSellerBadge(item);
  if (review.rating === "good") return "거래 평가 좋음";
  if (review.rating === "ok") return "거래 완료";
  return "주의 평가";
}

function isOwnMarketItem(item: MarketItem, memberName?: string) {
  return Boolean(memberName && item.sellerMemberName && item.sellerMemberName === memberName);
}

function getMarketSellerBlockIds(item: MarketItem) {
  return [item.sellerAuthUid, item.sellerMemberName, item.seller].filter(Boolean) as string[];
}

function getTradeThreadId(itemId: string, buyerName: string) {
  return `${itemId}__${encodeURIComponent(buyerName)}`;
}

function getTradeInquiryStatusLabel(status: TradeInquiryStatus) {
  if (status === "reviewed") return "평가 완료";
  if (status === "completed") return "평가 대기";
  return "문의중";
}

function getLatestItemReview(itemId: string, inquiries: TradeInquiry[], reviews: Record<string, TradeReview>) {
  const threadIds = inquiries.filter((inquiry) => inquiry.itemId === itemId).map((inquiry) => inquiry.id);
  return threadIds.map((threadId) => reviews[threadId]).find(Boolean);
}

function createEmptyLocalMarketItems(): Record<Destination, MarketItem[]> {
  return {
    호치민: [],
    다낭: [],
    나트랑: [],
    하노이: [],
    달랏: [],
    푸꾸옥: []
  };
}

function isMarketItem(value: unknown): value is MarketItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MarketItem>;
  return Boolean(
    typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.price === "string" &&
      typeof item.area === "string" &&
      typeof item.status === "string" &&
      typeof item.seller === "string" &&
      typeof item.note === "string" &&
      Array.isArray(item.tags)
  );
}

function parseMarketImageUris(value?: string | null) {
  if (!value?.trim()) return [];
  const rawValue = value.trim();
  if (rawValue.startsWith("[")) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    } catch {
      return [rawValue];
    }
  }
  return [rawValue];
}

function serializeMarketImageUris(photos: string[]) {
  const values = photos.filter((photo) => photo.trim());
  if (values.length === 0) return null;
  return values.length === 1 ? values[0] : JSON.stringify(values);
}

function isMarketChatMessage(value: unknown): value is MarketChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<MarketChatMessage>;
  return Boolean(
    typeof message.id === "string" &&
      typeof message.text === "string" &&
      (message.sender === "seller" || message.sender === "buyer" || message.sender === "system")
  );
}

function fromSupabaseMarketItem(row: SupabaseMarketItemRow): MarketItem {
  const photos = parseMarketImageUris(row.image_uri);
  return {
    id: row.id,
    city: row.city as Destination | undefined,
    title: row.title,
    price: row.price_label,
    area: row.location,
    status: row.status === "sold" ? "거래완료" : row.status === "reserved" ? "예약중" : row.status === "cancelled" ? "판매취소" : "판매중",
    seller: row.seller_name,
    sellerMemberName: row.seller_name,
    sellerAuthUid: row.seller_auth_uid,
    note: row.description,
    tags: [],
    photo: photos[0],
    photos,
    sellerTemp: 36.5,
    sellerBadge: "인증 판매자"
  };
}

function toSupabaseMarketItem(item: MarketItem, draft: MarketDraft, destination: Destination, sellerId: string) {
  const photos = item.photos?.length ? item.photos : item.photo ? [item.photo] : draft.photos;
  return {
    id: item.id,
    seller_auth_uid: sellerId,
    seller_name: item.seller,
    city: destination,
    title: item.title,
    description: item.note,
    location: item.area,
    price_label: item.price,
    contact: null,
    image_uri: serializeMarketImageUris(photos),
    status: item.status === "판매취소" ? "cancelled" : item.status === "거래완료" ? "sold" : item.status === "예약중" ? "reserved" : "selling"
  };
}

async function loadRemoteMarketItems() {
  if (!isSupabaseConfigured()) return [];
  const rows = await supabaseSelect<SupabaseMarketItemRow>("market_items", "select=*&status=neq.deleted&order=created_at.desc");
  return rows.map(fromSupabaseMarketItem);
}

async function loadRemoteMarketInquiries() {
  if (!isSupabaseConfigured()) return [];
  const rows = await supabaseSelect<SupabaseMarketInquiryRow>("market_inquiries", "select=*&order=created_at.desc");
  return rows.map(fromSupabaseMarketInquiry);
}

async function saveRemoteMarketItem(item: MarketItem, draft: MarketDraft, destination: Destination, sellerId: string) {
  if (!isSupabaseConfigured()) return;
  await supabaseUpsert<SupabaseMarketItemRow>("market_items", toSupabaseMarketItem(item, draft, destination, sellerId));
}

function fromSupabaseMarketInquiry(row: SupabaseMarketInquiryRow): TradeInquiry {
  return {
    id: row.id,
    itemId: row.item_id,
    buyerName: row.buyer_name,
    sellerName: "",
    buyerAuthUid: row.buyer_auth_uid,
    status: row.status === "closed" ? "completed" : "inquiry",
    createdAt: row.created_at
  };
}

async function saveRemoteMarketInquiry(inquiry: TradeInquiry, buyerId: string) {
  if (!isSupabaseConfigured()) return;
  await supabaseUpsert<SupabaseMarketInquiryRow>("market_inquiries", {
    id: inquiry.id,
    item_id: inquiry.itemId,
    buyer_auth_uid: buyerId,
    buyer_name: inquiry.buyerName,
    status: inquiry.status === "completed" ? "closed" : "open"
  });
}

async function updateRemoteMarketItemStatus(item: MarketItem, status: "selling" | "reserved" | "cancelled" | "deleted" | "sold", buyerAuthUid?: string) {
  if (!isSupabaseConfigured()) return;
  await supabasePatchById("market_items", item.id, {
    status,
    ...(buyerAuthUid ? { buyer_auth_uid: buyerAuthUid } : {})
  });
}

async function updateRemoteMarketInquiryStatus(inquiry: TradeInquiry, status: "open" | "closed" | "selected_buyer") {
  if (!isSupabaseConfigured()) return;
  await supabasePatchById("market_inquiries", inquiry.id, { status });
}

async function saveRemoteTradeReview(item: MarketItem, inquiry: TradeInquiry, review: TradeReview, reviewerAuthUid: string) {
  if (!isSupabaseConfigured()) return;
  const score = review.rating === "good" ? 5 : review.rating === "ok" ? 4 : 2;
  await supabaseUpsert<SupabaseTradeReviewRow>("trade_reviews", {
    item_id: item.id,
    seller_auth_uid: item.sellerAuthUid ?? item.sellerMemberName ?? item.seller,
    buyer_auth_uid: inquiry.buyerAuthUid ?? inquiry.buyerName,
    reviewer_auth_uid: reviewerAuthUid,
    score,
    tags: [review.rating],
    comment: getTradeRatingCopy(review.rating)
  }, "item_id,reviewer_auth_uid");
}

function mergeTradeInquiries(current: TradeInquiry[], incoming: TradeInquiry[]) {
  const byId = new Map(current.map((inquiry) => [inquiry.id, inquiry]));
  incoming.forEach((inquiry) => {
    const currentInquiry = byId.get(inquiry.id);
    byId.set(inquiry.id, { ...currentInquiry, ...inquiry });
  });
  return Array.from(byId.values()).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function mergeRemoteMarketItemsByDestination(
  current: Record<Destination, MarketItem[]>,
  remoteItems: MarketItem[],
  fallbackDestination: Destination
) {
  const next = { ...current };
  marketDestinations.forEach((destination) => {
    const byId = new Map(next[destination].map((item) => [item.id, item]));
    remoteItems
      .filter((item) => (item.city ?? fallbackDestination) === destination)
      .forEach((item) => {
        const existing = byId.get(item.id);
        byId.set(item.id, { ...existing, ...item });
      });
    next[destination] = Array.from(byId.values());
  });
  return next;
}

function fromSupabaseMarketMessage(row: SupabaseMarketMessageRow, isSeller: boolean, memberId: string, memberName: string): MarketChatMessage {
  const isMine = row.auth_uid === memberId || (!memberId && row.nickname === memberName);
  return {
    id: row.id,
    sender: isMine ? (isSeller ? "seller" : "buyer") : (isSeller ? "buyer" : "seller"),
    text: row.message,
    authorId: row.auth_uid,
    createdAt: row.created_at
  };
}

function formatChatTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours >= 12 ? "오후" : "오전"} ${hours % 12 || 12}:${minutes}`;
}

async function saveRemoteMarketMessage(inquiry: TradeInquiry, message: MarketChatMessage, memberId: string, nickname: string) {
  if (!isSupabaseConfigured()) return undefined;
  return supabaseInsert<SupabaseMarketMessageRow>("market_messages", {
    inquiry_id: inquiry.id,
    auth_uid: memberId,
    nickname,
    message: message.text
  });
}

async function fetchRemoteMarketMessages(inquiry: TradeInquiry, isSeller: boolean, memberId: string, memberName: string) {
  if (!isSupabaseConfigured()) return [];
  const rows = await supabaseSelect<SupabaseMarketMessageRow>(
    "market_messages",
    `select=*&inquiry_id=eq.${encodeURIComponent(inquiry.id)}&order=created_at.asc`
  );
  return rows.map((row) => fromSupabaseMarketMessage(row, isSeller, memberId, memberName));
}

function mergeMarketChatMessages(current: MarketChatMessage[], incoming: MarketChatMessage[]) {
  const merged = [...current];
  incoming.forEach((message) => {
    if (merged.some((item) => item.id === message.id)) return;
    merged.push(message);
  });
  return merged;
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

function readLocalMarketItemsStore() {
  const fallback = createEmptyLocalMarketItems();
  if (Platform.OS !== "web") return fallback;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return fallback;

  try {
    const rawValue = storage.getItem(localMarketItemsStorageKey);
    const value = rawValue ? JSON.parse(rawValue) : {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
    return marketDestinations.reduce<Record<Destination, MarketItem[]>>((result, destination) => {
      const storedItems = (value as Partial<Record<Destination, unknown>>)[destination];
      result[destination] = Array.isArray(storedItems) ? storedItems.filter(isMarketItem) : [];
      return result;
    }, fallback);
  } catch {
    return fallback;
  }
}

function writeLocalMarketItemsStore(values: Record<Destination, MarketItem[]>) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(localMarketItemsStorageKey, JSON.stringify(values));
  } catch {
    // Base64 photos can be large; keep the current session state even if storage is full.
  }
}

function readMarketChatStore() {
  if (Platform.OS !== "web") return {};
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return {};

  try {
    const rawValue = storage.getItem(marketChatStorageKey);
    const value = rawValue ? JSON.parse(rawValue) : {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce<Record<string, MarketChatMessage[]>>((result, [threadId, messages]) => {
      if (Array.isArray(messages)) result[threadId] = messages.filter(isMarketChatMessage);
      return result;
    }, {});
  } catch {
    return {};
  }
}

function writeMarketChatStore(values: Record<string, MarketChatMessage[]>) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(marketChatStorageKey, JSON.stringify(values));
  } catch {
    // Ignore storage limits; the current session still keeps the state.
  }
}

function readTradeInquiryStore() {
  if (Platform.OS !== "web") return [];
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return [];

  try {
    const rawValue = storage.getItem(tradeInquiryStorageKey);
    const value = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is TradeInquiry =>
      Boolean(
        item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.itemId === "string" &&
          typeof item.buyerName === "string" &&
          typeof item.sellerName === "string"
      )
    );
  } catch {
    return [];
  }
}

function writeTradeInquiryStore(values: TradeInquiry[]) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(tradeInquiryStorageKey, JSON.stringify(values));
  } catch {
    // Ignore storage limits; the current session still keeps the state.
  }
}

function readTradeReviewStore() {
  if (Platform.OS !== "web") return {};
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return {};

  try {
    const rawValue = storage.getItem(tradeReviewStorageKey);
    const value = rawValue ? JSON.parse(rawValue) : {};
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, TradeReview>) : {};
  } catch {
    return {};
  }
}

function writeTradeReviewStore(values: Record<string, TradeReview>) {
  if (Platform.OS !== "web") return;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;

  try {
    storage.setItem(tradeReviewStorageKey, JSON.stringify(values));
  } catch {
    // Ignore storage limits; the current session still keeps the state.
  }
}

export function MarketplaceScreen({
  input,
  memberId,
  memberName,
  memberTemperature,
  entryMode = "all",
  onRequireAuth
}: MarketplaceScreenProps) {
  const [selectedDestination, setSelectedDestination] = useState<Destination>(input.destination);
  const [postOpen, setPostOpen] = useState(false);
  const [visibleItemCount, setVisibleItemCount] = useState(5);
  const [activeChatItemId, setActiveChatItemId] = useState<string | null>(null);
  const [activeSellerItemId, setActiveSellerItemId] = useState<string | null>(null);
  const [activeTradeThreadId, setActiveTradeThreadId] = useState<string | null>(null);
  const [postedItemId, setPostedItemId] = useState<string | null>(null);
  const [tradingItemIds, setTradingItemIds] = useState<string[]>(() => readStringArrayStore(tradingMarketStorageKey));
  const [completedTradeItemIds, setCompletedTradeItemIds] = useState<string[]>(() => readStringArrayStore(completedTradeStorageKey));
  const [tradeReviewsByItemId, setTradeReviewsByItemId] = useState<Record<string, TradeReview>>(() => readTradeReviewStore());
  const [chatDraftsByItemId, setChatDraftsByItemId] = useState<Record<string, string>>({});
  const [chatMessagesByItemId, setChatMessagesByItemId] = useState<Record<string, MarketChatMessage[]>>(() => readMarketChatStore());
  const [unreadTradeThreadIds, setUnreadTradeThreadIds] = useState<string[]>([]);
  const [tradeChatToast, setTradeChatToast] = useState<{ id: string; title: string; body: string } | null>(null);
  const [tradeInquiries, setTradeInquiries] = useState<TradeInquiry[]>(() => readTradeInquiryStore());
  const [localItems, setLocalItems] = useState<Record<Destination, MarketItem[]>>(() => readLocalMarketItemsStore());
  const [blockedMarketItemIds, setBlockedMarketItemIds] = useState<string[]>([]);
  const [blockedMarketProfileIds, setBlockedMarketProfileIds] = useState<string[]>([]);
  const [photoStatus, setPhotoStatus] = useState("");
  const [marketPhotoFiles, setMarketPhotoFiles] = useState<SelectedPhotoFile[]>([]);
  const [tradeRealtimeStatus, setTradeRealtimeStatus] = useState<TradeRealtimeStatus>(() => (isSupabaseConfigured() ? "connecting" : "local"));
  const [tradeActionStatus, setTradeActionStatus] = useState("");
  const [marketViewMode, setMarketViewMode] = useState<MarketViewMode>(entryMode === "trading" ? "trading" : "all");
  const [submitting, setSubmitting] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [interestCategory, setInterestCategory] = useState("전체");
  const [priceUnit, setPriceUnit] = useState<MarketPriceUnit>("동");
  const [draft, setDraft] = useState<MarketDraft>({
    title: "",
    category: "여행",
    condition: "사용감 적음",
    price: "",
    photo: "",
    photos: [],
    description: "",
    location: "",
    contact: ""
  });
  const items = [...localItems[selectedDestination], ...marketItemsByDestination[selectedDestination]];
  const allItems = marketDestinations.flatMap((destination) => [...localItems[destination], ...marketItemsByDestination[destination]]);
  const tradeInquiriesRef = useRef(tradeInquiries);
  const marketItemsRef = useRef(allItems);
  const ownMarketItems = allItems.filter((item) => isOwnMarketItem(item, memberName));
  const tradingMarketItems = allItems.filter((item) => tradingItemIds.includes(item.id) || isOwnMarketItem(item, memberName));
  const reviewedMarketItems = allItems.filter((item) => {
    const inquiries = tradeInquiries.filter((inquiry) => inquiry.itemId === item.id);
    return inquiries.some((inquiry) => Boolean(tradeReviewsByItemId[inquiry.id]) || inquiry.status === "reviewed");
  });
  const baseMarketItems =
    entryMode === "trading"
      ? tradingMarketItems
      : marketViewMode === "selling"
        ? ownMarketItems
        : marketViewMode === "trading"
          ? tradingMarketItems
        : marketViewMode === "reviews"
          ? reviewedMarketItems
          : marketViewMode === "help"
            ? []
            : items;
  const visibleMarketItems = baseMarketItems.filter(
    (item) => !blockedMarketItemIds.includes(item.id) && !getMarketSellerBlockIds(item).some((id) => blockedMarketProfileIds.includes(id))
  ).filter((item) => isMarketItemInCategory(item, interestCategory));
  const displayItems = visibleMarketItems;
  const visibleItems = displayItems.slice(0, visibleItemCount);
  const hiddenItemCount = Math.max(0, displayItems.length - visibleItemCount);
  const canSubmit = draft.title.trim().length >= 1 && draft.location.trim().length >= 1 && !submitting;
  const activeChatItem = activeChatItemId ? allItems.find((item) => item.id === activeChatItemId) : undefined;
  const activeSellerItem = activeSellerItemId ? allItems.find((item) => item.id === activeSellerItemId) : undefined;
  const activeTradeThread = activeTradeThreadId ? tradeInquiries.find((inquiry) => inquiry.id === activeTradeThreadId) : undefined;
  const visibleChatMessages = activeTradeThread
    ? (chatMessagesByItemId[activeTradeThread.id] ?? []).filter((message) => !message.authorId || !blockedMarketProfileIds.includes(message.authorId))
    : [];
  const activeChatItemBlocked = activeChatItem
    ? blockedMarketItemIds.includes(activeChatItem.id) || getMarketSellerBlockIds(activeChatItem).some((id) => blockedMarketProfileIds.includes(id))
    : false;
  const activeTradeThreadBlocked = activeTradeThread
    ? blockedMarketProfileIds.includes(activeTradeThread.buyerAuthUid ?? activeTradeThread.buyerName)
    : false;

  useEffect(() => {
    writeStringArrayStore(tradingMarketStorageKey, tradingItemIds);
  }, [tradingItemIds]);

  useEffect(() => {
    if (entryMode === "trading") setMarketViewMode("trading");
  }, [entryMode]);

  useEffect(() => {
    writeStringArrayStore(completedTradeStorageKey, completedTradeItemIds);
  }, [completedTradeItemIds]);

  useEffect(() => {
    writeTradeInquiryStore(tradeInquiries);
  }, [tradeInquiries]);

  useEffect(() => {
    tradeInquiriesRef.current = tradeInquiries;
  }, [tradeInquiries]);

  useEffect(() => {
    writeTradeReviewStore(tradeReviewsByItemId);
  }, [tradeReviewsByItemId]);

  useEffect(() => {
    if (typeof CustomEvent === "undefined") return;
    globalThis.dispatchEvent?.(
      new CustomEvent("mangomap:tab-badge", {
        detail: { screen: "marketplace", count: unreadTradeThreadIds.length }
      })
    );
  }, [unreadTradeThreadIds.length]);

  useEffect(() => {
    writeLocalMarketItemsStore(localItems);
  }, [localItems]);

  useEffect(() => {
    marketItemsRef.current = allItems;
  }, [allItems]);

  useEffect(() => {
    writeMarketChatStore(chatMessagesByItemId);
  }, [chatMessagesByItemId]);

  useEffect(() => {
    if (!tradeChatToast) return;
    const timerId = globalThis.setTimeout(() => setTradeChatToast(null), 2600);
    return () => globalThis.clearTimeout(timerId);
  }, [tradeChatToast]);

  useEffect(() => {
    let active = true;
    const syncMarket = () => {
      Promise.all([loadRemoteMarketItems(), loadRemoteMarketInquiries()])
        .then(([remoteItems, remoteInquiries]) => {
        if (!active) return;
        if (remoteItems.length > 0) {
          setLocalItems((current) => mergeRemoteMarketItemsByDestination(current, remoteItems, input.destination));
        }
        if (remoteInquiries.length > 0) {
          setTradeInquiries((current) => mergeTradeInquiries(current, remoteInquiries));
          const completedIds = remoteInquiries.filter((inquiry) => inquiry.status === "completed").map((inquiry) => inquiry.id);
          if (completedIds.length > 0) {
            setCompletedTradeItemIds((current) => Array.from(new Set([...completedIds, ...current])));
          }
        }
      })
      .catch(() => undefined);
    };
    syncMarket();
    const intervalId = globalThis.setInterval(syncMarket, 9000);
    return () => {
      active = false;
      globalThis.clearInterval(intervalId);
    };
  }, [input.destination]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubscribe = subscribeSupabaseInserts<SupabaseMarketInquiryRow>(
      "market_inquiries",
      "",
      (row) => {
        const nextInquiry = fromSupabaseMarketInquiry(row);
        setTradeInquiries((current) => mergeTradeInquiries(current, [nextInquiry]));
        if (nextInquiry.status === "completed") {
          setCompletedTradeItemIds((current) => (current.includes(nextInquiry.id) ? current : [nextInquiry.id, ...current]));
        }
      }
    );
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    Promise.all([loadBlockedTargetIds("market_item"), loadBlockedTargetIds("profile", memberId ?? memberName)])
      .then(([itemIds, profileIds]) => {
        setBlockedMarketItemIds(itemIds);
        setBlockedMarketProfileIds(profileIds);
      })
      .catch(() => {
        setBlockedMarketItemIds([]);
        setBlockedMarketProfileIds([]);
      });
  }, [memberId, memberName]);

  useEffect(() => {
    setSelectedDestination(input.destination);
  }, [input.destination]);

  useEffect(() => {
    setVisibleItemCount(5);
  }, [selectedDestination, entryMode]);

  useEffect(() => {
    if (!activeChatItemBlocked && !activeTradeThreadBlocked) return;
    setActiveChatItemId(null);
    setActiveTradeThreadId(null);
  }, [activeChatItemBlocked, activeTradeThreadBlocked]);

  useEffect(() => {
    if (!activeTradeThreadId) return;
    setUnreadTradeThreadIds((current) => current.filter((id) => id !== activeTradeThreadId));
  }, [activeTradeThreadId]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !memberName) return;
    const activeMemberId = memberId ?? memberName;
    const unsubscribe = subscribeSupabaseInserts<SupabaseMarketMessageRow>(
      "market_messages",
      "",
      (row) => {
        const inquiry = tradeInquiriesRef.current.find((item) => item.id === row.inquiry_id);
        if (!inquiry) return;
        const marketItem = marketItemsRef.current.find((item) => item.id === inquiry.itemId);
        if (!marketItem) return;
        if (row.auth_uid && blockedMarketProfileIds.includes(row.auth_uid)) return;
        const isSeller = isOwnMarketItem(marketItem, memberName);
        const message = fromSupabaseMarketMessage(row, isSeller, activeMemberId, memberName);
        setChatMessagesByItemId((current) => ({
          ...current,
          [row.inquiry_id]: mergeMarketChatMessages(current[row.inquiry_id] ?? [], [message])
        }));
        if (row.auth_uid === activeMemberId) return;
        if (row.inquiry_id !== activeTradeThreadId) {
          setTradeChatToast({
            id: message.id,
            title: "거래 새 메시지",
            body: `${row.nickname || "상대"}: ${message.text}`
          });
          setUnreadTradeThreadIds((current) => (current.includes(row.inquiry_id) ? current : [row.inquiry_id, ...current]));
        }
      }
    );
    return () => unsubscribe?.();
  }, [activeTradeThreadId, blockedMarketProfileIds, memberId, memberName]);

  useEffect(() => {
    if (!activeSellerItem) return;
    if (!blockedMarketItemIds.includes(activeSellerItem.id) && !getMarketSellerBlockIds(activeSellerItem).some((id) => blockedMarketProfileIds.includes(id))) return;
    setActiveSellerItemId(null);
  }, [activeSellerItem, blockedMarketItemIds, blockedMarketProfileIds]);

  useEffect(() => {
    if (!activeTradeThread || !activeChatItem || !memberName) {
      setTradeRealtimeStatus(isSupabaseConfigured() ? "connecting" : "local");
      return;
    }
    if (!isSupabaseConfigured()) {
      setTradeRealtimeStatus("local");
      return;
    }
    const isSeller = isOwnMarketItem(activeChatItem, memberName);
    const activeMemberId = memberId ?? memberName;
    let active = true;
    setTradeRealtimeStatus("connecting");

    fetchRemoteMarketMessages(activeTradeThread, isSeller, activeMemberId, memberName)
      .then((messages) => {
        if (!active || messages.length === 0) return;
        setChatMessagesByItemId((current) => ({
          ...current,
          [activeTradeThread.id]: mergeMarketChatMessages(current[activeTradeThread.id] ?? [], messages)
        }));
      })
      .catch(() => {
        if (active) setTradeRealtimeStatus("error");
      });

    const unsubscribe = subscribeSupabaseInserts<SupabaseMarketMessageRow>(
      "market_messages",
      `inquiry_id=eq.${activeTradeThread.id}`,
      (row) => {
        const nextMessage = fromSupabaseMarketMessage(row, isSeller, activeMemberId, memberName);
        setChatMessagesByItemId((current) => ({
          ...current,
          [activeTradeThread.id]: mergeMarketChatMessages(current[activeTradeThread.id] ?? [], [nextMessage])
        }));
      },
      (status) => {
        if (active) setTradeRealtimeStatus(status);
      }
    );

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [activeTradeThreadId, activeChatItemId, memberId, memberName]);

  const updateDraft = (key: keyof MarketDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submitDraft = async () => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    if (isSupabaseConfigured() && !hasSupabaseSession()) {
      setPhotoStatus("로그인 세션이 만료됐어요. 다시 로그인한 뒤 판매글을 등록해주세요.");
      onRequireAuth();
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setPhotoStatus("");
    let uploadedPhotos = draft.photos.length > 0 ? draft.photos : draft.photo.trim() ? [draft.photo.trim()] : [];
    try {
      if (marketPhotoFiles.length > 0) {
        setPhotoStatus("사진 업로드 중...");
        uploadedPhotos = await Promise.all(marketPhotoFiles.map((photoFile, index) =>
          supabaseUploadFile(marketPhotoBucket, photoFile.blob, {
            folder: `${selectedDestination}/${memberId ?? memberName}`,
            fileNamePrefix: `market-${index + 1}`,
            fileName: photoFile.name,
            contentType: photoFile.type,
            maxBytes: maxMarketPhotoBytes
          })
        ));
      } else if (uploadedPhotos.length > 0) {
        uploadedPhotos = await Promise.all(uploadedPhotos.map((photo, index) =>
          isSupabaseStorageDataUrl(photo)
            ? supabaseUploadDataUrl(marketPhotoBucket, photo, {
              folder: `${selectedDestination}/${memberId ?? memberName}`,
              fileNamePrefix: `market-${index + 1}`,
              maxBytes: maxMarketPhotoBytes
            })
            : Promise.resolve(photo)
        ));
      }

      const nextItem: MarketItem = {
        id: `local-market-${Date.now()}`,
        city: selectedDestination,
        title: draft.title.trim(),
        price: formatMarketPriceLabel(draft.price, priceUnit),
        area: draft.location.trim(),
        status: "방금 등록",
        seller: memberName,
        sellerTemp: 36.5,
        sellerBadge: "첫 거래",
        sellerMemberName: memberName,
        sellerAuthUid: memberId ?? memberName,
        note: draft.description.trim() || "판매자가 상세 설명을 아직 적지 않았어요.",
        tags: [draft.category, draft.condition].filter(Boolean),
        photo: uploadedPhotos[0],
        photos: uploadedPhotos
      };

      if (isSupabaseConfigured()) {
        await saveRemoteMarketItem(nextItem, { ...draft, photo: uploadedPhotos[0] ?? "", photos: uploadedPhotos }, selectedDestination, memberId ?? memberName);
      }

      setLocalItems((current) => ({
        ...current,
        [selectedDestination]: [nextItem, ...current[selectedDestination]]
      }));
      setPostedItemId(nextItem.id);
      setVisibleItemCount((current) => Math.max(current, 5));
      setDraft({ title: "", category: "여행", condition: "사용감 적음", price: "", photo: "", photos: [], description: "", location: "", contact: "" });
      setCategoryPickerOpen(false);
      setPriceUnit("동");
      setMarketPhotoFiles([]);
      setPostOpen(false);
    } catch (error) {
      setPhotoStatus(
        getSubmitFailureMessage(
          error,
          isSupabaseConfigured()
            ? "판매글을 서버에 등록하지 못했어요. 잠시 후 다시 시도해주세요."
            : "사진 업로드에 실패했어요."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getOrCreateTradeInquiry = async (item: MarketItem, buyerName: string) => {
    const threadId = getTradeThreadId(item.id, buyerName);
    const existing = tradeInquiries.find((inquiry) => inquiry.id === threadId);
    if (existing) return existing;

    const nextInquiry: TradeInquiry = {
      id: threadId,
      itemId: item.id,
      buyerName,
      sellerName: item.sellerMemberName ?? item.seller,
      buyerAuthUid: memberId ?? buyerName,
      status: "inquiry",
      createdAt: new Date().toISOString()
    };
    if (isSupabaseConfigured()) {
      await saveRemoteMarketInquiry(nextInquiry, memberId ?? buyerName);
    }
    setTradeInquiries((current) => (current.some((inquiry) => inquiry.id === threadId) ? current : [nextInquiry, ...current]));
    return nextInquiry;
  };

  const openBuyerTradeThread = (item: MarketItem, inquiry: TradeInquiry) => {
    setTradeActionStatus("");
    setActiveSellerItemId(null);
    setActiveChatItemId(item.id);
    setActiveTradeThreadId(inquiry.id);
    setUnreadTradeThreadIds((current) => current.filter((id) => id !== inquiry.id));
    setTradingItemIds((current) => (current.includes(item.id) ? current : [item.id, ...current]));
    setChatMessagesByItemId((current) => {
      if (current[inquiry.id]?.length) return current;
      return {
        ...current,
        [inquiry.id]: [
          {
            id: `${inquiry.id}-system`,
            sender: "system",
            text: isOwnMarketItem(item, memberName)
              ? `${inquiry.buyerName}님 문의방이에요. 실제 구매자가 맞을 때만 판매완료 처리하세요.`
              : "1:1 거래문의방이 열렸어요. 공개 장소 직거래, 선입금 금지를 먼저 확인하세요. 평가는 판매자가 거래완료 처리한 뒤에만 열려요."
          }
        ]
      };
    });
  };

  const openTradeChat = async (item: MarketItem) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    setTradeActionStatus("");
    const isSeller = isOwnMarketItem(item, memberName);
    if (isSeller) {
      setActiveSellerItemId(item.id);
      setActiveChatItemId(null);
      setActiveTradeThreadId(null);
      return;
    }
    if (item.status === "판매취소") return;
    try {
      const inquiry = await getOrCreateTradeInquiry(item, memberName);
      openBuyerTradeThread(item, inquiry);
    } catch (error) {
      setTradeActionStatus(getSubmitFailureMessage(error, "거래문의방을 열지 못했어요. 잠시 후 다시 시도해주세요."));
    }
  };

  const reserveListing = async (item: MarketItem) => {
    if (!isOwnMarketItem(item, memberName)) return;
    if (item.status === "거래완료" || item.status === "판매취소") return;
    setTradeActionStatus("");
    try {
      await updateRemoteMarketItemStatus(item, "reserved");
    } catch (error) {
      setTradeActionStatus(getSubmitFailureMessage(error, "예약중 상태를 서버에 반영하지 못했어요."));
      return;
    }
    setLocalItems((current) =>
      marketDestinations.reduce<Record<Destination, MarketItem[]>>((result, destination) => {
        result[destination] = current[destination].map((candidate) =>
          candidate.id === item.id ? { ...candidate, status: "예약중", sellerBadge: "예약중" } : candidate
        );
        return result;
      }, createEmptyLocalMarketItems())
    );
  };

  const cancelListing = async (item: MarketItem) => {
    if (!isOwnMarketItem(item, memberName)) return;
    setTradeActionStatus("");
    try {
      await updateRemoteMarketItemStatus(item, "cancelled");
    } catch (error) {
      setTradeActionStatus(getSubmitFailureMessage(error, "판매취소를 서버에 반영하지 못했어요."));
      return;
    }
    setLocalItems((current) =>
      marketDestinations.reduce<Record<Destination, MarketItem[]>>((result, destination) => {
        result[destination] = current[destination].map((candidate) =>
          candidate.id === item.id ? { ...candidate, status: "판매취소", sellerBadge: "판매 중단" } : candidate
        );
        return result;
      }, createEmptyLocalMarketItems())
    );
  };

  const deleteListing = async (item: MarketItem) => {
    if (!isOwnMarketItem(item, memberName)) return;
    const inquiryIds = tradeInquiries.filter((inquiry) => inquiry.itemId === item.id).map((inquiry) => inquiry.id);
    setTradeActionStatus("");
    try {
      await updateRemoteMarketItemStatus(item, "deleted");
    } catch (error) {
      setTradeActionStatus(getSubmitFailureMessage(error, "게시글 삭제를 서버에 반영하지 못했어요."));
      return;
    }
    setLocalItems((current) =>
      marketDestinations.reduce<Record<Destination, MarketItem[]>>((result, destination) => {
        result[destination] = current[destination].filter((candidate) => candidate.id !== item.id);
        return result;
      }, createEmptyLocalMarketItems())
    );
    setTradeInquiries((current) => current.filter((inquiry) => inquiry.itemId !== item.id));
    setCompletedTradeItemIds((current) => current.filter((threadId) => !inquiryIds.includes(threadId)));
    setTradeReviewsByItemId((current) =>
      Object.fromEntries(Object.entries(current).filter(([threadId]) => !inquiryIds.includes(threadId)))
    );
    setChatMessagesByItemId((current) =>
      Object.fromEntries(Object.entries(current).filter(([threadId]) => !inquiryIds.includes(threadId)))
    );
    setTradingItemIds((current) => current.filter((itemId) => itemId !== item.id));
    setPostedItemId((current) => (current === item.id ? null : current));
    setActiveSellerItemId(null);
    setActiveChatItemId(null);
    setActiveTradeThreadId(null);
  };

  const sendTradeMessage = async (item: MarketItem, inquiry: TradeInquiry) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    const text = (chatDraftsByItemId[inquiry.id] ?? "").trim();
    if (!text) return;
    setTradeActionStatus("");
    const isSeller = isOwnMarketItem(item, memberName);
    const message: MarketChatMessage = {
      id: `${inquiry.id}-${Date.now()}`,
      sender: isSeller ? "seller" : "buyer",
      text,
      authorId: memberId ?? memberName,
      createdAt: new Date().toISOString()
    };
    try {
      let savedMessage = message;
      if (isSupabaseConfigured()) {
        const remoteMessage = await saveRemoteMarketMessage(inquiry, message, memberId ?? memberName, memberName);
        if (remoteMessage) savedMessage = fromSupabaseMarketMessage(remoteMessage, isSeller, memberId ?? memberName, memberName);
      }
      setChatMessagesByItemId((current) => ({
        ...current,
        [inquiry.id]: mergeMarketChatMessages(current[inquiry.id] ?? [], [savedMessage])
      }));
      setChatDraftsByItemId((current) => ({ ...current, [inquiry.id]: "" }));
    } catch (error) {
      setTradeActionStatus(getSubmitFailureMessage(error, "메시지를 보내지 못했어요. 네트워크나 로그인 상태를 확인해주세요."));
    }
  };

  const confirmTradeComplete = async (item: MarketItem, inquiry: TradeInquiry) => {
    if (!memberName) {
      onRequireAuth();
      return;
    }
    if (!isOwnMarketItem(item, memberName)) return;
    if (completedTradeItemIds.includes(inquiry.id) || tradeReviewsByItemId[inquiry.id]) return;
    const completedAt = new Date().toISOString();
    setTradeActionStatus("");
    try {
      await updateRemoteMarketInquiryStatus(inquiry, "closed");
      await updateRemoteMarketItemStatus(item, "sold", inquiry.buyerAuthUid ?? inquiry.buyerName);
    } catch (error) {
      setTradeActionStatus(getSubmitFailureMessage(error, "거래완료를 서버에 반영하지 못했어요."));
      return;
    }
    setCompletedTradeItemIds((current) => [inquiry.id, ...current]);
    setTradeInquiries((current) =>
      current.map((candidate) =>
        candidate.id === inquiry.id ? { ...candidate, status: "completed", completedAt } : candidate
      )
    );
    setLocalItems((current) =>
      marketDestinations.reduce<Record<Destination, MarketItem[]>>((result, destination) => {
        result[destination] = current[destination].map((candidate) =>
          candidate.id === item.id ? { ...candidate, status: "거래완료", sellerBadge: "거래완료" } : candidate
        );
        return result;
      }, createEmptyLocalMarketItems())
    );
    setChatMessagesByItemId((current) => ({
      ...current,
      [inquiry.id]: [
        ...(current[inquiry.id] ?? []),
        {
          id: `${inquiry.id}-complete-${Date.now()}`,
          sender: "system",
          text: `판매자가 ${inquiry.buyerName}님과의 거래완료를 처리했어요. 이제 이 구매자만 평가를 남길 수 있어요.`
        }
      ]
    }));
  };

  const isTradeThreadCompleted = (inquiry: TradeInquiry) =>
    completedTradeItemIds.includes(inquiry.id) || inquiry.status === "completed" || inquiry.status === "reviewed";

  const completeTrade = async (item: MarketItem, inquiry: TradeInquiry, rating: TradeRating) => {
    if (isOwnMarketItem(item, memberName)) return;
    if (inquiry.buyerName !== memberName || !isTradeThreadCompleted(inquiry)) return;
    if (tradeReviewsByItemId[inquiry.id]) return;
    const { sellerDelta, memberDelta } = getTradeTemperatureDeltas(rating);
    const completedAt = new Date().toISOString();
    const review: TradeReview = {
      itemId: item.id,
      threadId: inquiry.id,
      buyerName: inquiry.buyerName,
      rating,
      sellerDelta,
      memberDelta,
      completedAt
    };
    setTradeActionStatus("");
    try {
      await saveRemoteTradeReview(item, inquiry, review, memberId ?? memberName);
    } catch (error) {
      setTradeActionStatus(getSubmitFailureMessage(error, "거래 평가를 서버에 저장하지 못했어요."));
      return;
    }
    setCompletedTradeItemIds((current) => (current.includes(inquiry.id) ? current : [inquiry.id, ...current]));
    setTradeInquiries((current) =>
      current.map((candidate) =>
        candidate.id === inquiry.id ? { ...candidate, status: "reviewed", reviewedAt: completedAt } : candidate
      )
    );
    setTradeReviewsByItemId((current) => ({ ...current, [inquiry.id]: review }));

    const sellerSign = sellerDelta > 0 ? "+" : "";
    setChatMessagesByItemId((current) => ({
      ...current,
      [inquiry.id]: [
        ...(current[inquiry.id] ?? []),
        {
          id: `${inquiry.id}-review-${Date.now()}`,
          sender: "system",
          text: `${inquiry.buyerName}님의 거래 평가가 저장됐어요. 판매자 망고온도 ${sellerSign}${sellerDelta.toFixed(1)}°C`
        }
      ]
    }));
  };

  if (activeSellerItem) {
    return (
      <SellerTradeInboxScreen
        item={activeSellerItem}
        inquiries={tradeInquiries.filter((inquiry) => inquiry.itemId === activeSellerItem.id && !blockedMarketProfileIds.includes(inquiry.buyerAuthUid ?? inquiry.buyerName))}
        reviewsByThreadId={tradeReviewsByItemId}
        completedThreadIds={completedTradeItemIds}
        actionStatus={tradeActionStatus}
        onBack={() => setActiveSellerItemId(null)}
        onOpenInquiry={(inquiry) => openBuyerTradeThread(activeSellerItem, inquiry)}
        onReserveListing={() => reserveListing(activeSellerItem)}
        onCancelListing={() => cancelListing(activeSellerItem)}
        onDeleteListing={() => deleteListing(activeSellerItem)}
      />
    );
  }

  if (activeChatItem && activeTradeThread) {
    const activeTradeCompleted = isTradeThreadCompleted(activeTradeThread) || Boolean(tradeReviewsByItemId[activeTradeThread.id]);
    const activeChatIsSeller = isOwnMarketItem(activeChatItem, memberName);
    return (
      <TradeChatRoomScreen
        item={activeChatItem}
        tradeThread={activeTradeThread}
        memberId={memberId}
        memberName={memberName ?? "나"}
        memberTemperature={memberTemperature}
        tradeReview={tradeReviewsByItemId[activeTradeThread.id]}
        tradeCompleted={activeTradeCompleted}
        isSeller={activeChatIsSeller}
        canConfirmTrade={activeChatIsSeller}
        canEvaluateTrade={!activeChatIsSeller && activeTradeThread.buyerName === memberName}
        chatMessages={visibleChatMessages}
        chatDraft={chatDraftsByItemId[activeTradeThread.id] ?? ""}
        realtimeStatus={tradeRealtimeStatus}
        actionStatus={tradeActionStatus}
        chatToast={tradeChatToast}
        onBack={() => {
          setActiveChatItemId(null);
          setActiveTradeThreadId(null);
          if (activeChatIsSeller) setActiveSellerItemId(activeChatItem.id);
        }}
        onSetDraft={(text) => setChatDraftsByItemId((current) => ({ ...current, [activeTradeThread.id]: text }))}
        onSend={() => sendTradeMessage(activeChatItem, activeTradeThread)}
        onConfirmTradeComplete={() => confirmTradeComplete(activeChatItem, activeTradeThread)}
        onCompleteTrade={(rating) => completeTrade(activeChatItem, activeTradeThread, rating)}
        onUseQuickMessage={(text) => setChatDraftsByItemId((current) => ({ ...current, [activeTradeThread.id]: text }))}
        onBlockItem={(targetId) => {
          setBlockedMarketProfileIds((current) => (current.includes(targetId) ? current : [targetId, ...current]));
          setActiveChatItemId(null);
          setActiveTradeThreadId(null);
        }}
      />
    );
  }

  return (
    <AppShell withBottomNav backgroundColor="#FFF7DF">
      <Header
        eyebrow={entryMode === "trading" ? "내 거래" : "중고장터"}
        title={entryMode === "trading" ? "거래중인 중고거래" : `${selectedDestination} 여행자 거래`}
        subtitle={entryMode === "trading" ? "내가 거래문의한 물건만 모아서 보여줘요." : "출국 전 남은 여행 물품, 유심, 투어권을 가까운 여행자끼리 확인해요."}
        compactMascot
        dark
      />

      {tradeChatToast ? (
        <View style={styles.tradeToast}>
          <Text style={styles.tradeToastTitle}>{tradeChatToast.title}</Text>
          <Text style={styles.tradeToastBody} numberOfLines={1}>{tradeChatToast.body}</Text>
        </View>
      ) : null}

      {entryMode === "all" ? <View style={styles.cityCard}>
        <Text style={styles.sectionLabel}>도시 선택</Text>
        <View style={styles.cityRail}>
          {marketDestinations.map((destination) => (
            <Pressable
              key={destination}
              accessibilityRole="button"
              onPress={() => setSelectedDestination(destination)}
              style={[styles.cityChip, selectedDestination === destination && styles.cityChipActive]}
            >
              <Text style={[styles.cityText, selectedDestination === destination && styles.cityTextActive]}>{destination}</Text>
            </Pressable>
          ))}
        </View>
      </View> : null}

      {entryMode === "all" ? (
        <View style={styles.marketControlCard}>
          <View style={styles.marketControlHeader}>
            <View>
              <Text style={styles.marketControlEyebrow}>MY MARKET</Text>
              <Text style={styles.marketControlTitle}>내 장터 관리</Text>
            </View>
            <Text style={styles.marketControlBadge}>{unreadTradeThreadIds.length > 0 ? `새 대화 ${unreadTradeThreadIds.length}` : "안전거래"}</Text>
          </View>
          <View style={styles.marketModeRail}>
            {[
              { key: "all" as const, label: "전체", count: items.length },
              { key: "selling" as const, label: "내 판매", count: ownMarketItems.length },
              { key: "trading" as const, label: "거래중", count: tradingMarketItems.length },
              { key: "reviews" as const, label: "후기", count: reviewedMarketItems.length },
              { key: "help" as const, label: "고객센터", count: 0 }
            ].map((mode) => {
              const selected = marketViewMode === mode.key;
              return (
                <Pressable
                  key={mode.key}
                  accessibilityRole="button"
                  onPress={() => {
                    if (!memberName && mode.key !== "all" && mode.key !== "help") {
                      onRequireAuth();
                      return;
                    }
                    setMarketViewMode(mode.key);
                    setVisibleItemCount(6);
                  }}
                  style={[styles.marketModeChip, selected && styles.marketModeChipActive]}
                >
                  <Text style={[styles.marketModeText, selected && styles.marketModeTextActive]}>{mode.label}</Text>
                  {mode.count > 0 ? <Text style={[styles.marketModeCount, selected && styles.marketModeCountActive]}>{mode.count}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {marketViewMode !== "help" ? <View style={styles.marketSummary}>
        <View style={styles.marketSummaryCopy}>
          <Text style={styles.marketSummaryLabel}>
            {entryMode === "trading"
              ? "내 거래 목록"
              : marketViewMode === "selling"
                ? "내 판매글"
                : marketViewMode === "trading"
                  ? "거래중인 방"
                  : marketViewMode === "reviews"
                    ? "거래후기"
                    : `${selectedDestination} 장터`}
          </Text>
          <Text style={styles.marketSummaryValue}>
            {displayItems.length}개 · {interestCategory === "전체" ? "" : `${interestCategory} · `}{marketViewMode === "selling" ? "판매관리" : marketViewMode === "trading" ? "대화방" : marketViewMode === "reviews" ? "후기" : entryMode === "trading" ? "거래중" : "판매글"}
          </Text>
        </View>
        {entryMode === "all" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!memberName) {
                onRequireAuth();
                return;
              }
              setPostOpen((current) => !current);
            }}
            style={styles.marketWriteButton}
          >
            <Text style={styles.marketWriteButtonText} numberOfLines={1}>{postOpen ? "작성 닫기" : "+ 판매글"}</Text>
          </Pressable>
        ) : (
          <Text style={styles.marketSummaryBadge} numberOfLines={1}>내 거래</Text>
        )}
      </View> : null}

      {entryMode === "all" && marketViewMode !== "help" ? (
        <View style={styles.interestFilterCard}>
          <View style={styles.interestFilterHeader}>
            <View>
              <Text style={styles.interestFilterEyebrow}>관심 카테고리</Text>
              <Text style={styles.interestFilterTitle}>보고 싶은 물건만 먼저 보기</Text>
            </View>
            <Text style={styles.interestFilterBadge}>{interestCategory}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestFilterRail}>
            {marketCategoryFilterOptions.map((category) => {
              const active = interestCategory === category;
              return (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  onPress={() => {
                    setInterestCategory(category);
                    setVisibleItemCount(5);
                  }}
                  style={[styles.interestFilterChip, active && styles.interestFilterChipActive]}
                >
                  <Text style={[styles.interestFilterText, active && styles.interestFilterTextActive]}>{category}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {marketViewMode === "help" && entryMode === "all" ? (
        <View style={styles.marketHelpCard}>
          <Text style={styles.marketHelpTitle}>무엇을 도와드릴까요?</Text>
          <Text style={styles.marketHelpCopy}>베트남 여행자 장터에서 자주 생기는 거래 문제를 빠르게 확인해요.</Text>
          <View style={styles.marketHelpGrid}>
            {["운영정책", "공지사항", "자주 묻는 질문", "1:1 문의", "신고/차단", "거래 안전"].map((label) => (
              <View key={label} style={styles.marketHelpTile}>
                <Text style={styles.marketHelpIcon}>{label.slice(0, 1)}</Text>
                <Text style={styles.marketHelpLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.marketFaqList}>
            {["판매완료 후 평가는 누가 하나요?", "거래 중 사기 의심이면 어떻게 하나요?", "예약중과 판매완료는 어떻게 달라요?"].map((question) => (
              <View key={question} style={styles.marketFaqRow}>
                <Text style={styles.marketFaqQ}>Q</Text>
                <Text style={styles.marketFaqText}>{question}</Text>
                <Text style={styles.marketFaqArrow}>›</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {postOpen && entryMode === "all" ? (
        <View style={styles.postForm}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderSide} />
            <Text style={styles.formTitle}>상품 등록</Text>
            <Pressable accessibilityRole="button" onPress={() => setPostOpen(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.productSection}>
            <View style={styles.productSectionHeader}>
              <Text style={styles.productSectionTitle}>상품 정보</Text>
              <Text style={styles.productLimitLink}>거래 제한 품목 안내 ›</Text>
            </View>

            <View style={styles.productInfoGrid}>
              <View style={styles.productPhotoCell}>
                {draft.photos.length > 0 ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: draft.photos[0] }} style={styles.productPhotoPreview} />
                    {draft.photos.length > 1 ? <Text style={styles.photoCountBadge}>+{draft.photos.length - 1}</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setDraft((current) => ({ ...current, photo: "", photos: [] }));
                        setMarketPhotoFiles([]);
                        setPhotoStatus("");
                      }}
                      style={styles.photoRemoveButton}
                    >
                      <Text style={styles.photoRemoveText}>삭제</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.productPhotoPlaceholder}>
                    <Text style={styles.productPhotoIcon}>CAM</Text>
                    <Text style={styles.productPhotoText}>{draft.photos.length}/{maxMarketPhotoCount}</Text>
                  </View>
                )}
                <PhotoFilePicker
                  compact
                  count={draft.photos.length}
                  onPick={(photos) => {
                    const nextFiles = [...marketPhotoFiles, ...photos].slice(0, maxMarketPhotoCount);
                    const nextPhotos = nextFiles.map((photo) => photo.previewUri);
                    setMarketPhotoFiles(nextFiles);
                    setDraft((current) => ({ ...current, photos: nextPhotos, photo: nextPhotos[0] ?? "" }));
                  }}
                  onError={setPhotoStatus}
                />
              </View>

              <View style={styles.productInfoRows}>
                <View style={styles.productInfoRow}>
                  <Text style={styles.productInfoLabel}>상품명</Text>
                  <TextInput
                    value={draft.title}
                    onChangeText={(value) => updateDraft("title", value)}
                    placeholder="상품명을 입력해 주세요."
                    placeholderTextColor="#A7A7A7"
                    style={styles.productLineInput}
                  />
                </View>
                <View style={styles.productInfoRow}>
                  <Text style={styles.productInfoLabel}>카테고리</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setCategoryPickerOpen((current) => !current)}
                    style={styles.categorySelectButton}
                  >
                    <Text style={styles.categorySelectValue} numberOfLines={1}>{draft.category}</Text>
                    <Text style={styles.categorySelectArrow}>{categoryPickerOpen ? "⌃" : "›"}</Text>
                  </Pressable>
                </View>
                {categoryPickerOpen ? (
                  <View style={styles.categoryPickerPanel}>
                    <View style={styles.categoryPickerHeader}>
                      <Text style={styles.categoryPickerTitle}>카테고리 선택</Text>
                      <Text style={styles.categoryPickerHint}>판매 물건에 가장 가까운 항목을 골라주세요</Text>
                    </View>
                    {marketCategoryOptions.map((category) => (
                      <Pressable
                        key={category}
                        accessibilityRole="button"
                        onPress={() => {
                          updateDraft("category", category);
                          setCategoryPickerOpen(false);
                        }}
                        style={[styles.categoryOptionChip, draft.category === category && styles.categoryOptionChipActive]}
                      >
                        <Text style={[styles.categoryOptionText, draft.category === category && styles.categoryOptionTextActive]}>{category}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={styles.productInfoRow}>
                  <Text style={styles.productInfoLabel}>상품 상태</Text>
                  <View style={styles.optionRail}>
                    {marketConditionOptions.map((condition) => (
                      <Pressable
                        key={condition}
                        accessibilityRole="button"
                        onPress={() => updateDraft("condition", condition)}
                        style={[styles.optionChip, draft.condition === condition && styles.optionChipActive]}
                      >
                        <Text style={[styles.optionChipText, draft.condition === condition && styles.optionChipTextActive]}>{condition}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.productInfoRow}>
                  <Text style={styles.productInfoLabel}>판매가</Text>
                  <View style={styles.priceInputGroup}>
                    <TextInput
                      value={draft.price}
                      onChangeText={(value) => updateDraft("price", value)}
                      placeholder={priceUnit === "협의" ? "가격협의" : "숫자만 입력"}
                      placeholderTextColor="#A7A7A7"
                      keyboardType="number-pad"
                      editable={priceUnit !== "협의"}
                      style={[styles.productLineInput, priceUnit === "협의" && styles.productLineInputDisabled]}
                    />
                    <View style={styles.priceUnitRail}>
                      {(["동", "원", "협의"] as MarketPriceUnit[]).map((unit) => (
                        <Pressable
                          key={unit}
                          accessibilityRole="button"
                          onPress={() => {
                            setPriceUnit(unit);
                            if (unit === "협의") updateDraft("price", "");
                          }}
                          style={[styles.priceUnitChip, priceUnit === unit && styles.priceUnitChipActive]}
                        >
                          <Text style={[styles.priceUnitText, priceUnit === unit && styles.priceUnitTextActive]}>{unit}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
            {photoStatus ? <Text style={styles.photoStatusText}>{photoStatus}</Text> : null}
          </View>

          <View style={styles.productSection}>
            <View style={styles.productSectionHeader}>
              <Text style={styles.productSectionTitle}>상품 설명</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const template = "· 브랜드/상품명:\n· 구매 시기:\n· 사용 기간:\n· 하자 여부:\n· 거래 희망 위치:";
                  updateDraft("description", draft.description.trim() ? draft.description : template);
                }}
                style={styles.templateButton}
              >
                <Text style={styles.templateButtonText}>자주 쓰는 문구</Text>
              </Pressable>
            </View>
            <TextInput
              value={draft.description}
              onChangeText={(value) => updateDraft("description", value)}
              placeholder={"· 브랜드, 모델명, 구매 시기, 하자 유무를 적어주세요.\n· 전화번호, SNS 계정 등 개인정보 입력은 제한될 수 있어요.\n· 실제 촬영한 사진과 함께 자세히 작성하면 거래문의가 늘어요."}
              placeholderTextColor="#A7A7A7"
              style={styles.productDescriptionInput}
              multiline
              maxLength={2500}
            />
            <Text style={styles.descriptionCount}>{draft.description.length}/2500</Text>
          </View>

          <View style={styles.productSection}>
            <Text style={styles.productSectionTitle}>거래 방법</Text>
            <View style={styles.tradeMethodCard}>
              <Text style={styles.tradeMethodLabel}>직거래</Text>
              <TextInput
                value={draft.location}
                onChangeText={(value) => updateDraft("location", value)}
                placeholder="거래 위치를 입력해 주세요. 예: 1군 벤탄시장 근처"
                placeholderTextColor="#A7A7A7"
                style={styles.tradeLocationInput}
              />
            </View>
            <View style={styles.tradeOptionsRow}>
              <View style={styles.tradeOptionActive}>
                <Text style={styles.tradeOptionActiveText}>만나서 직거래</Text>
              </View>
              <View style={styles.tradeOption}>
                <Text style={styles.tradeOptionText}>예약 문의 가능</Text>
              </View>
            </View>
          </View>

          <View style={styles.saleNotice}>
            <Text style={styles.saleNoticeText}>판매 정보가 실제 상품과 다를 경우 책임은 판매자에게 있어요. 공개 장소에서 만나고 선입금은 피해주세요.</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={submitDraft} style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}>
            <Text style={styles.submitButtonText}>{submitting ? "업로드 중" : "등록 완료"}</Text>
          </Pressable>
        </View>
      ) : null}

      {entryMode === "trading" && displayItems.length === 0 ? (
        <View style={styles.marketEmptyCard}>
          <Text style={styles.marketEmptyTitle}>거래중인 글이 아직 없어요</Text>
          <Text style={styles.marketEmptyCopy}>중고장터에서 관심 있는 물건의 거래문의를 누르면 여기서 따로 모아볼 수 있어요.</Text>
        </View>
      ) : null}

      {entryMode === "all" && displayItems.length === 0 ? (
        <View style={styles.marketEmptyCard}>
          <Text style={styles.marketEmptyKicker}>MANGO VIETNAM MARKET</Text>
          <Text style={styles.marketEmptyTitle}>
            {marketViewMode === "selling"
              ? "내 판매글이 아직 없어요"
              : marketViewMode === "trading"
                ? "거래중인 방이 아직 없어요"
                : marketViewMode === "reviews"
                  ? "거래후기가 아직 없어요"
                  : "아직 올라온 물건이 없어요"}
          </Text>
          <Text style={styles.marketEmptyCopy}>
            {marketViewMode === "selling"
              ? "판매글을 올리면 여기에서 예약중, 판매완료, 삭제까지 관리할 수 있어요."
              : marketViewMode === "trading"
                ? "관심 있는 물건의 거래문의를 누르면 1:1 대화방이 여기에 모여요."
                : marketViewMode === "reviews"
                  ? "판매자가 거래완료 처리한 뒤 구매자가 평가를 남기면 후기가 쌓여요."
                  : "여행 중 남은 유심, 환전권, 티켓, 생활용품을 먼저 올리면 같은 도시 여행자에게 바로 보여요."}
          </Text>
        </View>
      ) : null}

      {postedItemId ? (
        <View style={styles.postSuccessCard}>
          <Text style={styles.postSuccessTitle}>판매글이 장터 상단에 올라갔어요</Text>
          <Text style={styles.postSuccessCopy}>방금 등록한 글을 초록 테두리로 표시했어요. 거래문의가 들어오면 1:1 대화에서 이어가면 돼요.</Text>
        </View>
      ) : null}

      {visibleItems.map((item) => {
        const itemInquiries = tradeInquiries.filter((inquiry) => inquiry.itemId === item.id);
        const memberInquiry = memberName ? itemInquiries.find((inquiry) => inquiry.buyerName === memberName) : undefined;
        const representativeInquiry = memberInquiry ?? itemInquiries.find((inquiry) => inquiry.status === "reviewed") ?? itemInquiries.find((inquiry) => inquiry.status === "completed") ?? itemInquiries[0];
        const tradeReview = representativeInquiry ? tradeReviewsByItemId[representativeInquiry.id] : getLatestItemReview(item.id, tradeInquiries, tradeReviewsByItemId);
        const isTrading = tradingItemIds.includes(item.id);
        const isSeller = isOwnMarketItem(item, memberName);
        const tradeCompleted = Boolean(representativeInquiry && (isTradeThreadCompleted(representativeInquiry) || tradeReview));
        const sellerTemperature = getAdjustedSellerTemperature(item, tradeReview);
        const sellerBadge = getAdjustedSellerBadge(item, tradeReview);
        const inquiryCount = itemInquiries.length;
        const hasUnreadTrade = itemInquiries.some((inquiry) => unreadTradeThreadIds.includes(inquiry.id));
        const listingCanceled = item.status === "판매취소";
        const displayStatus = tradeReview
          ? "거래완료"
          : tradeCompleted
            ? (isSeller ? "평가 대기" : "평가 가능")
            : isSeller && inquiryCount > 0
              ? `문의 ${inquiryCount}명`
              : item.status;

        return (
          <View key={item.id} style={[styles.itemCard, item.id === postedItemId && styles.itemCardFresh]}>
            <View style={styles.itemTop}>
              <View style={styles.itemPhotoWrap}>
                <Image source={{ uri: getMarketItemPhoto(item) }} style={styles.itemPhoto} />
                {getMarketItemPhotos(item).length > 1 ? <Text style={styles.itemPhotoCount}>+{getMarketItemPhotos(item).length - 1}</Text> : null}
              </View>
              <View style={styles.itemBody}>
                <View style={styles.metaRow}>
                  <Text style={styles.area}>{item.area}</Text>
                  <Text style={[
                    styles.status,
                    displayStatus === "예약중" && styles.statusReserved,
                    (displayStatus === "거래완료" || displayStatus === "평가 대기") && styles.statusSold,
                    displayStatus === "판매취소" && styles.statusCanceled,
                    displayStatus.startsWith("문의") && styles.statusInquiry
                  ]}>
                    {displayStatus}
                  </Text>
                  {hasUnreadTrade ? <Text style={styles.marketUnreadPill}>새 메시지</Text> : null}
                </View>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.price}>{item.price}</Text>
                <Text style={styles.note} numberOfLines={2}>{item.note}</Text>
                <View style={styles.sellerRow}>
                  <Text style={[styles.temperatureBadge, { color: getTemperatureTone(sellerTemperature) }]}>
                    {sellerTemperature.toFixed(1)}°C
                  </Text>
                  <Text style={styles.sellerBadgeText} numberOfLines={1}>{sellerBadge}</Text>
                </View>
                <View style={styles.temperatureMeterTrack}>
                  <View
                    style={[
                      styles.temperatureMeterFill,
                      { width: `${getTemperatureProgress(sellerTemperature)}%`, backgroundColor: getTemperatureTone(sellerTemperature) }
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.feedFooter}>
              {item.tags.length > 0 ? (
                <View style={styles.tagRow}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <Text key={`${item.id}-${tag}`} style={styles.tag}>
                      {tag}
                    </Text>
                  ))}
                </View>
              ) : null}
              <View style={styles.actionRow}>
                {!isSeller ? (
                  <Pressable accessibilityRole="button" style={styles.softButton}>
                    <Text style={styles.softButtonText} numberOfLines={1}>저장</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={listingCanceled && !isSeller}
                  onPress={() => openTradeChat(item)}
                  style={[styles.darkButton, listingCanceled && !isSeller && styles.darkButtonDisabled]}
                >
                  <Text style={styles.darkButtonText} numberOfLines={1}>
                    {isSeller ? (inquiryCount > 0 ? `문의 ${inquiryCount}명` : "판매관리") : listingCanceled ? "판매취소" : tradeReview ? "완료방" : isTrading ? "대화방" : "거래문의"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}

      {hiddenItemCount > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => setVisibleItemCount((current) => current + 5)} style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>게시글 {hiddenItemCount}개 더 보기</Text>
        </Pressable>
      ) : null}

    </AppShell>
  );
}

function SellerTradeInboxScreen({
  item,
  inquiries,
  reviewsByThreadId,
  completedThreadIds,
  actionStatus,
  onBack,
  onOpenInquiry,
  onReserveListing,
  onCancelListing,
  onDeleteListing
}: {
  item: MarketItem;
  inquiries: TradeInquiry[];
  reviewsByThreadId: Record<string, TradeReview>;
  completedThreadIds: string[];
  actionStatus: string;
  onBack: () => void;
  onOpenInquiry: (inquiry: TradeInquiry) => void;
  onReserveListing: () => void;
  onCancelListing: () => void;
  onDeleteListing: () => void;
}) {
  const sortedInquiries = [...inquiries].sort((left, right) => {
    const leftScore = left.status === "completed" ? 3 : left.status === "inquiry" ? 2 : 1;
    const rightScore = right.status === "completed" ? 3 : right.status === "inquiry" ? 2 : 1;
    return rightScore - leftScore || right.createdAt.localeCompare(left.createdAt);
  });

  return (
    <AppShell withBottomNav backgroundColor="#FFF7DF">
      <View style={styles.roomHeader}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.roomBackButton}>
          <Text style={styles.roomBackText}>‹</Text>
        </Pressable>
        <View style={styles.roomHeaderCopy}>
          <Text style={styles.roomEyebrow}>판매관리</Text>
          <Text style={styles.roomTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.roomMeta} numberOfLines={1}>문의자 {inquiries.length}명 · 실제 구매자만 완료 처리</Text>
        </View>
      </View>

      <View style={styles.tradeProductCard}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.tradeProductPhoto} />
        ) : (
          <View style={styles.tradeProductIcon}>
            <Text style={styles.tradeProductIconText}>{item.title.slice(0, 1)}</Text>
          </View>
        )}
        <View style={styles.tradeProductCopy}>
          <Text style={styles.tradeProductStatus}>{item.status}</Text>
          <Text style={styles.tradeProductTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.tradeProductSeller} numberOfLines={1}>{item.area} · {item.price}</Text>
        </View>
      </View>

      <View style={styles.roomNotice}>
        <Text style={styles.roomNoticeText}>문의자가 여러 명이면 각각 다른 거래방으로 관리해요. 실제로 산 사람의 방에서만 판매완료를 눌러야 그 사람에게만 평가 권한이 열립니다.</Text>
      </View>

      {actionStatus ? <Text style={styles.roomActionStatus}>{actionStatus}</Text> : null}

      <View style={styles.sellerManageActions}>
        <View style={styles.sellerManageCopy}>
          <Text style={styles.sellerManageTitle}>게시글 상태 관리</Text>
          <Text style={styles.sellerManageMeta}>{item.status === "판매취소" ? "판매를 중단한 글이에요. 필요 없으면 삭제할 수 있어요." : "문의자가 없어도 판매를 중단하거나 글을 지울 수 있어요."}</Text>
        </View>
        <View style={styles.sellerManageButtonRow}>
          <Pressable accessibilityRole="button" disabled={item.status === "예약중" || item.status === "판매취소" || item.status === "거래완료"} onPress={onReserveListing} style={[styles.sellerReserveButton, (item.status === "예약중" || item.status === "판매취소" || item.status === "거래완료") && styles.sellerActionDisabled]}>
            <Text style={styles.sellerReserveText}>{item.status === "예약중" ? "예약중" : "예약중 변경"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={item.status === "판매취소"} onPress={onCancelListing} style={[styles.sellerCancelButton, item.status === "판매취소" && styles.sellerActionDisabled]}>
            <Text style={styles.sellerCancelText}>{item.status === "판매취소" ? "취소됨" : "판매취소"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDeleteListing} style={styles.sellerDeleteButton}>
            <Text style={styles.sellerDeleteText}>게시글 삭제</Text>
          </Pressable>
        </View>
      </View>

      {sortedInquiries.length === 0 ? (
        <View style={styles.marketEmptyCard}>
          <Text style={styles.marketEmptyTitle}>아직 문의자가 없어요</Text>
          <Text style={styles.marketEmptyCopy}>구매자가 거래문의를 누르면 이곳에 문의자별 1:1 방이 쌓이고, 판매자는 그중 실제 구매자만 완료 처리하면 돼요.</Text>
        </View>
      ) : null}

      {sortedInquiries.map((inquiry) => {
        const review = reviewsByThreadId[inquiry.id];
        const status = review ? "reviewed" : completedThreadIds.includes(inquiry.id) ? "completed" : inquiry.status;
        return (
          <View key={inquiry.id} style={styles.inquiryCard}>
            <View style={styles.inquiryAvatar}>
              <Text style={styles.inquiryAvatarText}>{inquiry.buyerName.slice(0, 1)}</Text>
            </View>
            <View style={styles.inquiryCopy}>
              <Text style={styles.inquiryName}>{inquiry.buyerName}</Text>
              <Text style={styles.inquiryMeta}>{getTradeInquiryStatusLabel(status)} · 문의자별 거래방</Text>
              {review ? <Text style={styles.inquiryReview}>{getTradeRatingCopy(review.rating)} · 판매자 망고온도 {review.sellerDelta > 0 ? "+" : ""}{review.sellerDelta.toFixed(1)}°C</Text> : null}
            </View>
            <Pressable accessibilityRole="button" onPress={() => onOpenInquiry(inquiry)} style={styles.inquiryOpenButton}>
              <Text style={styles.inquiryOpenText} numberOfLines={1}>열기</Text>
            </Pressable>
          </View>
        );
      })}
    </AppShell>
  );
}

function TradeChatRoomScreen({
  item,
  tradeThread,
  memberId,
  memberName,
  memberTemperature,
  tradeReview,
  tradeCompleted,
  isSeller,
  canConfirmTrade,
  canEvaluateTrade,
  chatMessages,
  chatDraft,
  realtimeStatus,
  actionStatus,
  chatToast,
  onBack,
  onSetDraft,
  onSend,
  onConfirmTradeComplete,
  onCompleteTrade,
  onUseQuickMessage,
  onBlockItem
}: {
  item: MarketItem;
  tradeThread: TradeInquiry;
  memberId?: string;
  memberName: string;
  memberTemperature: number;
  tradeReview?: TradeReview;
  tradeCompleted: boolean;
  isSeller: boolean;
  canConfirmTrade: boolean;
  canEvaluateTrade: boolean;
  chatMessages: MarketChatMessage[];
  chatDraft: string;
  realtimeStatus: TradeRealtimeStatus;
  actionStatus: string;
  chatToast?: { id: string; title: string; body: string } | null;
  onBack: () => void;
  onSetDraft: (text: string) => void;
  onSend: () => void;
  onConfirmTradeComplete: () => void;
  onCompleteTrade: (rating: TradeRating) => void;
  onUseQuickMessage: (text: string) => void;
  onBlockItem: (targetId: string) => void;
}) {
  const chatScrollRef = useRef<ScrollView | null>(null);
  const sellerTemperature = getAdjustedSellerTemperature(item, tradeReview);
  const sellerBadge = getAdjustedSellerBadge(item, tradeReview);
  const canRateTrade = !isSeller && canEvaluateTrade && tradeCompleted && !tradeReview;
  const canSellerCompleteTrade = isSeller && canConfirmTrade && !tradeCompleted && !tradeReview;
  const showTradeCompleteCard = isSeller || tradeCompleted || Boolean(tradeReview);
  const blockTargetId = isSeller ? (tradeThread.buyerAuthUid ?? tradeThread.buyerName) : (item.sellerAuthUid ?? item.sellerMemberName ?? item.seller);

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
          <Text style={styles.roomEyebrow}>{isSeller ? "판매관리 대화방" : "1:1 거래문의"}</Text>
          <Text style={styles.roomTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.roomMeta} numberOfLines={1}>{isSeller ? `${tradeThread.buyerName}님 문의` : `${tradeThread.sellerName} 판매자`} · {item.area} · {item.price}</Text>
          <Text style={styles.roomRealtimeMeta}>{getTradeRealtimeStatusCopy(realtimeStatus)}</Text>
        </View>
      </View>

      {chatToast ? (
        <View style={styles.tradeToast}>
          <Text style={styles.tradeToastTitle}>{chatToast.title}</Text>
          <Text style={styles.tradeToastBody} numberOfLines={1}>{chatToast.body}</Text>
        </View>
      ) : null}

      <View style={styles.tradeProductCard}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.tradeProductPhoto} />
        ) : (
          <View style={styles.tradeProductIcon}>
            <Text style={styles.tradeProductIconText}>{item.title.slice(0, 1)}</Text>
          </View>
        )}
        <View style={styles.tradeProductCopy}>
          <Text style={styles.tradeProductStatus}>{item.status}</Text>
          <Text style={styles.tradeProductTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.tradeProductSeller} numberOfLines={1}>판매자 · {item.seller}</Text>
          <View style={styles.tradeTemperatureRow}>
            <Text style={[styles.tradeTemperature, { color: getTemperatureTone(sellerTemperature) }]}>{sellerTemperature.toFixed(1)}°C</Text>
            <Text style={styles.tradeTemperatureLabel}>{sellerBadge}</Text>
          </View>
          <View style={styles.tradeTemperatureMeterTrack}>
            <View
              style={[
                styles.tradeTemperatureMeterFill,
                { width: `${getTemperatureProgress(sellerTemperature)}%`, backgroundColor: getTemperatureTone(sellerTemperature) }
              ]}
            />
          </View>
        </View>
        <Text style={styles.tradeProductPrice}>{item.price}</Text>
      </View>

      <CommunitySafetyActions
        reporterId={memberId ?? memberName}
        targetType="market_item"
        targetId={item.id}
        targetName={item.title}
        blockTargetType="profile"
        blockTargetId={blockTargetId}
        onBlock={onBlockItem}
      />

      <View style={styles.roomNotice}>
        <Text style={styles.roomNoticeText}>
          {isSeller
            ? `${tradeThread.buyerName}님이 실제 구매자가 맞을 때만 거래완료를 처리하세요. 그 다음 이 구매자에게만 평가가 열려요.`
            : "공개 장소에서 만나고, 물건 상태와 유효기간을 현장에서 확인하세요. 판매자가 거래완료 처리한 뒤 평가할 수 있어요."}
        </Text>
      </View>

      <View style={styles.tradeSafetyTipCard}>
        <Text style={styles.tradeSafetyTipLabel}>안전 TIP</Text>
        <Text style={styles.tradeSafetyTipText}>
          연락처나 송금 요청이 나오더라도 거래 내용은 이 대화방에 남겨두세요. 공개 장소 직거래와 현장 확인이 가장 안전해요.
        </Text>
      </View>

      {showTradeCompleteCard ? (
        <View style={[styles.tradeCompleteCard, tradeReview && styles.tradeCompleteCardDone]}>
          <View style={styles.tradeCompleteHeader}>
            <View>
              <Text style={styles.tradeCompleteEyebrow}>
                {tradeReview ? "거래 완료" : tradeCompleted ? (isSeller ? "평가 대기" : "평가 가능") : "판매자 확인"}
              </Text>
              <Text style={styles.tradeCompleteTitle}>
                {tradeReview
                  ? `${getTradeRatingCopy(tradeReview.rating)} · 거래 후기 저장됨`
                  : tradeCompleted
                    ? isSeller
                      ? "구매자 평가를 기다리는 중"
                      : "거래 후기를 남겨주세요"
                    : "거래완료 처리"}
              </Text>
            </View>
            <Text style={styles.tradeCompleteBadge}>{tradeReview ? "반영됨" : tradeCompleted ? "완료" : "판매자"}</Text>
          </View>
          {tradeReview ? (
            <Text style={styles.tradeCompleteCopy}>
              거래 후기는 장터 신뢰 참고용으로만 기록돼요.
            </Text>
          ) : null}
          {canSellerCompleteTrade ? (
            <Pressable
              accessibilityRole="button"
              onPress={onConfirmTradeComplete}
              style={styles.tradeCompleteAction}
            >
              <Text style={styles.tradeCompleteActionText}>거래완료 처리</Text>
            </Pressable>
          ) : null}
          {canRateTrade ? (
            <>
              <Text style={styles.tradePraiseTitle}>남기고 싶은 칭찬을 선택해 주세요</Text>
              <View style={styles.tradePraiseList}>
                {tradePraiseOptions.map((option) => (
                  <Pressable key={option} accessibilityRole="button" onPress={() => onCompleteTrade("good")} style={styles.tradePraiseButton}>
                    <Text style={styles.tradePraiseCheck}>✓</Text>
                    <Text style={styles.tradePraiseText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.tradeRatingRow}>
                <Pressable accessibilityRole="button" onPress={() => onCompleteTrade("good")} style={[styles.tradeRatingButton, styles.tradeRatingButtonGood]}>
                  <Text style={styles.tradeRatingLabel}>좋았어요</Text>
                  <Text style={styles.tradeRatingDelta}>+0.2°</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => onCompleteTrade("ok")} style={styles.tradeRatingButton}>
                  <Text style={styles.tradeRatingLabel}>보통이에요</Text>
                  <Text style={styles.tradeRatingDelta}>+0.1°</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => onCompleteTrade("bad")} style={[styles.tradeRatingButton, styles.tradeRatingButtonBad]}>
                  <Text style={styles.tradeRatingLabel}>문제있어요</Text>
                  <Text style={[styles.tradeRatingDelta, styles.tradeRatingDeltaBad]}>-0.2°</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

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
            <Text style={styles.roomEmptyChatCopy}>첫 메시지로 거래 가능 시간과 만날 위치를 가볍게 물어보세요.</Text>
          </View>
        ) : null}
        {chatMessages.map((message, index) => (
          <View
            key={message.id}
            style={[
              styles.tradeBubble,
              index > 0 && chatMessages[index - 1]?.sender === message.sender && message.sender !== "system" && styles.tradeBubbleGrouped,
              ((isSeller && message.sender === "seller") || (!isSeller && message.sender === "buyer")) && styles.tradeBubbleMe,
              message.sender === "system" && styles.tradeBubbleSystem
            ]}
          >
            {index === 0 || chatMessages[index - 1]?.sender !== message.sender || message.sender === "system" ? <Text style={[styles.tradeSender, ((isSeller && message.sender === "seller") || (!isSeller && message.sender === "buyer")) && styles.tradeSenderMe]}>
              {message.sender === "buyer" ? (isSeller ? tradeThread.buyerName : memberName) : message.sender === "seller" ? (isSeller ? memberName : item.seller) : "안내"}
            </Text> : null}
            <Text style={[styles.tradeMessage, ((isSeller && message.sender === "seller") || (!isSeller && message.sender === "buyer")) && styles.tradeMessageMe]}>{message.text}</Text>
            {index === chatMessages.length - 1 || chatMessages[index + 1]?.sender !== message.sender || message.sender === "system" ? <Text style={[styles.tradeTimeText, ((isSeller && message.sender === "seller") || (!isSeller && message.sender === "buyer")) && styles.tradeTimeTextMe]}>
              {formatChatTime(message.createdAt)}
            </Text> : null}
          </View>
        ))}
        </ScrollView>
      </View>

      <View style={styles.tradeQuickRow}>
        {(isSeller ? ["공개 장소에서 만나요", "물건 상태 확인해주세요", "결제 확인 후 완료 처리할게요"] : ["아직 판매중인가요?", "어디서 거래 가능해요?", "가격 조정 가능해요?"]).map((text) => (
          <Pressable key={text} accessibilityRole="button" onPress={() => onUseQuickMessage(text)} style={styles.tradeQuickChip}>
            <Text style={styles.tradeQuickText}>{text}</Text>
          </Pressable>
        ))}
      </View>

      {actionStatus ? <Text style={styles.roomActionStatus}>{actionStatus}</Text> : null}

      <View style={styles.roomComposer}>
        <TextInput
          value={chatDraft}
          onChangeText={onSetDraft}
          placeholder="메시지 입력"
          placeholderTextColor="#7A8B84"
          style={styles.roomComposerInput}
          multiline
        />
        <Pressable accessibilityRole="button" onPress={onSend} style={[styles.roomSendButton, !chatDraft.trim() && styles.tradeSendButtonDisabled]}>
          <Text style={styles.roomSendText} numberOfLines={1}>전송</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  cityCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    ...shadow
  },
  sectionLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  cityRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11
  },
  cityChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    backgroundColor: "#FFF7DF",
    paddingHorizontal: 13,
    paddingVertical: 9
  },
  cityChipActive: {
    backgroundColor: "#FFC233",
    borderColor: "#FFC233"
  },
  cityText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  cityTextActive: {
    color: colors.ink
  },
  marketControlCard: {
    marginTop: 12,
    borderRadius: 24,
    padding: 14,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.18)",
    ...shadow
  },
  marketControlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  marketControlEyebrow: {
    color: colors.sunset,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900"
  },
  marketControlTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    marginTop: 2
  },
  marketControlBadge: {
    flexShrink: 0,
    color: colors.ink,
    backgroundColor: "#FFD43B",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900"
  },
  marketModeRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 13
  },
  marketModeChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)"
  },
  marketModeChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  marketModeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  marketModeTextActive: {
    color: "#FFFFFF"
  },
  marketModeCount: {
    minWidth: 18,
    overflow: "hidden",
    borderRadius: 999,
    textAlign: "center",
    color: colors.ink,
    backgroundColor: "#FFD43B",
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "900"
  },
  marketModeCountActive: {
    color: colors.ink,
    backgroundColor: "#FFC233"
  },
  interestFilterCard: {
    marginTop: 12,
    borderRadius: 24,
    padding: 14,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)",
    ...shadow
  },
  interestFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  interestFilterEyebrow: {
    color: "#B77900",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900"
  },
  interestFilterTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 2
  },
  interestFilterBadge: {
    flexShrink: 0,
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900"
  },
  interestFilterRail: {
    gap: 7,
    paddingTop: 12,
    paddingRight: 4
  },
  interestFilterChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#F1D9A8"
  },
  interestFilterChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  interestFilterText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "900"
  },
  interestFilterTextActive: {
    color: "#FFFFFF"
  },
  marketHelpCard: {
    marginTop: 12,
    borderRadius: 28,
    padding: 18,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.18)",
    ...shadow
  },
  marketHelpTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900"
  },
  marketHelpCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 6
  },
  marketHelpGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18
  },
  marketHelpTile: {
    width: "30.8%",
    minHeight: 86,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#F8F8F6",
    borderWidth: 1,
    borderColor: "rgba(18,32,51,0.06)"
  },
  marketHelpIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    textAlign: "center",
    lineHeight: 34,
    color: "#FFFFFF",
    backgroundColor: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    overflow: "hidden"
  },
  marketHelpLabel: {
    color: colors.ink,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
    textAlign: "center"
  },
  marketFaqList: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(18,32,51,0.08)"
  },
  marketFaqRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(18,32,51,0.08)"
  },
  marketFaqQ: {
    color: colors.greenDeep,
    fontSize: 16,
    fontWeight: "900"
  },
  marketFaqText: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  marketFaqArrow: {
    color: "rgba(18,32,51,0.34)",
    fontSize: 24,
    lineHeight: 24
  },
  marketSummary: {
    minHeight: 74,
    borderRadius: 22,
    backgroundColor: "rgba(255,239,185,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)",
    padding: 14,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    ...neonShadow
  },
  marketSummaryCopy: {
    flex: 1,
    minWidth: 0
  },
  marketSummaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  marketSummaryValue: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    marginTop: 4
  },
  marketSummaryBadge: {
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900"
  },
  marketWriteButton: {
    flexShrink: 0,
    minWidth: 96,
    minHeight: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    paddingHorizontal: 16,
    ...sunsetGlow
  },
  marketWriteButtonText: {
    color: "#FFF7F0",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  postForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 0,
    borderWidth: 1,
    borderColor: "rgba(18,32,51,0.08)",
    marginTop: 14,
    overflow: "hidden",
    ...shadow
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 72,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(18,32,51,0.06)"
  },
  formHeaderSide: {
    width: 44
  },
  formTitle: {
    flex: 1,
    color: "#111827",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  formCopy: {
    color: colors.nightMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  closeButtonText: {
    color: "#111827",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900"
  },
  aiWriteCard: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(18,32,51,0.06)"
  },
  aiWriteTitle: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  aiWriteCopy: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 4
  },
  aiToggle: {
    width: 54,
    height: 32,
    borderRadius: 16,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: "#22C55E"
  },
  aiToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF"
  },
  productSection: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 8,
    borderBottomColor: "#F3F4F6"
  },
  productSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14
  },
  productSectionTitle: {
    color: "#111827",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  productLimitLink: {
    color: "#8B95A1",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  productInfoGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  productPhotoCell: {
    width: 116,
    gap: 8
  },
  productPhotoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F3"
  },
  productPhotoIcon: {
    color: "#6B7280",
    fontSize: 22,
    fontWeight: "900"
  },
  productPhotoText: {
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 4
  },
  productPhotoPreview: {
    width: 112,
    height: 112,
    borderRadius: 4,
    backgroundColor: "#EEF2F3"
  },
  productInfoRows: {
    flex: 1,
    minWidth: 0
  },
  productInfoRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  productInfoLabel: {
    width: 76,
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  productInfoValue: {
    flex: 1,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  categorySelectButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8
  },
  categorySelectValue: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900"
  },
  categorySelectArrow: {
    color: "#111827",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "900"
  },
  categoryPickerPanel: {
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    shadowColor: "#B77900",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4
  },
  categoryPickerHeader: {
    width: "100%",
    marginBottom: 8
  },
  categoryPickerTitle: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  categoryPickerHint: {
    color: "#8B95A1",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 2
  },
  categoryOptionChip: {
    minHeight: 38,
    borderRadius: 13,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#F1D9A8"
  },
  categoryOptionChipActive: {
    backgroundColor: "#FFC233",
    borderColor: "#FFB000"
  },
  categoryOptionText: {
    color: "#5B6472",
    fontSize: 12,
    fontWeight: "900"
  },
  categoryOptionTextActive: {
    color: "#111827"
  },
  optionRail: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 8
  },
  optionChip: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  optionChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827"
  },
  optionChipText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "900"
  },
  optionChipTextActive: {
    color: "#FFFFFF"
  },
  productLineInput: {
    flex: 1,
    minHeight: 44,
    color: "#111827",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    paddingHorizontal: 0,
    paddingVertical: 8
  },
  productLineInputDisabled: {
    color: "#8B95A1"
  },
  priceInputGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  priceUnitRail: {
    flexDirection: "row",
    gap: 5
  },
  priceUnitChip: {
    minHeight: 30,
    minWidth: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  priceUnitChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827"
  },
  priceUnitText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "900"
  },
  priceUnitTextActive: {
    color: "#FFFFFF"
  },
  templateButton: {
    minHeight: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB"
  },
  templateButtonText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900"
  },
  productDescriptionInput: {
    minHeight: 170,
    borderRadius: 6,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: "top"
  },
  descriptionCount: {
    alignSelf: "flex-end",
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6
  },
  tradeMethodCard: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  tradeMethodLabel: {
    width: 72,
    color: "#111827",
    fontSize: 14,
    fontWeight: "900"
  },
  tradeLocationInput: {
    flex: 1,
    minHeight: 46,
    color: "#111827",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    paddingHorizontal: 0
  },
  tradeOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  tradeOptionActive: {
    flex: 1,
    minHeight: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF"
  },
  tradeOptionActiveText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900"
  },
  tradeOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB"
  },
  tradeOptionText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "900"
  },
  saleNotice: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderTopColor: "#F1F2F4"
  },
  saleNoticeText: {
    color: "#8B95A1",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  inputLabel: {
    color: colors.nightText,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 7
  },
  textInput: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.20)",
    color: colors.nightText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  multilineInput: {
    minHeight: 86,
    textAlignVertical: "top"
  },
  photoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  photoCountBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: "#FFFFFF",
    backgroundColor: colors.sunset,
    fontSize: 11,
    fontWeight: "900"
  },
  photoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8"
  },
  photoPlaceholderText: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900"
  },
  photoPreview: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: "#FFF4D8"
  },
  photoPreviewWrap: {
    position: "relative"
  },
  photoRemoveButton: {
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
  photoRemoveText: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "900"
  },
  photoStatusText: {
    color: "#E11D48",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 8
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
  filePickerFallbackCompact: {
    flex: 0,
    width: 112,
    minHeight: 34,
    borderRadius: 999
  },
  filePickerFallbackText: {
    color: colors.greenDeep,
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
  submitButton: {
    minHeight: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    marginTop: 13,
    ...sunsetGlow
  },
  submitButtonDisabled: {
    opacity: 0.45
  },
  submitButtonText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "900"
  },
  postSuccessCard: {
    borderRadius: 20,
    backgroundColor: "rgba(255,194,51,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.30)",
    padding: 13,
    marginTop: 12
  },
  postSuccessTitle: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "900"
  },
  postSuccessCopy: {
    color: colors.nightMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 5
  },
  marketEmptyCard: {
    borderRadius: 24,
    backgroundColor: "#FFFDF7",
    borderWidth: 1,
    borderColor: "rgba(255,159,28,0.24)",
    padding: 18,
    marginTop: 12,
    ...shadow
  },
  marketEmptyKicker: {
    alignSelf: "flex-start",
    color: colors.greenDeep,
    backgroundColor: "rgba(255,212,59,0.26)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 9
  },
  marketEmptyTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  marketEmptyCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 6
  },
  itemCard: {
    backgroundColor: "#FFFDF8",
    borderRadius: 20,
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.18)",
    marginTop: 10,
    ...shadow
  },
  itemCardFresh: {
    borderColor: colors.sunset,
    borderWidth: 2,
    backgroundColor: "#FFF7EE"
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  itemPhotoWrap: {
    position: "relative"
  },
  itemPhoto: {
    width: 98,
    height: 98,
    borderRadius: 14,
    backgroundColor: "#FFF4D8"
  },
  itemPhotoCount: {
    position: "absolute",
    right: 6,
    bottom: 6,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: "#FFFFFF",
    backgroundColor: "rgba(16,35,28,0.78)",
    fontSize: 11,
    fontWeight: "900"
  },
  itemBody: {
    flex: 1,
    minWidth: 0
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5
  },
  status: {
    color: "#7A3A00",
    backgroundColor: "#FFF1C2",
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  statusReserved: {
    color: "#8A4B00",
    backgroundColor: "#FFE1A3"
  },
  statusSold: {
    color: "#FFFFFF",
    backgroundColor: "#111827"
  },
  statusCanceled: {
    color: "#8B95A1",
    backgroundColor: "#E5E7EB"
  },
  statusInquiry: {
    color: "#0F766E",
    backgroundColor: "#DFF7EA"
  },
  marketUnreadPill: {
    color: colors.card,
    backgroundColor: "#FF7A00",
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  area: {
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  itemTitle: {
    color: "#172033",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 6
  },
  seller: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    maxWidth: 112
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 7
  },
  temperatureBadge: {
    backgroundColor: "#FFF1C2",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "900"
  },
  sellerBadgeText: {
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "900"
  },
  temperatureMeterTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginTop: 7
  },
  temperatureMeterFill: {
    height: "100%",
    borderRadius: 999
  },
  price: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    marginTop: 3
  },
  note: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4
  },
  feedFooter: {
    alignItems: "stretch",
    justifyContent: "flex-start",
    gap: 8,
    marginTop: 10
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    minWidth: 0
  },
  tag: {
    color: "#0F766E",
    backgroundColor: "#FFF1C2",
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900"
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
    minWidth: 0
  },
  softButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F3",
    borderWidth: 1,
    borderColor: "#FFD7E0",
    paddingHorizontal: 10
  },
  softButtonText: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center"
  },
  darkButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunset,
    paddingHorizontal: 11,
    ...sunsetGlow
  },
  darkButtonDisabled: {
    opacity: 0.5
  },
  darkButtonText: {
    color: "#FFF7F0",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center"
  },
  sellerManageActions: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.26)",
    padding: 13,
    marginTop: 12,
    ...shadow
  },
  sellerManageCopy: {
    gap: 4
  },
  sellerManageTitle: {
    color: colors.nightText,
    fontSize: 15,
    fontWeight: "900"
  },
  sellerManageMeta: {
    color: colors.nightMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800"
  },
  sellerManageButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  sellerReserveButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,212,59,0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,183,3,0.42)"
  },
  sellerReserveText: {
    color: "#8A5A00",
    fontSize: 12,
    fontWeight: "900"
  },
  sellerCancelButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,122,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.30)"
  },
  sellerCancelText: {
    color: colors.sunset,
    fontSize: 12,
    fontWeight: "900"
  },
  sellerDeleteButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,111,15,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,111,15,0.26)"
  },
  sellerDeleteText: {
    color: "#FF6F0F",
    fontSize: 12,
    fontWeight: "900"
  },
  sellerActionDisabled: {
    opacity: 0.5
  },
  inquiryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    padding: 12,
    marginTop: 12,
    ...shadow
  },
  inquiryAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,194,51,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.30)"
  },
  inquiryAvatarText: {
    color: colors.cyan,
    fontSize: 17,
    fontWeight: "900"
  },
  inquiryCopy: {
    flex: 1,
    minWidth: 0
  },
  inquiryName: {
    color: colors.nightText,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  inquiryMeta: {
    color: colors.nightMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 3
  },
  inquiryReview: {
    color: colors.cyan,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
    marginTop: 4
  },
  inquiryOpenButton: {
    minHeight: 38,
    borderRadius: 15,
    backgroundColor: colors.sunset,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...sunsetGlow
  },
  inquiryOpenText: {
    color: "#FFF7F0",
    fontSize: 12,
    fontWeight: "900"
  },
  tradeChatBox: {
    backgroundColor: "#FFF1BD",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1D9A8",
    padding: 12,
    marginTop: 10
  },
  tradeChatHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8
  },
  tradeChatTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  tradeChatStatus: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3
  },
  tradeChatBadge: {
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  tradeBubble: {
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
  tradeBubbleGrouped: {
    marginTop: 3,
    paddingVertical: 8
  },
  tradeBubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: "#FFD43B",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 6
  },
  tradeBubbleSystem: {
    alignSelf: "center",
    maxWidth: "92%",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18
  },
  tradeSender: {
    color: colors.greenDeep,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 3
  },
  tradeSenderMe: {
    color: colors.ink,
    textAlign: "right"
  },
  tradeMessage: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  tradeMessageMe: {
    color: colors.ink
  },
  tradeTimeText: {
    color: "rgba(67,81,95,0.62)",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    marginTop: 4
  },
  tradeTimeTextMe: {
    color: "rgba(43,23,0,0.62)",
    textAlign: "right"
  },
  tradeToast: {
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
  tradeToastTitle: {
    color: "#FFC233",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 3
  },
  tradeToastBody: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900"
  },
  tradeQuickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 11
  },
  tradeQuickChip: {
    maxWidth: "100%",
    borderRadius: 999,
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  tradeQuickText: {
    color: colors.greenDeep,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15
  },
  tradeComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10
  },
  tradeInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: "#FFF4D8",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  tradeSendButton: {
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: colors.mintDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13
  },
  tradeSendButtonDisabled: {
    opacity: 0.48
  },
  tradeSendText: {
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
  roomRealtimeMeta: {
    alignSelf: "flex-start",
    color: colors.greenDeep,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.52)",
    borderWidth: 1,
    borderColor: "rgba(25,181,116,0.22)"
  },
  tradeProductCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 22,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#F1E2C9",
    padding: 12,
    marginTop: 12
  },
  tradeProductPhoto: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#FFF0F3"
  },
  tradeProductIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F3",
    borderWidth: 1,
    borderColor: "#FFD2DD"
  },
  tradeProductIconText: {
    color: "#E11D48",
    fontSize: 18,
    fontWeight: "900"
  },
  tradeProductCopy: {
    flex: 1,
    minWidth: 0
  },
  tradeProductStatus: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "900"
  },
  tradeProductTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 3
  },
  tradeProductSeller: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4
  },
  tradeTemperatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6
  },
  tradeTemperature: {
    backgroundColor: "#FFF4D8",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "900"
  },
  tradeTemperatureLabel: {
    color: colors.greenDeep,
    fontSize: 11,
    fontWeight: "900"
  },
  tradeTemperatureMeterTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginTop: 7
  },
  tradeTemperatureMeterFill: {
    height: "100%",
    borderRadius: 999
  },
  tradeProductPrice: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "right",
    maxWidth: 86
  },
  roomNotice: {
    borderRadius: 18,
    backgroundColor: "rgba(255,194,51,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12
  },
  roomNoticeText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  tradeSafetyTipCard: {
    borderRadius: 18,
    backgroundColor: "#ECFFF6",
    borderWidth: 1,
    borderColor: "rgba(25,181,116,0.26)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 10
  },
  tradeSafetyTipLabel: {
    color: colors.greenDeep,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    marginBottom: 4
  },
  tradeSafetyTipText: {
    color: "#315247",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800"
  },
  tradeCompleteCard: {
    borderRadius: 22,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    padding: 13,
    marginTop: 12
  },
  tradeCompleteCardDone: {
    backgroundColor: "#ECFFF6",
    borderColor: "rgba(25,181,116,0.28)"
  },
  tradeCompleteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start"
  },
  tradeCompleteEyebrow: {
    color: colors.greenDeep,
    fontSize: 11,
    fontWeight: "900"
  },
  tradeCompleteTitle: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    marginTop: 3
  },
  tradeCompleteBadge: {
    color: colors.ink,
    backgroundColor: "#FFC233",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900"
  },
  tradeCompleteCopy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 8
  },
  tradeCompleteAction: {
    minHeight: 46,
    borderRadius: 17,
    backgroundColor: colors.sunset,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    ...sunsetGlow
  },
  tradeCompleteActionText: {
    color: "#FFF7F0",
    fontSize: 13,
    fontWeight: "900"
  },
  tradePraiseTitle: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 13,
    textAlign: "center"
  },
  tradePraiseList: {
    gap: 8,
    marginTop: 10
  },
  tradePraiseButton: {
    minHeight: 44,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1D9A8"
  },
  tradePraiseCheck: {
    width: 22,
    height: 22,
    overflow: "hidden",
    borderRadius: 999,
    textAlign: "center",
    color: colors.greenDeep,
    backgroundColor: "#ECFFF6",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "900"
  },
  tradePraiseText: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  tradeRatingRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  tradeRatingButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1D9A8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  tradeRatingButtonGood: {
    backgroundColor: "#FFF1C2",
    borderColor: "rgba(25,181,116,0.32)"
  },
  tradeRatingButtonBad: {
    backgroundColor: "#FFF2F3",
    borderColor: "#FFD2DD"
  },
  tradeRatingLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  tradeRatingDelta: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3
  },
  tradeRatingDeltaBad: {
    color: "#E11D48"
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
  roomSendText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
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
  }
});
