import type { Destination, GooglePlace, GooglePlaceCategory, GooglePlacesState } from "../types";

const coordinatesByDestination: Record<Destination, { latitude: number; longitude: number }> = {
  호치민: { latitude: 10.7769, longitude: 106.7009 },
  다낭: { latitude: 16.0544, longitude: 108.2022 },
  나트랑: { latitude: 12.2388, longitude: 109.1967 },
  하노이: { latitude: 21.0278, longitude: 105.8342 },
  달랏: { latitude: 11.9404, longitude: 108.4583 },
  푸꾸옥: { latitude: 10.2899, longitude: 103.984 }
};

type PlacesApiPlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  googleMapsUri?: string;
};

type PlacesTextSearchResponse = {
  places?: PlacesApiPlace[];
};

export function createInitialGooglePlacesState(destination: Destination): GooglePlacesState {
  return {
    destination,
    status: "idle",
    restaurants: [],
    cafes: []
  };
}

export async function loadGooglePlaces(destination: Destination): Promise<GooglePlacesState> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      destination,
      status: "missingKey",
      restaurants: [],
      cafes: [],
      message: "Google Places API 키를 연결하면 실제 식당/카페 추천을 불러올 수 있어요."
    };
  }

  try {
    const [restaurants, cafes] = await Promise.all([
      searchPlaces(destination, "restaurant", apiKey),
      searchPlaces(destination, "cafe", apiKey)
    ]);

    return {
      destination,
      status: "ready",
      restaurants,
      cafes
    };
  } catch {
    return {
      destination,
      status: "error",
      restaurants: [],
      cafes: [],
      message: "Google Places 데이터를 불러오지 못했어요. API 키, 결제, Places API 활성화를 확인하세요."
    };
  }
}

async function searchPlaces(destination: Destination, category: GooglePlaceCategory, apiKey: string): Promise<GooglePlace[]> {
  const coordinates = coordinatesByDestination[destination];
  const keyword = category === "restaurant" ? "요즘 뜨는 한국인 추천 맛집" : "요즘 뜨는 한국인 추천 카페";

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri"
    },
    body: JSON.stringify({
      textQuery: `${destination} ${keyword}`,
      languageCode: "ko",
      regionCode: "VN",
      maxResultCount: 10,
      locationBias: {
        circle: {
          center: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          },
          radius: 12000
        }
      }
    })
  });

  if (!response.ok) throw new Error("Google Places request failed");

  const data = (await response.json()) as PlacesTextSearchResponse;
  return (data.places ?? [])
    .filter((place) => place.id && place.displayName?.text)
    .map((place) => ({
      id: place.id as string,
      name: place.displayName?.text ?? "이름 없음",
      category,
      address: place.formattedAddress,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      priceLevel: place.priceLevel,
      googleMapsUri: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text ?? destination)}`
    }))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0));
}
