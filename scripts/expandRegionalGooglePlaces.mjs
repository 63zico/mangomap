import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "src", "data", "places.ts");
const googlePath = path.join(rootDir, "data", "collected-google-places.json");
const requireFromScript = createRequire(import.meta.url);

const category = {
  food: "맛집",
  cafe: "카페",
  night: "바/루프탑",
  massage: "마사지",
  karaoke: "가라오케",
  photo: "사진명소",
  shopping: "쇼핑",
  exchange: "환전",
  tour: "투어/액티비티"
};

const cities = [
  {
    name: "다낭",
    queryName: "Da Nang",
    center: { latitude: 16.0544, longitude: 108.2022 },
    radius: 22000,
    foodTerms: ["Mi Quang", "banh xeo", "seafood", "Korean restaurant", "Japanese restaurant", "Chinese restaurant", "brunch"],
    tourTerms: ["Ba Na Hills tour", "Hoi An tour", "Marble Mountains tour", "Son Tra tour"]
  },
  {
    name: "나트랑",
    queryName: "Nha Trang",
    center: { latitude: 12.2388, longitude: 109.1967 },
    radius: 22000,
    foodTerms: ["nem nuong", "bun ca", "seafood", "Korean restaurant", "Japanese restaurant", "Chinese restaurant", "brunch"],
    tourTerms: ["island tour", "mud bath", "snorkeling tour", "VinWonders"]
  },
  {
    name: "하노이",
    queryName: "Hanoi",
    center: { latitude: 21.0278, longitude: 105.8342 },
    radius: 22000,
    foodTerms: ["bun cha", "pho", "banh mi", "cha ca", "Korean restaurant", "Japanese restaurant", "Chinese restaurant", "brunch"],
    tourTerms: ["Old Quarter food tour", "Ha Long Bay tour", "Ninh Binh tour", "cooking class"]
  },
  {
    name: "달랏",
    queryName: "Da Lat",
    center: { latitude: 11.9404, longitude: 108.4583 },
    radius: 20000,
    foodTerms: ["lau ga la e", "banh can", "local restaurant", "BBQ", "Korean restaurant", "Japanese restaurant", "brunch"],
    tourTerms: ["countryside tour", "canyoning tour", "coffee farm tour", "Dalat waterfall tour"]
  },
  {
    name: "푸꾸옥",
    queryName: "Phu Quoc",
    center: { latitude: 10.2899, longitude: 103.984 },
    radius: 30000,
    foodTerms: ["seafood", "crab", "beach restaurant", "Vietnamese restaurant", "Korean restaurant", "Japanese restaurant", "brunch"],
    tourTerms: ["island tour", "snorkeling tour", "Sunset Town", "Grand World"]
  }
];

const plans = [
  {
    key: "food",
    target: 58,
    category: category.food,
    queries: (city) => [
      `best restaurants in ${city.queryName} Vietnam`,
      `local food restaurants in ${city.queryName} Vietnam`,
      `Vietnamese restaurant in ${city.queryName} Vietnam`,
      ...city.foodTerms.map((term) => `${term} ${city.queryName} Vietnam`)
    ]
  },
  {
    key: "cafe",
    target: 32,
    category: category.cafe,
    queries: (city) => [
      `best cafe in ${city.queryName} Vietnam`,
      `specialty coffee ${city.queryName} Vietnam`,
      `instagram cafe ${city.queryName} Vietnam`,
      `work friendly cafe ${city.queryName} Vietnam`,
      `dessert cafe ${city.queryName} Vietnam`,
      `view cafe ${city.queryName} Vietnam`
    ]
  },
  {
    key: "night",
    target: 14,
    category: category.night,
    queries: (city) => [
      `rooftop bar ${city.queryName} Vietnam`,
      `cocktail bar ${city.queryName} Vietnam`,
      `night club ${city.queryName} Vietnam`,
      `live music bar ${city.queryName} Vietnam`
    ]
  },
  {
    key: "massage",
    target: 10,
    category: category.massage,
    queries: (city) => [
      `best massage spa ${city.queryName} Vietnam`,
      `foot massage ${city.queryName} Vietnam`,
      `Korean traveler spa ${city.queryName} Vietnam`
    ]
  },
  {
    key: "photo",
    target: 12,
    category: category.photo,
    queries: (city) => [
      `photo spots ${city.queryName} Vietnam`,
      `landmarks ${city.queryName} Vietnam`,
      `things to do ${city.queryName} Vietnam`,
      `instagram spots ${city.queryName} Vietnam`
    ]
  },
  {
    key: "shopping",
    target: 8,
    category: category.shopping,
    queries: (city) => [
      `market ${city.queryName} Vietnam`,
      `shopping mall ${city.queryName} Vietnam`,
      `souvenir shop ${city.queryName} Vietnam`,
      `night market ${city.queryName} Vietnam`
    ]
  },
  {
    key: "tour",
    target: 10,
    category: category.tour,
    queries: (city) => city.tourTerms.map((term) => `${term} ${city.queryName} Vietnam`)
  },
  {
    key: "exchange",
    target: 3,
    category: category.exchange,
    queries: (city) => [
      `money exchange ${city.queryName} Vietnam`,
      `gold shop exchange ${city.queryName} Vietnam`
    ]
  },
  {
    key: "karaoke",
    target: 3,
    category: category.karaoke,
    queries: (city) => [
      `karaoke ${city.queryName} Vietnam`,
      `Korean karaoke ${city.queryName} Vietnam`
    ]
  }
];

