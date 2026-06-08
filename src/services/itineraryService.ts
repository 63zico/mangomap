import { durationToDays } from "../constants/options";
import { curatedPlaces } from "../data/places";
import type { DayPlan, Destination, Itinerary, PlannerInput, PlacePlan, Preference } from "../types";

type PlaceSeed = Omit<PlacePlan, "id" | "period" | "time"> & {
  tags: Preference[];
  bestPeriods: PlacePlan["period"][];
  premium?: boolean;
};

type TravelerProfile = {
  preferredCategories: PlacePlan["category"][];
  avoidCategories: PlacePlan["category"][];
  preferredTags: Preference[];
  maxNightCount: number;
  safetyFirst: boolean;
  luxuryBias: boolean;
  routeBias: number;
};

const periods: PlacePlan["period"][] = ["오전", "점심", "오후", "저녁", "밤"];
const timeByPeriod: Record<PlacePlan["period"], string> = {
  오전: "09:30",
  점심: "12:00",
  오후: "14:30",
  저녁: "18:00",
  밤: "21:00"
};

const cityPlacePools: Record<Destination, PlaceSeed[]> = {
  호치민: [
    food("반미 후인호아", "속이 꽉 찬 호치민 대표 반미 맛집", "Banh Mi Huynh Hoa Ho Chi Minh", 6000, 10000),
    food("퍼 호아 파스퇴르", "한국인도 편하게 먹기 좋은 진한 쌀국수 맛집", "Pho Hoa Pasteur Ho Chi Minh", 5000, 9000),
    food("껌땀 바기엔", "현지식 돼지고기 덮밥을 가볍게 먹기 좋은 가성비 맛집", "Com Tam Ba Ghien Ho Chi Minh", 4000, 9000),
    food("냐항 응온 138", "초행자와 가족 여행에 무난한 베트남 음식점", "Nha Hang Ngon 138 Ho Chi Minh", 12000, 25000),
    foodPremium("아난 사이공", "프리미엄 예산에서 넣기 좋은 베트남 파인다이닝 후보", "Anan Saigon Ho Chi Minh", 45000, 110000),
    food("피자포피스 푸미흥", "푸미흥/7군 숙소에서 접근 쉬운 캐주얼 레스토랑", "Pizza 4P's Phu My Hung Ho Chi Minh", 15000, 35000),
    cafe("카페 아파트먼트", "개성 있는 카페가 모인 응우옌 후에 사진 명소", "The Cafe Apartments Nguyen Hue Ho Chi Minh"),
    cafe("Okkio Cafe", "빈티지 분위기와 사진이 잘 나오는 감성 카페", "Okkio Cafe Ho Chi Minh"),
    sight("중앙우체국", "노트르담 성당과 같이 보기 좋은 대표 사진 명소", "Saigon Central Post Office"),
    sight("핑크성당", "분홍 외관으로 사진 찍기 좋은 호치민 인기 스팟", "Tan Dinh Church Ho Chi Minh"),
    shopping("벤탄 시장", "호치민 분위기를 잡기 좋은 대표 시장", "Ben Thanh Market Ho Chi Minh"),
    shopping("크레센트몰", "푸미흥/7군 숙소권에서 비와 더위를 피하기 좋은 쇼핑몰", "Crescent Mall Ho Chi Minh"),
    tour("구찌터널 반일 투어", "베트남 전쟁 역사를 직접 체험하는 근교 투어", "Cu Chi Tunnels tour Ho Chi Minh", 25000, 60000),
    tour("메콩델타 일일 투어", "배, 과일, 로컬 마을을 묶어 보는 클래식 투어", "Mekong Delta day tour from Ho Chi Minh", 35000, 80000),
    activity("오토바이 푸드투어", "로컬 음식과 밤거리를 한 번에 즐기는 인기 액티비티", "Ho Chi Minh motorbike food tour", 45000, 90000),
    massage("목 스파", "여행 피로를 풀기 좋은 깔끔한 마사지 코스", "Moc Huong Spa Ho Chi Minh"),
    massage("골든로터스 힐링 월드", "사우나와 마사지까지 묶어 쉬기 좋은 회복 코스", "Golden Lotus Healing World Ho Chi Minh", true),
    night("사이공 스카이덱", "호치민 야경을 한 번에 보는 전망 코스", "Saigon Skydeck Ho Chi Minh", true),
    night("칠 스카이바", "프리미엄 밤 일정에 어울리는 루프탑 바 후보", "Chill Skybar Ho Chi Minh", true),
    nightCheap("응우옌후에 야간 산책", "분수광장과 시청 야경을 가볍게 보는 저비용 밤 산책 코스", "Nguyen Hue Walking Street Ho Chi Minh"),
    nightCheap("벤탄 야시장", "간식과 기념품을 가볍게 둘러보기 좋은 중심지 밤 코스", "Ben Thanh Night Market Ho Chi Minh"),
    night("부이비엔 거리", "활기찬 밤 분위기를 체험하는 여행자 거리", "Bui Vien Walking Street"),
    karaoke("호치민 한인 가라오케", "한국어 응대와 룸 이용이 편한 밤 코스", "Ho Chi Minh Korean karaoke")
  ],
  다낭: [
    sight("미케비치", "아침 산책과 사진이 좋은 다낭 대표 해변", "My Khe Beach Da Nang"),
    shopping("한시장", "라탄백, 과일, 기념품을 사기 좋은 대표 시장", "Han Market Da Nang"),
    sight("핑크성당", "시내에서 가볍게 들르는 사진 명소", "Da Nang Cathedral"),
    tour("바나힐 골든브릿지 투어", "골든브릿지와 케이블카를 보는 대표 투어", "Ba Na Hills Golden Bridge", 70000, 140000),
    tour("호이안 올드타운 야경 투어", "등불 거리와 야시장을 함께 보는 저녁 코스", "Hoi An Old Town night market", 25000, 70000),
    activity("오행산", "동굴과 전망을 같이 보는 가벼운 트레킹 코스", "Marble Mountains Da Nang", 10000, 30000),
    cafe("NAM House Cafe", "레트로 감성 사진이 잘 나오는 다낭 카페", "NAM House Cafe Da Nang"),
    food("마담란", "초행자도 주문하기 쉬운 베트남 음식 맛집", "Madame Lan Da Nang", 10000, 25000),
    massage("허벌 스파 다낭", "호이안 다녀온 다음 날 넣기 좋은 마사지", "Herbal Spa Da Nang"),
    night("용다리 야경", "주말 불쇼와 함께 보기 좋은 다낭 야경 코스", "Dragon Bridge Da Nang"),
    karaoke("다낭 가라오케", "저녁 이후 친구끼리 가볍게 넣기 좋은 룸 노래 코스", "Da Nang karaoke")
  ],
  나트랑: [
    sight("쩐푸 해변", "숙소 접근성이 좋은 나트랑 대표 해변", "Tran Phu Beach Nha Trang"),
    shopping("담시장", "로컬 시장과 기념품을 보는 시내 코스", "Dam Market Nha Trang"),
    sight("포나가르 사원", "사진과 역사 분위기를 함께 보는 인기 명소", "Po Nagar Cham Towers"),
    activity("머드온천", "나트랑에서 많이 찾는 휴식형 액티비티", "Nha Trang mud bath", 25000, 70000),
    tour("호핑투어", "섬, 스노클링, 배 위 식사를 묶은 대표 투어", "Nha Trang island hopping tour", 50000, 120000),
    activity("빈원더스 나트랑", "가족 여행에 좋은 테마파크와 케이블카 코스", "VinWonders Nha Trang", 50000, 100000),
    cafe("Rainforest Cafe", "정글 분위기 인테리어로 사진 찍기 좋은 카페", "Rainforest Cafe Nha Trang"),
    food("갈랑가", "나트랑 초행자에게 무난한 베트남 음식점", "Galangal Nha Trang", 10000, 25000),
    massage("수 스파", "해변 일정 뒤 넣기 좋은 마사지 코스", "Su Spa Nha Trang"),
    night("스카이라이트 루프탑", "나트랑 야경과 음악을 즐기는 루프탑 코스", "Skylight Nha Trang", true),
    karaoke("나트랑 가라오케", "해변 일정 후 밤에 넣기 좋은 노래방 코스", "Nha Trang karaoke")
  ],
  하노이: [
    sight("호안끼엠 호수", "하노이 여행의 기준점이 되는 산책 코스", "Hoan Kiem Lake Hanoi"),
    sight("성요셉 성당", "사진 찍기 좋은 하노이 대표 감성 스팟", "St Joseph Cathedral Hanoi"),
    sight("기찻길 마을", "하노이에서 유명한 사진 명소", "Hanoi Train Street"),
    tour("하롱베이 일일 투어", "하노이 근교 대표 자연 투어", "Halong Bay day tour from Hanoi", 60000, 150000),
    tour("닌빈 짱안 투어", "배와 자연 풍경을 보는 인기 근교 투어", "Trang An Ninh Binh day tour", 50000, 130000),
    food("분짜 흐엉리엔", "오바마 분짜로 유명한 하노이 대표 맛집", "Bun Cha Huong Lien Hanoi", 7000, 15000),
    food("퍼틴", "진한 국물의 하노이 쌀국수 인기 맛집", "Pho Thin Hanoi", 5000, 12000),
    cafe("카페 지앙", "하노이 전통 커피로 유명한 올드쿼터 카페", "Cafe Giang Hanoi"),
    shopping("동쑤언 시장", "하노이 로컬 시장 분위기를 보는 코스", "Dong Xuan Market Hanoi"),
    night("타히엔 맥주거리", "하노이 밤 분위기를 가볍게 체험하는 거리", "Ta Hien Beer Street Hanoi"),
    karaoke("하노이 가라오케", "올드쿼터 일정 뒤 밤에 넣기 좋은 룸 노래 코스", "Hanoi karaoke")
  ],
  달랏: [
    sight("쑤언흐엉 호수", "달랏 시내 분위기를 잡기 좋은 산책 코스", "Xuan Huong Lake Da Lat"),
    sight("달랏 기차역", "사진 찍기 좋은 달랏 대표 빈티지 스팟", "Dalat Railway Station"),
    sight("린푸억 사원", "화려한 장식과 사진 포인트가 있는 달랏 명소", "Linh Phuoc Pagoda Da Lat"),
    tour("뚜옌럼 호수 반일 코스", "호수와 숲 분위기를 묶어 보는 휴식 코스", "Tuyen Lam Lake Da Lat", 15000, 45000),
    activity("달랏 알파인 코스터", "친구끼리 넣기 좋은 가벼운 액티비티", "Datanla Alpine Coaster Da Lat", 25000, 65000),
    food("라우가 라에 타오응오", "달랏에서 많이 찾는 닭전골 로컬 맛집", "Lau Ga La E Tao Ngo Da Lat", 8000, 18000),
    food("반깐 냐쭝", "아침이나 간식으로 넣기 좋은 달랏 로컬 음식", "Banh Can Nha Chung Da Lat", 4000, 10000),
    cafe("Still Cafe", "사진과 분위기 반응이 좋은 달랏 감성 카페", "Still Cafe Da Lat"),
    cafe("Tui Mo To", "전망과 사진을 같이 잡기 좋은 언덕 카페", "Tui Mo To Da Lat"),
    shopping("달랏 야시장", "저녁 간식과 기념품을 가볍게 보는 밤 코스", "Dalat Night Market"),
    massage("달랏 스파", "서늘한 날씨에 쉬어가기 좋은 마사지 코스", "Da Lat spa massage"),
    night("Maze Bar", "달랏 밤 분위기를 가볍게 즐기는 바 코스", "Maze Bar Da Lat"),
    karaoke("달랏 가라오케", "저녁 이후 친구끼리 가볍게 넣기 좋은 노래방 코스", "Da Lat karaoke")
  ],
  푸꾸옥: [
    sight("사오 비치", "하얀 모래와 맑은 물로 유명한 푸꾸옥 해변", "Sao Beach Phu Quoc"),
    sight("선셋타운", "사진 명소와 야경을 같이 보는 푸꾸옥 인기 스팟", "Sunset Town Phu Quoc"),
    activity("혼똔섬 케이블카", "바다 위를 지나는 긴 케이블카 액티비티", "Hon Thom Cable Car Phu Quoc", 30000, 80000),
    activity("빈원더스 푸꾸옥", "가족 여행과 테마파크 취향에 맞는 하루 코스", "VinWonders Phu Quoc", 60000, 120000),
    tour("스노클링 호핑투어", "섬과 바다를 즐기는 푸꾸옥 대표 투어", "Phu Quoc snorkeling island tour", 50000, 130000),
    shopping("즈엉동 야시장", "해산물, 간식, 기념품을 보는 밤 코스", "Duong Dong Night Market Phu Quoc"),
    cafe("Chuon Chuon Bistro", "언덕 위 전망과 사진이 좋은 카페", "Chuon Chuon Bistro Phu Quoc"),
    food("신짜오 레스토랑", "푸꾸옥에서 많이 찾는 해산물 레스토랑", "Xin Chao Restaurant Phu Quoc", 20000, 70000),
    massage("리조트 스파", "휴양지 분위기에 맞는 여유로운 스파 코스", "Phu Quoc resort spa", true),
    night("해변 선셋 바", "해변에서 노을과 칵테일을 즐기는 밤 코스", "Phu Quoc beach sunset bar"),
    karaoke("푸꾸옥 가라오케", "리조트 저녁 뒤 부담 없이 넣는 노래방 코스", "Phu Quoc karaoke")
  ]
};

