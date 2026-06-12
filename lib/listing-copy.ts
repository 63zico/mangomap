import type { Listing } from "@/lib/places";

export type ListingCopy = {
  title: string;
  cardReason: string;
  summary: string;
  paragraphs: string[];
  reasons: string[];
  recommendedFor: string[];
  primaryItems: string[];
  visitChecklist: string[];
  seoDescription: string;
};

export function getListingCopy(listing: Listing, categoryLabel = listing.category): ListingCopy {
  const profile = getCategoryProfile(listing, categoryLabel);
  const location = getLocation(listing);
  const area = getAreaLabel(listing);
  const primaryItems = unique([...getDataTags(listing), ...profile.primaryItems]).slice(0, 4);
  const reasons = unique([...profile.reasons, ...getEvidenceReasons(listing)]).slice(0, 5);
  const recommendedFor = unique(profile.recommendedFor).slice(0, 4);
  const visitChecklist = unique([...profile.visitChecklist, ...getFactChecklist(listing)]).slice(0, 5);
  const title = `${listing.name} | ${location.titleArea}에서 ${profile.titleIntent}`;
  const cardReason = `${area} 근처에서 ${profile.cardIntent} 찾을 때 보기 좋은 ${profile.placeNoun}.`;
  const summary = `${listing.name}은 ${area} 근처에서 ${profile.summaryIntent} 필요할 때 보기 좋은 ${profile.placeNoun}입니다. ${profile.context}`;
  const paragraphs = [
    summary,
    `${listing.city}에서 ${categoryLabel}을 고를 때는 이름보다 위치, 사진, 후기 수, 가격대, 영업시간을 함께 보는 편이 안전합니다. Mango Vietnam은 한국인이 빠르게 판단할 수 있도록 이 정보를 한 페이지에 모았습니다.`,
  ];
  const seoIntent = stripKoreanParticle(profile.summaryIntent);
  const seoDescription = `${listing.name} ${listing.city} ${area} ${categoryLabel} 정보. ${seoIntent}가 필요할 때 참고할 주소, 영업시간, 가격대, 사진, 후기 신호와 방문 전 체크포인트를 확인하세요.`;

  return {
    title,
    cardReason,
    summary,
    paragraphs,
    reasons,
    recommendedFor,
    primaryItems,
    visitChecklist,
    seoDescription,
  };
}

type CategoryProfile = {
  placeNoun: string;
  titleIntent: string;
  cardIntent: string;
  summaryIntent: string;
  context: string;
  reasons: string[];
  recommendedFor: string[];
  primaryItems: string[];
  visitChecklist: string[];
};

function getCategoryProfile(listing: Listing, categoryLabel: string): CategoryProfile {
  const text = normalize(listing.searchText);
  const category = normalize(categoryLabel);

  if (category.includes("맛집") || normalize(listing.category).includes("맛집")) return restaurantProfile(listing, text);
  if (category.includes("카페") || normalize(listing.category).includes("카페")) return cafeProfile();
  if (category.includes("마사지") || category.includes("스파") || normalize(listing.category).includes("마사지")) return massageProfile();
  if (category.includes("술집") || category.includes("루프탑") || normalize(listing.category).includes("바/루프탑")) return barProfile();
  if (category.includes("가라오케") || category.includes("노래방") || normalize(listing.category).includes("가라오케")) return karaokeProfile();
  if (category.includes("병원") || text.includes("clinic") || text.includes("hospital")) return hospitalProfile();
  if (category.includes("미용") || category.includes("헤어") || text.includes("hair") || text.includes("salon")) return beautyProfile();

  return {
    placeNoun: categoryLabel,
    titleIntent: "방문 전 확인할 때",
    cardIntent: "위치와 후기 신호를 확인할 곳을",
    summaryIntent: "사진, 위치, 후기 정보를",
    context: "처음 방문 전 기본 정보를 빠르게 확인하기 좋습니다.",
    reasons: ["위치와 동선을 먼저 확인할 수 있음", "사진과 후기 신호를 함께 비교할 수 있음", "방문 전 확인할 정보를 한 페이지에서 볼 수 있음"],
    recommendedFor: ["처음 방문 전 정보를 빠르게 보고 싶은 사람", "위치와 영업시간을 먼저 확인하려는 사람", "후기와 사진을 함께 비교하려는 사람"],
    primaryItems: ["위치 확인", "사진 확인", "후기 신호"],
    visitChecklist: ["지도에서 정확한 위치 확인", "영업시간과 휴무일 확인", "최근 사진과 후기 확인"],
  };
}

