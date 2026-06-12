type ReviewInput = {
  rating?: number;
  text?: string;
};

type EditorialInput = {
  name: string;
  cityName: string;
  cityKoreanName: string;
  districtName: string;
  categoryLabel: string;
  categoryKoreanLabel: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  openingHours?: string[];
  priceLevel?: string | null;
  reviews?: ReviewInput[];
};

export type PlaceEditorial = {
  description: string;
  seoTitle: string;
  seoDescription: string;
  reviewSummary: string;
  positiveSignals: string[];
  cautionSignals: string[];
  mentionedMenus: string[];
  recommendedFor: string[];
  editorialBody: string;
  faq: Array<{ question: string; answer: string }>;
};

const positiveSignalRules = [
  { label: "친절한 응대", patterns: ["친절", "서비스 최고", "응대", "welcome", "kind", "friendly", "nice staff"] },
  { label: "음식이 빨리 나옴", patterns: ["빨리", "빠르", "quick", "fast"] },
  { label: "한국에서 먹던 익숙한 맛", patterns: ["한국", "한국에서", "korean style", "authentic", "home"] },
  { label: "해장하기 좋은 국물", patterns: ["해장", "국물", "spicy soup", "broth"] },
  { label: "재방문 의사", patterns: ["또 올", "자주 방문", "재방문", "again", "come back"] },
  { label: "양이 넉넉함", patterns: ["양", "푸짐", "많이", "portion", "generous"] },
  { label: "분위기가 편함", patterns: ["분위기", "편안", "깔끔", "clean", "cozy"] },
];

const cautionSignalRules = [
  { label: "맛의 진하기는 취향이 갈릴 수 있음", patterns: ["밍밍", "싱겁", "bland", "weak"] },
  { label: "음식 온도에 대한 아쉬움이 있음", patterns: ["미지근", "차갑", "lukewarm", "cold"] },
  { label: "가격 체감이 높을 수 있음", patterns: ["비싸", "가격", "expensive", "pricey"] },
  { label: "대기나 제공 속도는 시간대에 따라 달라질 수 있음", patterns: ["늦", "기다", "slow", "wait"] },
  { label: "일부 메뉴 만족도는 갈릴 수 있음", patterns: ["별로", "아쉬", "not good", "disappointed"] },
];

const menuRules = [
  "짬뽕",
  "짜장면",
  "간짜장",
  "탕수육",
  "크림새우",
  "삼겹살",
  "갈비",
  "BBQ",
  "치킨",
  "떡볶이",
  "김밥",
  "설렁탕",
  "국밥",
  "반미",
  "쌀국수",
  "해산물",
  "커피",
  "마사지",
];

export function buildPlaceEditorial(input: EditorialInput): PlaceEditorial {
  const reviewTexts = (input.reviews ?? [])
    .map((review) => review.text ?? "")
    .filter(Boolean);
  const positiveSignals = pickSignals(reviewTexts, positiveSignalRules, ["위치가 편리함", "한국인이 고르기 쉬운 메뉴"]);
  const cautionSignals = pickSignals(reviewTexts, cautionSignalRules, []);
  const mentionedMenus = pickMentionedMenus(reviewTexts, input.name);
  const recommendedFor = buildRecommendedFor(input, positiveSignals, mentionedMenus);
  const ratingText = typeof input.rating === "number" ? `${input.rating.toFixed(1)}점` : "평점 정보가 아직 부족한 곳";
  const reviewText = typeof input.reviewCount === "number" ? `방문자 후기 ${input.reviewCount.toLocaleString("ko-KR")}개` : "방문자 후기가 더 쌓이는 중";
  const menuText = mentionedMenus.length ? `${mentionedMenus.slice(0, 3).join(", ")} 같은 메뉴` : `${input.categoryKoreanLabel} 메뉴`;
  const openText = input.openingHours?.[0] ? `운영시간은 ${input.openingHours[0].replace(/^Monday: |^Tuesday: |^Wednesday: |^Thursday: |^Friday: |^Saturday: |^Sunday: /, "")} 기준으로 확인됩니다.` : "운영시간은 방문 전 다시 확인하는 편이 좋습니다.";
  const priceText = input.priceLevel ? `가격대는 ${formatPriceLevel(input.priceLevel)} 정도로 보면 됩니다.` : "가격대는 메뉴와 방문 시점에 따라 달라질 수 있습니다.";

  const description = `${input.cityKoreanName} ${input.districtName}에서 ${menuText}를 찾을 때 후보에 올릴 만한 ${input.categoryKoreanLabel}입니다. ${ratingText}, ${reviewText} 기준으로 위치와 메뉴 성격을 함께 확인하기 좋습니다.`;

  const reviewSummary = buildReviewSummary(positiveSignals, cautionSignals);
  const editorialBody = [
    `${input.name}은 ${input.cityKoreanName} ${input.districtName}에서 찾을 수 있는 ${input.categoryKoreanLabel}입니다. 주소는 ${input.address || `${input.cityName} ${input.districtName}`}이며, 여행자 동선과 현지 생활권을 함께 고려해 비교하기 좋은 장소입니다.`,
    `${input.categoryKoreanLabel}을 찾는 사람에게 중요한 건 단순히 평점만이 아닙니다. 메뉴가 한국인 입맛에 맞는지, 혼자 가도 부담이 적은지, 가족이나 일행과 함께 가기 좋은지까지 봐야 합니다. 이곳은 ${recommendedFor.slice(0, 3).join(", ")} 상황에서 먼저 검토해볼 만합니다.`,
    `방문자 반응을 보면 ${positiveSignals.slice(0, 3).join(", ")}에 대한 언급이 눈에 띕니다. ${mentionedMenus.length ? `특히 ${mentionedMenus.slice(0, 3).join(", ")} 관련 언급이 있어 메뉴를 고를 때 참고하기 좋습니다.` : "메뉴 선택이 어렵다면 대표 메뉴와 사진을 먼저 확인하는 편이 좋습니다."}`,
    cautionSignals.length
      ? `다만 ${cautionSignals.slice(0, 2).join(", ")}이라는 의견도 일부 보입니다. 그래서 너무 큰 기대를 잡기보다는, ${input.cityKoreanName}에서 실패 확률을 줄이는 실용적인 선택지로 보는 편이 좋습니다.`
      : `아직 뚜렷하게 반복되는 아쉬운 신호는 많지 않습니다. 그래도 영업시간, 가격, 메뉴 구성은 방문 시점에 따라 달라질 수 있으니 출발 전 한 번 더 확인하는 것이 좋습니다.`,
    `${openText} ${priceText} Mango Vietnam에서는 이 장소를 주변 맛집, 카페, 마사지, 생활정보와 함께 묶어 한국인 기준으로 비교할 수 있게 정리합니다.`,
  ].join("\n\n");

  return {
    description,
    seoTitle: `${input.name} | ${input.cityKoreanName} ${input.districtName} ${input.categoryKoreanLabel}`,
    seoDescription: `${input.cityKoreanName} ${input.districtName} ${input.categoryKoreanLabel} ${input.name}. 주소, 운영시간, 가격대, 방문자 반응과 추천 상황을 한국인 기준으로 정리했습니다.`,
    reviewSummary,
    positiveSignals,
    cautionSignals,
    mentionedMenus,
    recommendedFor,
    editorialBody,
    faq: [
      {
        question: `${input.name}은 어떤 사람에게 추천하나요?`,
        answer: `${recommendedFor.slice(0, 3).join(", ")} 상황에 잘 맞습니다. ${input.cityKoreanName} ${input.districtName}에서 ${input.categoryKoreanLabel}을 찾는다면 비교 후보로 볼 만합니다.`,
      },
      {
        question: `${input.name} 방문 전 무엇을 확인해야 하나요?`,
        answer: "운영시간, 메뉴 가격, 휴무 여부는 방문 시점에 따라 달라질 수 있어 출발 전 최신 정보를 확인하는 것이 좋습니다.",
      },
      {
        question: `${input.name}의 장점은 무엇인가요?`,
        answer: `${positiveSignals.slice(0, 3).join(", ")}이 자주 언급됩니다. 다만 개인 취향에 따라 만족도는 달라질 수 있습니다.`,
      },
    ],
  };
}