export function generateItinerary(input: PlannerInput): Itinerary {
  const days = durationToDays[input.duration];
  const pool = cityPlacePools[input.destination];
  const used = new Set<string>();
  const profile = getTravelerProfile(input);
  const personalization = buildPersonalization(input);
  const mustVisitSeed = resolveMustVisitSeed(input, pool);
  const mustVisitPlacement = mustVisitSeed ? getMustVisitPlacement(mustVisitSeed, input, days) : undefined;

  const generatedDayPlans = Array.from({ length: days }, (_, dayIndex) => {
    const activePeriods = getActivePeriods(input, dayIndex, days);
    const dayCategories: PlacePlan["category"][] = [];
    const places = activePeriods.map((period, periodIndex) => {
      const isMustVisitSlot = mustVisitSeed && mustVisitPlacement?.dayIndex === dayIndex && mustVisitPlacement.period === period;
      const candidateUsed =
        mustVisitSeed && !isMustVisitSlot
          ? new Set([...used, mustVisitSeed.placeName])
          : used;
      const seed =
        isMustVisitSlot
          ? mustVisitSeed
          : pickPlace(pool, input, profile, period, candidateUsed, dayCategories, dayIndex + periodIndex);
      used.add(seed.placeName);
      dayCategories.push(seed.category);
      return toPlacePlan(seed, period, input, dayIndex, periodIndex);
    });

    return buildDayPlan({
      day: dayIndex + 1,
      title: getDayTitle(input.destination, dayIndex),
      mood: getMood(input, dayIndex),
      places,
      style: input.style,
      input
    });
  });
  const dayPlans = applyPreferenceCoverage(generatedDayPlans, input, pool);

  return {
    summary:
      input.duration === "당일치기"
        ? `${input.destination} 당일치기 맞춤 코스예요. ${input.arrivalTime}/${input.departureTime} 기준으로 핵심 동선만 하루 안에 압축했어요.`
        : `${input.destination} ${input.duration} 맞춤 코스예요. 숙소는 ${input.accommodationArea}, ${input.arrivalTime}/${input.departureTime} 기준으로 무리한 첫날과 마지막날을 줄였어요.`,
    personalization,
    mustKnow: getMustKnow(input.destination),
    cautions: getCautions(input.destination, input),
    days: dayPlans
  };
}