function restaurantProfile(listing: Listing, text: string): CategoryProfile {
  const trustedText = trustedRestaurantText(listing);

  if (matches(trustedText, ["도야", "doya", "짬뽕", "jjambbong", "jjamppong", "짜장"])) {
    return {
      placeNoun: "중식당",
      titleIntent: "짬뽕이 생각날 때",
      cardIntent: "짬뽕이나 볶음요리를",
      summaryIntent: "짬뽕, 볶음요리, 한국식 중화요리가",
      context: "베트남 음식이 이어지는 일정 중 매콤한 국물이나 익숙한 한 끼가 필요할 때 선택하기 좋습니다.",
      reasons: ["짬뽕이나 볶음 메뉴로 입맛을 바꾸기 좋음", "점심과 저녁 모두 무난한 식사 후보", "여러 메뉴를 나눠 먹기 쉬움"],
      recommendedFor: ["호치민에서 매운 국물이 필요한 사람", "베트남 음식이 잠깐 물린 사람", "1군 근처에서 익숙한 한 끼를 찾는 사람"],
      primaryItems: ["짬뽕", "볶음요리", "한국식 중화요리"],
      visitChecklist: ["피크 시간대 대기 여부 확인", "매운맛과 대표 메뉴 확인", "영업시간과 지도 위치 재확인"],
    };
  }

  if (matches(text, ["딤섬", "dim sum", "dimsum", "cantonese", "광둥", "중식", "chinese", "딤투탁", "kim's", "tan hai van", "tân hải vân"])) {
    return {
      placeNoun: "중식당",
      titleIntent: "중식이나 딤섬이 필요할 때",
      cardIntent: "중식 메뉴나 딤섬을",
      summaryIntent: "중식, 딤섬, 볶음요리 같은 메뉴가",
      context: "여러 메뉴를 나눠 먹거나 현지 음식 사이에 익숙한 중식 계열 식사를 넣고 싶을 때 비교하기 좋습니다.",
      reasons: ["메뉴를 여러 개 시켜 나눠 먹기 좋음", "사진으로 분위기와 메뉴 구성을 먼저 확인하기 쉬움", "점심이나 저녁 식사 후보로 비교하기 좋음"],
      recommendedFor: ["딤섬이나 중식 메뉴가 필요한 사람", "여러 명이 메뉴를 나눠 먹고 싶은 사람", "현지 음식이 아닌 다른 선택지를 찾는 사람"],
      primaryItems: ["중식", "딤섬", "볶음요리"],
      visitChecklist: ["대표 메뉴와 가격대 확인", "피크 시간대 예약 필요 여부 확인", "영업시간과 지도 위치 재확인"],
    };
  }

  if (matches(text, ["korean", "korea", "한식", "한국", "고기", "삼겹", "갈비", "김치", "분식", "bbq"])) {
    return {
      placeNoun: "한식당",
      titleIntent: "한식이 필요할 때",
      cardIntent: "한식이나 익숙한 식사를",
      summaryIntent: "한식, 고기, 익숙한 식사가",
      context: "현지 음식이 이어지는 일정 중 한국인 입맛에 맞는 식사가 필요할 때 보기 좋습니다.",
      reasons: ["한국인이 익숙하게 고를 수 있는 메뉴가 있음", "여행 중 입맛을 회복하기 좋은 선택지", "가족이나 일행과 함께 방문하기 무난함"],
      recommendedFor: ["현지 음식이 물린 여행자", "가족식사나 회식 후보를 찾는 사람", "한식이 필요한 장기 체류자"],
      primaryItems: ["한식 메뉴", "고기 메뉴", "식사 메뉴"],
      visitChecklist: ["대표 메뉴와 가격대 확인", "단체 방문 가능 여부 확인", "영업시간과 예약 필요 여부 확인"],
    };
  }

  if (matches(text, ["seafood", "hai san", "해산물", "새우", "조개", "crab", "랍스터"])) {
    return {
      placeNoun: "해산물 식당",
      titleIntent: "해산물을 먹고 싶을 때",
      cardIntent: "해산물 식사를",
      summaryIntent: "해산물, 저녁식사, 일행과 나눠 먹을 메뉴가",
      context: "여러 메뉴를 나눠 먹는 일정이나 저녁 식사 후보로 비교하기 좋습니다.",
      reasons: ["여럿이 메뉴를 나눠 먹기 좋음", "사진으로 메뉴와 분위기를 먼저 확인하기 쉬움", "여행 동선에 맞춰 저녁 후보로 넣기 좋음"],
      recommendedFor: ["해산물을 먹고 싶은 여행자", "가족이나 일행과 저녁을 먹는 사람", "메뉴 사진을 보고 고르고 싶은 사람"],
      primaryItems: ["해산물", "저녁식사", "나눠 먹는 메뉴"],
      visitChecklist: ["무게 단위와 가격 확인", "피크 시간대 자리 여부 확인", "매운 양념과 조리 방식 확인"],
    };
  }

  return {
    placeNoun: "식당",
    titleIntent: "식사 장소를 고를 때",
    cardIntent: "식사 장소를",
    summaryIntent: "점심, 저녁, 현지 음식 또는 가벼운 식사가",
    context: "사진과 후기 신호를 함께 보며 실패 확률을 줄이고 싶은 사람에게 적합합니다.",
    reasons: ["식사 동선에 넣기 쉬운 후보", "사진과 평점으로 분위기를 먼저 볼 수 있음", "처음 방문 전 기본 정보를 빠르게 확인할 수 있음"],
    recommendedFor: ["식당을 빠르게 골라야 하는 사람", "현지 음식 입문 후보를 찾는 사람", "후기와 사진을 함께 보고 싶은 사람"],
    primaryItems: ["대표 메뉴", "점심 식사", "저녁 식사"],
    visitChecklist: ["피크 시간대 혼잡도 확인", "메뉴 사진과 가격대 확인", "숙소나 관광지와 이동 거리 확인"],
  };
}

