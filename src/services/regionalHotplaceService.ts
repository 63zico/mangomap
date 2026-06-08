import type { CuratedPlace, CuratedPlaceCategory, Destination } from "../types";

export type RegionalHotplaceState = {
  destination: Destination;
  status: "idle" | "loading" | "ready" | "missingKey" | "error";
  places: CuratedPlace[];
  message?: string;
};

type PlacesApiReview = {
  rating?: number;
  text?: {
    text?: string;
    languageCode?: string;
  };
  originalText?: {
    text?: string;
    languageCode?: string;
  };
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
  photos?: Array<{
    name?: string;
  }>;
  reviews?: PlacesApiReview[];
};

type PlacesTextSearchResponse = {
  places?: PlacesApiPlace[];
};

type RegionalQuery = {
  category: CuratedPlaceCategory;
  query: string;
  tags: string[];
};

const cityMeta: Record<Destination, { english: string; addressHints: string[]; center: { latitude: number; longitude: number } }> = {
  호치민: {
    english: "Ho Chi Minh City",
    addressHints: ["Hồ Chí Minh", "Ho Chi Minh"],
    center: { latitude: 10.7769, longitude: 106.7009 }
  },
  다낭: {
    english: "Da Nang",
    addressHints: ["Đà Nẵng", "Da Nang"],
    center: { latitude: 16.0544, longitude: 108.2022 }
  },
  나트랑: {
    english: "Nha Trang",
    addressHints: ["Nha Trang", "Khánh Hòa"],
    center: { latitude: 12.2388, longitude: 109.1967 }
  },
  하노이: {
    english: "Hanoi",
    addressHints: ["Hà Nội", "Hanoi"],
    center: { latitude: 21.0278, longitude: 105.8342 }
  },
  달랏: {
    english: "Da Lat",
    addressHints: ["Đà Lạt", "Da Lat", "Dalat", "Lâm Đồng"],
    center: { latitude: 11.9404, longitude: 108.4583 }
  },
  푸꾸옥: {
    english: "Phu Quoc",
    addressHints: ["Phú Quốc", "Phu Quoc"],
    center: { latitude: 10.2899, longitude: 103.984 }
  }
};

export function createInitialRegionalHotplaceState(destination: Destination): RegionalHotplaceState {
  return {
    destination,
    status: "idle",
    places: []
  };
}

export async function loadRegionalHotplaces(destination: Destination): Promise<RegionalHotplaceState> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      destination,
      status: "missingKey",
      places: [],
      message: "Google Places API 키를 연결하면 지역별 큐레이션 후보를 불러올 수 있어요."
    };
  }

  try {
    const queryResults = await Promise.allSettled(buildQueries(destination).map((query) => searchPlaces(destination, query, apiKey)));
    const places = dedupePlaces(
      queryResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    )
      .filter((place) => isEligibleRegionalPlace(place))
      .sort((a, b) => getRegionalScore(b) - getRegionalScore(a))
      .slice(0, 120);

    return {
      destination,
      status: "ready",
      places
    };
  } catch {
    return {
      destination,
      status: "error",
      places: [],
      message: "지역별 큐레이션 후보를 불러오지 못했어요."
    };
  }
}

async function searchPlaces(destination: Destination, query: RegionalQuery, apiKey: string): Promise<CuratedPlace[]> {
  const meta = cityMeta[destination];
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.photos.name,places.reviews"
    },
    body: JSON.stringify({
      textQuery: query.query,
      languageCode: "ko",
      regionCode: "VN",
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: meta.center,
          radius: 30000
        }
      }
    })
  });

  if (!response.ok) throw new Error("Regional Places request failed");

  const data = (await response.json()) as PlacesTextSearchResponse;
  return (data.places ?? [])
    .filter((place) => place.id && place.displayName?.text && place.formattedAddress)
    .filter((place) => isAddressInDestination(destination, place.formattedAddress ?? ""))
    .map((place) => mapPlace(destination, query, place));
}

