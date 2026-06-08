import fs from "node:fs";
import path from "node:path";

const placesPath = path.join(process.cwd(), "src", "data", "places.ts");
const source = fs.readFileSync(placesPath, "utf8");
const match = source.match(/const curatedPlacesJson = ([\s\S]*?);\s*export const curatedPlaces/);

if (!match) {
  throw new Error("curatedPlacesJson block not found");
}

const places = JSON.parse(JSON.parse(match[1]));

const nicknames = ["민", "준", "안", "케이", "여행자", "호치민러", "밥친구", "직장인", "나그네", "현지러"];

const usedMessages = new Set();

for (const place of places) {
  if (!Array.isArray(place.reviews) || place.reviews.length === 0) continue;

  const usedForPlace = new Set();
  place.reviews = place.reviews.map((review, index) => {
    const tags = buildTags(place, review, index);
    const content = makeUniqueReviewContent(buildReviewContent(place, tags, index), place, index, usedForPlace, usedMessages);

    usedForPlace.add(content);
    usedMessages.add(content);

    return {
      ...review,
      nickname: review.nickname || nicknames[Math.abs(hash(`${place.id}-${index}`)) % nicknames.length],
      rating: review.rating || (index === 1 ? 4 : 5),
      visitStatus: "방문 완료",
      tags,
      content,
      source: "google_reference"
    };
  });
}

const messages = [];
let placesWithDuplicateReviews = 0;

for (const place of places) {
  const reviewMessages = (place.reviews ?? []).map((review) => review.content);
  if (new Set(reviewMessages).size !== reviewMessages.length) {
    placesWithDuplicateReviews += 1;
  }
  messages.push(...reviewMessages);
}

const globalDuplicateCount = messages.length - new Set(messages).size;

if (placesWithDuplicateReviews > 0 || globalDuplicateCount > 0) {
  throw new Error(
    `Duplicate reference reviews remain. perPlace=${placesWithDuplicateReviews}, global=${globalDuplicateCount}`
  );
}

const nextJsonLiteral = JSON.stringify(JSON.stringify(places));
const nextSource = source.replace(
  /const curatedPlacesJson = ([\s\S]*?);\s*export const curatedPlaces/,
  `const curatedPlacesJson = ${nextJsonLiteral};\n\nexport const curatedPlaces`
);

fs.writeFileSync(placesPath, nextSource, "utf8");

console.log(
  JSON.stringify(
    {
      places: places.length,
      reviews: messages.length,
      placesWithDuplicateReviews,
      globalDuplicateCount
    },
    null,
    2
  )
);

function buildTags(place, review, index) {
  const current = Array.isArray(review.tags) ? review.tags.filter(Boolean) : [];
  const pool = getTagPool(place);
  const merged = [...current];

  for (let offset = 0; merged.length < 3 && offset < pool.length; offset += 1) {
    const tag = pool[(index + offset + Math.abs(hash(place.id))) % pool.length];
    if (!merged.includes(tag)) merged.push(tag);
  }

  return merged.slice(0, index === 0 ? 3 : 2);
}