export function recomputeItinerary(itinerary: Itinerary, input: PlannerInput): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day) =>
      buildDayPlan({
        day: day.day,
        title: day.title,
        mood: day.mood,
        places: day.places,
        style: input.style,
        input
      })
    )
  };
}

function getActivePeriods(input: PlannerInput, dayIndex: number, totalDays: number): PlacePlan["period"][] {
  let active = [...periods];
  if (input.duration === "당일치기") {
    if (input.arrivalTime === "오후 도착") active = ["점심", "오후", "저녁", "밤"];
    if (input.arrivalTime === "저녁 도착") active = ["저녁", "밤"];
    if (input.departureTime === "오전 출국") active = ["오전"];
    if (input.departureTime === "오후 출국") active = active.filter((period) => !["저녁", "밤"].includes(period));
    return active;
  }
  if (dayIndex === 0 && input.arrivalTime === "오후 도착") active = ["점심", "오후", "저녁", "밤"];
  if (dayIndex === 0 && input.arrivalTime === "저녁 도착") active = ["저녁", "밤"];
  if (dayIndex === totalDays - 1 && input.departureTime === "오전 출국") active = ["오전"];
  if (dayIndex === totalDays - 1 && input.departureTime === "오후 출국") active = active.filter((period) => !["저녁", "밤"].includes(period));
  return active;
}

function applyPreferenceCoverage(dayPlans: DayPlan[], input: PlannerInput, pool: PlaceSeed[]): DayPlan[] {
  const requirements = getRequiredCoverage(input);
  if (requirements.length === 0) return dayPlans;

  const next = dayPlans.map((day) => ({ ...day, places: [...day.places] }));
  const usedNames = new Set(next.flatMap((day) => day.places.map((place) => place.placeName)));

  for (const requirement of requirements) {
    if (hasCoveredCategory(next, requirement)) continue;
    const seed = pickRequiredSeed(pool, input, requirement, usedNames);
    if (!seed) continue;

    const slot = findCoverageSlot(next, seed, input);
    if (!slot) continue;

    const previous = next[slot.dayIndex].places[slot.placeIndex];
    usedNames.delete(previous.placeName);
    usedNames.add(seed.placeName);
    next[slot.dayIndex].places[slot.placeIndex] = toPlacePlan(seed, slot.period, input, slot.dayIndex, slot.placeIndex);
  }

  return next.map((day) =>
    buildDayPlan({
      day: day.day,
      title: day.title,
      mood: day.mood,
      places: day.places,
      style: input.style,
      input
    })
  );
}

function getRequiredCoverage(input: PlannerInput): PlacePlan["category"][] {
  const required = new Set<PlacePlan["category"]>();
  if (input.preferences.includes("마사지") || input.preferences.includes("힐링/휴식")) required.add("마사지");
  if (input.preferences.includes("액티비티")) required.add("액티비티");
  if (input.preferences.includes("카페")) required.add("카페");
  if (input.preferences.includes("술/힙한바") || input.preferences.includes("가라오케")) required.add("야경");
  if (input.preferences.includes("먹방") || input.preferences.includes("맛집")) required.add("맛집");

  const limit = input.duration === "당일치기" ? 2 : 3;
  return Array.from(required).slice(0, limit);
}

function hasCoveredCategory(dayPlans: DayPlan[], category: PlacePlan["category"]) {
  return dayPlans.some((day) =>
    day.places.some((place) => place.category === category || place.matchTags.includes(category as Preference))
  );
}

function pickRequiredSeed(
  pool: PlaceSeed[],
  input: PlannerInput,
  category: PlacePlan["category"],
  usedNames: Set<string>
) {
  const avoid = input.avoid.trim();
  return pool
    .filter((place) => place.category === category)
    .filter((place) => !usedNames.has(place.placeName))
    .filter((place) => !avoid || !place.placeName.includes(avoid))
    .filter((place) => input.budget === "프리미엄" || !place.premium || input.preferences.includes("가라오케"))
    .map((place) => ({
      place,
      score: getBudgetScore(input, place) + getAccommodationAreaScore(input, place) + getDirectPreferenceScore(input, place)
    }))
    .sort((a, b) => b.score - a.score || a.place.placeName.localeCompare(b.place.placeName, "ko-KR"))[0]?.place;
}

function findCoverageSlot(dayPlans: DayPlan[], seed: PlaceSeed, input: PlannerInput) {
  const slots = dayPlans.flatMap((day, dayIndex) =>
    day.places.map((place, placeIndex) => ({
      dayIndex,
      placeIndex,
      period: place.period,
      current: place
    }))
  );

  return slots
    .filter((slot) => !isMustVisitPlanPlace(slot.current, input))
    .filter((slot) => isAllowedForPeriod(seed, slot.period, getCategoriesBefore(dayPlans[slot.dayIndex].places, slot.placeIndex), input))
    .map((slot) => ({
      ...slot,
      score:
        (seed.bestPeriods.includes(slot.period) ? 30 : 0) +
        (slot.current.category === seed.category ? -30 : 0) +
        (slot.current.period === "점심" && slot.current.category === "맛집" ? -18 : 0) +
        (slot.current.matchTags.some((tag) => input.preferences.includes(tag)) ? -8 : 8) +
        (slot.period === "오후" && seed.category === "마사지" ? 12 : 0) +
        (slot.period === "저녁" && seed.category === "마사지" ? 6 : 0)
    }))
    .sort((a, b) => b.score - a.score)[0];
}

function getCategoriesBefore(places: PlacePlan[], placeIndex: number) {
  return places.slice(0, placeIndex).map((place) => place.category);
}

function isMustVisitPlanPlace(place: PlacePlan, input: PlannerInput) {
  const mustVisit = input.mustVisit.trim();
  if (!mustVisit) return false;
  const needle = normalizePlaceKeyword(mustVisit);
  const haystack = normalizePlaceKeyword(`${place.placeName} ${place.mapQuery} ${place.description} ${place.matchTags.join(" ")}`);
  return haystack.includes(needle) || needle.includes(normalizePlaceKeyword(place.placeName));
}

function resolveMustVisitSeed(input: PlannerInput, pool: PlaceSeed[]) {
  const mustVisit = input.mustVisit.trim();
  if (!mustVisit) return undefined;
  return pool.find((place) => isMustVisitMatch(place, mustVisit)) ?? createCustomMustVisitSeed(input);
}

function getMustVisitPlacement(seed: PlaceSeed, input: PlannerInput, totalDays: number) {
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const activePeriods = getActivePeriods(input, dayIndex, totalDays);
    const exactPeriod = seed.bestPeriods.find((period) => activePeriods.includes(period));
    if (exactPeriod) return { dayIndex, period: exactPeriod };
  }

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const activePeriods = getActivePeriods(input, dayIndex, totalDays);
    const relaxedPeriod =
      activePeriods.find((period) => period !== "밤") ?? activePeriods[0];
    if (relaxedPeriod) return { dayIndex, period: relaxedPeriod };
  }

  return undefined;
}

function isMustVisitMatch(place: Pick<PlaceSeed, "placeName" | "mapQuery" | "description" | "tags">, mustVisit: string) {
  const needle = normalizePlaceKeyword(mustVisit);
  if (!needle) return false;
  const haystack = normalizePlaceKeyword(`${place.placeName} ${place.mapQuery} ${place.description} ${place.tags.join(" ")}`);
  return haystack.includes(needle) || needle.includes(normalizePlaceKeyword(place.placeName));
}

