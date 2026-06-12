import type { Listing } from "@/lib/places";
import { SITE_URL } from "@/lib/site";

type PhotoSize = {
  width?: number;
  height?: number;
};

export function getPlacePhotoNames(listing: Pick<Listing, "photoName" | "photoNames">) {
  return Array.from(new Set([listing.photoName, ...(listing.photoNames ?? [])].filter(Boolean))) as string[];
}

export function getPlacePhotoSrc(listing: Pick<Listing, "photoName" | "photoNames" | "name" | "category">, index = 0, size: PhotoSize = {}) {
  const name = getPlacePhotoNames(listing)[index];
  if (!name) return undefined;

  const params = new URLSearchParams({
    name,
    w: String(size.width ?? 720),
    h: String(size.height ?? 520),
    label: listing.category || "Mango Vietnam",
  });

  return `/api/place-photo?${params.toString()}`;
}

export function getAbsolutePlacePhotoSrc(
  listing: Pick<Listing, "photoName" | "photoNames" | "name" | "category">,
  index = 0,
  size: PhotoSize = {},
) {
  const src = getPlacePhotoSrc(listing, index, size);
  return src ? `${SITE_URL}${src}` : undefined;
}