function cafeProfile(): CategoryProfile {
  return {
    placeNoun: "카페",
    titleIntent: "커피와 휴식이 필요할 때",
    cardIntent: "커피, 휴식, 작업 공간을",
    summaryIntent: "커피, 디저트, 더운 날 쉬어갈 공간이",
    context: "더운 오후에 쉬거나 일정 사이에 시간을 보내기 좋은 후보입니다.",
    reasons: ["걷는 일정 중간에 쉬어가기 좋음", "사진으로 분위기와 좌석 느낌을 확인하기 쉬움", "비 오는 날이나 더운 오후 대안으로 좋음"],
    recommendedFor: ["더운 오후에 쉬고 싶은 사람", "카페 투어를 하는 여행자", "잠깐 작업하거나 일정을 정리하려는 사람"],
    primaryItems: ["커피", "디저트", "휴식"],
    visitChecklist: ["콘센트와 좌석 분위기 확인", "혼잡 시간대 확인", "사진 목적이면 낮 시간대 확인"],
  };
}

function massageProfile(): CategoryProfile {
  return {
    placeNoun: "마사지샵",
    titleIntent: "마사지샵을 고를 때",
    cardIntent: "마사지나 스파를",
    summaryIntent: "마사지, 스파, 일정 후 휴식이",
    context: "가격표, 팁 포함 여부, 예약 가능 시간처럼 방문 전 확인할 조건이 중요합니다.",
    reasons: ["여행 일정 후 피로를 풀기 좋은 후보", "가격대와 위치를 함께 확인할 수 있음", "방문 전 예약과 추가 비용을 체크하기 좋음"],
    recommendedFor: ["관광 후 피로를 풀고 싶은 사람", "숙소 근처 마사지샵을 찾는 사람", "가격과 팁 포함 여부를 먼저 확인하려는 사람"],
    primaryItems: ["기본 마사지", "스파 프로그램", "예약 확인"],
    visitChecklist: ["가격표와 팁 포함 여부 확인", "예약 가능 시간 확인", "샤워 가능 여부와 귀가 동선 확인"],
  };
}

