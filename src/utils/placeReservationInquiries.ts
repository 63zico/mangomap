import type { Destination } from "../types";

export type PlaceReservationInquiry = {
  id: string;
  placeId: string;
  placeName: string;
  city: Destination;
  draft: string;
  createdAt: string;
  status: "draft" | "sent";
};

type ReservationInquiryInput = {
  placeId: string;
  placeName: string;
  city: Destination;
  draft: string;
};

const storageKey = "mangomap-place-reservation-inquiries-v1";

export function loadPlaceReservationInquiries(): PlaceReservationInquiry[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isReservationInquiry)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  } catch {
    return [];
  }
}

export function savePlaceReservationInquiry(input: ReservationInquiryInput): PlaceReservationInquiry {
  const inquiry: PlaceReservationInquiry = {
    ...input,
    id: createInquiryId(input.placeId),
    draft: input.draft.trim(),
    createdAt: new Date().toISOString(),
    status: "draft"
  };

  const storage = getStorage();
  if (!storage) return inquiry;

  const next = [inquiry, ...loadPlaceReservationInquiries()].slice(0, 50);
  storage.setItem(storageKey, JSON.stringify(next));
  return inquiry;
}

export function deletePlaceReservationInquiry(id: string) {
  const storage = getStorage();
  if (!storage) return;

  const next = loadPlaceReservationInquiries().filter((inquiry) => inquiry.id !== id);
  storage.setItem(storageKey, JSON.stringify(next));
}

function getStorage(): Storage | undefined {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return undefined;
  return globalThis.localStorage;
}

function createInquiryId(placeId: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${placeId}-${randomId}`;
}

function isReservationInquiry(value: unknown): value is PlaceReservationInquiry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PlaceReservationInquiry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.placeId === "string" &&
    typeof candidate.placeName === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.draft === "string" &&
    typeof candidate.createdAt === "string" &&
    (candidate.status === "draft" || candidate.status === "sent")
  );
}
