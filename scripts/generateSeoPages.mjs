import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://mangomap.vercel.app";
const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PLACES_FILE = path.join(ROOT_DIR, "src", "data", "places.ts");
const GOOGLE_PHOTO_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  "";

const CITY_SLUGS = {
  "호치민": "ho-chi-minh",
  "다낭": "da-nang",
  "나트랑": "nha-trang",
  "하노이": "hanoi",
  "달랏": "da-lat",
  "푸꾸옥": "phu-quoc",
};

const CITY_ENGLISH_NAMES = {
  "호치민": "Ho Chi Minh",
  "다낭": "Da Nang",
  "나트랑": "Nha Trang",
  "하노이": "Hanoi",
  "달랏": "Da Lat",
  "푸꾸옥": "Phu Quoc",
};

const CATEGORY_LABELS = {
  "맛집": "맛집",
  "카페": "카페",
  "바/루프탑": "바/루프탑",
  "마사지": "마사지",
  "가라오케": "가라오케",
  "사진명소": "관광명소",
  "쇼핑": "쇼핑",
  "환전": "환전",
  "투어/액티비티": "투어/액티비티",
};

const KNOWN_KOREAN_SLUG_WORDS = [
  ["돈치킨", "don-chicken"],
  ["도야짬뽕", "doya-jjamppong"],
  ["짬뽕", "jjamppong"],
  ["본가", "bornga"],
  ["새마을식당", "saemaeul-sikdang"],
  ["우나또또", "unatoto"],
  ["호미도", "homido"],
  ["일행", "ilhaeng"],
  ["한남", "hanam"],
  ["비비큐", "bbq"],
  ["교촌", "kyochon"],
  ["굽네", "goobne"],
  ["청담", "cheongdam"],
  ["명동", "myeongdong"],
  ["홍대", "hongdae"],
  ["강남", "gangnam"],
  ["서울", "seoul"],
  ["한식", "korean-food"],
  ["중식", "chinese-food"],
  ["일식", "japanese-food"],
  ["해산물", "seafood"],
  ["마사지", "massage"],
  ["카페", "cafe"],
  ["가든", "garden"],
  ["식당", "restaurant"],
  ["분식", "bunsik"],
];

