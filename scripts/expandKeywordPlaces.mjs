import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "src", "data", "places.ts");
const googlePath = path.join(rootDir, "data", "collected-google-places.json");
const requireFromScript = createRequire(import.meta.url);

const hcm = "호치민";
const targetCounts = {
  korean: 10,
  chinese: 10,
  japanese: 10,
  vietnamese: 30,
  pho: 10,
  banhmi: 10,
  seafood: 10,
  bbq: 10,
  localfood: 30,
  finefood: 10,
  brunch: 10,
  streetfood: 10,
  vegan: 10,
  specialtyCafe: 10,
  photoCafe: 10,
  workCafe: 10,
  viewCafe: 10,
  dessertCafe: 10,
  rooftop: 10,
  bar: 10,
  danceClub: 12
};

const categoryFood = "\uB9DB\uC9D1";
const categoryCafe = "\uCE74\uD398";
const categoryNight = "\uBC14/\uB8E8\uD504\uD0D1";
const foodFilterIds = new Set(["korean", "chinese", "japanese", "vietnamese", "pho", "banhmi", "seafood", "bbq", "localfood", "finefood", "brunch", "streetfood", "vegan"]);
const cafeFilterIds = new Set(["specialtyCafe", "photoCafe", "workCafe", "viewCafe", "dessertCafe"]);
const nightFilterIds = new Set(["rooftop", "bar", "danceClub"]);

const existingPlaces = await loadCuratedPlaces();
const googlePlaces = JSON.parse(await readFile(googlePath, "utf8")).places ?? [];
const places = existingPlaces.filter((place) => !isSuppressedPlace(place) && !isMismatchedCuratedPlace(place)).map(normalizeExistingPlace);
const existingKeys = new Set(places.map(getPlaceKey));
const addedFromGoogle = new Set();

for (const [filterId, target] of Object.entries(targetCounts)) {
  let guard = 0;
  while (countFilter(filterId, places) < target && guard < 120) {
    guard += 1;
    const candidate = pickCandidate(filterId, places);
    if (!candidate) break;
    const curated = toCuratedPlace(candidate, filterId);
    const key = getPlaceKey(curated);
    addedFromGoogle.add(candidate.googlePlaceId);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    places.push(curated);
  }
}

const ordered = orderPlaces(places);
const serializedPlaces = JSON.stringify(JSON.stringify(ordered));
await writeFile(
  sourcePath,
  `import type { CuratedPlace } from "../types";

// Google Places API 후보를 기반으로 만든 MVP용 큐레이션 시드입니다.
// 프로덕션에서는 googlePlaceId를 저장하고 평점/영업시간은 최신 조회로 보강하는 구조를 권장합니다.
const curatedPlacesJson = ${serializedPlaces};

export const curatedPlaces: CuratedPlace[] = JSON.parse(curatedPlacesJson);
`,
  "utf8"
);

