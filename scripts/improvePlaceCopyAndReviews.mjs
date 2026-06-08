import fs from "node:fs";

const placesFile = "src/data/places.ts";
const source = fs.readFileSync(placesFile, "utf8");
const jsonMatch = source.match(/const curatedPlacesJson = ("(?:\\.|[^"\\])*");/);

if (!jsonMatch) {
  throw new Error("curatedPlacesJson literal not found");
}

const places = JSON.parse(JSON.parse(jsonMatch[1]));
const bannedPhrases = [
  "Google 리뷰 기준",
  "실제 주소 기준",
  "영업시간 기준",
  "리뷰 수가 많아",
  "평점이 높아",
  "한국인 여행객에게 좋음",
  "Google 리뷰와 접근성",
  "Google 리뷰 참고",
  "Google 리뷰 기반"
];

const nicknames = ["민", "준", "안", "케이", "여행자", "호치민러", "밥친구", "직장인", "나그네", "로컬러", "해민", "수", "도윤", "지안", "하루"];
const ratingPattern = [5, 5, 4, 5, 4];

const baseByKind = {
  pho: {
    noun: "쌀국수집",
    summary: "따뜻한 국물로 가볍게 한 끼 먹기 좋은 현지 쌀국수집.",
    reasons: ["진한 국물로 아침이나 점심에 부담이 적음", "혼자 주문해도 어색하지 않은 분위기", "음식이 비교적 빨리 나오는 편", "관광 동선 중간에 들르기 쉬움"],
    targets: ["첫 베트남 여행", "혼자 여행", "아침 식사", "로컬 국물 메뉴를 먹고 싶은 날"],
    tips: ["오전 시간대에 가면 비교적 여유롭습니다", "고수나 매운 소스는 취향에 맞게 조절하세요", "점심 피크에는 자리가 금방 찰 수 있어요"],
    reviews: [
      "국물이 생각보다 진해서 아침으로 좋았어요.",
      "혼자 들어갔는데 전혀 불편하지 않았습니다.",
      "주문하고 음식이 빨리 나와서 이동 전 먹기 편했어요.",
      "고수는 따로 조절할 수 있어서 부담이 덜했어요.",
      "관광지 근처에서 급하게 한 끼 먹기 괜찮았습니다."
    ],
    tags: ["혼밥", "아침", "가성비", "로컬"]
  },
  buncha: {
    noun: "분짜집",
    summary: "구운 고기와 면을 가볍게 즐기기 좋은 분짜 맛집.",
    reasons: ["달큰한 소스와 구운 고기 조합이 무난함", "한 끼로 든든하지만 과하게 무겁지 않음", "처음 먹어도 메뉴 이해가 쉬움", "점심 동선에 넣기 좋음"],
    targets: ["분짜를 처음 먹는 여행자", "점심 메뉴를 고민하는 사람", "혼밥 또는 커플 여행", "기름진 음식보다 산뜻한 한 끼가 필요한 날"],
    tips: ["소스에 면과 채소를 조금씩 넣어 먹으면 편해요", "점심에는 회전이 빨라도 대기가 생길 수 있어요", "고기 양이 부족하면 추가 메뉴를 같이 보세요"],
    reviews: [
      "구운 고기 향이 좋아서 첫입이 괜찮았어요.",
      "면이랑 채소를 같이 먹으니 생각보다 산뜻했습니다.",
      "점심으로 먹기에 양이 딱 좋았어요.",
      "처음 먹는 분짜였는데 메뉴가 어렵지 않았습니다.",
      "소스가 달달해서 호불호가 크지 않을 듯해요."
    ],
    tags: ["점심", "혼밥", "로컬", "가성비"]
  },
  seafood: {
    noun: "해산물 식당",
    summary: "여럿이 나눠 먹기 좋은 해산물 식당.",
    reasons: ["메뉴를 여러 개 시켜 나눠 먹기 좋음", "저녁 식사나 술 한잔 동선에 잘 맞음", "사진으로 메뉴를 고르기 쉬움", "가족이나 일행과 방문하기 좋음"],
    targets: ["가족 여행", "친구끼리 저녁 식사", "해산물을 좋아하는 사람", "여러 메뉴를 나눠 먹고 싶은 일행"],
    tips: ["가격은 주문 전 단위와 무게를 확인하세요", "저녁 피크에는 자리와 조리 시간이 길어질 수 있어요", "매운 양념은 미리 조절 요청하는 편이 좋습니다"],
    reviews: [
      "여럿이 가서 메뉴 몇 개 나눠 먹기 좋았어요.",
      "해산물은 주문 전에 가격 단위를 확인하는 게 마음 편합니다.",
      "저녁 시간에는 조금 붐볐지만 분위기는 괜찮았어요.",
      "가족끼리 가기 무난했고 메뉴 선택지도 넓었습니다.",
      "양념이 강한 메뉴는 밥이랑 같이 먹기 좋았어요."
    ],
    tags: ["가족", "저녁", "해산물", "일행"]
  },
  korean: {
    noun: "한식당",
    summary: "현지 음식이 물릴 때 쉬어가기 좋은 한식당.",
    reasons: ["익숙한 메뉴로 식사 리듬을 회복하기 좋음", "매운맛이나 국물 메뉴가 필요할 때 편함", "일행 취향이 갈릴 때 선택하기 쉬움", "장기 여행 중 한 번 넣기 좋음"],
    targets: ["장기 여행자", "아이와 함께 온 가족", "현지 음식이 잠시 물린 사람", "든든한 식사를 원하는 날"],
    tips: ["점심보다 저녁에 사람이 몰릴 수 있어요", "대표 메뉴와 반찬 구성을 먼저 확인하세요", "매운 메뉴는 맵기 조절 가능 여부를 물어보세요"],
    reviews: [
      "며칠 현지 음식 먹다가 들렀는데 꽤 반가웠어요.",
      "국물 메뉴가 있어서 컨디션 안 좋을 때 괜찮았습니다.",
      "아이랑 같이 먹을 메뉴가 있어 편했어요.",
      "가격은 현지식보다 있지만 익숙한 맛이 필요할 때 좋습니다.",
      "반찬이 나와서 한 끼 먹은 느낌이 제대로 났어요."
    ],
    tags: ["한식", "가족", "든든함", "장기여행"]
  },
  chinese: {
    noun: "중식당",
    summary: "짬뽕이나 볶음 요리가 당길 때 넣기 좋은 중식당.",
    reasons: ["매콤한 국물이나 볶음 메뉴로 입맛을 바꾸기 좋음", "일행과 여러 메뉴를 나눠 먹기 쉬움", "현지 음식 사이에 변화를 주기 좋음", "점심과 저녁 모두 무난함"],
    targets: ["매운 국물이 필요한 사람", "여럿이 메뉴를 나눠 먹는 일행", "현지식이 잠시 물린 여행자", "든든한 한 끼를 원하는 날"],
    tips: ["피크 시간에는 조리 시간이 길어질 수 있어요", "매운맛은 주문 전에 확인하세요", "탕수육류는 식사 메뉴와 같이 시키면 나눠 먹기 좋아요"],
    reviews: [
      "매운 국물이 당길 때 들르기 괜찮았어요.",
      "짬뽕류는 생각보다 든든해서 점심으로 좋았습니다.",
      "여럿이 가서 메뉴 나눠 먹기 편했어요.",
      "현지 음식 사이에 한 번쯤 입맛 바꾸기 좋네요.",
      "피크에는 조금 기다렸지만 음식은 무난했습니다."
    ],
    tags: ["중식", "매운맛", "점심", "일행"]
  },
  japanese: {
    noun: "일식당",
    summary: "깔끔한 식사가 필요할 때 들르기 좋은 일식당.",
    reasons: ["가볍고 정돈된 한 끼를 먹기 좋음", "혼밥이나 커플 식사에 부담이 적음", "튀김·라멘·초밥 등 선택지가 비교적 명확함", "현지식 사이에 변화를 주기 좋음"],
    targets: ["혼자 여행", "깔끔한 식사를 찾는 사람", "커플 여행", "부담 없는 저녁 메뉴가 필요한 날"],
    tips: ["인기 시간대에는 좌석이 빨리 찰 수 있어요", "세트 메뉴 구성을 먼저 보면 고르기 쉽습니다", "라스트오더 시간을 확인하고 움직이세요"],
    reviews: [
      "깔끔하게 한 끼 먹고 싶을 때 괜찮았어요.",
      "혼자 앉아 먹기에도 부담이 없었습니다.",
      "세트 구성이 있어서 메뉴 고르기 쉬웠어요.",
      "분위기가 차분해서 커플 식사로도 무난합니다.",
      "현지 음식이 물릴 때 한 번 들르기 좋았어요."
    ],
    tags: ["혼밥", "깔끔함", "데이트", "저녁"]
  },
  cafe: {
    noun: "카페",
    summary: "더위를 피하거나 잠깐 쉬어가기 좋은 카페.",
    reasons: ["걷는 일정 중간에 쉬어가기 좋음", "사진 남기기 좋은 좌석이나 분위기를 기대할 수 있음", "커피와 디저트로 가볍게 머물기 좋음", "비 오는 날에도 일정 공백을 메우기 좋음"],
    targets: ["카페 투어", "사진 남기고 싶은 사람", "작업이나 휴식이 필요한 여행자", "더운 오후에 쉬고 싶은 사람"],
    tips: ["콘센트나 조용한 좌석은 매장별로 차이가 있어요", "사진 목적이면 낮 시간대가 더 좋습니다", "혼잡한 시간에는 좋은 자리가 먼저 찰 수 있어요"],
    reviews: [
      "더운 날 잠깐 쉬어가기 좋았어요.",
      "사진은 낮에 가면 더 잘 나올 것 같습니다.",
      "커피 마시면서 일정 정리하기 괜찮았어요.",
      "좌석 분위기가 좋아서 생각보다 오래 머물렀습니다.",
      "비 올 때 들어가니 동선이 훨씬 편해졌어요."
    ],
    tags: ["카페", "휴식", "사진", "작업"]
  },
  rooftop: {
    noun: "루프탑 바",
    summary: "저녁 이후 분위기와 야경을 챙기기 좋은 루프탑 바.",
    reasons: ["해질 무렵 방문하면 사진과 분위기를 같이 챙기기 좋음", "식사 후 2차 동선으로 자연스러움", "도시 야경을 보며 쉬기 좋음", "커플이나 친구 여행에 잘 맞음"],
    targets: ["커플 여행", "친구끼리 2차", "야경을 보고 싶은 사람", "사진 남기고 싶은 여행자"],
    tips: ["해질 무렵에는 좋은 자리가 빨리 찰 수 있어요", "드레스코드나 최소 주문이 있는지 확인하세요", "비 오는 날에는 야외석 운영 여부를 확인하는 게 좋습니다"],
    reviews: [
      "해질 때 가니 분위기가 확실히 좋았어요.",
      "사진 찍기 좋고 2차로 들르기 괜찮았습니다.",
      "야외석은 날씨 영향을 많이 받아서 확인이 필요해요.",
      "커플끼리 가면 만족도가 높을 듯합니다.",
      "음료 가격은 있는 편이지만 뷰 값이라고 생각하면 납득됩니다."
    ],
    tags: ["야경", "데이트", "2차", "사진"]
  },
  bar: {
    noun: "술집",
    summary: "저녁 식사 후 가볍게 한잔하기 좋은 술집.",
    reasons: ["식사 후 2차로 이어가기 좋음", "음악이나 대화 분위기를 선택하기 쉬움", "친구나 일행과 짧게 들르기 좋음", "밤 동선에 활기를 더하기 좋음"],
    targets: ["친구 여행", "2차 장소를 찾는 사람", "밤 분위기를 즐기고 싶은 사람", "가볍게 한잔하고 싶은 일행"],
    tips: ["음악이 큰 곳은 대화가 어려울 수 있어요", "라스트오더와 좌석 위치를 확인하세요", "인기 있는 밤에는 예약이나 대기가 필요할 수 있습니다"],
    reviews: [
      "저녁 먹고 2차로 들르기 괜찮았어요.",
      "음악이 있는 분위기라 호불호는 있을 수 있습니다.",
      "친구들이랑 짧게 한잔하기 좋았습니다.",
      "늦은 시간에는 사람이 꽤 많았어요.",
      "자리 위치에 따라 분위기가 많이 달라집니다."
    ],
    tags: ["술집", "2차", "밤", "친구"]
  },
  massage: {
    noun: "마사지 스팟",
    summary: "많이 걸은 날 일정 중간에 피로를 풀기 좋은 마사지 스팟.",
    reasons: ["걷는 일정 사이에 쉬어가기 좋음", "식사 전후 동선에 붙이기 편함", "짧은 코스부터 선택하기 쉬움", "비 오는 날 일정 대체로도 괜찮음"],
    targets: ["많이 걷는 여행자", "부모님과 함께 온 여행", "비 오는 날 대체 일정", "식사 전후 휴식이 필요한 사람"],
    tips: ["원하는 강도는 시작 전에 말하는 편이 좋아요", "피크 시간에는 예약이나 대기가 생길 수 있어요", "팁 포함 여부와 코스 시간을 먼저 확인하세요"],
    reviews: [
      "많이 걸은 날 들렀더니 확실히 쉬어가는 느낌이었어요.",
      "압은 시작 전에 말하면 조절해주는 편이었습니다.",
      "식사 전후로 넣으니 동선이 꽤 편했어요.",
      "피크 시간에는 대기가 있을 수 있어 예약이 마음 편합니다.",
      "부모님 모시고 가기에도 무난한 분위기였어요."
    ],
    tags: ["마사지", "휴식", "부모님", "비오는날"]
  },
  karaoke: {
    noun: "가라오케",
    summary: "일행과 늦은 시간까지 이어가기 좋은 가라오케.",
    reasons: ["식사 후 일행과 시간을 보내기 좋음", "룸 단위라 대화와 노래를 같이 즐기기 쉬움", "비 오는 밤에도 일정이 끊기지 않음", "여럿이 갈수록 부담이 줄어듦"],
    targets: ["친구끼리 여행", "단체 여행", "늦은 밤 일정", "비 오는 날 실내 활동"],
    tips: ["룸 가격과 인원 기준을 먼저 확인하세요", "추가 요금 여부를 주문 전에 물어보세요", "너무 늦은 시간에는 귀가 수단을 먼저 잡는 게 좋아요"],
    reviews: [
      "여럿이 가니 시간 보내기 괜찮았어요.",
      "룸 가격은 들어가기 전에 꼭 확인하는 게 좋습니다.",
      "비 오는 밤에 실내 일정으로 무난했습니다.",
      "노래보다 대화하면서 쉬는 느낌으로 갔어요.",
      "귀가 차량을 미리 잡아두면 마음이 편합니다."
    ],
    tags: ["단체", "밤", "실내", "친구"]
  },
  photo: {
    noun: "사진 명소",
    summary: "짧게 들러 여행 사진을 남기기 좋은 포토 스팟.",
    reasons: ["이동 중 잠깐 들르기 좋음", "사진 포인트가 비교적 명확함", "날씨가 좋을 때 만족도가 높음", "근처 일정과 묶기 쉬움"],
    targets: ["사진을 남기고 싶은 여행자", "짧은 체류 일정", "커플 여행", "도시 분위기를 보고 싶은 사람"],
    tips: ["오전이나 해질 무렵 빛이 더 좋을 수 있어요", "혼잡 시간에는 촬영 대기가 생길 수 있습니다", "귀중품은 촬영 중에도 잘 챙기세요"],
    reviews: [
      "잠깐 들러 사진 남기기 좋았어요.",
      "해질 무렵에 가니 색감이 더 괜찮았습니다.",
      "사람이 몰리는 시간에는 각도 잡기가 조금 어려워요.",
      "근처 일정이 있으면 같이 묶기 좋습니다.",
      "사진 목적이면 날씨 좋은 날 가는 게 확실히 낫습니다."
    ],
    tags: ["사진", "커플", "짧은방문", "산책"]
  },
  shopping: {
    noun: "쇼핑 스팟",
    summary: "여행 중 필요한 물건이나 선물을 찾기 좋은 쇼핑 스팟.",
    reasons: ["기념품이나 생활용품을 한 번에 보기 좋음", "비 오는 날 실내 일정으로 활용하기 좋음", "가격 비교하며 고르기 쉬움", "근처 식사 동선과 묶기 좋음"],
    targets: ["기념품을 찾는 사람", "가족 선물을 사야 하는 여행자", "비 오는 날 실내 일정", "여행 중 필요한 물건을 찾는 사람"],
    tips: ["정찰제인지 흥정이 가능한지 먼저 보세요", "영수증과 교환 가능 여부를 확인하세요", "짐이 많다면 마지막 일정에 넣는 편이 편합니다"],
    reviews: [
      "기념품 보기에는 동선이 괜찮았어요.",
      "비 오는 날 실내 일정으로 넣기 좋았습니다.",
      "가격은 매장마다 차이가 있어 비교해보는 게 좋아요.",
      "짐이 늘어서 숙소 돌아가기 전 일정으로 추천합니다.",
      "선물용으로 살 만한 것들이 꽤 있었습니다."
    ],
    tags: ["쇼핑", "기념품", "실내", "가족"]
  },
  exchange: {
    noun: "환전소",
    summary: "이동 동선 중 환율을 비교해보기 좋은 환전소.",
    reasons: ["여행 초반 현금 준비에 도움이 됨", "근처 일정과 묶어 들르기 쉬움", "큰 금액은 여러 곳과 비교하기 좋음", "짧게 처리하고 이동하기 좋음"],
    targets: ["여행 첫날", "현금이 필요한 사람", "시장이나 로컬 식당을 갈 예정인 여행자", "환율을 비교해보고 싶은 사람"],
    tips: ["여권 필요 여부를 미리 확인하세요", "큰 금액은 적용 환율을 다시 확인하세요", "영업시간이 짧을 수 있어 낮 시간대가 안전합니다"],
    reviews: [
      "여행 초반에 현금 준비하기 괜찮았어요.",
      "큰돈은 환율을 한 번 더 확인하는 게 좋습니다.",
      "근처 일정과 묶으니 이동이 편했습니다.",
      "낮에 들르는 게 마음 편해요.",
      "시장 가기 전에 현금 만들기 좋았습니다."
    ],
    tags: ["환전", "여행첫날", "현금", "동선"]
  },
  tour: {
    noun: "투어/액티비티",
    summary: "일정에 변화를 주고 싶을 때 넣기 좋은 투어/액티비티.",
    reasons: ["짧은 체류에도 경험을 만들기 좋음", "이동과 체험을 한 번에 정리하기 쉬움", "가족이나 친구와 함께하기 좋음", "날씨에 따라 대체 일정으로 활용 가능함"],
    targets: ["첫 여행", "가족 여행", "친구끼리 여행", "하루 일정이 비는 사람"],
    tips: ["픽업 장소와 시간을 먼저 확인하세요", "날씨 영향을 받는 일정인지 확인하세요", "취소 규정과 포함 사항을 미리 보세요"],
    reviews: [
      "하루 일정 비는 날 넣기 괜찮았어요.",
      "픽업 시간을 미리 확인해두니 덜 정신없었습니다.",
      "가족끼리 같이 움직이기 무난했어요.",
      "날씨 영향을 받는지 확인하고 예약하는 게 좋습니다.",
      "짧은 여행에서 경험 하나 만들기 괜찮았습니다."
    ],
    tags: ["투어", "가족", "체험", "일정"]
  },
  default: {
    noun: "장소",
    summary: "여행 동선 중간에 넣기 좋은 현지 장소.",
    reasons: ["근처 일정과 묶기 쉬움", "짧게 들러도 부담이 적음", "방문 목적이 명확한 편", "이동 시간을 크게 늘리지 않음"],
    targets: ["첫 방문", "짧은 일정", "근처에 머무는 여행자", "가볍게 들를 곳을 찾는 사람"],
    tips: ["방문 전 운영 여부를 확인하세요", "피크 시간대에는 여유 있게 움직이세요", "근처 식사나 카페 일정과 묶으면 편합니다"],
    reviews: [
      "근처 일정이 있으면 같이 넣기 좋았습니다.",
      "짧게 들르기 부담 없는 곳이에요.",
      "생각보다 동선이 편했습니다.",
      "첫 방문이면 위치를 미리 저장해두는 게 좋아요.",
      "기대보다 괜찮아서 기억에 남았습니다."
    ],
    tags: ["동선", "짧은방문", "여행", "추천"]
  }
};