const env = await loadEnv();
const apiKey = env.GOOGLE_MAPS_API_KEY || env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(".env에 GOOGLE_MAPS_API_KEY 또는 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY가 없습니다.");
}

const existingPlaces = await loadCuratedPlaces();
const googleData = existsSync(googlePath)
  ? JSON.parse(await readFile(googlePath, "utf8"))
  : { generatedAt: "", source: "Google Places API Text Search", total: 0, places: [] };
const googleById = new Map((googleData.places ?? []).map((place) => [place.googlePlaceId, place]));
const workingPlaces = existingPlaces.map(normalizeExistingPlace);
const seenIds = new Set(workingPlaces.map((place) => place.googlePlaceId).filter(Boolean));
const seenKeys = new Set(workingPlaces.map(getPlaceKey));
const collectedPlaces = new Map((googleData.places ?? []).map((place) => [place.googlePlaceId, place]));
const added = [];
const queryStats = [];

for (const city of cities) {
  for (const plan of plans) {
    for (const query of plan.queries(city)) {
      const currentCount = countCoordinateCategory(workingPlaces, city.name, plan.category);
      if (currentCount >= plan.target) break;

      process.stdout.write(`Searching ${city.name} / ${plan.key} (${currentCount}/${plan.target}): ${query}\n`);
      const results = await searchText(apiKey, city, query);
      queryStats.push({ city: city.name, category: plan.category, query, count: results.length });

      const candidates = results
        .filter((place) => isUsablePlace(place, plan.category))
        .sort((a, b) => scoreGooglePlace(b, plan.category) - scoreGooglePlace(a, plan.category));

      for (const place of candidates) {
        if (countCoordinateCategory(workingPlaces, city.name, plan.category) >= plan.target) break;
        const curated = toCuratedPlace(city, place, plan, query);
        const key = getPlaceKey(curated);
        if (seenIds.has(curated.googlePlaceId) || seenKeys.has(key)) continue;

        seenIds.add(curated.googlePlaceId);
        seenKeys.add(key);
        workingPlaces.push(curated);
        added.push(curated);
        collectedPlaces.set(curated.googlePlaceId, toGoogleCachePlace(city, place, plan, query));
      }

      await sleep(70);
    }
  }
}

const ordered = orderPlaces(workingPlaces);
const serializedPlaces = JSON.stringify(JSON.stringify(ordered));

await writeFile(
  sourcePath,
  `import type { CuratedPlace } from "../types";

// Google Places API 정보를 기반으로 만든 MVP 큐레이션 시드입니다.
// 프로덕션에서는 googlePlaceId를 저장하고 평점/영업시간은 최신 조회로 보강하는 구조를 권장합니다.
const curatedPlacesJson = ${serializedPlaces};

export const curatedPlaces: CuratedPlace[] = JSON.parse(curatedPlacesJson);
`,
  "utf8"
);

