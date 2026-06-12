import { communityPosts, jobPosts, priceReportPosts, realEstatePosts, usedMarketPosts } from "@/lib/site";

export type SeedPost = {
  id: string;
  slug: string;
  category: string;
  city: string;
  title: string;
  statusLabel: string;
  price: string | null;
  contact: string;
  detail: string;
  excerpt: string;
  authorName: string;
  checklist: string[];
  notice: string;
  createdAt: string;
  updatedAt: string;
};

type SeedSource = {
  title: string;
  city: string;
  date: string;
  status: string;
  href: string;
  excerpt?: string;
  category?: string;
  pay?: string;
  price?: string;
  tag?: string;
};

const categoryDefaults: Record<string, { checklist: string[]; notice: string; contact: string }> = {
  "구인구직": {
    checklist: ["급여와 지급일", "근무 요일과 근무시간", "비자 지원 여부", "식사·교통비 제공 여부", "수습 기간과 계약 방식"],
    notice: "이 글은 운영팀이 실제 공고를 받기 전에 올린 예시입니다. 실제 채용 공고가 들어오면 검수 후 우선 노출됩니다.",
    contact: "실제 공고 등록은 글 등록하기에서 받습니다.",
  },
  "중고거래": {
    checklist: ["실사진과 사용 기간", "고장·수리 이력", "직거래 위치", "픽업 가능 날짜", "선입금 요구 여부"],
    notice: "이 글은 없는 매물을 진짜처럼 보이지 않기 위한 거래 예시입니다. 실제 매물 제보가 들어오면 샘플보다 우선 노출됩니다.",
    contact: "실제 판매글 등록은 글 등록하기에서 받습니다.",
  },
  "부동산": {
    checklist: ["월세와 보증금", "관리비 포함 항목", "전기요금 단가", "계약 기간", "퇴실 조건과 보증금 반환일"],
    notice: "이 글은 운영팀이 부동산 제보 양식을 보여주기 위해 만든 예시입니다. 실제 매물은 검수 후 우선 노출됩니다.",
    contact: "실제 매물 등록은 글 등록하기에서 받습니다.",
  },
  "커뮤니티": {
    checklist: ["도시와 생활권", "방문일 또는 확인일", "가격·운영시간 변화", "주의할 점", "사진 또는 링크 여부"],
    notice: "이 글은 운영팀 질문입니다. 실제 경험담과 제보가 들어오면 본문을 업데이트합니다.",
    contact: "답변과 제보는 글 등록하기에서 받습니다.",
  },
  "가격제보": {
    checklist: ["실제 결제 금액", "방문일 또는 이용일", "포함·불포함 항목", "팁 또는 추가 비용", "인원과 이용 시간"],
    notice: "이 글은 실제 가격 제보를 받기 위한 운영팀 양식입니다. 날짜가 있는 제보를 우선 반영합니다.",
    contact: "가격 제보는 글 등록하기에서 받습니다.",
  },
};

