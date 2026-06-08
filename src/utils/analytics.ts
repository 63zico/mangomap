export type AnalyticsEventName =
  | "view_home"
  | "click_nearby_places"
  | "search_place"
  | "view_place"
  | "save_place"
  | "share_place"
  | "comment_place"
  | "report_place"
  | "open_google_maps";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (command: "event", eventName: string, payload?: AnalyticsPayload) => void;
  }
}

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const eventPayload = {
    event: name,
    ...payload
  };

  window.dataLayer?.push(eventPayload);
  window.gtag?.("event", name, payload);

  if (process.env.NODE_ENV !== "production") {
    console.info("[MANGOMAP analytics]", name, payload);
  }
}