const nextGooglePlaces = Array.from(collectedPlaces.values()).sort((a, b) => {
  const cityCompare = String(a.city).localeCompare(String(b.city), "ko");
  if (cityCompare !== 0) return cityCompare;
  const categoryCompare = String(a.category).localeCompare(String(b.category), "ko");
  if (categoryCompare !== 0) return categoryCompare;
  return (b.rating ?? 0) - (a.rating ?? 0) || (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
});

await writeFile(
  googlePath,
  `${JSON.stringify(
    {
      ...googleData,
      generatedAt: new Date().toISOString(),
      city: "multi-city",
      source: "Google Places API Text Search",
      note: "MANGOMAP 도시별 기본 표본을 Google Places 기반으로 보강했습니다.",
      total: nextGooglePlaces.length,
      places: nextGooglePlaces
    },
    null,
    2
  )}\n`,
  "utf8"
);

process.stdout.write(
  `${JSON.stringify(
    {
      added: added.length,
      total: ordered.length,
      counts: summarizeCounts(ordered),
      queries: queryStats.length
    },
    null,
    2
  )}\n`
);

async function loadCuratedPlaces() {
  const source = await readFile(sourcePath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  new Function("exports", "require", "module", "__filename", "__dirname", js)(
    mod.exports,
    (specifier) => {
      if (specifier === "../types") return {};
      return requireFromScript(specifier);
    },
    mod,
    sourcePath,
    path.dirname(sourcePath)
  );
  return mod.exports.curatedPlaces ?? [];
}

async function loadEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return {};
  const raw = await readFile(envPath, "utf8");
  return raw.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return acc;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return acc;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    acc[key] = value;
    return acc;
  }, {});
}

async function searchText(apiKey, city, textQuery) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.types,places.photos"
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "ko",
      regionCode: "VN",
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: city.center,
          radius: city.radius
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Places request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.places ?? [];
}

function isUsablePlace(place, placeCategory) {
  if (!place.id || !place.displayName?.text || !place.location?.latitude || !place.location?.longitude) return false;
  const text = `${place.displayName.text} ${(place.formattedAddress ?? "")} ${(place.types ?? []).join(" ")}`.toLowerCase();
  if (/(hotel|resort|villa|apartment|condotel|real estate|airport|bus station|taxi)/.test(text) && !["사진명소", "쇼핑", "투어/액티비티"].includes(placeCategory)) return false;
  if (placeCategory === "맛집") return /(restaurant|food|meal|bakery|cafe|bar)/.test(text) && !/(spa|massage|karaoke|travel agency)/.test(text);
  if (placeCategory === "카페") return /(cafe|coffee|bakery|restaurant|food)/.test(text) && !/(bar|club|spa|massage|karaoke)/.test(text);
  if (placeCategory === "바/루프탑") return /(bar|night_club|restaurant|food)/.test(text) && !/(spa|massage|karaoke)/.test(text);
  if (placeCategory === "마사지") return /(spa|massage|beauty_salon)/.test(text);
  if (placeCategory === "가라오케") return /(karaoke|bar|night_club)/.test(text);
  if (placeCategory === "사진명소") return /(tourist_attraction|point_of_interest|park|museum|church|pagoda|landmark|natural_feature|establishment)/.test(text);
  if (placeCategory === "쇼핑") return /(shopping|market|store|mall|jewelry_store|clothing_store|souvenir|establishment)/.test(text);
  if (placeCategory === "환전") return /(currency_exchange|finance|bank|jewelry_store|gold|money)/.test(text);
  if (placeCategory === "투어/액티비티") return /(travel_agency|tourist_attraction|point_of_interest|establishment|amusement_park)/.test(text);
  return true;
}

function scoreGooglePlace(place, placeCategory) {
  let score = 0;
  score += (place.rating ?? 0) * 100;
  score += Math.min(place.userRatingCount ?? 0, 6000) / 12;
  if (place.photos?.[0]?.name) score += 120;
  if ((place.userRatingCount ?? 0) >= 300) score += 80;
  if (placeCategory === "환전") score += 40;
  return score;
}