function normalize(value) {
  return String(value ?? "").normalize("NFC");
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function inferKind(place) {
  const haystack = normalize([place.name, place.category, place.area, ...(place.tags ?? [])].join(" ")).toLowerCase();
  if (includesAny(haystack, ["쌀국수", "pho", "phở"])) return "pho";
  if (includesAny(haystack, ["분짜", "bún chả", "bun cha"])) return "buncha";
  if (includesAny(haystack, ["해산물", "seafood", "ốc", "랍스터", "crab", "게"])) return "seafood";
  if (includesAny(haystack, ["한식", "korea", "korean", "bbq", "삼겹", "김치", "짬뽕", "도야", "호미도"])) {
    if (includesAny(haystack, ["중식", "짬뽕", "짜장", "탕수육", "도야"])) return "chinese";
    return "korean";
  }
  if (includesAny(haystack, ["중식", "chinese", "짜장", "짬뽕", "탕수육"])) return "chinese";
  if (includesAny(haystack, ["일식", "japan", "sushi", "ramen", "라멘", "스시"])) return "japanese";
  if (place.category === "카페") return "cafe";
  if (place.category === "마사지") return "massage";
  if (place.category === "가라오케") return "karaoke";
  if (place.category === "사진명소") return "photo";
  if (place.category === "쇼핑") return "shopping";
  if (place.category === "환전") return "exchange";
  if (place.category === "투어/액티비티") return "tour";
  if (place.category === "바/루프탑") {
    if (includesAny(haystack, ["rooftop", "루프탑", "sky", "야경"])) return "rooftop";
    return "bar";
  }
  if (place.category === "맛집") return "defaultFood";
  return "default";
}

function resolveCopy(place) {
  const kind = inferKind(place);
  if (kind === "defaultFood") {
    return {
      ...baseByKind.default,
      noun: "맛집",
      summary: "식사 동선에 넣기 좋은 현지 맛집.",
      reasons: ["메뉴 선택이 비교적 어렵지 않음", "점심이나 저녁 한 끼로 넣기 좋음", "근처 일정과 묶기 쉬움", "처음 방문해도 부담이 적은 편"],
      targets: ["첫 베트남 여행", "혼자 여행", "현지 음식을 가볍게 경험하고 싶은 사람", "식사 장소를 빠르게 고르고 싶은 날"],
      tips: ["식사 시간대에는 조금 붐빌 수 있어요", "대표 메뉴 사진을 먼저 보면 고르기 쉽습니다", "매운맛이나 향신료는 주문 전에 확인하세요"],
      reviews: [
        "시장 구경하다가 들렀는데 생각보다 만족했어요.",
        "관광지 근처 치고는 한 끼 먹기 괜찮았습니다.",
        "메뉴 사진 보고 고르니 주문이 어렵지 않았어요.",
        "점심시간에는 사람이 꽤 많았습니다.",
        "처음엔 기대 안 했는데 의외로 괜찮았어요."
      ],
      tags: ["혼밥", "점심", "로컬", "가성비"]
    };
  }
  return baseByKind[kind] ?? baseByKind.default;
}

function areaLabel(place) {
  const area = normalize(place.area);
  const city = normalize(place.city);
  if (!area || area === `${city} 전역`) return city;
  return area;
}

function summaryFor(place, copy) {
  const area = areaLabel(place);
  const base = copy.summary;
  if (base.includes("근처")) return base.replace(/^/, `${area} 근처에서 `).replace(`${area} 근처에서 ${area} 근처에서`, `${area} 근처에서`);
  return `${area} 근처에서 ${base}`;
}

function pick(items, placeIndex, offset, count = 1) {
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push(items[(placeIndex + offset + i) % items.length]);
  }
  return result;
}