function buildQueries(destination: Destination): RegionalQuery[] {
  const city = cityMeta[destination].english;
  return [
    { category: "맛집", query: `${city} Korean recommended restaurant`, tags: ["한국인취향", "한국어후기", "맛집"] },
    { category: "맛집", query: `${city} Korean restaurant`, tags: ["한식당", "한국어후기", "비오는날"] },
    { category: "맛집", query: `${city} popular Vietnamese restaurant`, tags: ["베트남음식", "현지맛집", "한국어후기"] },
    { category: "맛집", query: `${city} seafood restaurant`, tags: ["해산물", "한국어후기", "저녁추천"] },
    { category: "맛집", query: `${city} best local restaurant`, tags: ["현지맛집", "로컬입문", "한국어후기"] },
    { category: "맛집", query: `${city} Michelin restaurant`, tags: ["프리미엄", "저녁추천", "한국어후기"] },
    { category: "맛집", query: `${city} family restaurant`, tags: ["가족여행", "초행자추천", "한국어후기"] },
    { category: "맛집", query: `${city} breakfast restaurant`, tags: ["아침식사", "초행자추천", "한국어후기"] },
    { category: "맛집", query: `${city} brunch restaurant`, tags: ["브런치", "사진맛집", "한국어후기"] },
    { category: "맛집", query: `${city} street food restaurant`, tags: ["길거리음식", "로컬입문", "한국어후기"] },
    { category: "카페", query: `${city} popular cafe`, tags: ["커피맛집", "비오는날", "초행자추천"] },
    { category: "카페", query: `${city} specialty coffee cafe`, tags: ["커피맛집", "사진맛집", "비오는날"] },
    { category: "카페", query: `${city} instagram cafe`, tags: ["사진맛집", "인스타감성", "비오는날"] },
    { category: "카페", query: `${city} best coffee shop`, tags: ["커피맛집", "초행자추천", "비오는날"] },
    { category: "카페", query: `${city} dessert cafe`, tags: ["디저트", "사진맛집", "커플여행"] },
    { category: "마사지", query: `${city} spa massage`, tags: ["마사지", "비오는날", "회복코스"] },
    { category: "마사지", query: `${city} foot massage spa`, tags: ["마사지", "가성비", "회복코스"] },
    { category: "마사지", query: `${city} luxury spa`, tags: ["마사지", "프리미엄", "회복코스"] },
    { category: "바/루프탑", query: `${city} rooftop bar`, tags: ["루프탑", "야경", "밤추천"] },
    { category: "바/루프탑", query: `${city} cocktail bar`, tags: ["칵테일바", "밤추천", "야경"] },
    { category: "바/루프탑", query: `${city} night bar`, tags: ["밤추천", "칵테일바", "커플여행"] },
    { category: "가라오케", query: `${city} karaoke`, tags: ["가라오케", "노래방", "밤추천"] },
    { category: "가라오케", query: `${city} Korean karaoke`, tags: ["가라오케", "한국어가능", "밤추천"] },
    { category: "사진명소", query: `${city} tourist attraction`, tags: ["사진스팟", "초행자추천", "관광지"] },
    { category: "사진명소", query: `${city} instagram spot`, tags: ["사진스팟", "인스타감성", "짧은방문"] },
    { category: "사진명소", query: `${city} landmark`, tags: ["관광지", "사진스팟", "초행자추천"] },
    { category: "사진명소", query: `${city} beach viewpoint`, tags: ["사진스팟", "자연선", "짧은방문"] },
    { category: "쇼핑", query: `${city} shopping mall market`, tags: ["쇼핑", "비오는날", "기념품"] },
    { category: "쇼핑", query: `${city} night market`, tags: ["시장", "기념품", "밤추천"] },
    { category: "쇼핑", query: `${city} local market`, tags: ["시장", "로컬입문", "쇼핑"] },
    { category: "환전", query: `${city} money exchange gold shop`, tags: ["환전", "금은방", "현금준비"] },
    { category: "투어/액티비티", query: `${city} tour activity`, tags: ["투어", "액티비티", "반일투어"] },
    { category: "투어/액티비티", query: `${city} day tour`, tags: ["투어", "반일투어", "초행자추천"] },
    { category: "투어/액티비티", query: `${city} cooking class`, tags: ["액티비티", "로컬입문", "커플여행"] }
  ];
}

