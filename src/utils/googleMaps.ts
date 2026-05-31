import { Linking, Platform } from "react-native";

type PlaceLike = {
  googleMapsUri?: string;
  mapQuery?: string;
  placeName?: string;
  name?: string;
};

export function buildGoogleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(points: string[]) {
  const routePoints = points.map((point) => encodeURIComponent(point)).join("/");
  return `https://www.google.com/maps/dir/${routePoints}`;
}

export function getGoogleMapsPlaceUrl(place: PlaceLike, fallbackContext?: string) {
  if (place.googleMapsUri?.trim()) return place.googleMapsUri.trim();

  const query = [place.mapQuery, place.placeName, place.name, fallbackContext]
    .filter(Boolean)
    .join(" ")
    .trim();

  return buildGoogleMapsSearchUrl(query || "Vietnam");
}

export function openGoogleMapsPlace(place: PlaceLike, fallbackContext?: string) {
  return openExternalGoogleMapsUrl(getGoogleMapsPlaceUrl(place, fallbackContext));
}

export function openGoogleMapsSearch(query: string) {
  return openExternalGoogleMapsUrl(buildGoogleMapsSearchUrl(query));
}

export function openGoogleMapsUrl(url: string) {
  return openExternalGoogleMapsUrl(url);
}

function openExternalGoogleMapsUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.assign(url);
    return Promise.resolve();
  }

  return Linking.openURL(url);
}
