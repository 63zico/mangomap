import Link from "next/link";
import { Bookmark, Camera, MapPin, MessageSquareText } from "lucide-react";

import { getListingCopy } from "@/lib/listing-copy";
import { getPlacePhotoSrc } from "@/lib/place-photos";
import type { Listing } from "@/lib/places";
import { categoryLabelForListing, getKoreanFitScore, getRestaurantDecisionTags } from "@/lib/places";
import { formatCount } from "@/lib/utils";

export function ListingCard({ listing, priority = false }: { listing: Listing; priority?: boolean }) {
  const photoSrc = getPlacePhotoSrc(listing, 0, { width: 860, height: 620 });
  const categoryLabel = categoryLabelForListing(listing);
  const score = getDisplayScore(listing);
  const reason = getListingCopy(listing, categoryLabel).cardReason;
  const decisionTags = getRestaurantDecisionTags(listing).slice(0, 3);

  return (
    <Link href={`/listing/${listing.slug}`} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0068f0]">
      <article className="bg-white">
        <div className="relative overflow-hidden bg-[#e7e8ec]">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={`${listing.name} 대표 사진`}
              className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.035]"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center bg-[#e7e8ec] text-sm font-black uppercase text-[#666]">No Photo</div>
          )}
          <div className="absolute right-3 top-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe14a] text-2xl font-black text-black shadow-[0_4px_14px_rgba(0,0,0,0.14)]">
            {score}
          </div>
          <Bookmark className="absolute bottom-4 right-4 text-white drop-shadow" size={25} strokeWidth={2.4} aria-hidden="true" />
        </div>

        <div className="pt-5">
          <h3 className="text-3xl font-black leading-[0.96] tracking-normal text-[#111] transition group-hover:text-[#0068f0] md:text-4xl">
            {listing.name}
          </h3>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-black uppercase tracking-normal">
            <span>{categoryLabel}</span>
            <span className="h-5 w-px bg-[#cfcfcf]" />
            <span>{listing.area || listing.city}</span>
          </div>

          <p className="mt-4 line-clamp-2 text-base font-medium leading-7 text-[#202020]">{reason}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {decisionTags.map((tag) => (
              <span key={tag} className="border border-[#d9d9d9] bg-white px-3 py-1 text-xs font-black uppercase text-[#111]">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#e5e5e5] pt-4 text-xs font-black uppercase text-[#202020]">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareText size={15} />
              후기 {formatCount(listing.reviewTotal)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Camera size={15} />
              사진 {listing.photoTotal}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin size={15} className="shrink-0" />
              <span className="truncate">{listing.city}</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function getDisplayScore(listing: Listing) {
  if (listing.rating) return (Math.round(listing.rating * 20) / 10).toFixed(1);
  return (Math.round(getKoreanFitScore(listing)) / 10).toFixed(1);
}
