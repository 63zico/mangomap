import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const inputPath = path.join(rootDir, "data", "collected-google-places.json");
const outputPath = path.join(rootDir, "src", "data", "places.ts");

const categoryTargets = {
  맛집: 28,
  카페: 14,
  "바/루프탑": 10,
  마사지: 10,
  사진명소: 10,
  쇼핑: 8,
  "투어/액티비티": 10
};

const categoryCopy = {
  맛집: {
    oneLine: "후기와 접근성을 기준으로 고른 호치민 맛집 후보",
    tip: "메뉴 사진을 미리 저장해두면 주문이 훨씬 쉬워요."
  },
  카페: {
    oneLine: "더운 오후에 쉬기 좋은 호치민 감성 카페 후보",
    tip: "사진 목적이면 낮 시간, 쉬는 목적이면 오후 늦게가 좋아요."
  },
  "바/루프탑": {
    oneLine: "저녁 동선에 넣기 좋은 호치민 바와 루프탑 후보",
    tip: "밤 이동은 Grab Car를 추천하고, 드레스코드가 있는지 확인하세요."
  },
  마사지: {
    oneLine: "일정 중간에 체력 회복용으로 넣기 좋은 마사지 후보",
    tip: "인기 시간대는 예약 후 방문하면 대기 시간을 줄일 수 있어요."
  },
  사진명소: {
    oneLine: "첫 호치민 여행에서 사진과 분위기를 잡기 좋은 장소 후보",
    tip: "오전이나 해질녘에 가면 더위와 역광을 피하기 좋아요."
  },
  쇼핑: {
    oneLine: "기념품과 쇼핑 동선에 넣기 좋은 장소 후보",
    tip: "시장에서는 첫 가격보다 비교와 흥정을 가볍게 해보세요."
  },
  "투어/액티비티": {
    oneLine: "하루를 꽉 채우는 체험형 투어와 액티비티 후보",
    tip: "픽업 위치와 포함 사항을 예약 전에 꼭 확인하세요."
  }
};

const raw = JSON.parse(await readFile(inputPath, "utf8"));
const selected = [];

for (const [category, limit] of Object.entries(categoryTargets)) {
  const places = raw.places
    .filter((place) => place.category === category)
    .sort((a, b) => scorePlace(b) - scorePlace(a))
    .slice(0, limit);
  selected.push(...places);
}

const curated = selected.map((place) => {
  const copy = categoryCopy[place.category];
  const tags = buildTags(place);

  return {
    id: slugify(`${place.category}-${place.name}-${place.googlePlaceId}`),
    city: "호치민",
    name: place.name,
    category: place.category,
    oneLine: copy.oneLine,
    koreanTip: copy.tip,
    tags,
    hiddenGem: Boolean(place.curation?.hiddenGem),
    beginnerSafe: Boolean(place.curation?.beginnerSafe),
    rainyDayOk: Boolean(place.curation?.rainyDayOk),
    bestTime: place.curation?.bestTime ?? ["오후"],
    priceLevel: place.curation?.priceLevel ?? "보통",
    googlePlaceId: place.googlePlaceId,
    googleMapsUri: place.googleMapsUri,
    photoName: place.photoName,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    koreanReviewSignal: normalizeKoreanSignal(place.koreanReviewSignal)
  };
});

const serializedPlaces = JSON.stringify(JSON.stringify(curated));
const file = `import type { CuratedPlace } from "../types";

// Google Places API 후보를 기반으로 만든 MVP용 큐레이션 시드입니다.
// 프로덕션에서는 googlePlaceId를 저장하고 평점/영업시간은 최신 조회로 보강하는 구조를 권장합니다.
const curatedPlacesJson = ${serializedPlaces};

export const curatedPlaces: CuratedPlace[] = JSON.parse(curatedPlacesJson);
`;

await writeFile(outputPath, `${file}\n`, "utf8");
process.stdout.write(`Built ${curated.length} curated places at ${path.relative(rootDir, outputPath)}\n`);

function scorePlace(place) {
  return (place.rating ?? 0) * 1000 + Math.min(place.userRatingCount ?? 0, 5000) + getKoreanSignalScore(place.koreanReviewSignal) * 25;
}