function barProfile(): CategoryProfile {
  return {
    placeNoun: "술집",
    titleIntent: "저녁 동선을 정할 때",
    cardIntent: "루프탑바, 펍, 가볍게 한잔할 곳을",
    summaryIntent: "루프탑바, 펍, 맥주나 칵테일 한잔할 장소가",
    context: "여행 동선과 귀가 동선, 가격대, 분위기, 영업시간을 함께 확인하는 것이 중요합니다.",
    reasons: ["저녁 일정에 넣기 쉬운 후보", "위치와 분위기를 사진으로 먼저 확인할 수 있음", "영업시간과 귀가 동선을 함께 보기 좋음"],
    recommendedFor: ["저녁에 가볍게 한잔할 곳을 찾는 사람", "루프탑바나 펍을 비교하는 여행자", "위치와 분위기를 먼저 확인하려는 사람"],
    primaryItems: ["루프탑바", "맥주", "칵테일"],
    visitChecklist: ["영업시간과 라스트오더 확인", "총액 기준 가격과 서비스 차지 확인", "귀가 동선과 예약 필요 여부 확인"],
  };
}

function karaokeProfile(): CategoryProfile {
  return {
    placeNoun: "가라오케",
    titleIntent: "노래방과 단체 모임 장소를 확인할 때",
    cardIntent: "노래방, 회식, 단체 모임 장소를",
    summaryIntent: "예약, 영업시간, 인원 기준, 한국 노래 지원 여부가",
    context: "정보성 카테고리로 운영하며 방문 전 가격 구조, 예약 조건, 귀가 동선을 확인하는 데 초점을 둡니다.",
    reasons: ["인원수와 룸 기준을 먼저 비교할 수 있음", "한국 노래 지원 여부를 확인하기 좋음", "위치와 귀가 동선을 함께 볼 수 있음"],
    recommendedFor: ["일행과 노래방을 찾는 사람", "회식이나 단체 모임 장소를 비교하는 사람", "총액 기준 가격을 먼저 확인하려는 사람"],
    primaryItems: ["노래방", "단체 모임", "예약 확인"],
    visitChecklist: ["룸 가격과 시간 기준 확인", "음료와 안주 포함 여부 확인", "결제 방식과 귀가 동선 확인"],
  };
}

function hospitalProfile(): CategoryProfile {
  return {
    placeNoun: "병원",
    titleIntent: "진료 가능 여부를 확인할 때",
    cardIntent: "진료과목과 위치를",
    summaryIntent: "진료과목, 언어 응대, 예약 가능 여부 확인이",
    context: "의료 정보는 바뀔 수 있으므로 방문 전 전화 확인이 특히 중요합니다.",
    reasons: ["진료 위치와 연락처를 빠르게 확인할 수 있음", "방문 전 예약과 언어 응대 가능 여부를 체크하기 좋음", "보험·서류 확인이 필요한 상황에 대비할 수 있음"],
    recommendedFor: ["한국어 또는 영어 응대가 필요한 사람", "진료과목을 먼저 확인하려는 사람", "예약과 보험 가능 여부를 확인해야 하는 사람"],
    primaryItems: ["진료과목", "예약 확인", "언어 응대"],
    visitChecklist: ["방문 전 전화 예약", "보험 가능 여부와 필요 서류 확인", "응급 여부와 운영시간 확인"],
  };
}