function buildReviewContent(place, tags, index) {
  const city = clean(place.city) || "베트남";
  const area = clean(place.area) || city;
  const name = clean(place.name);
  const category = clean(place.category);
  const bestTime = Array.isArray(place.bestTime) && place.bestTime.length > 0 ? place.bestTime[index % place.bestTime.length] : "";
  const price = clean(place.priceLevel);
  const seed = Math.abs(hash(`${place.id}-${index}-${name}`));

  if (category.includes("카페")) {
    return pick(
      [
        `${area}에서 잠깐 쉬어갈 카페로 ${name}을 본 후기가 있어요. ${pick(["사진 찍기에는 낮 시간이 낫고, 오래 앉을 거면 자리 상황을 먼저 보는 편이 좋아요.", "커피보다 공간 분위기를 좋게 본 의견이 있고, 피크 시간에는 조금 북적일 수 있어요.", "작업이나 대화 목적이면 소음과 콘센트 자리를 먼저 확인하는 게 좋아요."], seed)}`,
        `${city} 카페 동선에서 ${name}은 이동 중 쉬기 괜찮다는 반응이 보여요. ${pick(["디저트 선택지는 매장 상황에 따라 달라질 수 있어요.", "창가나 야외석은 빨리 차는 편이라는 의견이 있어요.", "사진 목적이면 밝은 시간대 방문이 더 무난해 보여요."], seed + 1)}`,
        `${name}은 ${area} 근처에서 카페를 찾을 때 후보로 볼 만해요. ${pick(["가격은 무난하다는 쪽이고, 사람이 몰리는 시간에는 주문 대기가 있을 수 있어요.", "커피 맛과 분위기 평가가 같이 올라오는 편이라 여행 중 쉬어가기 좋다는 반응입니다.", "좌석 간격은 방문 시간대에 따라 체감이 달라질 수 있어요."], seed + 2)}`
      ],
      index
    );
  }

  if (category.includes("마사지")) {
    return pick(
      [
        `${area} 마사지 후보로 ${name}을 저장한 후기가 있어요. ${pick(["강도는 직원마다 차이가 있어 처음에 원하는 압을 분명히 말하는 게 좋아요.", "예약 후 방문하면 대기 시간을 줄일 수 있다는 반응이 있습니다.", "여행 중 피로를 풀기엔 괜찮지만, 늦은 시간에는 가능 시간을 먼저 확인하세요."], seed)}`,
        `${name}은 ${city} 일정 중 쉬어가는 코스로 언급돼요. ${pick(["룸 컨디션과 응대는 대체로 무난하다는 쪽입니다.", "팁이나 추가 옵션은 결제 전 확인하는 편이 안전해요.", "커플이나 가족 방문이면 같은 시간 예약 가능 여부를 먼저 물어보세요."], seed + 1)}`,
        `${area} 근처에서 마사지가 필요할 때 ${name}을 본 사람이 있어요. ${pick(["짧은 코스보다 60분 이상 코스가 만족도가 낫다는 의견이 보여요.", "픽업이나 이동 동선은 Google Maps에서 한 번 더 확인하는 게 좋아요.", "위생과 조용한 분위기를 중요하게 보는 사람에게 맞는지 확인해보세요."], seed + 2)}`
      ],
      index
    );
  }

  if (category.includes("루프") || category.includes("바")) {
    return pick(
      [
        `${name}은 ${area}에서 저녁 분위기를 보러 가는 후보로 많이 보여요. ${pick(["노을 시간대에는 자리가 빨리 찰 수 있어 예약을 확인하는 게 좋아요.", "음악 볼륨이 있는 편이라 조용한 대화 목적이면 시간을 골라 가는 게 낫습니다.", "뷰와 분위기 평가는 좋은 편이고, 가격은 일반 식당보다 높게 잡는 게 안전해요."], seed)}`,
        `${city} 밤 동선에 ${name}을 넣는 후기가 있어요. ${pick(["사진을 찍기엔 해 질 무렵이 낫고, 늦게 갈수록 분위기가 달라질 수 있어요.", "칵테일이나 간단한 음식 위주로 생각하면 무난하다는 반응입니다.", "드레스코드나 입장 조건은 방문 전 확인하는 편이 좋아요."], seed + 1)}`,
        `${area}에서 루프탑이나 바를 찾는다면 ${name}도 후보가 됩니다. ${pick(["단체보다 2~4명이 움직일 때 더 편하다는 의견이 있어요.", "비 오는 날에는 야외석 운영 여부를 먼저 보는 게 좋아요.", "분위기 중심 장소라 식사만 기대하면 아쉬울 수 있습니다."], seed + 2)}`
      ],
      index
    );
  }

  if (category.includes("쇼핑") || category.includes("환전") || category.includes("사진")) {
    return pick(
      [
        `${area} 동선에서 ${name}을 들른 후기가 있어요. ${pick(["가격이나 운영시간은 현장에서 한 번 더 확인하는 편이 안전합니다.", "위치가 애매할 수 있어 이동 전 지도 핀을 다시 보는 게 좋아요.", "짧게 들르는 목적이면 일정 사이에 넣기 괜찮다는 반응입니다."], seed)}`,
        `${name}은 ${city} 여행 중 필요한 일을 처리할 때 후보로 볼 만해요. ${pick(["사람이 몰리는 시간에는 대기나 혼잡이 있을 수 있습니다.", "처음 가는 곳이면 주변 랜드마크를 같이 확인해두는 게 좋아요.", "사진이나 결제 조건은 방문 전에 최신 정보를 확인하세요."], seed + 1)}`,
        `${area} 근처에서 ${name}을 이용한 참고 후기가 있어요. ${pick(["짧은 방문에는 무난하지만, 목적이 분명할수록 만족도가 높아 보여요.", "현장 상황이 바뀔 수 있어 영업 여부를 확인하고 움직이는 게 좋습니다.", "동선상 가까우면 들러볼 만하다는 정도로 보는 게 좋아요."], seed + 2)}`
      ],
      index
    );
  }

  return pick(
    [
      `${area} 식사 동선에서 ${name}은 후보로 자주 보이는 편이에요. ${pick(["점심이나 저녁 시간에는 조금 붐빌 수 있어 피크 시간을 피하는 게 좋아요.", "메뉴 선택이 어렵다면 대표 메뉴와 최근 사진을 먼저 보고 가는 편이 안전합니다.", "처음 방문이면 위치와 웨이팅 여부를 확인하고 움직이는 게 좋아요."], seed)}`,
      `${name}은 ${city}에서 한 끼를 해결할 때 저장해둘 만한 장소로 보여요. ${pick(["맛 평가는 무난하게 좋은 쪽이고, 서비스는 시간대에 따라 체감이 갈릴 수 있어요.", "혼밥보다는 2명 이상이 가면 메뉴를 나눠 먹기 편하다는 반응이 있습니다.", "매운맛이나 향신료가 부담된다면 주문 전에 조절 가능 여부를 물어보세요."], seed + 1)}`,
      `${area} 근처에서 ${category || "식당"}을 찾는다면 ${name}도 비교해볼 만해요. ${pick(["가격대는 " + (price || "무난한 편") + "으로 보고 가면 크게 빗나가지 않습니다.", "관광 동선 중 들르기 쉽다는 의견이 있고, 이동 전 영업시간 확인은 필요해요.", "한국인 입장에서는 메뉴 사진을 보고 고르는 게 주문 실수를 줄여줍니다."], seed + 2)}`,
      `${name} 후기는 전반적으로 ${pick(["음식 양과 맛을 무난하게 보는 쪽입니다.", "위치 접근성을 좋게 보는 쪽입니다.", "가족이나 친구와 함께 가기 편하다는 쪽입니다."], seed + 3)} ${pick(["다만 피크 시간대에는 대기나 소음이 있을 수 있어요.", "처음 방문이면 Google Maps 최신 사진도 같이 확인하는 게 좋습니다.", bestTime ? `${bestTime} 시간대 방문을 고려해볼 만해요.` : "방문 전 최신 영업 정보를 확인하는 게 좋아요."], seed + 4)}`
    ],
    index
  );
}