process.stdout.write(
  `${JSON.stringify(
    {
      total: ordered.length,
      hcmCounts: Object.fromEntries(Object.keys(targetCounts).map((id) => [id, countFilter(id, ordered)])),
      addedGoogleCandidates: addedFromGoogle.size
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

function pickCandidate(filterId, currentPlaces) {
  return googlePlaces
    .filter((place) => place.city === hcm && !addedFromGoogle.has(place.googlePlaceId))
    .map((place) => ({ place, score: scoreCandidate(place, filterId, currentPlaces) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.place;
}

function scoreCandidate(place, filterId, currentPlaces) {
  const text = getSearchText(place);
  if (!candidateMatchesFilter(place, filterId, text)) return 0;
  const key = getRawPlaceKey(place);
  if (currentPlaces.some((current) => getPlaceKey(current) === key || current.googlePlaceId === place.googlePlaceId)) return 0;
  let score = 1000;
  score += (place.rating ?? 0) * 100;
  score += Math.min(place.userRatingCount ?? 0, 6000) / 10;
  score += (place.koreanReviewSignal?.score ?? 0) * 2;
  if ((place.photoName ?? "").length > 0) score += 120;
  if (place.sourceQueries?.some((query) => query.toLowerCase().includes(getFilterQueryNeedle(filterId)))) score += 220;
  return score;
}

function candidateMatchesFilter(place, filterId, text = getSearchText(place)) {
  const contentText = getContentText(place);
  if (foodFilterIds.has(filterId) && (place.category !== categoryFood || isNonFoodBusiness(text))) return false;
  if (cafeFilterIds.has(filterId) && (place.category !== categoryCafe || isNonCafeBusiness(text))) return false;
  if (nightFilterIds.has(filterId) && (place.category !== categoryNight || isNonNightBusiness(text))) return false;

  switch (filterId) {
    case "korean":
      return /korean|korea bbq|kimchi|samgyeopsal/.test(text) && !/korean chinese|chinese|doya|jjambbong|jjamppong|jajang|tangsuyuk/.test(text);
    case "chinese":
      return /chinese|dim\s*sum|hotpot|sichuan|shanghai|hong kong|doya|jjambbong|jjamppong/.test(text);
    case "japanese":
      return /japanese|sushi|ramen|izakaya|yakitori|tokyo/.test(text);
    case "vietnamese":
      return /vietnamese|local restaurant|bib gourmand|michelin|bistro|quan|quán|pho|phở|banh|bánh|street food/.test(text) && !candidateMatchesFilter(place, "korean", text) && !candidateMatchesFilter(place, "chinese", text) && !candidateMatchesFilter(place, "japanese", text);
    case "pho":
      return /\bpho\b|phở/.test(text);
    case "banhmi":
      return /banh\s*mi|bánh\s*mì/.test(text);
    case "seafood":
      return /seafood|crab|oyster|lobster|snail|ốc/.test(text);
    case "bbq":
      return /bbq|barbecue|grill|korean bbq|steakhouse/.test(text);
    case "localfood":
      return /local restaurant|vietnamese|street food|bib gourmand|michelin|quan|quán|pho|phở|banh|bánh/.test(text);
    case "finefood":
      return /michelin|bib gourmand|fine dining|premium|tasting menu|restaurant/.test(text) && (place.rating ?? 0) >= 4.5;
    case "brunch":
      return /brunch|breakfast|bakery|bake|croissant|pancake/.test(text);
    case "streetfood":
      return /street food|food market|banh mi|bánh mì|pho|phở/.test(text);
    case "vegan":
      return /vegan|vegetarian|chay/.test(text);
    case "specialtyCafe":
      return /specialty|roastery|coffee roaster|espresso/.test(contentText) && place.category === "카페";
    case "photoCafe":
      return /instagram|photogenic|photo|hidden cafe|rooftop cafe|view cafe|apartment cafe/.test(contentText) && place.category === "카페";
    case "workCafe":
      return /study|work friendly|laptop|quiet|workspace|coworking/.test(text) && !/rooftop|sky bar|cocktail|nightclub|club|lounge/.test(contentText) && place.category === "카페";
    case "viewCafe":
      return /rooftop cafe|view cafe|river view|sky|landmark|apartment cafe/.test(contentText) && place.category === "카페";
    case "dessertCafe":
      return /dessert|cake|bakery|bake|ice cream|patisserie|croissant/.test(contentText) && place.category === "카페";
    case "rooftop":
      return /rooftop|sky bar|view bar|night view/.test(contentText) && place.category === "바/루프탑";
    case "bar":
      return /cocktail|speakeasy|mixology|wine bar/.test(contentText) && place.category === "바/루프탑";
    case "danceClub":
      return /nightclub|dance club|dj club|club|lounge/.test(contentText) && place.category === "바/루프탑";
    default:
      return false;
  }
}

function toCuratedPlace(place, requiredFilterId) {
  const category = normalizeCategory(place.category, requiredFilterId);
  const tags = buildTags(place, category, requiredFilterId);
  return {
    id: slugify(`${category}-${place.name}-${place.googlePlaceId}`),
    city: hcm,
    name: place.name,
    category,
    area: inferArea(place),
    address: place.address,
    oneLine: buildOneLine(category, tags),
    koreanTip: buildKoreanTip(category, tags),
    tags,
    hiddenGem: tags.includes("숨은핫플") || tags.includes("로컬입문"),
    beginnerSafe: true,
    rainyDayOk: category === "카페" || tags.includes("비오는날") || tags.includes("작업카페"),
    bestTime: inferBestTime(category, tags),
    priceLevel: normalizePriceLevel(place.curation?.priceLevel ?? place.priceLevel),
    googlePlaceId: place.googlePlaceId,
    googleMapsUri: place.googleMapsUri,
    coordinates: place.location
      ? { latitude: place.location.latitude, longitude: place.location.longitude }
      : place.coordinates
        ? { latitude: place.coordinates.latitude, longitude: place.coordinates.longitude }
        : undefined,
    photoName: place.photoName,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    koreanReviewSignal: normalizeKoreanSignal(place.koreanReviewSignal, tags)
  };
}

function buildTags(place, category, requiredFilterId) {
  const text = getSearchText(place);
  const contentText = getContentText(place);
  const tags = new Set();
  if (category === "맛집") tags.add("맛집");
  if (category === "카페") tags.add("카페");
  if (category === "바/루프탑") tags.add("밤추천");

  const addRequired = {
    korean: ["한식당", "한국인취향"],
    chinese: ["중식당"],
    japanese: ["일식당"],
    vietnamese: ["베트남음식", "현지맛집"],
    pho: ["쌀국수", "베트남음식"],
    banhmi: ["반미", "베트남음식"],
    seafood: ["해산물"],
    bbq: ["고기"],
    localfood: ["현지맛집", "로컬입문", "베트남음식"],
    finefood: ["프리미엄"],
    brunch: ["브런치"],
    streetfood: ["길거리음식"],
    vegan: ["채식가능"],
    specialtyCafe: ["커피맛집"],
    photoCafe: ["사진맛집", "인스타감성"],
    workCafe: ["작업카페", "노트북가능"],
    viewCafe: ["뷰맛집"],
    dessertCafe: ["디저트"],
    rooftop: ["루프탑", "야경"],
    bar: ["칵테일바", "칵테일"],
    danceClub: ["클럽", "DJ"]
  }[requiredFilterId] ?? [];
  addRequired.forEach((tag) => tags.add(tag));

  if (/korean|korea bbq|samgyeopsal|kimchi/.test(text)) tags.add("한식당");
  if (/chinese|dim\s*sum|hotpot|sichuan|shanghai|hong kong/.test(text)) tags.add("중식당");
  if (/japanese|sushi|ramen|izakaya|yakitori/.test(text)) tags.add("일식당");
  if (/vietnamese|bib gourmand|local restaurant|quán|quan/.test(text)) tags.add("베트남음식");
  if (/\bpho\b|phở/.test(text)) tags.add("쌀국수");
  if (/banh\s*mi|bánh\s*mì/.test(text)) tags.add("반미");
  if (/seafood|crab|oyster|lobster|ốc/.test(text)) tags.add("해산물");
  if (/bbq|barbecue|grill|steakhouse/.test(text)) tags.add("고기");
  if (/street food/.test(text)) tags.add("길거리음식");
  if (/vegan|vegetarian|chay/.test(text)) tags.add("채식가능");
  if (/brunch|bakery|breakfast|croissant/.test(text)) tags.add("브런치");
  if (/michelin|bib gourmand|fine dining/.test(text)) tags.add("프리미엄");
  if (/instagram|photo|photogenic|apartment cafe/.test(contentText)) tags.add("사진맛집");
  if (/study|work friendly|laptop|quiet|workspace|coworking/.test(contentText)) tags.add("작업카페");
  if (/specialty|roastery|coffee roaster|espresso/.test(contentText)) tags.add("커피맛집");
  if (/dessert|cake|ice cream|patisserie/.test(contentText)) tags.add("디저트");
  if (/rooftop|view|sky|river view|landmark/.test(contentText)) tags.add("뷰맛집");
  if (/cocktail|speakeasy|mixology|wine bar/.test(contentText)) tags.add("칵테일바");
  if (/nightclub|dance club|dj club/.test(contentText)) tags.add("클럽");
  if (/dj|dance/.test(contentText)) tags.add("DJ");
  if ((place.koreanReviewSignal?.reviewCount ?? 0) > 0) tags.add("한국어후기");
  if ((place.rating ?? 0) >= 4.7) tags.add("고평점");
  if ((place.userRatingCount ?? 0) >= 3000) tags.add("리뷰많음");
  else tags.add("후기확인");
  if (category === "카페") tags.add("비오는날");

  return Array.from(tags).slice(0, 9);
}

function countFilter(filterId, list) {
  return dedupeVisiblePlaces(list.filter((place) => place.city === hcm && isEligibleHotplace(place))).filter((place) => matchesFilter(place, filterId)).length;
}

function dedupeVisiblePlaces(list) {
  const seenIds = new Set();
  const seenNames = new Set();
  return list.filter((place) => {
    const idKey = place.googlePlaceId || place.id;
    const nameKey = getPlaceKey(place);
    if (seenIds.has(idKey) || seenNames.has(nameKey)) return false;
    seenIds.add(idKey);
    seenNames.add(nameKey);
    return true;
  });
}

function matchesFilter(place, filterId) {
  switch (filterId) {
    case "korean":
      return place.category === "맛집" && !hasAnyTag(place, ["중식당", "한국식중식"]) && (hasTag(place, "한식당") || nameHas(place, ["korean restaurant", "korean bbq", "kimchi", "한식", "한국식당"]));
    case "chinese":
      return place.category === "맛집" && (hasAnyTag(place, ["중식당", "한국식중식"]) || nameHas(place, ["chinese restaurant", "dim sum", "dimsum", "hotpot", "중식", "중국식당", "짬뽕", "짜장", "자장", "탕수육", "jjamppong", "jjambbong", "jajang", "tangsuyuk", "doya"]));
    case "japanese":
      return place.category === "맛집" && (hasTag(place, "일식당") || nameHas(place, ["japanese restaurant", "sushi", "ramen", "izakaya", "일식"]));
    case "vietnamese":
      return place.category === "맛집" && !hasAnyTag(place, ["한식당", "중식당", "일식당"]);
    case "pho":
      return hasTag(place, "쌀국수") || nameHas(place, ["phở", "pho", "퍼 "]);
    case "banhmi":
      return hasTag(place, "반미") || nameHas(place, ["bánh mì", "banh mi", "반미"]);
    case "seafood":
      return place.category === "맛집" && (hasTag(place, "해산물") || nameHas(place, ["seafood", "crab", "oyster", "해산물"]));
    case "bbq":
      return place.category === "맛집" && (hasAnyTag(place, ["고기", "한식당"]) || nameHas(place, ["bbq", "barbecue", "grill", "고기", "삼겹살"]));
    case "localfood":
      return place.category === "맛집" && (place.hiddenGem || hasAnyTag(place, ["현지맛집", "로컬입문", "베트남음식"]));
    case "finefood":
      return place.category === "맛집" && (place.priceLevel === "프리미엄" || hasTag(place, "프리미엄") || nameHas(place, ["michelin", "fine dining"]));
    case "brunch":
      return place.category === "맛집" && (hasTag(place, "브런치") || nameHas(place, ["brunch", "bakery", "croissant", "breakfast"]));
    case "streetfood":
      return place.category === "맛집" && (hasTag(place, "길거리음식") || (nameHas(place, ["street food"]) && !nameHas(place, ["food tour", "tour", "adventure", "experience"])));
    case "vegan":
      return place.category === "맛집" && (hasTag(place, "채식가능") || nameHas(place, ["vegan", "vegetarian", "chay"]));
    case "specialtyCafe":
      return place.category === "카페" && (hasTag(place, "커피맛집") || nameHas(place, ["specialty", "roastery", "espresso"]));
    case "photoCafe":
      return place.category === "카페" && (hasAnyTag(place, ["사진맛집", "인스타감성"]) || nameHas(place, ["instagram", "photogenic"]));
    case "workCafe":
      return place.category === "카페" && (hasAnyTag(place, ["작업카페", "노트북가능"]) || nameHas(place, ["study", "work", "laptop", "workspace", "quiet"]));
    case "viewCafe":
      return place.category === "카페" && (hasTag(place, "뷰맛집") || nameHas(place, ["view", "hill", "rooftop", "sky"]));
    case "dessertCafe":
      return place.category === "카페" && (hasTag(place, "디저트") || nameHas(place, ["dessert", "bakery", "ice cream", "cake", "빙수", "케이크"]));
    case "rooftop":
      return isNightlifePlace(place) && !isKaraokePlace(place) && (hasAnyTag(place, ["루프탑", "야경"]) || nameHas(place, ["rooftop", "sky bar"]));
    case "bar":
      return isNightlifePlace(place) && !isKaraokePlace(place) && (hasAnyTag(place, ["칵테일바", "칵테일"]) || nameHas(place, ["cocktail", "speakeasy", "wine bar", "mixology"]));
    case "danceClub":
      return isNightlifePlace(place) && !isKaraokePlace(place) && (hasAnyTag(place, ["클럽", "DJ"]) || nameHas(place, ["club", "dj", "dance", "nightclub"]));
    default:
      return false;
  }
}

function isEligibleHotplace(place) {
  if (isSuppressedPlace(place)) return false;
  if (place.tags?.includes("지도추천")) return true;
  if ((place.userRatingCount ?? 0) < 100) return false;
  return true;
}

function isSuppressedPlace(place) {
  const text = `${place.name} ${place.oneLine ?? ""} ${(place.tags ?? []).join(" ")}`.toLowerCase();
  return text.includes("에그커피") || text.includes("egg coffee") || text.includes("eggyolk");
}

function isMismatchedCuratedPlace(place) {
  const text = getSearchText(place);
  if (place.category === categoryFood && isNonFoodBusiness(text)) return true;
  if (place.category === categoryCafe && isNonCafeBusiness(text)) return true;
  if (place.category === categoryNight && isNonNightBusiness(text)) return true;
  return false;
}

function normalizeExistingPlace(place) {
  if (place.category !== categoryCafe) return place;
  const contentText = `${place.name ?? ""} ${place.oneLine ?? ""}`.toLowerCase();
  const tags = (place.tags ?? []).filter((tag) => {
    if (tag === "커피맛집") return /specialty|roastery|coffee roaster|espresso|xlIII|lacàph|lacaph|arabica|워크샵|workshop/.test(contentText);
    if (tag === "작업카페" || tag === "노트북가능") return !/rooftop|sky bar|cocktail|nightclub|club|lounge/.test(contentText);
    return true;
  });
  return tags.length === (place.tags ?? []).length ? place : { ...place, tags };
}

function isNonFoodBusiness(text) {
  return /spa|massage|sauna|facial|nail|salon|clinic|pharmacy|hotel|hostel|tour|travel agency|car rental|barber|hair|스파|마사지|사우나|네일|피부|왁싱/.test(text);
}

function isNonCafeBusiness(text) {
  return /spa|massage|sauna|facial|nail|salon|clinic|pharmacy|hotel|hostel|tour|travel agency|bbq|barbecue|hotpot|seafood|nightclub|club|스파|마사지|사우나|네일|피부|왁싱/.test(text);
}

function isNonNightBusiness(text) {
  return /spa|massage|sauna|facial|nail|salon|clinic|pharmacy|hotel|hostel|tour|travel agency|coffee roaster|study cafe|work friendly|스파|마사지|사우나|네일|피부|왁싱/.test(text);
}

function isNightlifePlace(place) {
  return place.category === "바/루프탑" || (place.tags ?? []).some((tag) => ["야경", "루프탑", "뷰맛집", "칵테일바", "밤추천", "클럽", "DJ"].includes(tag));
}

function isKaraokePlace(place) {
  return place.category === "가라오케";
}

function normalizeCategory(category, requiredFilterId) {
  if (["specialtyCafe", "photoCafe", "workCafe", "viewCafe", "dessertCafe"].includes(requiredFilterId)) return "카페";
  if (["rooftop", "bar", "danceClub"].includes(requiredFilterId)) return "바/루프탑";
  return category === "카페" || category === "바/루프탑" ? category : "맛집";
}

function normalizePriceLevel(value) {
  if (value === "저렴" || value === "보통" || value === "프리미엄") return value;
  if (value === "PRICE_LEVEL_INEXPENSIVE") return "저렴";
  if (value === "PRICE_LEVEL_EXPENSIVE" || value === "PRICE_LEVEL_VERY_EXPENSIVE") return "프리미엄";
  return "보통";
}

function normalizeKoreanSignal(signal, tags) {
  if (signal) {
    return {
      score: clamp(signal.score ?? 0, 0, 100),
      reviewCount: signal.reviewCount ?? 0,
      positiveCount: signal.positiveCount ?? 0,
      cautionCount: signal.cautionCount ?? 0,
      summary: signal.summary ?? "Google Places 검색으로 추가한 후보",
      keywords: signal.keywords ?? tags.slice(0, 5)
    };
  }
  return {
    score: tags.includes("한국어후기") ? 70 : 40,
    reviewCount: 0,
    positiveCount: 0,
    cautionCount: 0,
    summary: "Google Places 검색으로 추가한 키워드 후보",
    keywords: tags.slice(0, 5)
  };
}

function buildOneLine(category, tags) {
  if (category === "카페") {
    if (tags.includes("작업카페")) return "노트북 작업이나 쉬어가기 좋은 호치민 카페 후보";
    if (tags.includes("사진맛집")) return "사진 남기기 좋은 분위기 중심 호치민 카페 후보";
    if (tags.includes("디저트")) return "커피와 디저트를 같이 보기 좋은 호치민 카페 후보";
    if (tags.includes("뷰맛집")) return "전망과 분위기를 같이 챙기기 좋은 호치민 카페 후보";
    return "커피 맛과 접근성을 기준으로 고른 호치민 카페 후보";
  }
  if (category === "바/루프탑") {
    if (tags.includes("클럽")) return "음악과 사람 많은 분위기를 찾을 때 넣기 좋은 밤 코스 후보";
    if (tags.includes("칵테일바")) return "칵테일과 조용한 분위기를 챙기기 좋은 호치민 바 후보";
    return "야경과 분위기를 같이 챙기기 좋은 호치민 루프탑 후보";
  }
  if (tags.includes("한식당")) return "베트남 음식이 물릴 때 넣기 좋은 호치민 한식 후보";
  if (tags.includes("중식당")) return "짬뽕, 딤섬, 훠궈 같은 중식이 당길 때 좋은 후보";
  if (tags.includes("일식당")) return "스시, 라멘, 이자카야가 당길 때 넣기 좋은 일식 후보";
  if (tags.includes("쌀국수")) return "호치민에서 쌀국수 한 끼를 잡기 좋은 후보";
  if (tags.includes("반미")) return "가볍게 먹기 좋은 호치민 반미 후보";
  if (tags.includes("해산물")) return "해산물 메뉴를 넣고 싶을 때 보기 좋은 후보";
  return "키워드와 Google 후기를 기준으로 고른 호치민 맛집 후보";
}

function buildKoreanTip(category, tags) {
  if (category === "카페") {
    if (tags.includes("작업카페")) return "콘센트와 좌석 여유는 시간대별로 달라서 낮 시간대 방문이 좋아요.";
    if (tags.includes("사진맛집")) return "사진 목적이면 낮 시간대가 좋고, 인기 시간대에는 좌석 대기가 있을 수 있어요.";
    if (tags.includes("디저트")) return "디저트 품절이 있을 수 있어 늦은 방문 전에는 최근 후기를 확인하세요.";
    return "더운 오후 동선 중간에 넣으면 체력 관리가 쉬워요.";
  }
  if (category === "바/루프탑") return "밤 이동은 Grab Car를 추천하고, 드레스코드와 라스트오더를 먼저 확인하세요.";
  if (tags.includes("한식당")) return "입맛 리셋용으로 좋고, 피크 시간에는 예약이나 대기를 감안하세요.";
  if (tags.includes("중식당")) return "매운 국물이나 익숙한 중식이 당길 때 일정 중간에 넣기 좋아요.";
  if (tags.includes("일식당")) return "깔끔한 한 끼나 술 한 잔 동선으로 넣기 좋아요.";
  return "방문 전 Google Maps에서 최근 영업시간과 메뉴 사진을 한 번 더 확인하세요.";
}

function inferBestTime(category, tags) {
  if (category === "카페") return tags.includes("작업카페") ? ["오후"] : ["오후", "저녁"];
  if (category === "바/루프탑") return ["저녁", "밤"];
  if (tags.includes("브런치") || tags.includes("반미")) return ["오전", "점심"];
  return ["점심", "저녁"];
}

function inferArea(place) {
  const address = place.address ?? "";
  if (/Thảo Điền|Thao Dien|An Khánh|An Phú/i.test(address)) return "타오디엔";
  if (/Bến Thành|Ben Thanh|District 1|Quận 1|Q\. 1|Đa Kao|Nguyễn Huệ|Lê Thánh Tôn/i.test(address)) return "1군";
  if (/Bình Thạnh|Binh Thanh|Phạm Viết Chánh/i.test(address)) return "빈탄";
  if (/Phú Mỹ Hưng|District 7|Quận 7/i.test(address)) return "푸미흥/7군";
  if (/District 3|Quận 3|Q\. 3/i.test(address)) return "3군";
  if (/District 2|Quận 2|Q\. 2/i.test(address)) return "2군";
  return "호치민";
}

function orderPlaces(list) {
  return [...list].sort((a, b) => {
    if (a.city !== b.city) return a.city.localeCompare(b.city, "ko");
    if (a.city === hcm && b.city !== hcm) return -1;
    if (b.city === hcm && a.city !== hcm) return 1;
    const categoryDiff = categoryRank(a.category) - categoryRank(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    const mapDiff = Number(Boolean(b.tags?.includes("지도추천"))) - Number(Boolean(a.tags?.includes("지도추천")));
    if (mapDiff !== 0) return mapDiff;
    return (b.rating ?? 0) - (a.rating ?? 0) || (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
  });
}

function categoryRank(category) {
  return ["맛집", "카페", "바/루프탑", "마사지", "가라오케", "사진명소", "쇼핑", "환전", "투어/액티비티"].indexOf(category);
}

function getFilterQueryNeedle(filterId) {
  return {
    korean: "korean",
    chinese: "chinese",
    japanese: "japanese",
    vietnamese: "vietnamese",
    pho: "pho",
    banhmi: "banh mi",
    seafood: "seafood",
    bbq: "bbq",
    localfood: "local",
    finefood: "michelin",
    brunch: "brunch",
    streetfood: "street food",
    vegan: "vegetarian",
    specialtyCafe: "specialty",
    photoCafe: "instagram",
    workCafe: "study",
    viewCafe: "rooftop cafe",
    dessertCafe: "dessert",
    rooftop: "rooftop",
    bar: "cocktail",
    danceClub: "club"
  }[filterId] ?? filterId;
}

function getSearchText(place) {
  return `${place.name ?? ""} ${place.address ?? ""} ${(place.sourceQueries ?? []).join(" ")} ${(place.types ?? []).join(" ")} ${(place.curation?.tags ?? []).join(" ")}`.toLowerCase();
}

function getContentText(place) {
  return `${place.name ?? ""} ${place.address ?? ""} ${(place.types ?? []).join(" ")} ${(place.curation?.tags ?? []).join(" ")}`.toLowerCase();
}

function hasTag(place, tag) {
  return (place.tags ?? []).includes(tag);
}

function hasAnyTag(place, tags) {
  return tags.some((tag) => hasTag(place, tag));
}

function nameHas(place, needles) {
  const text = `${place.name ?? ""} ${place.oneLine ?? ""} ${(place.tags ?? []).join(" ")}`.toLowerCase();
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

function getPlaceKey(place) {
  return `${place.city}-${formatName(place.name)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
}

function getRawPlaceKey(place) {
  return `${hcm}-${formatName(place.name)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
}

function formatName(name) {
  return String(name ?? "")
    .replace(/\s+-\s*(vietnamese cuisine|vietnamese food|vegetarian food|vegan food).*$/i, "")
    .replace(/\s*&\s*(vegetarian|vegan).*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