function pickSignals(
  texts: string[],
  rules: Array<{ label: string; patterns: string[] }>,
  fallback: string[],
) {
  const haystack = normalizeText(texts.join("\n"));
  const picked = rules
    .filter((rule) => rule.patterns.some((pattern) => haystack.includes(normalizeText(pattern))))
    .map((rule) => rule.label);

  return unique([...picked, ...fallback]).slice(0, 5);
}

function pickMentionedMenus(texts: string[], name: string) {
  const haystack = normalizeText([name, ...texts].join("\n"));
  return menuRules.filter((menu) => haystack.includes(normalizeText(menu))).slice(0, 5);
}

function buildRecommendedFor(input: EditorialInput, signals: string[], menus: string[]) {
  const result = ["근처에서 한 끼를 고르는 사람"];
  const text = normalizeText([input.name, input.categoryLabel, input.categoryKoreanLabel, ...signals, ...menus].join(" "));

  if (/korean|한식|한국|짬뽕|짜장|탕수육/.test(text)) result.push("한국식 메뉴가 필요한 날");
  if (/짬뽕|국물|해장|spicy soup/.test(text)) result.push("매운 국물이나 해장이 필요한 날");
  if (/cafe|커피|카페/.test(text)) result.push("카페에서 쉬어가고 싶은 날");
  if (/massage|마사지|spa/.test(text)) result.push("여행 중 피로를 풀고 싶은 날");
  if (/bbq|삼겹살|갈비|고기/.test(text)) result.push("여럿이 고기 먹기 좋은 날");
  if (/해산물|seafood/.test(text)) result.push("해산물 식사를 찾는 날");

  result.push("처음 가는 지역에서 실패 확률을 줄이고 싶은 사람");
  return unique(result).slice(0, 6);
}

function buildReviewSummary(positiveSignals: string[], cautionSignals: string[]) {
  const positive = positiveSignals.length
    ? `방문자 후기를 보면 ${positiveSignals.slice(0, 3).join(", ")}이 자주 언급됩니다.`
    : "방문자 후기가 더 쌓이면 장점과 주의점을 더 명확하게 비교할 수 있습니다.";
  const caution = cautionSignals.length
    ? `다만 ${cautionSignals.slice(0, 2).join(", ")}이라는 반응도 일부 있어 방문 전 기대치를 조정하는 편이 좋습니다.`
    : "반복적으로 두드러지는 아쉬운 신호는 아직 많지 않습니다.";

  return `${positive} ${caution}`;
}

function formatPriceLevel(priceLevel: string) {
  const labels: Record<string, string> = {
    PRICE_LEVEL_FREE: "무료 또는 매우 낮은 편",
    PRICE_LEVEL_INEXPENSIVE: "부담 낮은 편",
    PRICE_LEVEL_MODERATE: "중간",
    PRICE_LEVEL_EXPENSIVE: "높은 편",
    PRICE_LEVEL_VERY_EXPENSIVE: "상당히 높은 편",
  };
  return labels[priceLevel] ?? priceLevel;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