function buildTags(place) {
  const tags = [];
  const text = `${place.name ?? ""} ${(place.sourceQueries ?? []).join(" ")} ${(place.types ?? []).join(" ")}`.toLowerCase();
  const bestTime = place.curation?.bestTime ?? [];
  const add = (...items) => {
    for (const item of items) {
      if (item && !tags.includes(item)) tags.push(item);
    }
  };

  switch (place.category) {
    case "맛집":
      add(pickStable(place.name, ["첫끼추천", "로컬입문", "한국인취향", "혼밥가능", "무난한선택"]), "현지맛집");
      break;
    case "카페":
      add(pickStable(place.name, ["사진스팟", "쉬어가기", "커피타임", "오후추천", "노트북가능"]), "감성카페");
      break;
    case "바/루프탑":
      add(pickStable(place.name, ["루프탑", "칵테일", "데이트", "2차코스", "분위기좋음"]), "야경");
      break;
    case "마사지":
      add(pickStable(place.name, ["예약추천", "피로회복", "비오는날", "커플가능", "중간휴식"]), "힐링");
      break;
    case "사진명소":
      add(pickStable(place.name, ["첫여행", "산책코스", "랜드마크", "오전추천", "노을추천"]), "사진스팟");
      break;
    case "쇼핑":
      add(pickStable(place.name, ["기념품", "흥정가능", "실내동선", "선물사기", "시장구경"]), "쇼핑");
      break;
    case "투어/액티비티":
      add(pickStable(place.name, ["반일투어", "예약필수", "체험코스", "외곽코스", "하루코스"]), "액티비티");
      break;
  }

  if (place.category === "맛집") {
    if (/korean\s+restaurant|korean\s+bbq|kimchi|samgyeopsal|seoul|한식|한국식당|한식당/.test(text)) add("한식당");
    if (/chinese\s+restaurant|china\s+restaurant|dim\s*sum|dimsum|hotpot|중식|중국식당|중식당/.test(text)) add("중식당");
    if (/japanese\s+restaurant|japan\s+restaurant|sushi|ramen|izakaya|일식|일본식당|일식당/.test(text)) add("일식당");
    if (/seafood|crab|lobster|oyster|해산물/.test(text)) add("해산물");
    if (/brunch|bakery|croissant|breakfast/.test(text)) add("브런치");
    if (/street\s*food/.test(text) && !/food\s*tour|tour|adventure|experience/.test(text)) add("길거리음식");
    if (/b[aá]nh\s*m[iì]|banh\s*mi|bánh\s*mì/.test(text)) add("반미");
    if (/\bpho\b|phở/.test(text)) add("쌀국수");
    if (/vegan|vegetarian|chay/.test(text)) add("채식가능");
  }
  if (/coffee|cafe|café|espresso|roastery|specialty/.test(text)) add("커피맛집");
  if (/egg\s*coffee|cà phê trứng/.test(text)) add("에그커피");
  if (/rooftop|sky|view|lounge/.test(text)) add("뷰맛집");
  if (/cocktail|wine|speakeasy|bar/.test(text)) add("칵테일바");
  if (/spa|massage/.test(text)) add("스파");
  if (/market|chợ/.test(text)) add("시장");
  if (/mall|center|centre|plaza|saigon square/.test(text)) add("쇼핑몰");
  if (/souvenir|gift/.test(text)) add("기념품");
  if (/mekong|cu chi|tunnel|tour/.test(text)) add("투어");

  if (place.curation?.hiddenGem) add("숨은핫플");
  if (place.curation?.beginnerSafe) add("초행자추천");
  if (place.curation?.rainyDayOk) add("비오는날");

  if (place.curation?.priceLevel === "가성비") add("가성비");
  if (place.curation?.priceLevel === "프리미엄") add("프리미엄");

  if (bestTime.includes("오전")) add("오전추천");
  if (bestTime.includes("점심")) add("점심추천");
  if (bestTime.includes("오후")) add("오후추천");
  if (bestTime.includes("저녁")) add("저녁추천");
  if (bestTime.includes("밤")) add("밤추천");

  if ((place.koreanReviewSignal?.reviewCount ?? 0) > 0) add("한국어후기");
  if ((place.koreanReviewSignal?.score ?? 0) >= 70) add("한국인반응좋음");
  if ((place.koreanReviewSignal?.cautionCount ?? 0) > 0) add("후기주의");

  if ((place.rating ?? 0) >= 4.8) add("고평점");
  if ((place.userRatingCount ?? 0) >= 10000) add("리뷰폭발");
  else if ((place.userRatingCount ?? 0) >= 3000) add("리뷰많음");
  else if ((place.userRatingCount ?? 0) >= 1000) add("검증된곳");
  else add("후기확인");

  return tags.slice(0, 6);
}

function normalizeKoreanSignal(signal) {
  if (!signal) {
    return {
      score: 0,
      reviewCount: 0,
      positiveCount: 0,
      cautionCount: 0,
      summary: "한국어 후기 신호는 아직 약한 후보",
      keywords: []
    };
  }

  return {
    score: getKoreanSignalScore(signal),
    reviewCount: signal.reviewCount ?? 0,
    positiveCount: signal.positiveCount ?? 0,
    cautionCount: signal.cautionCount ?? 0,
    summary: signal.summary ?? "한국어 후기 신호는 아직 약한 후보",
    keywords: signal.keywords ?? []
  };
}

function getKoreanSignalScore(signal) {
  if (!signal) return 0;
  return clamp(
    Math.round((signal.reviewCount ?? 0) * 7 + (signal.positiveCount ?? 0) * 4 - (signal.cautionCount ?? 0) * 12 + ((signal.reviewCount ?? 0) > 0 ? 30 : 0)),
    0,
    100
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pickStable(seed, options) {
  const value = String(seed ?? "");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return options[hash % options.length];
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