function normalizePlaceKeyword(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function createCustomMustVisitSeed(input: PlannerInput): PlaceSeed {
  const placeName = input.mustVisit.trim();
  const category = inferMustVisitCategory(placeName);
  const bestPeriods = getBestPeriodsForCategory(category);
  const tags = getTagsForCategory(category);
  return base(
    placeName,
    category,
    "사용자가 꼭 가고 싶다고 입력한 장소라 일정에 고정했어요.",
    `${placeName} ${input.destination}`,
    getDefaultCostMin(category),
    getDefaultCostMax(category),
    bestPeriods,
    tags,
    "Google Maps에서 영업시간과 정확한 위치를 먼저 확인하고 이동하세요."
  );
}

function pickPlace(
  pool: PlaceSeed[],
  input: PlannerInput,
  profile: TravelerProfile,
  period: PlacePlan["period"],
  used: Set<string>,
  dayCategories: PlacePlan["category"][],
  offset: number
) {
  const avoid = input.avoid.trim();
  const candidates = pool
    .filter((place) => !used.has(place.placeName))
    .filter((place) => !avoid || !place.placeName.includes(avoid))
    .filter((place) => profile.luxuryBias || input.budget === "프리미엄" || input.preferences.includes("가라오케") || !place.premium)
    .filter((place) => isAllowedForPeriod(place, period, dayCategories, input))
    .map((place) => ({
      place,
      score:
        place.tags.reduce((total, tag) => total + (input.preferences.includes(tag) ? 14 : 0), 0) +
        place.tags.reduce((total, tag) => total + (profile.preferredTags.includes(tag) ? 8 : 0), 0) +
        (profile.preferredCategories.includes(place.category) ? 16 : 0) -
        (profile.avoidCategories.includes(place.category) ? 18 : 0) +
        (profile.safetyFirst && place.reviewCount && place.reviewCount >= 1000 ? 6 : 0) +
        (profile.luxuryBias && place.premium ? 18 : 0) +
        getDirectPreferenceScore(input, place) +
        getBudgetScore(input, place) +
        getAccommodationAreaScore(input, place) +
        getStyleScore(input, place) -
        Math.max(0, place.routeMinutesFromPrevious - 16) * profile.routeBias +
        (period === "밤" && dayCategories.filter((category) => category === "야경").length >= profile.maxNightCount ? -30 : 0) +
        (profile.safetyFirst && isLateNightPlace(place) ? -28 : 0) +
        (profile.safetyFirst && place.tags.includes("가라오케") && !input.preferences.includes("가라오케") ? -36 : 0) +
        (place.bestPeriods.includes(period) ? 8 : 0) +
        getPeriodCategoryScore(period, place.category) -
        getPeriodMismatchPenalty(period, place) -
        getDuplicateCategoryPenalty(dayCategories, place.category) +
        (isMustVisitMatch(place, input.mustVisit) ? 500 : 0) +
        (period === "밤" && place.tags.some((tag) => ["야경", "클럽/바", "술/힙한바", "가라오케"].includes(tag)) ? 3 : 0)
    }))
    .sort((a, b) => b.score - a.score || a.place.placeName.localeCompare(b.place.placeName, "ko-KR"));

  if (candidates.length === 0) {
    const fallbackPool = pool
      .filter((place) => !used.has(place.placeName))
      .filter((place) => !avoid || !place.placeName.includes(avoid))
      .filter((place) => isAllowedForPeriod(place, period, dayCategories, input));
    const relaxedFallbackPool = fallbackPool.length > 0 ? fallbackPool : pool.filter((place) => isAllowedForPeriod(place, period, dayCategories, input));
    return relaxedFallbackPool[offset % relaxedFallbackPool.length] ?? pool[offset % pool.length];
  }
  const topScore = candidates[0].score;
  const topGroup = candidates.filter((candidate) => candidate.score === topScore);
  return topGroup[offset % topGroup.length].place;
}

function mapPreferenceToCategory(preference: Preference): PlacePlan["category"] | undefined {
  if (preference === "맛집" || preference === "먹방" || preference === "로컬 감성" || preference === "로컬") return "맛집";
  if (preference === "카페" || preference === "인스타 감성") return "카페";
  if (preference === "마사지" || preference === "힐링/휴식") return "마사지";
  if (preference === "액티비티" || preference === "자연선" || preference === "관광지") return "액티비티";
  if (preference === "쇼핑" || preference === "럭셔리") return "쇼핑";
  if (preference === "술/힙한바" || preference === "가라오케" || preference === "야경" || preference === "클럽/바") return "야경";
  return undefined;
}

function getDirectPreferenceScore(input: PlannerInput, place: PlaceSeed) {
  let score = 0;
  for (const preference of input.preferences) {
    if (place.tags.includes(preference)) score += 12;
    if (mapPreferenceToCategory(preference) === place.category) score += 14;
  }
  if (input.preferences.includes("마사지") && place.category === "마사지") score += 24;
  if (input.preferences.includes("힐링/휴식") && ["마사지", "카페"].includes(place.category)) score += 14;
  if (input.preferences.includes("먹방") && place.category === "맛집") score += 16;
  if (input.preferences.includes("인스타 감성") && ["카페", "관광지", "야경"].includes(place.category)) score += 10;
  if (input.preferences.includes("럭셔리") && place.premium) score += 24;
  if (input.preferences.includes("가라오케") && place.tags.includes("가라오케")) score += 32;
  return score;
}

function getBudgetScore(input: PlannerInput, place: PlaceSeed) {
  if (input.budget === "가성비") {
    if (place.premium || place.costMax >= 80000) return -34;
    if (place.costMax <= 12000) return 24;
    if (place.costMax <= 30000) return 14;
    return -8;
  }

  if (input.budget === "프리미엄") {
    let score = 0;
    if (place.premium) score += 30;
    if (place.costMax >= 70000) score += 18;
    if (["마사지", "야경", "쇼핑", "액티비티"].includes(place.category)) score += 8;
    if (place.costMax <= 12000) score -= 8;
    return score;
  }

  if (place.costMax >= 12000 && place.costMax <= 80000) return 10;
  if (place.costMax > 110000) return -12;
  return 0;
}

function getAccommodationAreaScore(input: PlannerInput, place: Pick<PlaceSeed, "placeName" | "mapQuery">) {
  const text = normalizePlaceKeyword(`${place.placeName} ${place.mapQuery}`);
  if (input.accommodationArea === "타오디엔" && hasAnyKeyword(text, ["타오디엔", "thao dien"])) return 20;
  if (input.accommodationArea === "푸미흥/7군" && hasAnyKeyword(text, ["푸미흥", "phu my hung", "district 7", "crescent"])) return 24;
  if (input.accommodationArea === "부이비엔/팜응라오" && hasAnyKeyword(text, ["부이비엔", "bui vien", "pham ngu lao"])) return 18;
  if (input.accommodationArea === "응우옌후에/동코이" && hasAnyKeyword(text, ["응우옌후에", "nguyen hue", "dong khoi"])) return 16;
  if (input.accommodationArea === "1군/벤탄시장" && hasAnyKeyword(text, ["벤탄", "ben thanh", "district 1", "saigon"])) return 12;
  return 0;
}

function getStyleScore(input: PlannerInput, place: PlaceSeed) {
  if (input.style === "여유롭게") return ["카페", "마사지", "쇼핑"].includes(place.category) ? 12 : place.category === "액티비티" ? -10 : 0;
  if (input.style === "빡세게") return ["액티비티", "관광지", "야경"].includes(place.category) ? 12 : 0;
  return ["맛집", "카페", "관광지"].includes(place.category) ? 4 : 0;
}

function getTravelerProfile(input: PlannerInput): TravelerProfile {
  const preferredCategories = new Set<PlacePlan["category"]>();
  const avoidCategories = new Set<PlacePlan["category"]>();
  const preferredTags = new Set<Preference>();
  let maxNightCount = 1;
  let safetyFirst = false;
  let luxuryBias = input.budget === "프리미엄" || input.preferences.includes("럭셔리");
  let routeBias = input.style === "여유롭게" ? 0.5 : 0.2;

  if (input.companion === "혼자" || input.preferences.includes("혼자 여행")) {
    ["카페", "마사지", "쇼핑", "관광지"].forEach((category) => preferredCategories.add(category as PlacePlan["category"]));
    ["로컬", "카페", "관광지"].forEach((tag) => preferredTags.add(tag as Preference));
    avoidCategories.add("야경");
    maxNightCount = 0;
    safetyFirst = true;
    routeBias += 0.25;
  }

  if (input.companion === "커플" || input.preferences.includes("커플 여행")) {
    ["카페", "야경", "마사지", "관광지"].forEach((category) => preferredCategories.add(category as PlacePlan["category"]));
    ["인스타 감성", "야경", "카페"].forEach((tag) => preferredTags.add(tag as Preference));
    maxNightCount = 1;
  }

  if (input.companion === "가족" || input.preferences.includes("가족 여행")) {
    ["관광지", "쇼핑", "맛집", "마사지"].forEach((category) => preferredCategories.add(category as PlacePlan["category"]));
    ["관광지", "쇼핑"].forEach((tag) => preferredTags.add(tag as Preference));
    avoidCategories.add("야경");
    maxNightCount = 0;
    safetyFirst = true;
    routeBias += 0.35;
  }

  if (input.preferences.includes("여자끼리")) {
    ["카페", "마사지", "쇼핑", "야경"].forEach((category) => preferredCategories.add(category as PlacePlan["category"]));
    ["카페", "쇼핑", "인스타 감성"].forEach((tag) => preferredTags.add(tag as Preference));
    maxNightCount = 1;
    safetyFirst = true;
    routeBias += 0.2;
  }

  if (input.preferences.includes("가라오케")) {
    preferredCategories.add("야경");
    ["가라오케", "클럽/바", "야경"].forEach((tag) => preferredTags.add(tag as Preference));
    maxNightCount = Math.max(maxNightCount, 1);
  }

  if (luxuryBias) {
    ["야경", "마사지", "쇼핑"].forEach((category) => preferredCategories.add(category as PlacePlan["category"]));
    ["럭셔리", "야경", "쇼핑"].forEach((tag) => preferredTags.add(tag as Preference));
    maxNightCount = Math.max(maxNightCount, 1);
  }

  for (const preference of input.preferences) {
    preferredTags.add(preference);
    const mappedCategory = mapPreferenceToCategory(preference);
    if (mappedCategory) preferredCategories.add(mappedCategory);
  }

  if (input.budget === "가성비") routeBias += 0.1;
  if (input.budget === "프리미엄") routeBias = Math.max(0.08, routeBias - 0.08);

  return {
    preferredCategories: Array.from(preferredCategories),
    avoidCategories: Array.from(avoidCategories),
    preferredTags: Array.from(preferredTags),
    maxNightCount,
    safetyFirst,
    luxuryBias,
    routeBias
  };
}

function getPeriodCategoryScore(period: PlacePlan["period"], category: PlacePlan["category"]) {
  const desiredByPeriod: Record<PlacePlan["period"], PlacePlan["category"][]> = {
    오전: ["관광지", "액티비티"],
    점심: ["맛집"],
    오후: ["카페", "마사지", "쇼핑", "관광지"],
    저녁: ["맛집", "야경"],
    밤: ["야경"]
  };
  return desiredByPeriod[period].includes(category) ? 12 : -4;
}

function getPeriodMismatchPenalty(period: PlacePlan["period"], place: PlaceSeed) {
  const category = place.category;
  if (isLateNightPlace(place) && period !== "밤") return 42;
  if (period === "밤" && ["맛집", "카페", "마사지", "쇼핑", "액티비티"].includes(category)) return 46;
  if (period === "저녁" && category === "카페") return 42;
  if (period === "저녁" && ["마사지", "쇼핑"].includes(category)) return 12;
  if (period === "점심" && category !== "맛집") return 10;
  return 0;
}

function getDuplicateCategoryPenalty(dayCategories: PlacePlan["category"][], category: PlacePlan["category"]) {
  const count = dayCategories.filter((item) => item === category).length;
  if (category === "맛집") return count * 14;
  if (category === "카페") return count * 26;
  return count * 6;
}

function toPlacePlan(seed: PlaceSeed, period: PlacePlan["period"], input: PlannerInput, dayIndex: number, periodIndex: number): PlacePlan {
  const lodgingPenalty = getLodgingPenalty(input, seed.category);
  const routeMinutes = seed.routeMinutesFromPrevious + lodgingPenalty;
  const fitReason = buildPlaceFitReason(seed, period, input, routeMinutes);
  return {
    id: `${dayIndex + 1}-${periodIndex + 1}-${seed.placeName}`,
    period,
    time: timeByPeriod[period],
    ...seed,
    routeMinutesFromPrevious: routeMinutes,
    moveTip: `${input.accommodationArea} 기준 ${routeMinutes}분 안팎 예상. 실제 이동 전 Google Maps/Grab으로 재확인하세요.`,
    fitReason: isMustVisitMatch(seed, input.mustVisit) ? `꼭 가고 싶은 곳으로 고정 · ${fitReason}` : fitReason
  };
}

function buildPlaceFitReason(seed: PlaceSeed, period: PlacePlan["period"], input: PlannerInput, routeMinutes: number) {
  const reasons = [
    getPeriodFitCopy(seed, period),
    getCompanionFitCopy(input, seed),
    getBudgetFitCopy(input, seed),
    routeMinutes <= 20 ? `${input.accommodationArea} 기준 이동 부담이 낮은 편` : `${input.accommodationArea} 기준 이동시간을 감안해 배치`,
    seed.tags.some((tag) => input.preferences.includes(tag)) ? `${seed.tags.filter((tag) => input.preferences.includes(tag)).slice(0, 2).join(", ")} 취향 반영` : undefined
  ].filter(Boolean) as string[];

  return reasons.slice(0, 3).join(" · ");
}

function getPeriodFitCopy(seed: PlaceSeed, period: PlacePlan["period"]) {
  if (period === "밤") {
    if (seed.tags.includes("가라오케")) return "21시 이후 예약하고 가기 좋은 밤 코스";
    if (isLateNightPlace(seed)) return "21시 이후 분위기가 살아나는 밤거리 코스";
    return "저녁 이후 야경·루프탑 흐름에 맞는 코스";
  }
  if (period === "저녁" && seed.category === "맛집") return "저녁 식사 시간대에 맞춘 식당 코스";
  if (period === "저녁" && seed.category === "야경") return "식사 뒤 이어가기 좋은 야경 코스";
  if (period === "오후" && seed.category === "카페") return "더운 오후에 쉬어가기 좋은 카페 코스";
  if (period === "오후" && seed.category === "마사지") return "오후 체력 회복용으로 넣기 좋은 코스";
  if (period === "점심" && seed.category === "맛집") return "점심 시간대에 맞춘 식사 코스";
  if (period === "오전" && seed.category === "액티비티") return "오전에 시작해야 여유로운 투어 코스";
  return `${period} 시간대에 ${seed.category} 흐름이 좋아요`;
}

function getCompanionFitCopy(input: PlannerInput, seed: PlaceSeed) {
  if (input.companion === "혼자" || input.preferences.includes("혼자 여행")) {
    if (seed.category === "야경") return "혼자 여행이라 밤 이동은 짧게 확인 필요";
    return "혼자 움직여도 부담이 낮은 후보";
  }
  if (input.companion === "커플" || input.preferences.includes("커플 여행")) {
    if (["카페", "야경", "관광지", "마사지"].includes(seed.category)) return "커플 여행 분위기에 맞는 후보";
    return "커플 일정 중간에 무난하게 넣기 좋음";
  }
  if (input.companion === "가족" || input.preferences.includes("가족 여행")) {
    if (seed.category === "야경") return "가족 여행이면 귀가 동선 확인 필요";
    return "가족 동행도 무난한 검증형 후보";
  }
  if (input.preferences.includes("여자끼리")) return "후기와 이동 안정성을 우선한 후보";
  return `${input.companion} 여행에서 무난한 후보`;
}

function getBudgetFitCopy(input: PlannerInput, seed: PlaceSeed) {
  if (input.budget === "가성비") return seed.costMax <= 30000 ? "가성비 예산에 맞음" : "예산 초과 가능성은 낮게 확인 필요";
  if (input.budget === "프리미엄") return seed.premium ? "프리미엄 예산에 맞는 선택" : "프리미엄 일정 속 부담 없는 구간";
  return "보통 예산에서 무난한 비용대";
}

function buildPersonalization(input: PlannerInput): Itinerary["personalization"] {
  const companionPref = `${input.companion} 여행` as Preference;
  const matchScore = Math.min(98, 72 + input.preferences.length * 3 + (input.preferences.includes(companionPref) ? 8 : 4));
  const profileCopy = getTravelerProfileCopy(input);
  return {
    persona: getPersona(input),
    matchScore,
    routeStrategy:
      input.duration === "당일치기"
        ? `${input.arrivalTime}, ${input.departureTime} 기준으로 오전-점심-오후-저녁-밤 흐름을 하루 안에 압축했어요. ${getStyleStrategy(input.style)}`
        : `${input.accommodationArea} 숙소를 기준으로 첫날 ${input.arrivalTime}, 마지막날 ${input.departureTime}을 반영했어요. ${getStyleStrategy(input.style)}`,
    highlights: [
      `${input.preferences.slice(0, 3).join(", ")} 취향을 우선 반영`,
      profileCopy,
      input.mustVisit ? `"${input.mustVisit}" 관련 장소를 우선 배치` : "꼭 가고 싶은 장소를 입력하면 다음 생성 때 고정 가능"
    ],
    improvementTips: [
      "숙소를 Google Place로 선택하면 실제 이동시간 정확도가 더 좋아져요.",
      "마음에 안 드는 장소는 빼기/대체하기로 바로 수정하세요.",
      "비가 오면 야외 관광명소보다 카페/마사지/실내 쇼핑을 앞으로 당기는 게 좋아요."
    ]
  };
}

function getTravelerProfileCopy(input: PlannerInput) {
  if (input.preferences.includes("여자끼리")) return "여자끼리 여행 기준으로 후기 많은 곳과 안전한 밤 동선을 우선";
  if (input.companion === "혼자" || input.preferences.includes("혼자 여행")) return "혼자 여행 기준으로 밤 일정과 먼 이동을 줄임";
  if (input.companion === "커플" || input.preferences.includes("커플 여행")) return "커플 여행 기준으로 감성 카페, 관광명소, 야경을 강화";
  if (input.companion === "가족" || input.preferences.includes("가족 여행")) return "가족 여행 기준으로 검증된 장소와 짧은 동선을 우선";
  if (input.preferences.includes("럭셔리") || input.budget === "프리미엄") return "럭셔리 취향 기준으로 스파, 루프탑, 쇼핑 비중 강화";
  return `${input.companion} 여행 기준으로 밤 일정과 이동 부담 조정`;
}

function buildDayPlan({
  day,
  title,
  mood,
  places,
  style,
  input
}: {
  day: number;
  title: string;
  mood: string;
  places: PlacePlan[];
  style: PlannerInput["style"];
  input: PlannerInput;
}): DayPlan {
  const costMin = places.reduce((total, place) => total + place.costMin, 0);
  const costMax = places.reduce((total, place) => total + place.costMax, 0);
  const moveMinutes = places.reduce((total, place) => total + place.routeMinutesFromPrevious, 0);
  const intensity = style === "빡세게" ? "빡셈" : style === "여유롭게" ? "여유" : moveMinutes > 90 ? "빡셈" : moveMinutes > 70 ? "적당" : "여유";
  const routeWarning =
    moveMinutes > 90
      ? "이 날은 이동이 많은 편이에요. 카페나 마사지 하나를 빼면 훨씬 편해져요."
      : input.accommodationArea === "공항 근처" && places.some((place) => place.period === "밤")
        ? "공항 근처 숙소라면 밤 일정 후 귀가 시간이 길 수 있어요."
        : undefined;

  return {
    day,
    title,
    mood,
    totalCost: `${formatVndFromKrw(costMin)}~${formatVndFromKrw(costMax)}`,
    totalMoveTime: `${moveMinutes}분`,
    intensity,
    rainyPlan: "비가 오면 야외 관광명소보다 카페, 마사지, 실내 쇼핑을 앞으로 당기세요.",
    survivalTip: `${input.accommodationArea} 숙소 기준으로 출발 전 지도 앱과 Grab에 목적지를 모두 찍어두세요.`,
    routeWarning,
    places
  };
}

function inferMustVisitCategory(placeName: string): PlacePlan["category"] {
  const text = normalizePlaceKeyword(placeName);
  if (hasAnyKeyword(text, ["카페", "coffee", "cafe", "콩카페"])) return "카페";
  if (hasAnyKeyword(text, ["마사지", "스파", "spa", "sauna", "사우나"])) return "마사지";
  if (hasAnyKeyword(text, ["가라오케", "karaoke", "클럽", "club", "bar", "바", "pub", "루프탑", "rooftop", "부이비엔", "bui", "night"])) return "야경";
  if (hasAnyKeyword(text, ["시장", "마켓", "market", "몰", "mall", "쇼핑", "shopping"])) return "쇼핑";
  if (hasAnyKeyword(text, ["투어", "tour", "섬", "island", "쿠킹", "cooking", "온천", "mudbath", "케이블카", "activity"])) return "액티비티";
  if (hasAnyKeyword(text, ["맛집", "식당", "레스토랑", "restaurant", "food", "pho", "banhmi", "반미", "쌀국수", "분짜", "짬뽕", "갈비", "bbq", "해산물"])) return "맛집";
  return "관광지";
}

function getBestPeriodsForCategory(category: PlacePlan["category"]): PlacePlan["period"][] {
  if (category === "맛집") return ["점심", "저녁"];
  if (category === "카페") return ["오후"];
  if (category === "마사지") return ["오후", "저녁"];
  if (category === "쇼핑") return ["오후", "저녁"];
  if (category === "야경") return ["밤"];
  if (category === "액티비티") return ["오전", "오후"];
  return ["오전", "오후"];
}

function getTagsForCategory(category: PlacePlan["category"]): Preference[] {
  if (category === "맛집") return ["맛집", "먹방", "로컬"];
  if (category === "카페") return ["카페", "인스타 감성"];
  if (category === "마사지") return ["마사지", "힐링/휴식"];
  if (category === "쇼핑") return ["쇼핑", "로컬"];
  if (category === "야경") return ["야경", "클럽/바"];
  if (category === "액티비티") return ["액티비티", "관광지"];
  return ["관광지", "인스타 감성"];
}

function getDefaultCostMin(category: PlacePlan["category"]) {
  if (category === "맛집") return 8000;
  if (category === "카페") return 4000;
  if (category === "마사지") return 25000;
  if (category === "야경") return 10000;
  if (category === "액티비티") return 30000;
  return 0;
}

function getDefaultCostMax(category: PlacePlan["category"]) {
  if (category === "맛집") return 30000;
  if (category === "카페") return 12000;
  if (category === "마사지") return 80000;
  if (category === "쇼핑") return 50000;
  if (category === "야경") return 80000;
  if (category === "액티비티") return 100000;
  return 15000;
}

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizePlaceKeyword(keyword)));
}