function beautyProfile(): CategoryProfile {
  return {
    placeNoun: "미용실",
    titleIntent: "시술 전 사진을 확인할 때",
    cardIntent: "커트, 염색, 펌 상담을",
    summaryIntent: "커트, 염색, 펌 같은 시술 상담이",
    context: "시술 결과는 사진과 상담 방식이 중요하므로 방문 전 포트폴리오 확인이 필요합니다.",
    reasons: ["시술 사진과 분위기를 먼저 확인할 수 있음", "한국인 기준 상담 가능성을 비교하기 좋음", "예약 전 가격대와 원하는 스타일을 정리하기 좋음"],
    recommendedFor: ["한국식 스타일 상담이 필요한 사람", "시술 사진을 보고 고르고 싶은 사람", "커트나 염색 전 가격대를 확인하려는 사람"],
    primaryItems: ["커트", "염색", "스타일 상담"],
    visitChecklist: ["원하는 스타일 사진 준비", "예약 가능 시간 확인", "시술 가격과 소요 시간 확인"],
  };
}

function getEvidenceReasons(listing: Listing) {
  const reasons: string[] = [];
  if (listing.photoTotal > 0) reasons.push(`사진 ${listing.photoTotal}장으로 분위기를 먼저 확인할 수 있음`);
  if (listing.rating) reasons.push(`평점 ${listing.rating.toFixed(1)}점을 참고해 후보를 비교할 수 있음`);
  if (listing.reviewTotal > 0) reasons.push(`후기 신호 ${listing.reviewTotal}개를 기준으로 기대치를 잡을 수 있음`);
  if (listing.openingHoursText?.length) reasons.push("영업시간 정보가 있어 방문 전 재확인하기 쉬움");
  return reasons;
}

function getFactChecklist(listing: Listing) {
  const location = getLocation(listing);
  return [
    `지도에서 ${location.area} 위치와 이동 동선 확인`,
    listing.openingHoursText?.[0] ? `현재 확인된 영업시간: ${listing.openingHoursText[0]}` : "영업시간은 방문 전 전화 또는 지도 링크로 확인",
    listing.priceLevel ? `가격대는 ${listing.priceLevel}로 표시되어 있으나 실제 메뉴별 금액 확인` : "가격 정보는 메뉴판 사진이나 연락처로 확인",
  ];
}

function getDataTags(listing: Listing) {
  return (listing.tags ?? []).filter((tag) => !/지도추천|지역대표|망고단추천|고평점|리뷰|후기/.test(tag)).slice(0, 3);
}

function getLocation(listing: Listing) {
  const area = getAreaLabel(listing);
  const titleArea = listing.area ? `${listing.city} ${compactArea(listing.area)}` : listing.city;
  return { area, titleArea };
}

function getAreaLabel(listing: Listing) {
  return listing.area || listing.address || listing.city;
}

function compactArea(area: string) {
  if (area.includes("Bui Thi Xuan") && area.includes("1군")) return "1군";
  return area;
}

function matches(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalize(keyword)));
}

function normalize(value: string) {
  return value.normalize("NFC").toLowerCase();
}

function trustedRestaurantText(listing: Listing) {
  return normalize([listing.name, listing.city, listing.area, listing.address, listing.category, ...(listing.tags ?? [])].filter(Boolean).join(" "));
}

function stripKoreanParticle(value: string) {
  return value.replace(/[이가을를]$/, "");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