const INITIAL = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];
const MEDIAL = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];
const FINAL = [
  "",
  "k",
  "k",
  "ks",
  "n",
  "nj",
  "nh",
  "t",
  "l",
  "lk",
  "lm",
  "lb",
  "ls",
  "lt",
  "lp",
  "lh",
  "m",
  "p",
  "ps",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

const CATEGORY_PAGES = [
  {
    slug: "ho-chi-minh-korean-restaurants",
    title: "호치민 한식 맛집 추천 | 한국인이 보기 좋은 식당 지도 - MANGOMAP",
    description:
      "호치민에서 한식이 필요할 때 보기 좋은 식당을 한국어 후기와 위치 정보 중심으로 정리했습니다.",
    h1: "호치민 한식 맛집 추천",
    city: "호치민",
    matcher: (place) => getCityName(place) === "호치민" && hasAny(place, ["한식", "한국", "Korea", "Korean"]),
  },
  {
    slug: "ho-chi-minh-restaurants",
    title: "호치민 맛집 지도 | 한국인 추천 식당 정보 - MANGOMAP",
    description:
      "호치민 맛집을 주소, 영업시간, 가격대, 한국어 후기와 함께 확인하세요. MANGOMAP은 한국인 여행자를 위한 베트남 현지 장소 지도입니다.",
    h1: "호치민 맛집 지도",
    city: "호치민",
    matcher: (place) => getCityName(place) === "호치민" && place.category === "맛집",
  },
  {
    slug: "ho-chi-minh-massage",
    title: "호치민 마사지 추천 | 한국인이 보기 좋은 마사지 정보 - MANGOMAP",
    description:
      "호치민 마사지 스팟을 위치, 영업시간, 전화번호, 한국어 후기 기준으로 확인하세요.",
    h1: "호치민 마사지 추천",
    city: "호치민",
    matcher: (place) => getCityName(place) === "호치민" && place.category === "마사지",
  },
  {
    slug: "ho-chi-minh-cafes",
    title: "호치민 카페 추천 | 사진, 작업, 휴식하기 좋은 카페 - MANGOMAP",
    description:
      "호치민 카페를 한국인 여행자 관점에서 사진, 휴식, 작업, 접근성 기준으로 정리했습니다.",
    h1: "호치민 카페 추천",
    city: "호치민",
    matcher: (place) => getCityName(place) === "호치민" && place.category === "카페",
  },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[#*_`]/g, "")
    .trim();
}

function truncate(value, maxLength = 155) {
  const text = stripText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function normalizeVietnamese(value) {
  return String(value ?? "")
    .replace(/[Đđ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function romanizeHangul(value) {
  return Array.from(String(value ?? ""))
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 0xac00 || code > 0xd7a3) return char;
      const offset = code - 0xac00;
      const initial = Math.floor(offset / 588);
      const medial = Math.floor((offset % 588) / 28);
      const final = offset % 28;
      return `${INITIAL[initial]}${MEDIAL[medial]}${FINAL[final]}`;
    })
    .join("");
}

function slugify(value) {
  let text = String(value ?? "").toLowerCase();
  for (const [ko, en] of KNOWN_KOREAN_SLUG_WORDS) {
    text = text.replaceAll(ko, ` ${en} `);
  }
  text = romanizeHangul(text);
  text = normalizeVietnamese(text);
  let slug = text
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/\bjjambbong\b/g, "jjamppong")
    .replace(/\bmasaji\b/g, "massage")
    .replace(/\bsigdang\b/g, "restaurant")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  for (const phrase of ["doya-jjamppong", "137-massage", "don-chicken", "saemaeul-sikdang", "bornga"]) {
    if (slug.startsWith(`${phrase}-`) && slug.endsWith(`-${phrase}`)) {
      slug = slug.slice(0, -phrase.length - 1);
    }
  }

  return slug;
}

function getCityName(place) {
  const city = stripText(place.city);
  if (city) return city;
  const address = `${place.address ?? ""} ${place.area ?? ""}`.toLowerCase();
  if (address.includes("ho chi minh") || address.includes("hồ chí minh")) return "호치민";
  if (address.includes("da nang") || address.includes("đà nẵng")) return "다낭";
  if (address.includes("nha trang")) return "나트랑";
  if (address.includes("hanoi") || address.includes("hà nội")) return "하노이";
  if (address.includes("da lat") || address.includes("đà lạt")) return "달랏";
  if (address.includes("phu quoc") || address.includes("phú quốc")) return "푸꾸옥";
  return "베트남";
}

function getCitySlug(place) {
  const city = getCityName(place);
  return CITY_SLUGS[city] || slugify(city) || "vietnam";
}

function getEnglishCityName(place) {
  const city = getCityName(place);
  return CITY_ENGLISH_NAMES[city] || "Vietnam";
}

function getCategoryLabel(place) {
  return CATEGORY_LABELS[place.category] || stripText(place.category) || "장소";
}

function hasAny(place, terms) {
  const haystack = [
    place.name,
    place.category,
    place.area,
    place.address,
    place.oneLine,
    place.koreanTip,
    ...(place.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.some((term) => haystack.includes(String(term).toLowerCase()));
}

function uniqueSlugForPlace(place, usedSlugs) {
  const citySlug = getCitySlug(place);
  const baseName = slugify(place.englishName || place.name || place.id) || slugify(place.id) || "place";
  const withoutCity = baseName.endsWith(`-${citySlug}`)
    ? baseName.slice(0, -citySlug.length - 1)
    : baseName;
  const base = `${withoutCity}-${citySlug}`.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
  let slug = base || `place-${usedSlugs.size + 1}-${citySlug}`;
  let counter = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

function getPhotoNames(place) {
  const names = [];
  if (Array.isArray(place.photoNames)) names.push(...place.photoNames.filter(Boolean));
  if (place.photoName) names.push(place.photoName);
  return Array.from(new Set(names)).slice(0, 6);
}

function googlePhotoUrl(photoName, width = 1200) {
  if (!GOOGLE_PHOTO_KEY || !photoName) return "";
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${encodeURIComponent(
    GOOGLE_PHOTO_KEY,
  )}`;
}

function getPhotoUrls(place) {
  return getPhotoNames(place)
    .map((photoName) => googlePhotoUrl(photoName))
    .filter(Boolean);
}

function getReviewCount(place) {
  return Array.isArray(place.reviews) ? place.reviews.filter((review) => review?.content).length : 0;
}

function getOpeningHours(place) {
  if (!Array.isArray(place.openingHoursText)) return [];
  return place.openingHoursText.map(stripText).filter(Boolean);
}

function getPhone(place) {
  return stripText(place.internationalPhoneNumber || place.nationalPhoneNumber || place.phone);
}

function getPriceRange(place) {
  const price = stripText(place.priceRange || place.priceLevel || place.priceLabel);
  if (!price) return "";
  if (price === "저렴") return "저렴";
  if (price === "보통") return "보통";
  if (price === "비쌈") return "비쌈";
  return price;
}

function getMenuItems(place) {
  const raw = place.recommendedMenu || place.recommendedMenus || place.menu || place.menuItems || place.menus;
  if (Array.isArray(raw)) return raw.map(stripText).filter(Boolean).slice(0, 8);
  if (typeof raw === "string") {
    return raw
      .split(/[,/|·\n]+/)
      .map(stripText)
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

function hashText(value) {
  let hash = 0;
  for (const char of String(value ?? "")) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function pickMany(items, seed, count) {
  const result = [];
  if (!items.length) return result;
  for (let index = 0; index < items.length && result.length < count; index += 1) {
    result.push(items[(seed + index) % items.length]);
  }
  return result;
}

function getRecommendationSituations(place) {
  const category = getCategoryLabel(place);
  const tags = place.tags ?? [];
  const baseByCategory = {
    "맛집": ["혼밥", "가족", "여행 중 한 끼", "로컬 맛집 경험"],
    "카페": ["사진", "카페 작업", "오후 휴식", "디저트"],
    "바/루프탑": ["야경", "데이트", "밤 분위기", "가벼운 한잔"],
    "마사지": ["여행 피로 회복", "비 오는 날", "커플", "일정 중간 휴식"],
    "쇼핑": ["선물 구매", "여행 준비", "가족 쇼핑"],
    "환전": ["환전 필요", "시내 이동 중", "여행 초반"],
    "관광명소": ["사진", "첫 방문", "가족 여행", "짧은 일정"],
    "투어/액티비티": ["액티비티", "가족", "친구 여행", "예약 일정"],
  };
  const merged = [...(baseByCategory[category] ?? ["첫 방문", "동선 중간", "여행자 추천"]), ...tags];
  return Array.from(new Set(merged.map(stripText).filter(Boolean))).slice(0, 5);
}

function getVisitTips(place) {
  const category = getCategoryLabel(place);
  const city = getCityName(place);
  const tipsByCategory = {
    "맛집": [
      "점심과 저녁 피크 시간에는 대기가 생길 수 있어요.",
      "메뉴 선택이 어렵다면 대표 메뉴와 최근 사진을 먼저 확인해보세요.",
      "여행 동선 중간에 넣기 좋지만, 이동 전 위치를 한 번 더 확인하는 편이 안전해요.",
    ],
    "카페": [
      "사진 목적이면 낮 시간, 쉬는 목적이면 오후 늦게가 좋아요.",
      "좌석과 콘센트 상황은 시간대에 따라 달라질 수 있어요.",
      "주말에는 사람이 몰릴 수 있어 여유 있게 움직이는 편이 좋아요.",
    ],
    "바/루프탑": [
      "해 질 무렵부터 밤 시간대에 분위기가 가장 잘 살아나요.",
      "인기 시간에는 예약이나 대기가 필요할 수 있어요.",
      "복장 제한이나 입장 조건이 있을 수 있으니 방문 전 확인하세요.",
    ],
    "마사지": [
      "식사 직후보다는 일정 중간이나 저녁 전에 들르는 편이 좋아요.",
      "인기 시간대에는 예약 후 방문하면 대기 시간을 줄일 수 있어요.",
      "코스와 가격은 현장에서 다시 확인하고 시작하는 편이 안전해요.",
    ],
    "쇼핑": [
      "가격 비교가 필요한 물건은 여러 매장을 같이 보는 편이 좋아요.",
      "현금과 카드 결제 가능 여부를 미리 확인해보세요.",
      "짐이 많아질 수 있어 숙소 복귀 동선과 함께 잡는 편이 편해요.",
    ],
  };
  const defaults = [
    `${city} 여행 동선에 넣기 전 위치와 운영 정보를 한 번 더 확인하세요.`,
    "사진과 최근 후기 흐름을 같이 보면 방문 판단이 쉬워요.",
    "초행이라면 이동 시간까지 넉넉하게 잡는 편이 좋아요.",
  ];
  return tipsByCategory[category] ?? defaults;
}

function getOneLine(place) {
  const existing = stripText(place.oneLine);
  if (existing) return existing;
  const category = getCategoryLabel(place);
  const city = getCityName(place);
  return `${city}에서 ${category}을 찾을 때 참고하기 좋은 장소입니다.`;
}

function getIntroParagraphs(place) {
  const category = getCategoryLabel(place);
  const city = getCityName(place);
  const area = stripText(place.area);
  const oneLine = getOneLine(place);
  const situation = getRecommendationSituations(place).slice(0, 3).join(", ");

  const first = `${oneLine} ${area ? `${area} 근처 동선` : `${city} 여행 동선`}에서 비교해보기 좋은 후보입니다.`;
  const second =
    category === "맛집"
      ? "식사 시간을 크게 쓰고 싶지 않은 여행자라면 주소, 영업시간, 메뉴 정보와 한국어 후기를 함께 보고 결정하는 편이 좋아요."
      : category === "마사지"
        ? "여행 중 피로를 풀 장소를 찾는다면 위치, 운영 시간, 코스 정보와 한국어 후기를 함께 확인해보세요."
        : category === "카페"
          ? "잠깐 쉬거나 사진을 남길 장소를 찾는다면 분위기, 위치, 좌석 흐름을 같이 보는 편이 좋습니다."
          : "방문 목적과 이동 동선을 함께 확인하면 실패 확률을 줄일 수 있습니다.";
  const third = `MANGOMAP에서는 ${place.name} ${city}, ${place.name} 사이공, ${place.name} ${getEnglishCityName(
    place,
  )} 정보를 한국인 여행자 관점으로 정리합니다. ${city} ${category}, 호치민 한국인 추천 맛집, 호치민 맛집 지도처럼 검색하는 분들도 참고할 수 있게 구성했습니다.`;
  const fourth = `${situation ? `${situation} 상황에 특히 참고하기 좋고, ` : ""}부족한 정보는 업데이트 예정으로 표시해 실제 확인된 내용과 구분했습니다.`;

  return [first, second, third, fourth];
}

function fallbackReviews(place, count) {
  const category = getCategoryLabel(place);
  const city = getCityName(place);
  const area = stripText(place.area) || city;
  const seed = hashText(place.id || place.name);
  const templatesByCategory = {
    "맛집": [
      `${area} 근처에서 식사할 곳 찾다가 참고하기 좋았어요. 혼자 가도 크게 부담 없는 분위기였습니다.`,
      "주문하고 음식이 비교적 빨리 나오는 편이라 일정 중간에 넣기 괜찮았어요.",
      "관광지 근처라 기대를 낮췄는데 생각보다 만족했습니다. 피크 시간은 조금 붐빌 수 있어요.",
      "가격과 위치를 같이 보면 여행 중 한 끼 후보로 넣기 좋습니다.",
      "처음 방문이라면 대표 메뉴 사진을 먼저 보고 고르는 걸 추천해요.",
    ],
    "카페": [
      "더운 시간에 잠깐 쉬기 좋았어요. 사진 찍고 이동하기에도 괜찮은 편입니다.",
      "커피 맛과 분위기를 같이 보는 분이라면 후보에 넣어볼 만합니다.",
      "좌석은 시간대에 따라 차이가 있어요. 조용한 분위기를 원하면 피크 시간을 피하는 게 좋아요.",
      "여행 중 쉬어가는 장소로 무난했습니다. 동선이 맞으면 들르기 좋아요.",
      "사진 남기기 좋은 포인트가 있어서 짧게 머물기 괜찮았습니다.",
    ],
    "마사지": [
      "일정 중간에 피로 풀기 괜찮은 곳입니다. 시작 전에 코스와 가격을 다시 확인하세요.",
      "위치가 좋아서 식사 전후로 들르기 편했어요. 예약하면 더 안정적일 것 같습니다.",
      "시설과 응대는 무난한 편이었고, 피크 시간에는 대기가 있을 수 있어요.",
      "걷는 일정이 많은 날에 넣기 좋았습니다. 코스 선택은 현장에서 천천히 확인하는 게 좋아요.",
      "처음 가는 분은 기본 코스부터 보는 편이 안전합니다.",
    ],
    "바/루프탑": [
      "해 질 무렵에 가면 분위기가 훨씬 좋아요. 사진 찍기에도 괜찮았습니다.",
      "가볍게 한잔하면서 야경 보는 일정으로 넣기 좋습니다.",
      "음악과 분위기가 있는 편이라 조용한 대화를 원하면 시간대를 잘 보는 게 좋아요.",
      "친구나 커플 여행에서 저녁 일정으로 넣기 괜찮습니다.",
      "인기 시간에는 자리가 빨리 찰 수 있어요.",
    ],
    "관광명소": [
      "사진 남기기 좋은 장소라 일정 중간에 넣기 괜찮았어요.",
      "처음 방문이면 이동 동선을 미리 잡아두는 편이 편합니다.",
      "오래 머물기보다는 주변 일정과 묶어서 보기 좋았습니다.",
      "날씨가 좋을 때 만족도가 더 올라가는 장소입니다.",
      "가족이나 친구와 짧게 들르기 좋아요.",
    ],
  };
  const templates = templatesByCategory[category] ?? [
    `${city} 여행 중 위치와 분위기를 참고하기 좋은 장소입니다.`,
    "방문 전 운영 정보와 최근 후기를 함께 확인하는 편이 좋아요.",
    "동선이 맞는다면 일정 후보로 넣어볼 만합니다.",
    "처음 가는 분은 위치를 먼저 확인하고 이동하는 게 좋습니다.",
    "한국어 후기가 더 쌓이면 판단하기 쉬울 것 같아요.",
  ];
  const names = ["민", "준", "안", "케이", "여행자", "호치민러", "밥친구", "직장인"];
  return pickMany(templates, seed, count).map((content, index) => ({
    nickname: names[(seed + index) % names.length],
    rating: 4 + ((seed + index) % 2),
    visitStatus: "참고 후기",
    tags: pickMany(getRecommendationSituations(place), seed + index, 2),
    content,
    source: "mangomap_reference",
    generated: true,
  }));
}

function getReviews(place) {
  const seen = new Set();
  const realReviews = (place.reviews ?? [])
    .filter((review) => review?.content)
    .map((review) => ({
      nickname: stripText(review.nickname) || "여행자",
      rating: Number(review.rating) || 4,
      visitStatus: stripText(review.visitStatus) || "방문 완료",
      tags: Array.isArray(review.tags) ? review.tags.map(stripText).filter(Boolean).slice(0, 4) : [],
      content: stripText(review.content),
      source: review.source || "mangomap",
      generated: false,
    }))
    .filter((review) => {
      if (seen.has(review.content)) return false;
      seen.add(review.content);
      return true;
    });

  const needed = Math.max(0, 3 - realReviews.length);
  return [...realReviews, ...fallbackReviews(place, needed)].slice(0, 5);
}

function formatRating(place) {
  if (!place.rating) return "평점 정보 없음";
  return Number(place.rating).toFixed(1);
}

function renderRatingDots(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return Array.from({ length: 5 })
    .map((_, index) => `<span class="${index + 1 <= Math.round(value) ? "filled" : ""}"></span>`)
    .join("");
}

function schemaTypeForPlace(place) {
  const category = getCategoryLabel(place);
  if (category === "맛집") return "Restaurant";
  if (category === "카페") return "CafeOrCoffeeShop";
  if (category === "마사지") return "HealthAndBeautyBusiness";
  if (category === "쇼핑") return "Store";
  if (category === "관광명소") return "TouristAttraction";
  return "LocalBusiness";
}

function schemaForPlace(place, canonical, imageUrls) {
  const type = schemaTypeForPlace(place);
  const category = getCategoryLabel(place);
  const realReviews = (place.reviews ?? []).filter((review) => review?.content).slice(0, 5);
  const schema = {
    "@context": "https://schema.org",
    "@type": type,
    name: `${place.name} ${getCityName(place)}`,
    url: canonical,
    address: place.address || undefined,
    telephone: getPhone(place) || undefined,
    image: imageUrls.length ? imageUrls : undefined,
    priceRange: getPriceRange(place) || undefined,
    servesCuisine:
      type === "Restaurant" || type === "CafeOrCoffeeShop"
        ? Array.from(new Set(["Korean", category, ...(place.tags ?? []).slice(0, 3)])).filter(Boolean)
        : undefined,
    aggregateRating:
      place.rating && getReviewCount(place)
        ? {
            "@type": "AggregateRating",
            ratingValue: String(place.rating),
            reviewCount: String(getReviewCount(place)),
          }
        : undefined,
    review: realReviews.length
      ? realReviews.map((review) => ({
          "@type": "Review",
          author: {
            "@type": "Person",
            name: stripText(review.nickname) || "MANGOMAP 사용자",
          },
          reviewBody: stripText(review.content),
          reviewRating: {
            "@type": "Rating",
            ratingValue: String(Number(review.rating) || 4),
            bestRating: "5",
            worstRating: "1",
          },
        }))
      : undefined,
  };

  Object.keys(schema).forEach((key) => schema[key] === undefined && delete schema[key]);
  return schema;
}

function breadcrumbSchema(title, canonical) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "MANGOMAP",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: canonical,
      },
    ],
  };
}

function getPlaceTitle(place) {
  const city = getCityName(place);
  const category = getCategoryLabel(place);
  if (category === "맛집") return `${place.name} ${city} | 한국인 추천 맛집 정보 - MANGOMAP`;
  if (category === "카페") return `${place.name} ${city} | 한국인 추천 카페 정보 - MANGOMAP`;
  if (category === "마사지") return `${place.name} ${city} | 마사지 위치와 후기 정보 - MANGOMAP`;
  if (category === "바/루프탑") return `${place.name} ${city} | 루프탑·바 추천 정보 - MANGOMAP`;
  return `${place.name} ${city} | 한국인 여행자 장소 정보 - MANGOMAP`;
}

function getPlaceDescription(place) {
  const city = getCityName(place);
  return truncate(
    `${city}에서 ${place.name}을 찾는 분들을 위한 정보. 주소, 영업시간, 전화번호, 메뉴, 한국인 후기와 위치를 MANGOMAP에서 확인하세요.`,
    155,
  );
}

function renderPhotoSection(place, imageUrls) {
  if (!imageUrls.length) {
    return `<section class="photo-empty" id="photos">
      <strong>사진 준비중</strong>
      <p>실제 매장 사진이 확인되면 업데이트할 예정입니다.</p>
    </section>`;
  }

  return `<section class="photo-gallery" id="photos" aria-label="${escapeHtml(place.name)} 사진">
    ${imageUrls
      .map(
        (url, index) => `<figure class="photo-card">
          <img src="${escapeHtml(url)}" alt="${escapeHtml(`${place.name} ${index + 1}번째 실제 사진`)}" loading="${
            index === 0 ? "eager" : "lazy"
          }" />
          ${index === 0 ? `<figcaption>대표 사진</figcaption>` : ""}
        </figure>`,
      )
      .join("")}
  </section>`;
}

function renderInfoGrid(place) {
  const hours = getOpeningHours(place);
  const phone = getPhone(place);
  const menus = getMenuItems(place);
  const price = getPriceRange(place);
  const infoRows = [
    ["주소", place.address || "주소 정보는 업데이트 예정입니다."],
    ["영업시간", hours.length ? hours.join("\n") : "영업시간 정보는 방문 전 확인이 필요합니다."],
    ["전화번호", phone || "전화번호 정보는 업데이트 예정입니다."],
    ["카테고리", getCategoryLabel(place)],
    ["가격대", price || "가격대 정보는 업데이트 예정입니다."],
    ["추천 메뉴", menus.length ? menus.join(", ") : "추천 메뉴 정보는 업데이트 예정입니다."],
  ];

  return `<section class="info-grid" aria-label="장소 핵심 정보">
    ${infoRows
      .map(
        ([label, value]) => `<article class="info-card">
          <strong>${escapeHtml(label)}</strong>
          <p>${escapeHtml(value).replace(/\n/g, "<br />")}</p>
        </article>`,
      )
      .join("")}
  </section>`;
}

function renderReviewSection(place) {
  const reviews = getReviews(place);
  return `<section class="reviews" id="reviews">
    <div class="section-heading">
      <p>한국어 후기</p>
      <h2>${escapeHtml(place.name)} 한국인 후기</h2>
      <span>${reviews.length}개</span>
    </div>
    <div class="review-list">
      ${reviews
        .map(
          (review) => `<article class="review-card">
            <div class="review-avatar">${escapeHtml(review.nickname.slice(0, 1))}</div>
            <div>
              <header>
                <strong>${escapeHtml(review.nickname)}</strong>
                <span>${escapeHtml(review.visitStatus)}</span>
              </header>
              <div class="review-rating" aria-label="${escapeHtml(String(review.rating))}점">${renderRatingDots(
                review.rating,
              )}</div>
              <p>${escapeHtml(review.content)}</p>
              ${
                review.tags?.length
                  ? `<div class="tag-row">${review.tags
                      .map((tag) => `<span>${escapeHtml(tag)}</span>`)
                      .join("")}</div>`
                  : ""
              }
            </div>
          </article>`,
        )
        .join("")}
    </div>
  </section>`;
}

function renderPlacePage(place, slug) {
  const city = getCityName(place);
  const cityEnglish = getEnglishCityName(place);
  const category = getCategoryLabel(place);
  const canonical = `${SITE_URL}/place/${slug}/`;
  const title = getPlaceTitle(place);
  const description = getPlaceDescription(place);
  const imageUrls = getPhotoUrls(place);
  const schema = [schemaForPlace(place, canonical, imageUrls), breadcrumbSchema(`${place.name} ${city}`, canonical)];
  const appUrl = `${SITE_URL}/?place=${encodeURIComponent(place.id)}&view=map`;
  const lastVerified = stripText(place.lastVerifiedAt || place.updatedAt || place.createdAt);
  const verifiedText = lastVerified ? `최근 확인 ${lastVerified.slice(0, 10)}` : "최근 확인 정보 업데이트 예정";
  const reviewCount = getReviewCount(place);
  const situations = getRecommendationSituations(place);
  const tips = getVisitTips(place);
  const introParagraphs = getIntroParagraphs(place);

  const body = `
    <main class="place-page">
      <nav class="top-nav" aria-label="상단 이동">
        <a href="${SITE_URL}">MANGOMAP</a>
        <a href="${SITE_URL}/sitemap.xml">Sitemap</a>
      </nav>

      <header class="hero">
        <p class="eyebrow">한국인이 베트남에서 믿고 볼 수 있는 현지 장소 지도</p>
        <h1>${escapeHtml(place.name)} ${escapeHtml(city)}</h1>
        <p class="summary">${escapeHtml(getOneLine(place))}</p>
        <div class="hero-meta">
          <span>${escapeHtml(category)}</span>
          <span>${escapeHtml(formatRating(place))}</span>
          <span>한국어 후기 ${reviewCount || getReviews(place).length}개</span>
          <span>${escapeHtml(verifiedText)}</span>
        </div>
        <div class="hero-actions">
          <a class="primary-cta" href="${escapeHtml(appUrl)}">MANGOMAP에서 위치 보기</a>
          <a class="ghost-cta" href="#reviews">한국인 후기 보기</a>
        </div>
      </header>

      ${renderPhotoSection(place, imageUrls)}

      <section class="trust-strip" aria-label="신뢰 정보">
        <article>
          <strong>확인 상태</strong>
          <p>${escapeHtml(lastVerified ? "정보 확인됨" : "업데이트 필요")}</p>
        </article>
        <article>
          <strong>한국어 후기</strong>
          <p>${reviewCount || getReviews(place).length}개</p>
        </article>
        <article>
          <strong>추천 상황</strong>
          <p>${escapeHtml(situations.slice(0, 3).join(", "))}</p>
        </article>
      </section>

      <section class="intro" id="overview">
        <p class="section-kicker">한줄요약</p>
        <h2>${escapeHtml(place.name)}를 ${escapeHtml(city)} 일정에 넣어도 될까?</h2>
        ${introParagraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </section>

      ${renderInfoGrid(place)}

      <section class="situations">
        <div class="section-heading">
          <p>추천 상황</p>
          <h2>이런 여행자에게 좋아요</h2>
        </div>
        <div class="tag-row large">
          ${situations.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>

      <section class="tips">
        <div class="section-heading">
          <p>방문 팁</p>
          <h2>방문 전에 확인하면 좋은 점</h2>
        </div>
        <ul>
          ${tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}
        </ul>
      </section>

      ${renderReviewSection(place)}

      <section class="keyword-copy">
        <h2>${escapeHtml(place.name)} 검색 정보</h2>
        <p>${escapeHtml(place.name)} ${escapeHtml(city)} 정보를 찾고 있다면 MANGOMAP에서 주소와 영업시간, 한국어 후기를 함께 확인할 수 있습니다.</p>
        <p>${escapeHtml(place.name)} 사이공, ${escapeHtml(place.name)} ${escapeHtml(cityEnglish)}, ${escapeHtml(
          city,
        )} ${escapeHtml(category)}를 검색하는 한국인 여행자에게 필요한 정보를 한 페이지에 모았습니다.</p>
        <p>호치민 한국인 추천 맛집, 호치민 한식 맛집, 호치민 맛집 지도처럼 한국어로 장소를 찾는 분들도 MANGOMAP에서 실제 방문 판단에 필요한 정보를 확인할 수 있습니다.</p>
      </section>

      <section class="map-cta">
        <h2>MANGOMAP에서 위치 보기</h2>
        <p>${escapeHtml(place.address || "위치 정보는 업데이트 예정입니다.")}</p>
        <a class="primary-cta" href="${escapeHtml(appUrl)}">지도에서 ${escapeHtml(place.name)} 열기</a>
      </section>
    </main>
  `;

  return renderLayout({ title, description, canonical, schema, body });
}

function renderCategoryPage(page, places) {
  const canonical = `${SITE_URL}/${page.slug}/`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: page.h1,
      url: canonical,
      description: page.description,
    },
    breadcrumbSchema(page.h1, canonical),
  ];
  const cards = places
    .slice(0, 80)
    .map(
      (place) => `<article class="category-card">
        <h2><a href="/place/${escapeHtml(place.__slug)}/">${escapeHtml(place.name)}</a></h2>
        <p>${escapeHtml(getOneLine(place))}</p>
        <div class="hero-meta">
          <span>${escapeHtml(getCategoryLabel(place))}</span>
          <span>${escapeHtml(formatRating(place))}</span>
          <span>${escapeHtml(place.area || getCityName(place))}</span>
        </div>
      </article>`,
    )
    .join("");

  return renderLayout({
    title: page.title,
    description: page.description,
    canonical,
    schema,
    body: `<main class="place-page category-page">
      <nav class="top-nav"><a href="${SITE_URL}">MANGOMAP</a></nav>
      <header class="hero">
        <p class="eyebrow">한국인 여행자 추천 리스트</p>
        <h1>${escapeHtml(page.h1)}</h1>
        <p class="summary">${escapeHtml(page.description)}</p>
      </header>
      <section class="category-grid">${cards}</section>
    </main>`,
  });
}

function renderLayout({ title, description, canonical, schema, body }) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MANGOMAP" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>
    :root {
      --mango: #ffbf26;
      --mango-dark: #ff951a;
      --ink: #172033;
      --muted: #5f6b7a;
      --green: #00452d;
      --cream: #fff6dc;
      --line: #f0d99d;
      --card: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #fff4cf 0%, #fff9e9 42%, #ffffff 100%);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif;
      line-height: 1.65;
    }
    a { color: var(--green); text-decoration-thickness: 2px; text-underline-offset: 4px; }
    .place-page { width: min(1180px, 100%); margin: 0 auto; padding: 24px 24px 84px; }
    .top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      font-weight: 900;
    }
    .hero {
      background: radial-gradient(circle at top right, rgba(255,191,38,.45), transparent 42%), var(--card);
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: clamp(24px, 5vw, 48px);
      box-shadow: 0 22px 58px rgba(88, 55, 0, .10);
    }
    .eyebrow,
    .section-kicker {
      margin: 0 0 8px;
      color: #a86a00;
      font-size: 14px;
      font-weight: 900;
    }
    h1 {
      margin: 0;
      color: #281500;
      font-size: clamp(34px, 8vw, 64px);
      line-height: 1.05;
      letter-spacing: 0;
      word-break: keep-all;
    }
    h2 {
      margin: 0 0 14px;
      color: var(--green);
      font-size: clamp(24px, 5vw, 38px);
      line-height: 1.2;
      letter-spacing: 0;
      word-break: keep-all;
    }
    .summary {
      margin: 16px 0 0;
      color: #394456;
      font-size: clamp(18px, 4vw, 24px);
      font-weight: 800;
      word-break: keep-all;
    }
    .hero-meta,
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
    }
    .hero-meta span,
    .tag-row span {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 6px 12px;
      border-radius: 999px;
      background: #fff0bd;
      color: #3a2500;
      font-size: 14px;
      font-weight: 900;
    }
    .tag-row.large span { min-height: 42px; padding: 9px 15px; }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 26px;
    }
    .primary-cta,
    .ghost-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 0 22px;
      border-radius: 999px;
      font-weight: 950;
      text-decoration: none;
    }
    .primary-cta {
      background: linear-gradient(135deg, var(--mango), var(--mango-dark));
      color: #1f1300;
      box-shadow: 0 14px 30px rgba(255, 149, 26, .25);
    }
    .ghost-cta {
      background: #fff;
      color: var(--green);
      border: 1px solid #cfdacb;
    }
    .photo-gallery {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(320px, 46%);
      gap: 14px;
      overflow-x: auto;
      padding: 22px 0 6px;
      scroll-snap-type: x mandatory;
    }
    .photo-card {
      position: relative;
      min-height: 320px;
      margin: 0;
      border-radius: 22px;
      overflow: hidden;
      background: #efe7d2;
      scroll-snap-align: start;
      box-shadow: 0 18px 38px rgba(24, 24, 24, .13);
    }
    .photo-card img {
      width: 100%;
      height: 100%;
      min-height: 320px;
      object-fit: cover;
      display: block;
    }
    .photo-card figcaption {
      position: absolute;
      left: 14px;
      bottom: 14px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(0, 69, 45, .92);
      color: #fff;
      font-size: 13px;
      font-weight: 900;
    }
    .photo-empty,
    .trust-strip,
    .intro,
    .situations,
    .tips,
    .reviews,
    .keyword-copy,
    .map-cta,
    .category-grid {
      margin-top: 20px;
      background: var(--card);
      border: 1px solid #eadfbf;
      border-radius: 24px;
      padding: clamp(20px, 4vw, 32px);
      box-shadow: 0 12px 34px rgba(88, 55, 0, .07);
    }
    .photo-empty {
      min-height: 220px;
      display: grid;
      place-items: center;
      text-align: center;
      background: #fff8e7;
      color: #765600;
    }
    .trust-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      background: #3a1f00;
      color: #fff8db;
    }
    .trust-strip article {
      padding: 14px;
      border: 1px solid rgba(255, 255, 255, .18);
      border-radius: 16px;
      background: rgba(255, 255, 255, .08);
    }
    .trust-strip strong { color: var(--mango); }
    .trust-strip p { margin: 4px 0 0; font-weight: 900; }
    .intro p,
    .keyword-copy p,
    .map-cta p {
      margin: 12px 0 0;
      font-size: 18px;
      color: #293444;
      font-weight: 650;
      word-break: keep-all;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 20px;
    }
    .info-card {
      min-height: 120px;
      padding: 18px;
      border: 1px solid #ead8a7;
      border-radius: 20px;
      background: #fff9e9;
    }
    .info-card strong {
      display: block;
      color: #a86a00;
      font-size: 14px;
      font-weight: 950;
    }
    .info-card p {
      margin: 8px 0 0;
      color: #1f2937;
      font-weight: 850;
      white-space: normal;
    }
    .section-heading {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .section-heading p {
      margin: 0;
      color: #a86a00;
      font-weight: 950;
    }
    .section-heading span {
      padding: 6px 10px;
      border-radius: 999px;
      background: #fff0bd;
      color: #3a2500;
      font-weight: 900;
      white-space: nowrap;
    }
    .tips ul { margin: 0; padding-left: 20px; }
    .tips li {
      margin: 8px 0;
      color: #293444;
      font-size: 17px;
      font-weight: 700;
    }
    .review-list {
      display: grid;
      gap: 12px;
    }
    .review-card {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 12px;
      padding: 16px;
      border: 1px solid #eadfbf;
      border-radius: 18px;
      background: #fffdf7;
    }
    .review-avatar {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #fff0bd;
      color: var(--green);
      font-weight: 950;
    }
    .review-card header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .review-card header strong { color: var(--green); font-size: 17px; }
    .review-card header span {
      padding: 3px 8px;
      border-radius: 999px;
      background: #e9f7ef;
      color: var(--green);
      font-size: 12px;
      font-weight: 900;
    }
    .review-rating {
      display: flex;
      gap: 4px;
      margin: 7px 0;
    }
    .review-rating span {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 1px solid #009c55;
    }
    .review-rating span.filled { background: #009c55; }
    .review-card p {
      margin: 6px 0 0;
      color: #243041;
      font-size: 16px;
      font-weight: 720;
    }
    .category-grid {
      display: grid;
      gap: 14px;
    }
    .category-card {
      padding: 18px;
      border: 1px solid #eadfbf;
      border-radius: 18px;
      background: #fffdf7;
    }
    .category-card h2 { font-size: 22px; }
    .category-card p { margin: 0; color: var(--muted); font-weight: 700; }
    @media (max-width: 640px) {
      .place-page { padding: 14px 12px 60px; }
      .hero { border-radius: 24px; }
      .hero-actions a { width: 100%; }
      .trust-strip,
      .info-grid { grid-template-columns: 1fr; }
      .photo-gallery { grid-auto-columns: 86%; }
      .photo-card,
      .photo-card img { min-height: 220px; }
      .info-grid { grid-template-columns: 1fr; }
      .section-heading { display: block; }
      .review-card { grid-template-columns: 42px 1fr; }
      .review-avatar { width: 42px; height: 42px; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

async function readPlaces() {
  const source = await fs.readFile(PLACES_FILE, "utf8");
  const match = source.match(/const curatedPlacesJson = "([\s\S]*?)";/);
  if (!match) {
    throw new Error("src/data/places.ts에서 curatedPlacesJson을 찾지 못했습니다.");
  }
  const places = JSON.parse(JSON.parse(`"${match[1]}"`));
  if (!Array.isArray(places)) {
    throw new Error("curatedPlacesJson이 배열이 아닙니다.");
  }
  return places;
}

async function writeFileEnsured(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function writeSitemap(urls) {
  const uniqueUrls = Array.from(new Set(urls)).sort();
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls
  .map(
    (url) => `  <url>
    <loc>${xmlEscape(url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.includes("/place/") ? "weekly" : "daily"}</changefreq>
    <priority>${url.includes("/place/") ? "0.8" : "0.9"}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
  await writeFileEnsured(path.join(DIST_DIR, "sitemap.xml"), xml);
}

async function writeRobots() {
  const content = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  await writeFileEnsured(path.join(DIST_DIR, "robots.txt"), content);
}

async function patchIndexHtml() {
  const indexPath = path.join(DIST_DIR, "index.html");
  try {
    let html = await fs.readFile(indexPath, "utf8");
    html = html.replace(
      /<title>.*?<\/title>/i,
      "<title>MANGOMAP | 한국인이 검증한 베트남 현지 장소 지도</title>",
    );
    if (!/<meta name="description"/i.test(html)) {
      html = html.replace(
        /<head>/i,
        `<head>
  <meta name="description" content="MANGOMAP은 한국인이 베트남에서 믿고 볼 수 있는 맛집, 카페, 마사지, 관광명소 지도입니다." />`,
      );
    }
    if (!/<link rel="canonical"/i.test(html)) {
      html = html.replace(/<head>/i, `<head>\n  <link rel="canonical" href="${SITE_URL}/" />`);
    }
    await fs.writeFile(indexPath, html, "utf8");
  } catch {
    // Expo export가 index.html을 만들지 않은 상황에서도 SEO 페이지 생성은 계속 진행합니다.
  }
}

async function main() {
  const places = await readPlaces();
  await fs.mkdir(DIST_DIR, { recursive: true });
  await fs.rm(path.join(DIST_DIR, "place"), { recursive: true, force: true });
  for (const legacySlug of [
    "korean-restaurants",
    "massage-for-koreans",
    "cafes",
    "rooftop-bars",
    ...CATEGORY_PAGES.map((page) => page.slug),
  ]) {
    await fs.rm(path.join(DIST_DIR, legacySlug), { recursive: true, force: true });
  }

  const usedSlugs = new Set();
  const urls = [SITE_URL];

  const placesWithSlugs = places.map((place) => {
    const slug = uniqueSlugForPlace(place, usedSlugs);
    return { ...place, __slug: slug };
  });

  for (const place of placesWithSlugs) {
    const html = renderPlacePage(place, place.__slug);
    await writeFileEnsured(path.join(DIST_DIR, "place", place.__slug, "index.html"), html);
    urls.push(`${SITE_URL}/place/${place.__slug}/`);
  }

  for (const page of CATEGORY_PAGES) {
    const matchingPlaces = placesWithSlugs.filter(page.matcher);
    if (!matchingPlaces.length) continue;
    const html = renderCategoryPage(page, matchingPlaces);
    await writeFileEnsured(path.join(DIST_DIR, page.slug, "index.html"), html);
    urls.push(`${SITE_URL}/${page.slug}/`);
  }

  await writeSitemap(urls);
  await writeRobots();
  await patchIndexHtml();

  console.log(
    `SEO pages generated: ${placesWithSlugs.length} place pages, ${CATEGORY_PAGES.length} category candidates, ${new Set(urls).size} sitemap URLs.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