function food(placeName: string, description: string, mapQuery: string, costMin: number, costMax: number): PlaceSeed {
  return base(placeName, "맛집", description, mapQuery, costMin, costMax, ["점심", "저녁"], ["맛집", "먹방", "로컬"], "한국인 입맛에도 무난해서 실패 확률이 낮아요.");
}

function foodPremium(placeName: string, description: string, mapQuery: string, costMin: number, costMax: number): PlaceSeed {
  return base(
    placeName,
    "맛집",
    description,
    mapQuery,
    costMin,
    costMax,
    ["점심", "저녁"],
    ["맛집", "먹방", "럭셔리"],
    "예약 가능 여부와 드레스코드, 코스 가격을 지도에서 한 번 더 확인하세요.",
    true
  );
}

function cafe(placeName: string, description: string, mapQuery: string): PlaceSeed {
  return base(placeName, "카페", description, mapQuery, 4000, 12000, ["오후"], ["카페", "인스타 감성"], "더운 오후에 쉬어가기 좋아요.");
}

function sight(placeName: string, description: string, mapQuery: string): PlaceSeed {
  return base(placeName, "관광지", description, mapQuery, 0, 10000, ["오전", "오후"], ["관광지", "인스타 감성"], "오전이나 오후 늦게 가면 사진과 체력 모두 좋아요.");
}