function toCuratedPlace(city, place, plan, query) {
  const name = place.displayName.text;
  const tags = buildTags(place, plan, query);
  return {
    id: slugify(`${city.name}-${plan.key}-${name}-${place.id}`),
    city: city.name,
    name,
    category: plan.category,
    area: inferArea(city.name, place.formattedAddress ?? name),
    address: place.formattedAddress,
    oneLine: buildOneLine(city.name, plan.category, tags),
    koreanTip: buildKoreanTip(city.name, plan.category),
    tags,
    hiddenGem: tags.includes("숨은핫플") || tags.includes("로컬입문"),
    beginnerSafe: !["바/루프탑", "가라오케"].includes(plan.category),
    rainyDayOk: ["카페", "마사지", "쇼핑", "환전", "가라오케"].includes(plan.category),
    bestTime: inferBestTime(plan.category, tags),
    priceLevel: normalizePriceLevel(place.priceLevel),
    googlePlaceId: place.id,
    googleMapsUri: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city.queryName}`)}`,
    coordinates: {
      latitude: Number(place.location.latitude),
      longitude: Number(place.location.longitude)
    },
    photoName: place.photos?.[0]?.name,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    koreanReviewSignal: {
      score: inferSignalScore(place, tags),
      reviewCount: 0,
      positiveCount: 0,
      cautionCount: 0,
      summary: `${city.name} Google Places 기준으로 추가한 ${plan.category} 후보`,
      keywords: tags.slice(0, 5)
    }
  };
}

function toGoogleCachePlace(city, place, plan, query) {
  return {
    googlePlaceId: place.id,
    city: city.name,
    name: place.displayName.text,
    category: plan.category,
    suggestedCategories: [plan.category],
    address: place.formattedAddress,
    location: place.location,
    googleMapsUri: place.googleMapsUri,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceLevel: place.priceLevel,
    photoName: place.photos?.[0]?.name,
    types: place.types ?? [],
    sourceQueries: [query],
    reviews: googleById.get(place.id)?.reviews ?? [],
    koreanReviewSignal: {
      score: inferSignalScore(place, []),
      reviewCount: 0,
      positiveCount: 0,
      cautionCount: 0,
      summary: `${city.name} Google Places 검색으로 추가한 후보`,
      keywords: []
    }
  };
}

function buildTags(place, plan, query) {
  const text = `${query} ${place.displayName?.text ?? ""} ${(place.types ?? []).join(" ")}`.toLowerCase();
  const tags = new Set(["지도추천", "지역대표"]);
  if (plan.category === "맛집") tags.add("맛집");
  if (plan.category === "카페") tags.add("카페");
  if (plan.category === "바/루프탑") tags.add("밤추천");
  if (plan.category === "마사지") tags.add("마사지");
  if (plan.category === "가라오케") tags.add("가라오케");
  if (plan.category === "사진명소") tags.add("사진스팟");
  if (plan.category === "쇼핑") tags.add("쇼핑");
  if (plan.category === "환전") tags.add("환전");
  if (plan.category === "투어/액티비티") tags.add("투어");

  if (/korean|bbq|samgyeopsal|kimchi/.test(text)) tags.add("한식당");
  if (/chinese|dim sum|hotpot|sichuan|hong kong/.test(text)) tags.add("중식당");
  if (/japanese|sushi|ramen|izakaya/.test(text)) tags.add("일식당");
  if (/vietnamese|local|pho|bun|mi quang|banh|bánh|nem|cha ca|chả cá|lau ga|lẩu gà/.test(text)) tags.add("베트남음식");
  if (/seafood|crab|oyster|lobster|snail/.test(text)) tags.add("해산물");
  if (/brunch|breakfast|bakery|croissant|dessert/.test(text)) tags.add("브런치");
  if (/banh mi|bánh mì/.test(text)) tags.add("반미");
  if (/pho|phở/.test(text)) tags.add("쌀국수");
  if (/coffee|specialty|roaster|espresso/.test(text)) tags.add("커피맛집");
  if (/instagram|photo|view|landmark|sky|rooftop/.test(text)) tags.add("사진맛집");
  if (/work|study|laptop|quiet/.test(text)) tags.add("작업카페");
  if (/dessert|cake|ice cream|patisserie/.test(text)) tags.add("디저트");
  if (/rooftop|sky/.test(text)) tags.add("루프탑");
  if (/cocktail|speakeasy|wine/.test(text)) tags.add("칵테일바");
  if (/club|dj|dance/.test(text)) tags.add("클럽");
  if (/spa|massage/.test(text)) tags.add("스파");
  if (/market|shopping|souvenir|mall/.test(text)) tags.add("기념품");
  if (/gold|exchange|currency|money/.test(text)) tags.add("현금준비");
  if (/tour|class|snorkeling|canyoning|island|tunnel|mountain|waterfall/.test(text)) tags.add("액티비티");
  if ((place.rating ?? 0) >= 4.7) tags.add("고평점");
  if ((place.userRatingCount ?? 0) >= 500) tags.add("리뷰500+");
  tags.add("망고단추천");
  return Array.from(tags).slice(0, 10);
}