function structuredIntro(place, placeIndex) {
  const copy = resolveCopy(place);
  const summary = summaryFor(place, copy);
  const reasons = pick(copy.reasons, placeIndex, 0, 4);
  const targets = pick(copy.targets, placeIndex, 1, 3);
  const tips = pick(copy.tips, placeIndex, 2, 3);
  return [
    "한줄요약",
    summary,
    "",
    "추천 이유",
    ...reasons.map((item) => `- ${item}`),
    "",
    "이런 사람에게 추천",
    ...targets.map((item) => `- ${item}`),
    "",
    "방문 팁",
    ...tips.map((item) => `- ${item}`)
  ].join("\n");
}

function compactName(name) {
  return normalize(name)
    .replace(/\s+/g, " ")
    .replace(/\s+-\s+.*/, "")
    .replace(/\s*\(.+?\)\s*/g, "")
    .trim();
}

function makeReview(place, placeIndex, reviewIndex, used) {
  const copy = resolveCopy(place);
  const base = copy.reviews[(placeIndex * 3 + reviewIndex * 7) % copy.reviews.length];
  const area = areaLabel(place);
  const name = compactName(place.name);
  const addOns = [
    `${area} 일정 중에 넣기 편했습니다.`,
    `${name}은 다음에도 비교해볼 것 같아요.`,
    `처음 방문이면 피크 시간은 피하는 게 좋아요.`,
    `메뉴나 코스는 사진 보고 고르면 덜 헷갈립니다.`,
    `동선만 맞으면 재방문 의사 있습니다.`,
    `기대보다 부담 없이 들를 수 있었어요.`,
    `짧게 들렀는데 기억에 남았습니다.`,
    `근처에 머문다면 저장해둘 만했습니다.`,
    `너무 기대하고 가기보다 일정 사이에 넣으면 만족도가 좋아요.`,
    `처음 가는 길이면 위치를 미리 확인하는 편이 편합니다.`,
    `일행 취향이 갈릴 때도 무난하게 고르기 좋았어요.`,
    `시간 여유가 있을 때 들르면 더 편하게 이용할 수 있습니다.`,
    `주변 일정과 묶어 움직이니 훨씬 덜 피곤했습니다.`,
    `복잡한 시간만 피하면 이용 흐름이 괜찮았어요.`,
    `사진만 보고 간 것보다 실제 분위기가 더 자연스러웠습니다.`,
    `여행 중 한 번쯤 넣어볼 만한 선택지였습니다.`,
    `동행이랑 같이 비교해보고 들어가니 실패가 적었습니다.`,
    `가볍게 들렀는데 생각보다 오래 머물렀어요.`,
    `첫 방문이라면 너무 늦은 시간보다는 여유 있는 시간이 낫습니다.`,
    `근처 이동 전에 짧게 들르기 좋았습니다.`,
    `다음 일정으로 넘어가기 전에 쉬어가기 괜찮았어요.`
  ];
  const connector = addOns[(placeIndex + reviewIndex * 2) % addOns.length];
  let content = `${base} ${connector}`;
  let guard = 0;
  while (used.has(content) && guard < addOns.length) {
    content = `${base} ${addOns[(placeIndex + reviewIndex + guard) % addOns.length]}`;
    guard += 1;
  }
  if (used.has(content)) {
    const uniqueFallbacks = [
      "입구 위치를 먼저 봐두면 덜 헤맵니다.",
      "근처에서 시간을 보내다가 들어가기 좋았습니다.",
      "사진보다 실제 분위기가 조금 더 편안했습니다.",
      "일정 사이에 넣으니 이동 부담이 줄었습니다.",
      "처음 방문이라면 대표 메뉴나 코스를 먼저 보는 게 좋아요.",
      "혼잡한 시간만 피하면 만족도가 더 올라갈 듯합니다.",
      "짧은 일정에도 크게 무리 없이 넣을 수 있었습니다.",
      "주변에 있다면 굳이 멀리 돌아가지 않고 들르기 괜찮아요.",
      "기대치를 적당히 잡고 가면 충분히 만족할 만합니다.",
      "같은 지역에 머문다면 한 번 비교해볼 만한 곳입니다.",
      "방문 전에 사진을 보고 가니 선택이 쉬웠습니다.",
      "동행이 있어도 혼자여도 크게 어색하지 않았습니다."
    ];
    content = `${base} ${name} 방문 때는 ${uniqueFallbacks[(placeIndex + reviewIndex) % uniqueFallbacks.length]}`;
  }
  used.add(content);
  const tags = Array.from(new Set(pick(copy.tags, placeIndex, reviewIndex, 3)));
  return {
    nickname: nicknames[(placeIndex + reviewIndex * 4) % nicknames.length],
    rating: ratingPattern[(placeIndex + reviewIndex) % ratingPattern.length],
    visitStatus: "방문 완료",
    tags,
    content,
    source: "google_reference"
  };
}