function shopping(placeName: string, description: string, mapQuery: string): PlaceSeed {
  return base(placeName, "쇼핑", description, mapQuery, 0, 50000, ["오후", "저녁"], ["쇼핑", "로컬", "럭셔리"], "가격 비교 후 흥정하면 좋아요.");
}

function tour(placeName: string, description: string, mapQuery: string, costMin: number, costMax: number): PlaceSeed {
  return base(placeName, "액티비티", description, mapQuery, costMin, costMax, ["오전"], ["액티비티", "관광지"], "하루 일정의 중심이 되므로 오전 고정이 좋아요.", true);
}

function activity(placeName: string, description: string, mapQuery: string, costMin: number, costMax: number): PlaceSeed {
  return base(placeName, "액티비티", description, mapQuery, costMin, costMax, ["오전", "오후"], ["액티비티", "인스타 감성"], "날씨 영향을 받으니 전날 예보를 확인하세요.");
}

function massage(placeName: string, description: string, mapQuery: string, premium?: boolean): PlaceSeed {
  return base(placeName, "마사지", description, mapQuery, 25000, 80000, ["오후", "저녁"], ["마사지", "힐링/휴식"], "예약 후 방문하면 대기 시간을 줄일 수 있어요.", premium);
}

function night(placeName: string, description: string, mapQuery: string, premium?: boolean): PlaceSeed {
  const lateNight = /부이비엔|Bui Vien|타히엔|Ta Hien|Beer Street|Walking Street/i.test(`${placeName} ${mapQuery}`);
  return base(
    placeName,
    "야경",
    lateNight ? `${description}. 21시 이후에 분위기가 살아나는 밤 코스` : description,
    mapQuery,
    10000,
    60000,
    lateNight ? ["밤"] : ["저녁", "밤"],
    ["야경", "클럽/바", "술/힙한바"],
    lateNight ? "21시 이후가 가장 활기차요. 늦은 귀가는 Grab Car로 숙소 앞까지 이동하세요." : "늦은 귀가는 Grab Car를 추천해요.",
    premium
  );
}