function buildOneLine(cityName, placeCategory, tags) {
  if (placeCategory === "맛집") {
    if (tags.includes("한식당")) return `${cityName}에서 베트남 음식이 물릴 때 넣기 좋은 한식 후보`;
    if (tags.includes("해산물")) return `${cityName} 저녁 동선에 넣기 좋은 해산물 맛집 후보`;
    if (tags.includes("베트남음식")) return `${cityName} 첫 여행자가 고르기 쉬운 현지 음식 후보`;
    return `${cityName} 여행 동선에 넣기 좋은 검증형 맛집 후보`;
  }
  if (placeCategory === "카페") return `${cityName}에서 쉬어가거나 사진 남기기 좋은 카페 후보`;
  if (placeCategory === "바/루프탑") return `${cityName} 밤 분위기와 2차 코스로 보기 좋은 후보`;
  if (placeCategory === "마사지") return `${cityName} 일정 중간에 피로 풀기 좋은 마사지 후보`;
  if (placeCategory === "사진명소") return `${cityName}에서 짧게 들러 사진 남기기 좋은 스팟`;
  if (placeCategory === "쇼핑") return `${cityName} 기념품과 간단 쇼핑 동선 후보`;
  if (placeCategory === "환전") return `${cityName} 현금 준비 전 확인하기 좋은 환전 후보`;
  if (placeCategory === "투어/액티비티") return `${cityName} 하루 일정으로 묶기 좋은 액티비티 후보`;
  if (placeCategory === "가라오케") return `${cityName} 밤 일정 전 가격과 룸 조건 확인이 필요한 후보`;
  return `${cityName} 여행 후보`;
}

function buildKoreanTip(cityName, placeCategory) {
  if (placeCategory === "환전") return "방문 전 당일 환율, 수수료, 여권 필요 여부를 Google Maps와 현장에서 한 번 더 확인하세요.";
  if (placeCategory === "가라오케") return "룸 요금, 시간제, 주류 포함 여부를 입장 전에 먼저 확인하는 흐름이 좋아요.";
  if (placeCategory === "투어/액티비티") return "픽업 위치와 포함 사항이 업체마다 달라 예약 전에 상세 조건을 확인하세요.";
  if (placeCategory === "바/루프탑") return "밤 이동은 Grab Car를 추천하고, 드레스코드와 예약 가능 여부를 먼저 확인하세요.";
  return `${cityName} 동선에 넣기 쉬운 후보예요. 피크 시간, 메뉴 사진, 최근 영업시간은 Google Maps에서 한 번 확인하세요.`;
}