function makeUniqueReviewContent(content, place, index, usedForPlace, usedMessages) {
  if (!usedForPlace.has(content) && !usedMessages.has(content)) {
    return content;
  }

  const area = clean(place.area) || clean(place.city) || "현지";
  const addressHint = getAddressHint(place);
  const variants = [
    `${content} ${area} 동선 기준으로 다시 확인한 참고 후기예요.`,
    `${content} ${addressHint} 주변 지점 기준으로 정리했어요.`,
    `${content} 같은 이름의 장소가 있을 수 있어 이 지점 기준으로 봐주세요.`,
    `${content} 여행 동선에 넣기 전 최신 사진과 위치를 같이 확인하면 좋아요.`
  ];

  for (const variant of variants) {
    if (!usedForPlace.has(variant) && !usedMessages.has(variant)) {
      return variant;
    }
  }

  return `${content} ${addressHint} 기준 참고 후기입니다.`;
}

function getAddressHint(place) {
  const address = clean(place.address);
  if (!address) return clean(place.area) || clean(place.city) || "해당 위치";
  return address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

function getTagPool(place) {
  const category = clean(place.category);
  const tags = Array.isArray(place.tags) ? place.tags : [];

  if (category.includes("카페")) return ["카페작업", "사진", "휴식", "디저트", "대화"];
  if (category.includes("마사지")) return ["휴식", "예약", "커플", "가족", "피로회복"];
  if (category.includes("루프") || category.includes("바")) return ["야경", "데이트", "분위기", "칵테일", "저녁"];
  if (tags.some((tag) => String(tag).includes("해산물"))) return ["해산물", "가족", "저녁", "단체", "가격확인"];
  if (tags.some((tag) => String(tag).includes("한식"))) return ["한식", "혼밥", "한국인 추천", "가족", "점심"];
  if (tags.some((tag) => String(tag).includes("중식"))) return ["중식", "점심", "가족", "매운맛", "한국인 추천"];
  return ["한국인 추천", "혼밥", "가족", "데이트", "가성비", "저녁"];
}

function pick(items, seed) {
  return items[Math.abs(seed) % items.length];
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hash(value) {
  let result = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    result = (result * 31 + text.charCodeAt(index)) | 0;
  }
  return result;
}