function nightCheap(placeName: string, description: string, mapQuery: string): PlaceSeed {
  return base(
    placeName,
    "야경",
    description,
    mapQuery,
    0,
    12000,
    ["밤"],
    ["야경", "로컬"],
    "돈을 많이 쓰기보다 산책, 간식, 사진 위주로 가볍게 둘러보면 좋아요."
  );
}

function isLateNightPlace(place: Pick<PlaceSeed, "placeName" | "mapQuery" | "category">) {
  return place.category === "야경" && /부이비엔|Bui Vien|타히엔|Ta Hien|Beer Street|Walking Street/i.test(`${place.placeName} ${place.mapQuery}`);
}

function isNightOnlyPlace(place: Pick<PlaceSeed, "placeName" | "mapQuery" | "category" | "tags">) {
  return isLateNightPlace(place) || place.tags.includes("가라오케");
}

function isAllowedForPeriod(
  place: PlaceSeed,
  period: PlacePlan["period"],
  dayCategories: PlacePlan["category"][] = [],
  input?: PlannerInput
) {
  if (isNightOnlyPlace(place)) return period === "밤";
  if (period === "밤") return place.category === "야경";
  if (period === "저녁" && place.category === "마사지") {
    return Boolean(input?.preferences.includes("마사지") || input?.preferences.includes("힐링/휴식") || input?.style === "여유롭게");
  }
  if (period === "저녁" && !["맛집", "야경"].includes(place.category)) return false;
  if (place.category === "카페" && dayCategories.includes("카페")) return false;
  return place.bestPeriods.includes(period);
}

function karaoke(placeName: string, description: string, mapQuery: string): PlaceSeed {
  return base(
    placeName,
    "야경",
    `${description}. 21시 이후 예약 후 방문하기 좋은 밤 코스`,
    mapQuery,
    30000,
    120000,
    ["밤"],
    ["가라오케", "클럽/바", "술/힙한바", "야경"],
    "룸/시간제 요금과 주류 포함 여부를 먼저 확인하고, 늦은 귀가는 Grab Car를 추천해요.",
    true
  );
}

function base(
  placeName: string,
  category: PlacePlan["category"],
  description: string,
  mapQuery: string,
  costMin: number,
  costMax: number,
  bestPeriods: PlacePlan["period"][],
  tags: Preference[],
  localTip: string,
  premium?: boolean
): PlaceSeed {
  const trust = buildTrustSignals(category, costMax, premium);
  return {
    placeName,
    category,
    description,
    stayTime: category === "액티비티" ? "2~5시간" : "1시간 30분",
    estimatedCost: `${formatVndFromKrw(costMin)}~${formatVndFromKrw(costMax)}`,
    costMin,
    costMax,
    routeMinutesFromPrevious: category === "액티비티" ? 35 : category === "관광지" ? 18 : 12,
    difficulty: category === "액티비티" ? "보통" : "쉬움",
    moveTip: "Google Maps/Grab으로 실제 이동시간을 확인하세요.",
    localTip,
    fitReason: `${tags.slice(0, 2).join(" · ")} 취향에 맞고 ${bestPeriods.join("/")} 시간대에 넣기 좋은 코스예요.`,
    matchTags: tags.slice(0, 3),
    alternativePlaces: buildAlternatives(category),
    rainyAlternative: ["카페", "마사지", "쇼핑"].includes(category) ? "비 오는 날 그대로 진행하기 좋아요." : "비가 강하면 카페, 마사지, 실내 쇼핑으로 대체하세요.",
    rating: trust.rating,
    reviewCount: trust.reviewCount,
    koreanFitScore: trust.koreanFitScore,
    reliabilityBadge: trust.reliabilityBadge,
    warning: ["쇼핑", "야경"].includes(category) ? "사람 많은 곳에서는 휴대폰과 가방을 앞으로 챙기세요." : undefined,
    reservationTip: premium || tags.includes("가라오케") ? "인기 시간대는 사전 예약을 추천해요." : undefined,
    mapQuery,
    googleMapsUri: findSeedGoogleMapsUri(placeName, mapQuery),
    tags,
    bestPeriods,
    premium,
    openingHint: isLateNightPlace({ placeName, mapQuery, category }) || tags.includes("가라오케") ? "21시 이후 예약 추천" : trust.openingHint
  };
}

function findSeedGoogleMapsUri(placeName: string, mapQuery: string) {
  const placeKey = normalizeSeedText(placeName);
  const queryKey = normalizeSeedText(mapQuery);
  const destination = inferSeedDestination(mapQuery);
  const candidates = destination ? curatedPlaces.filter((place) => place.city === destination) : curatedPlaces;
  const match = candidates.find((place) => {
    const nameKey = normalizeSeedText(place.name);
    return nameKey.includes(placeKey) || placeKey.includes(nameKey) || queryKey.includes(nameKey);
  });
  return match?.googleMapsUri;
}

function inferSeedDestination(mapQuery: string): Destination | undefined {
  const query = mapQuery.toLowerCase();
  if (/ho chi minh|saigon|hcm/.test(query)) return "호치민";
  if (/da nang|đà nẵng/.test(query)) return "다낭";
  if (/nha trang/.test(query)) return "나트랑";
  if (/hanoi|ha noi|hà nội/.test(query)) return "하노이";
  if (/da lat|dalat|đà lạt/.test(query)) return "달랏";
  if (/phu quoc|phú quốc/.test(query)) return "푸꾸옥";
  return undefined;
}