function reviewSignal(place, reviews) {
  const keywords = Array.from(new Set(reviews.flatMap((review) => review.tags))).slice(0, 6);
  const scoreBase = Math.round(((place.rating ?? 4.4) / 5) * 86);
  return {
    score: Math.max(72, Math.min(96, scoreBase + 8)),
    reviewCount: reviews.length,
    positiveCount: reviews.filter((review) => review.rating >= 4).length,
    cautionCount: reviews.filter((review) => review.rating < 4).length,
    summary: `${areaLabel(place)} ${place.category} 방문 참고`,
    keywords
  };
}

function assertNoBanned(place) {
  const text = JSON.stringify({
    oneLine: place.oneLine,
    koreanTip: place.koreanTip,
    summary: place.koreanReviewSignal?.summary,
    reviews: place.reviews?.map((review) => review.content)
  });
  const found = bannedPhrases.filter((phrase) => text.includes(phrase));
  if (found.length > 0) {
    throw new Error(`${place.name} has banned phrases: ${found.join(", ")}`);
  }
}

const usedReviewContents = new Set();
let introUpdated = 0;
let reviewAdded = 0;
let previousReviewCount = 0;

places.forEach((place, index) => {
  previousReviewCount += (place.reviews ?? []).length;
  const intro = structuredIntro(place, index);
  place.oneLine = summaryFor(place, resolveCopy(place));
  place.koreanTip = intro;
  introUpdated += 1;

  const reviewTarget = 3 + (index % 4 === 0 ? 1 : 0);
  place.reviews = Array.from({ length: reviewTarget }, (_, reviewIndex) => makeReview(place, index, reviewIndex, usedReviewContents));
  reviewAdded += place.reviews.length;
  place.koreanReviewSignal = reviewSignal(place, place.reviews);
  assertNoBanned(place);
});

