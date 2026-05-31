export type ScreenName = "home" | "planner" | "plan" | "map" | "places" | "travel" | "marketplace" | "saved" | "my";

export type Destination = "호치민" | "다낭" | "나트랑" | "하노이" | "달랏" | "푸꾸옥";
export type Duration = "당일치기" | "1박2일" | "2박3일" | "3박4일" | "4박5일";
export type Companion = "혼자" | "커플" | "친구" | "가족";
export type Budget = "가성비" | "보통" | "프리미엄";
export type TravelStyle = "빡세게" | "여유롭게" | "반반";
export type ArrivalTime = "오전 도착" | "오후 도착" | "저녁 도착";
export type DepartureTime = "오전 출국" | "오후 출국" | "밤 출국";
export type AccommodationArea =
  | "1군/벤탄시장"
  | "응우옌후에/동코이"
  | "부이비엔/팜응라오"
  | "타오디엔"
  | "푸미흥/7군"
  | "미케비치"
  | "한시장/시내"
  | "용다리/한강"
  | "호이안 올드타운"
  | "쩐푸 해변"
  | "나트랑 시내"
  | "담시장 근처"
  | "혼총/북부"
  | "호안끼엠/올드쿼터"
  | "성요셉성당 근처"
  | "서호/떠이호"
  | "바딘/롯데센터"
  | "달랏 시내"
  | "쑤언흐엉 호수"
  | "달랏 야시장"
  | "뚜옌럼 호수"
  | "즈엉동"
  | "롱비치"
  | "선셋타운/남부"
  | "옹랑/북서부"
  | "리조트 존"
  | "공항 근처"
  | "아직 미정";

export type Preference =
  | "맛집"
  | "먹방"
  | "카페"
  | "인스타 감성"
  | "로컬 감성"
  | "마사지"
  | "술/힙한바"
  | "가라오케"
  | "힐링/휴식"
  | "액티비티"
  | "자연선"
  | "럭셔리"
  | "혼자 여행"
  | "커플 여행"
  | "가족 여행"
  | "여자끼리"
  | "쇼핑"
  | "로컬"
  | "야경"
  | "클럽/바"
  | "관광지";

export type PlannerInput = {
  destination: Destination;
  duration: Duration;
  companion: Companion;
  budget: Budget;
  preferences: Preference[];
  style: TravelStyle;
  accommodationArea: AccommodationArea;
  arrivalTime: ArrivalTime;
  departureTime: DepartureTime;
  mustVisit: string;
  avoid: string;
};

export type PlacePlan = {
  id: string;
  period: "오전" | "점심" | "오후" | "저녁" | "밤";
  time: string;
  placeName: string;
  category: Preference | "공항/이동" | "휴식";
  description: string;
  stayTime: string;
  estimatedCost: string;
  costMin: number;
  costMax: number;
  routeMinutesFromPrevious: number;
  difficulty: "쉬움" | "보통" | "빡셈";
  moveTip: string;
  localTip: string;
  fitReason: string;
  matchTags: Preference[];
  alternativePlaces: string[];
  rainyAlternative: string;
  rating?: number;
  reviewCount?: number;
  koreanFitScore?: number;
  reliabilityBadge?: string;
  openingHint?: string;
  warning?: string;
  reservationTip?: string;
  mapQuery: string;
  googleMapsUri?: string;
};

export type DayPlan = {
  day: number;
  title: string;
  mood: string;
  totalCost: string;
  totalMoveTime: string;
  intensity: "여유" | "적당" | "빡셈";
  rainyPlan: string;
  survivalTip: string;
  routeWarning?: string;
  places: PlacePlan[];
};

export type Itinerary = {
  summary: string;
  personalization: {
    persona: string;
    matchScore: number;
    routeStrategy: string;
    highlights: string[];
    improvementTips: string[];
  };
  mustKnow: string[];
  cautions: string[];
  days: DayPlan[];
};

export type SavedTrip = {
  id: string;
  title: string;
  createdAt: string;
  input: PlannerInput;
  itinerary: Itinerary;
};

export type LiveTravelInfo = {
  destination: Destination;
  weather: {
    status: "loading" | "ready" | "error";
    temperatureC?: number;
    humidity?: number;
    windKmh?: number;
    precipitationMm?: number;
    condition?: string;
    tip: string;
    updatedAt?: string;
  };
  exchange: {
    status: "loading" | "ready" | "error";
    krwToVnd?: number;
    tenThousandKrwToVnd?: number;
    updatedAt?: string;
    tip: string;
  };
};

export type GooglePlaceCategory = "restaurant" | "cafe";

export type GooglePlace = {
  id: string;
  name: string;
  category: GooglePlaceCategory;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  googleMapsUri: string;
};

export type GooglePlacesState = {
  destination: Destination;
  status: "idle" | "loading" | "ready" | "missingKey" | "error";
  restaurants: GooglePlace[];
  cafes: GooglePlace[];
  message?: string;
};

export type CuratedPlaceCategory = "맛집" | "카페" | "바/루프탑" | "가라오케" | "마사지" | "사진명소" | "쇼핑" | "환전" | "투어/액티비티";

export type CuratedPlace = {
  id: string;
  city: Destination;
  name: string;
  category: CuratedPlaceCategory;
  area?: string;
  address?: string;
  oneLine: string;
  koreanTip: string;
  tags: string[];
  hiddenGem: boolean;
  beginnerSafe: boolean;
  rainyDayOk: boolean;
  bestTime: string[];
  priceLevel: "저렴" | "보통" | "프리미엄";
  googlePlaceId: string;
  googleMapsUri: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  photoName?: string;
  rating?: number;
  userRatingCount?: number;
  koreanReviewSignal?: {
    score: number;
    reviewCount: number;
    positiveCount: number;
    cautionCount: number;
    summary: string;
    keywords: string[];
  };
};

export type PlaceReport = {
  id: string;
  createdAt: string;
  status: "검토중" | "승인" | "반려";
  city: Destination;
  reporterType: "호치민 거주자" | "최근 방문자" | "여행 준비중";
  name: string;
  googleMapsUri: string;
  area: string;
  category: CuratedPlaceCategory;
  priceLevel: "저렴" | "보통" | "프리미엄";
  reason: string;
  reporterId?: string;
  mapReflectionStatus?: "검토중" | "지도 반영 대기" | "지도 반영 완료";
  viewCount?: number;
  rewardPoints?: number;
  updatedAt?: string;
};