function normalizeSeedText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function buildTrustSignals(category: PlacePlan["category"], costMax: number, premium?: boolean) {
  const baseRating =
    category === "맛집" ? 4.6 : category === "카페" ? 4.5 : category === "마사지" ? 4.7 : category === "액티비티" ? 4.4 : 4.3;
  const reviewCount =
    category === "관광지" || category === "쇼핑"
      ? 4200
      : category === "맛집"
        ? 1800
        : category === "카페"
          ? 950
          : category === "마사지"
            ? 720
            : 1100;
  const koreanFitScore = Math.min(98, 78 + (category === "맛집" || category === "마사지" ? 10 : 0) + (premium ? 6 : 0));

  return {
    rating: Math.round((baseRating + (premium ? 0.1 : 0)) * 10) / 10,
    reviewCount,
    koreanFitScore,
    reliabilityBadge: costMax > 70000 ? "예약/가격 확인 추천" : reviewCount > 1000 ? "초행자 실패 확률 낮음" : "후기 확인 후 방문 추천",
    openingHint: category === "야경" ? "저녁 이후 방문 추천" : category === "맛집" ? "점심/저녁 피크 대기 가능" : "영업시간 방문 전 확인"
  };
}

function buildAlternatives(category: PlacePlan["category"]) {
  if (category === "맛집") return ["근처 로컬 쌀국수", "반미 맛집", "깔끔한 베트남 가정식"];
  if (category === "카페") return ["콩카페", "전망 좋은 카페", "사진 잘 나오는 감성 카페"];
  if (category === "마사지") return ["호텔 근처 스파", "발마사지 60분", "프리미엄 스파"];
  if (category === "쇼핑") return ["실내 쇼핑몰", "야시장", "기념품 상점"];
  if (category === "액티비티") return ["반일 투어", "시티투어", "실내 체험"];
  if (category === "야경") return ["루프탑 바", "가라오케", "야시장"];
  return ["근처 카페", "실내 명소", "마사지"];
}

function getLodgingPenalty(input: PlannerInput, category: PlacePlan["category"]) {
  if (input.accommodationArea === "아직 미정") return 8;
  if (input.accommodationArea.includes("공항") && category !== "공항/이동") return 20;
  if (["호이안 올드타운", "리조트 존", "선셋타운/남부", "옹랑/북서부"].includes(input.accommodationArea)) {
    return ["야경", "쇼핑", "맛집"].includes(category) ? 14 : 8;
  }
  if (["타오디엔", "서호/떠이호", "혼총/북부", "바딘/롯데센터"].includes(input.accommodationArea)) {
    return ["관광지", "쇼핑", "야경"].includes(category) ? 9 : 5;
  }
  if (input.accommodationArea === "푸미흥/7군") {
    return ["관광지", "야경", "공항/이동"].includes(category) ? 13 : 6;
  }
  return 0;
}

function getDayTitle(destination: Destination, dayIndex: number) {
  return [`${destination} 첫날 적응 코스`, `${destination} 맛집·카페·사진 코스`, `${destination} 투어와 액티비티 코스`, `${destination} 여유 휴식 코스`, `${destination} 마지막 쇼핑 코스`][dayIndex] ?? `${destination} 자유여행 코스`;
}

function getMood(input: PlannerInput, dayIndex: number) {
  if (input.style === "빡세게") return "핵심 스팟과 투어를 촘촘히 넣은 고효율 동선";
  if (input.style === "여유롭게") return "이동을 줄이고 카페와 휴식을 넉넉히 둔 하루";
  return dayIndex % 2 === 0 ? "관광명소와 쉬는 시간을 섞은 하루" : "맛집과 로컬 동선을 조금 더 넣은 하루";
}

function getStyleStrategy(style: PlannerInput["style"]) {
  if (style === "빡세게") return "오전부터 투어와 핵심 명소를 당겨 넣고 밤에는 야경으로 마무리해요.";
  if (style === "여유롭게") return "카페, 마사지, 해변 휴식처럼 체력 회복 구간을 넉넉히 둬요.";
  return "핵심 명소와 쉬는 시간을 번갈아 배치해 초행자도 지치지 않게 만들어요.";
}

function getPersona(input: PlannerInput) {
  if (input.preferences.includes("여자끼리")) return "사진, 안전, 휴식을 같이 챙기는 여자끼리 여행자";
  if (input.companion === "혼자" || input.preferences.includes("혼자 여행")) return "혼자서도 부담 없는 안전 동선 여행자";
  if (input.companion === "커플" || input.preferences.includes("커플 여행")) return "분위기와 야경을 챙기는 커플 여행자";
  if (input.companion === "가족" || input.preferences.includes("가족 여행")) return "동선과 안전을 우선하는 가족 여행자";
  if (input.preferences.includes("럭셔리") || input.budget === "프리미엄") return "스파, 루프탑, 쇼핑을 즐기는 프리미엄 여행자";
  if (input.preferences.includes("액티비티")) return "움직이면서 경험을 쌓는 체험형 여행자";
  if (input.preferences.includes("가라오케")) return "밤에 노래방과 바 분위기를 즐기는 여행자";
  if (input.preferences.includes("인스타 감성")) return "사진과 분위기를 중요하게 보는 감성 여행자";
  if (input.preferences.includes("먹방") || input.preferences.includes("맛집")) return "맛집 중심으로 도시를 이해하는 먹방 여행자";
  if (input.preferences.includes("힐링/휴식") || input.preferences.includes("마사지")) return "무리하지 않고 컨디션을 챙기는 휴식형 여행자";
  return "핵심 명소와 로컬 감성을 섞어 즐기는 자유여행자";
}

function getMustKnow(destination: Destination) {
  const common = ["Grab 목적지는 출발 전에 미리 찍어두면 언어 부담이 줄어요.", "시장과 야시장은 첫 가격 그대로 결제하지 말고 가볍게 흥정하세요."];
  if (["다낭", "나트랑", "푸꾸옥"].includes(destination)) return ["해변 도시는 날씨와 파도 영향을 많이 받아 투어 전날 확인이 좋아요.", ...common];
  if (destination === "달랏") return ["달랏은 밤 기온이 내려가니 얇은 겉옷을 챙기면 좋아요.", ...common];
  if (destination === "하노이") return ["올드쿼터는 길이 좁고 오토바이가 많아 도보 이동 시간을 넉넉히 잡으세요.", ...common];
  return ["낮에는 더우니 오전 관광, 오후 카페/마사지, 밤 야경 흐름이 편해요.", ...common];
}

function getCautions(destination: Destination, input: PlannerInput) {
  const cautions = ["오토바이 날치기 방지를 위해 길가에서 휴대폰을 오래 들지 마세요.", "시장과 번화가에서는 소지품을 앞으로 메는 편이 좋아요."];
  if (input.accommodationArea.includes("공항")) cautions.push("공항 근처 숙소는 시내 왕복 이동시간이 길 수 있어 밤 일정을 줄이는 게 좋아요.");
  if (["호이안 올드타운", "리조트 존", "선셋타운/남부", "옹랑/북서부"].includes(input.accommodationArea)) {
    cautions.push("숙소가 중심지와 떨어진 권역이라 밤 일정 후 Grab 이동시간을 꼭 확인하세요.");
  }
  if (input.preferences.includes("여자끼리") || input.companion === "혼자") cautions.push("밤에는 큰길 위주로 이동하고 Grab Car로 숙소 앞까지 이동하는 편이 좋아요.");
  if (input.companion === "가족") cautions.push("한낮 야외 이동은 줄이고 카페나 쇼핑몰에서 쉬는 시간을 확보하세요.");
  if (destination === "푸꾸옥") return ["해산물 시세 메뉴는 주문 전 가격을 확인하세요.", "섬 투어는 날씨에 따라 취소될 수 있어요."];
  return cautions;
}

function formatVndFromKrw(value: number) {
  if (value === 0) return "0 VND";
  const vnd = Math.round((value * 18) / 1000) * 1000;
  if (vnd >= 1000000) return `${(vnd / 1000000).toFixed(vnd % 1000000 === 0 ? 0 : 1)}M VND`;
  return `${vnd.toLocaleString("ko-KR")} VND`;
}