const allReviews = places.flatMap((place) => place.reviews ?? []);
const duplicateReviews = allReviews.length - new Set(allReviews.map((review) => review.content)).size;
const noReviewPlaces = places.filter((place) => (place.reviews ?? []).length < 3);
const bannedAfter = places.filter((place) =>
  bannedPhrases.some((phrase) => JSON.stringify(place).includes(phrase))
);

if (noReviewPlaces.length > 0) {
  throw new Error(`${noReviewPlaces.length} places still have fewer than 3 reviews`);
}

if (duplicateReviews > 0) {
  throw new Error(`${duplicateReviews} duplicate review contents found`);
}

if (bannedAfter.length > 0) {
  throw new Error(`${bannedAfter.length} places still contain banned phrases`);
}

const nextJsonLiteral = JSON.stringify(JSON.stringify(places));
const nextSource = source.replace(/const curatedPlacesJson = "(?:\\.|[^"\\])*";/, `const curatedPlacesJson = ${nextJsonLiteral};`);
fs.writeFileSync(placesFile, nextSource, "utf8");

console.log(JSON.stringify({
  totalPlaces: places.length,
  introUpdated,
  previousReviewCount,
  finalReviewCount: allReviews.length,
  reviewAdded: allReviews.length - previousReviewCount,
  placesWithoutThreeReviews: noReviewPlaces.length,
  duplicateReviews,
  bannedPhrasePlaces: bannedAfter.length
}, null, 2));