const customDetails: Record<string, string> = {
  "sample-district-7-restaurant-parttime":
    "푸미흥 인근 한식당에서 주말 저녁 시간대 홀 파트타임 공고를 올린다면 이런 정보가 필요합니다.\n\n단순히 '알바 구합니다'라고 쓰는 것보다 근무 요일, 근무시간, 급여 지급일, 식사 제공 여부, 한국어 응대 필요 여부를 분리해서 적어야 지원자가 빠르게 판단할 수 있습니다.\n\n실제 공고가 들어오면 운영팀은 급여, 위치, 연락 방식, 비자 관련 표현을 먼저 확인한 뒤 샘플보다 우선 노출합니다.",
  "seed-district-2-cafe-barista":
    "2군 타오디엔 카페 구인 공고를 받을 때 필요한 예시입니다.\n\n카페 구인은 시급만큼 근무 시간대와 팁 배분, 영어 응대 필요 여부가 중요합니다. 오전 근무인지, 주말 포함인지, 식사나 교통비가 제공되는지도 함께 적어야 합니다.\n\n실제 카페 공고가 등록되면 운영팀 검수 후 이 예시 글보다 먼저 보여줍니다.",
  "sample-honda-vision-2022":
    "호치민 2군에서 중고 오토바이를 판매한다면 등록증, 주행거리, 정비 이력, 시운전 가능 여부가 먼저 보여야 합니다.\n\n중고 오토바이는 가격만 보고 결정하기 어렵습니다. 번호판, 등록증, 엔진 상태, 브레이크, 타이어, 누유 여부를 함께 확인해야 안전합니다.\n\n실제 판매글이 들어오면 사진과 서류 확인 항목이 있는 글을 우선 노출합니다.",
  "sample-my-khe-home-appliances":
    "다낭 미케비치 원룸 입주자가 바로 쓸 수 있는 생활가전 묶음 예시입니다.\n\n가전 거래는 제품명보다 실사진, 사용 기간, 작동 여부, 픽업 위치가 중요합니다. 냉장고나 전자레인지는 운반 가능 여부도 함께 적어야 거래가 빠르게 진행됩니다.\n\n실제 판매글이 들어오면 물품 상태와 거래 가능 날짜가 명확한 글을 우선 반영합니다.",
};

export const seedPosts: SeedPost[] = [
  ...jobPosts.map((post) => toSeedPost(post, "구인구직")),
  ...usedMarketPosts.map((post) => toSeedPost(post, "중고거래")),
  ...realEstatePosts.map((post) => toSeedPost(post, "부동산")),
  ...communityPosts.map((post) => toSeedPost(post, "커뮤니티")),
  ...priceReportPosts.map((post) => toSeedPost(post, "가격제보")),
].filter((post, index, collection) => collection.findIndex((candidate) => candidate.slug === post.slug) === index);

export function getSeedPostBySlug(slug: string) {
  return seedPosts.find((post) => post.slug === slug);
}

export function getLatestSeedPosts(limit = 20) {
  return seedPosts.slice(0, limit);
}

export function getSeedPostUrlByHref(href: string) {
  const slug = slugFromHref(href);
  if (!slug) return null;
  return `/posts/${slug}`;
}

function toSeedPost(source: SeedSource, category: string): SeedPost {
  const slug = slugFromHref(source.href) ?? slugSegment(`${source.city}-${category}-${source.title}`);
  const defaults = categoryDefaults[category] ?? categoryDefaults["커뮤니티"];
  const value = source.pay ?? source.price ?? source.category ?? null;
  const excerpt = source.excerpt ?? [value, source.tag].filter(Boolean).join(" · ");
  const detail =
    customDetails[slug] ??
    `${excerpt}\n\n이 글은 Mango Vietnam 운영팀이 실제 제보를 받기 전에 올린 시드 콘텐츠입니다. 사용자가 어떤 정보를 적어야 하는지 보여주기 위한 예시이며, 실제 공고나 매물처럼 보이게 만들기 위한 글이 아닙니다.\n\n실제 제보가 들어오면 도시, 카테고리, 가격 또는 급여, 위치, 연락 방식, 확인 날짜를 기준으로 검수한 뒤 이 예시보다 우선 노출합니다.`;

  return {
    id: `seed-${slug}`,
    slug,
    category,
    city: source.city,
    title: source.title,
    statusLabel: source.status,
    price: value,
    contact: defaults.contact,
    detail,
    excerpt,
    authorName: "Mango Vietnam 운영팀",
    checklist: defaults.checklist,
    notice: defaults.notice,
    createdAt: `${source.date}T00:00:00.000+07:00`,
    updatedAt: `${source.date}T00:00:00.000+07:00`,
  };
}

function slugFromHref(href: string) {
  if (href.startsWith("/posts/")) return href.replace("/posts/", "").split(/[?#]/)[0];
  const hash = href.split("#")[1];
  return hash ? slugSegment(hash) : null;
}

function slugSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