function mapPlace(destination: Destination, query: RegionalQuery, place: PlacesApiPlace): CuratedPlace {
  const reviews = place.reviews ?? [];
  const koreanReviewCount = countKoreanReviews(reviews);
  const cautionCount = reviews.filter((review) => (review.rating ?? 5) <= 3).length;
  const keywords = inferKeywords(query.category, reviews);
  return {
    id: `regional-${destination}-${slugify(place.id ?? place.displayName?.text ?? `${Date.now()}`)}`,
    city: destination,
    name: place.displayName?.text ?? "이름 없음",
    category: query.category,
    area: inferArea(destination, place.formattedAddress ?? ""),
    address: place.formattedAddress,
    oneLine: buildOneLine(destination, query.category),
    koreanTip: buildKoreanTip(query.category),
    tags: buildTags(query, koreanReviewCount),
    hiddenGem: (place.userRatingCount ?? 0) < 900,
    beginnerSafe: (place.rating ?? 0) >= 4.6 && (place.userRatingCount ?? 0) >= 500,
    rainyDayOk: ["카페", "마사지", "쇼핑", "환전", "맛집", "가라오케"].includes(query.category),
    bestTime: getBestTime(query.category),
    priceLevel: mapPriceLevel(place.priceLevel),
    googlePlaceId: place.id ?? "",
    googleMapsUri: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text ?? destination)}`,
    photoName: place.photos?.[0]?.name,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    koreanReviewSignal: {
      score: Math.min(92, 68 + koreanReviewCount * 5 + ((place.rating ?? 0) >= 4.7 ? 8 : 0)),
      reviewCount: koreanReviewCount,
      positiveCount: reviews.filter((review) => (review.rating ?? 0) >= 4).length,
      cautionCount,
      summary: koreanReviewCount > 0 ? "한국어 후기가 확인된 장소" : "방문 동선에 넣기 쉬운 장소",
      keywords
    }
  };
}

function isEligibleRegionalPlace(place: CuratedPlace) {
  if ((place.userRatingCount ?? 0) < 500) return false;
  if ((place.rating ?? 0) < 4.4) return false;
  if (place.category === "맛집" && (place.koreanReviewSignal?.reviewCount ?? 0) <= 0) return false;
  return true;
}

function getRegionalScore(place: CuratedPlace) {
  return (
    (place.rating ?? 0) * 20 +
    Math.min(place.userRatingCount ?? 0, 10000) / 250 +
    (place.koreanReviewSignal?.reviewCount ?? 0) * 7 +
    (place.beginnerSafe ? 8 : 0)
  );
}

function dedupePlaces(places: CuratedPlace[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = place.googlePlaceId || place.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isAddressInDestination(destination: Destination, address: string) {
  return cityMeta[destination].addressHints.some((hint) => address.toLowerCase().includes(hint.toLowerCase()));
}

function countKoreanReviews(reviews: PlacesApiReview[]) {
  return reviews.filter((review) => {
    const originalLanguage = review.originalText?.languageCode ?? review.text?.languageCode;
    const text = `${review.originalText?.text ?? ""} ${review.text?.text ?? ""}`;
    return originalLanguage === "ko" || /[가-힣]/.test(text);
  }).length;
}

function inferKeywords(category: CuratedPlaceCategory, reviews: PlacesApiReview[]) {
  const text = reviews.map((review) => `${review.originalText?.text ?? ""} ${review.text?.text ?? ""}`).join(" ");
  const keywords = [
    /맛있|맛잇|맛집|맛/.test(text) ? "맛있" : undefined,
    /친절/.test(text) ? "친절" : undefined,
    /깔끔|깨끗/.test(text) ? "깔끔" : undefined,
    /추천/.test(text) ? "추천" : undefined,
    /만족|좋았|좋네요/.test(text) ? "만족" : undefined,
    /분위기|사진/.test(text) ? "분위기" : undefined,
    /한국|한국어|한국인/.test(text) ? "한국인" : undefined
  ].filter(Boolean) as string[];

  if (keywords.length > 0) return keywords.slice(0, 6);
  if (category === "카페") return ["분위기", "깔끔", "추천"];
  if (category === "마사지") return ["친절", "만족", "깔끔"];
  if (category === "바/루프탑") return ["분위기", "추천", "좋았"];
  return ["추천", "만족", "깔끔"];
}

function buildTags(query: RegionalQuery, koreanReviewCount: number) {
  const tags = [...query.tags];
  if (koreanReviewCount > 0) tags.push("한국어후기");
  tags.push("리뷰500+");
  return Array.from(new Set(tags)).slice(0, 7);
}

function inferArea(destination: Destination, address: string) {
  if (destination === "다낭") {
    if (/Võ Nguyên Giáp|Ngô Thì Sĩ|Ngũ Hành Sơn|Mỹ An|An Hải/i.test(address)) return "미케비치";
    if (/Hải Châu|Lê Hồng Phong|Nguyễn Chí Thanh|Hàn/i.test(address)) return "한시장/시내";
    return "다낭 시내권";
  }
  if (destination === "나트랑") {
    if (/Trần Phú|Nguyễn Thiện Thuật|Hồng Bàng|Minh Khai/i.test(address)) return "나트랑 시내";
    return "나트랑 시내권";
  }
  if (destination === "하노이") {
    if (/Hoàn Kiếm|Hàng|Nhà Thờ|Tràng Tiền|Old Quarter|Phố cổ/i.test(address)) return "호안끼엠/올드쿼터";
    if (/Tây Hồ|West Lake/i.test(address)) return "서호/떠이호";
    return "하노이 시내권";
  }
  if (destination === "달랏") {
    if (/Xuân Hương|Hồ Tùng Mậu|Phan Đình Phùng|Hòa Bình/i.test(address)) return "달랏 시내";
    if (/Tuyền Lâm|Robin|Prenn/i.test(address)) return "뚜옌럼/남부";
    return "달랏 시내권";
  }
  if (destination === "푸꾸옥") {
    if (/Trần Hưng Đạo|Dương Đông|30\/4/i.test(address)) return "즈엉동/롱비치";
    if (/Grand World|Vinpearl/i.test(address)) return "그랜드월드/북부";
    if (/Sunset|Địa Trung Hải|Venice/i.test(address)) return "선셋타운/남부";
    return "푸꾸옥 시내권";
  }
  return "시내권";
}

function buildOneLine(destination: Destination, category: CuratedPlaceCategory) {
  if (category === "맛집") return `${destination}에서 식사 동선에 넣기 좋은 맛집`;
  if (category === "카페") return `${destination}에서 더위 피하고 쉬기 좋은 카페`;
  if (category === "마사지") return `${destination} 여행 중 체력 회복용 마사지 스팟`;
  if (category === "바/루프탑") return `${destination}에서 저녁 이후 분위기 바꾸기 좋은 밤 코스`;
  if (category === "가라오케") return `${destination}에서 일행과 늦게까지 놀기 좋은 가라오케`;
  if (category === "사진명소") return `${destination}에서 짧게 들러 사진 남기기 좋은 코스`;
  if (category === "쇼핑") return `${destination}에서 비 오는 날이나 기념품 쇼핑하기 좋은 곳`;
  if (category === "환전") return `${destination}에서 현금 준비가 필요할 때 확인하기 좋은 환전소`;
  return `${destination} 반일 일정에 넣기 좋은 투어와 액티비티`;
}

function buildKoreanTip(category: CuratedPlaceCategory) {
  if (category === "맛집") return "식사 시간대에는 대기할 수 있으니 최근 리뷰와 영업시간을 먼저 확인하세요.";
  if (category === "카페") return "더운 낮이나 비 오는 날 쉬어가는 코스로 넣기 좋아요.";
  if (category === "마사지") return "인기 시간대는 예약 후 방문하면 대기 시간을 줄일 수 있어요.";
  if (category === "바/루프탑") return "밤 이동은 Grab Car를 추천하고 요금/예약/드레스코드를 먼저 확인하세요.";
  if (category === "가라오케") return "룸 요금, 시간제, 주류 포함 여부를 먼저 확인하고 밤 이동은 Grab Car를 추천해요.";
  if (category === "사진명소") return "낮에는 더울 수 있으니 짧게 보고 근처 카페와 묶는 게 좋아요.";
  if (category === "쇼핑") return "가격 비교와 영수증 확인을 해두면 좋아요.";
  if (category === "환전") return "환율, 수수료, 여권 필요 여부를 창구에서 먼저 확인하세요.";
  return "픽업 위치와 포함 사항을 예약 전에 꼭 확인하세요.";
}

function getBestTime(category: CuratedPlaceCategory) {
  if (category === "카페") return ["오후", "저녁"];
  if (category === "마사지") return ["오후", "저녁"];
  if (category === "바/루프탑") return ["저녁", "밤"];
  if (category === "가라오케") return ["저녁", "밤"];
  if (category === "사진명소") return ["오전", "오후"];
  if (category === "쇼핑") return ["오후", "저녁"];
  if (category === "환전") return ["오전", "오후"];
  if (category === "투어/액티비티") return ["오전", "오후"];
  return ["점심", "저녁"];
}

function mapPriceLevel(priceLevel?: string): CuratedPlace["priceLevel"] {
  if (priceLevel === "PRICE_LEVEL_EXPENSIVE" || priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") return "프리미엄";
  if (priceLevel === "PRICE_LEVEL_INEXPENSIVE") return "저렴";
  return "보통";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
}