function inferArea(cityName, address) {
  const text = address.toLowerCase();
  if (cityName === "다낭") {
    if (/hoi an|hội an/.test(text)) return "호이안";
    if (/sơn trà|son tra|mỹ khê|my khe|mỹ an|my an|an thượng|an thuong/.test(text)) return "미케비치";
    if (/hải châu|hai chau|bạch đằng|bach dang|hàn|han/.test(text)) return "한시장/시내";
    return "다낭 전역";
  }
  if (cityName === "나트랑") {
    if (/trần phú|tran phu|lộc thọ|loc tho/.test(text)) return "쩐푸 해변";
    if (/vĩnh hải|vinh hai|hòn chồng|hon chong/.test(text)) return "혼총";
    if (/đầm|dam market|xương huân|xuong huan/.test(text)) return "담시장";
    return "나트랑 시내";
  }
  if (cityName === "하노이") {
    if (/hoàn kiếm|hoan kiem|old quarter|hàng|hang|đinh liệt|dinh liet/.test(text)) return "호안끼엠/올드쿼터";
    if (/tây hồ|tay ho|west lake/.test(text)) return "서호/떠이호";
    if (/ba đình|ba dinh/.test(text)) return "바딘";
    return "하노이 시내";
  }
  if (cityName === "달랏") {
    if (/xuân hương|xuan huong|phường 1|ward 1|hòa bình|hoa binh/.test(text)) return "달랏 시내";
    if (/tuyền lâm|tuyen lam/.test(text)) return "뚜옌럼 호수";
    if (/night market|chợ đà lạt|cho da lat/.test(text)) return "달랏 야시장";
    return "달랏 전역";
  }
  if (cityName === "푸꾸옥") {
    if (/dương đông|duong dong/.test(text)) return "즈엉동";
    if (/long beach|bãi trường|bai truong|dương tơ|duong to/.test(text)) return "롱비치";
    if (/sunset town|an thới|an thoi/.test(text)) return "선셋타운";
    if (/grand world|gành dầu|ganh dau|bắc đảo|bac dao/.test(text)) return "북부/그랜드월드";
    return "푸꾸옥 전역";
  }
  return cityName;
}

function inferBestTime(placeCategory, tags) {
  if (placeCategory === "맛집") return tags.includes("브런치") ? ["오전", "점심"] : ["점심", "저녁"];
  if (placeCategory === "카페") return ["오후", "비오는날"];
  if (placeCategory === "바/루프탑" || placeCategory === "가라오케") return ["저녁", "밤"];
  if (placeCategory === "마사지") return ["오후", "저녁"];
  if (placeCategory === "사진명소") return ["오전", "노을"];
  if (placeCategory === "투어/액티비티") return ["오전", "반일"];
  return ["오전", "오후"];
}

function normalizePriceLevel(priceLevel) {
  if (priceLevel === "PRICE_LEVEL_INEXPENSIVE") return "저렴";
  if (priceLevel === "PRICE_LEVEL_EXPENSIVE" || priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") return "프리미엄";
  return "보통";
}

function inferSignalScore(place, tags) {
  let score = 58;
  if ((place.rating ?? 0) >= 4.8) score += 18;
  else if ((place.rating ?? 0) >= 4.5) score += 12;
  if ((place.userRatingCount ?? 0) >= 1000) score += 12;
  else if ((place.userRatingCount ?? 0) >= 300) score += 8;
  if (tags.includes("망고단추천")) score += 4;
  return Math.min(score, 95);
}

function normalizeExistingPlace(place) {
  return place;
}

function countCoordinateCategory(places, cityName, placeCategory) {
  return dedupePlaces(
    places.filter((place) => place.city === cityName && place.category === placeCategory && place.coordinates)
  ).length;
}

function orderPlaces(places) {
  const cityOrder = ["나트랑", "다낭", "달랏", "푸꾸옥", "하노이", "호치민"];
  const categoryOrder = ["맛집", "카페", "바/루프탑", "마사지", "가라오케", "사진명소", "쇼핑", "환전", "투어/액티비티"];
  return [...places].sort((a, b) => {
    const cityDiff = cityOrder.indexOf(a.city) - cityOrder.indexOf(b.city);
    if (cityDiff !== 0) return cityDiff;
    const categoryDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    const coordinateDiff = Number(Boolean(b.coordinates)) - Number(Boolean(a.coordinates));
    if (coordinateDiff !== 0) return coordinateDiff;
    return (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
  });
}

function dedupePlaces(places) {
  const seen = new Set();
  return places.filter((place) => {
    const key = getPlaceKey(place);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getPlaceKey(place) {
  return `${place.city}-${normalizeName(place.name)}-${place.category}`;
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function slugify(value) {
  return normalizeName(value).slice(0, 96) || `place-${Date.now()}`;
}

function summarizeCounts(places) {
  const result = {};
  for (const place of places) {
    result[place.city] ??= { total: 0, coordinates: 0, category: {} };
    result[place.city].total += 1;
    if (place.coordinates) result[place.city].coordinates += 1;
    result[place.city].category[place.category] ??= { total: 0, coordinates: 0 };
    result[place.city].category[place.category].total += 1;
    if (place.coordinates) result[place.city].category[place.category].coordinates += 1;
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
