export type CollectorDistrict = {
  name: string;
  query: string;
  patterns: string[];
  center: { latitude: number; longitude: number };
  radius: number;
};

export type CollectorCity = {
  slug: string;
  name: string;
  koreanName: string;
  query: string;
  center: { latitude: number; longitude: number };
  radius: number;
  districts: CollectorDistrict[];
};

export type CollectorCategory = {
  key: string;
  label: string;
  koreanLabel: string;
  query: string;
  allowedTypeHints: string[];
  blockedTypeHints: string[];
};

export type CollectorPlanStep = {
  citySlug: string;
  cityName: string;
  districtName: string;
  categoryKey: string;
  categoryLabel: string;
};

export const collectorCities: CollectorCity[] = [
  {
    slug: "ho-chi-minh-city",
    name: "Ho Chi Minh City",
    koreanName: "\uD638\uCE58\uBBFC",
    query: "Ho Chi Minh City",
    center: { latitude: 10.7769, longitude: 106.7009 },
    radius: 18000,
    districts: [
      { name: "District 1", query: "District 1 Ho Chi Minh City", patterns: ["district 1", "quan 1", "q.1", "ben nghe", "bui thi xuan"], center: { latitude: 10.7757, longitude: 106.7019 }, radius: 3500 },
      { name: "District 2", query: "District 2 Ho Chi Minh City", patterns: ["district 2", "quan 2", "an phu", "an khanh"], center: { latitude: 10.7873, longitude: 106.7498 }, radius: 6500 },
      { name: "District 7", query: "District 7 Ho Chi Minh City", patterns: ["district 7", "quan 7", "tan phong"], center: { latitude: 10.7358, longitude: 106.7218 }, radius: 6500 },
      { name: "Binh Thanh", query: "Binh Thanh Ho Chi Minh City", patterns: ["binh thanh"], center: { latitude: 10.8035, longitude: 106.7078 }, radius: 5500 },
      { name: "Thao Dien", query: "Thao Dien Ho Chi Minh City", patterns: ["thao dien"], center: { latitude: 10.8025, longitude: 106.7402 }, radius: 3000 },
      { name: "Phu My Hung", query: "Phu My Hung Ho Chi Minh City", patterns: ["phu my hung", "hung phuoc"], center: { latitude: 10.7292, longitude: 106.7084 }, radius: 3500 },
    ],
  },
  {
    slug: "nha-trang",
    name: "Nha Trang",
    koreanName: "\uB098\uD2B8\uB791",
    query: "Nha Trang",
    center: { latitude: 12.2388, longitude: 109.1967 },
    radius: 18000,
    districts: [
      { name: "Tran Phu", query: "Tran Phu Nha Trang", patterns: ["tran phu"], center: { latitude: 12.2381, longitude: 109.1961 }, radius: 3500 },
      { name: "Loc Tho", query: "Loc Tho Nha Trang", patterns: ["loc tho"], center: { latitude: 12.2387, longitude: 109.1952 }, radius: 2500 },
      { name: "Vinh Hai", query: "Vinh Hai Nha Trang", patterns: ["vinh hai"], center: { latitude: 12.268, longitude: 109.2038 }, radius: 3500 },
      { name: "Hon Chong", query: "Hon Chong Nha Trang", patterns: ["hon chong"], center: { latitude: 12.2732, longitude: 109.2053 }, radius: 3000 },
    ],
  },
  {
    slug: "hanoi",
    name: "Hanoi",
    koreanName: "\uD558\uB178\uC774",
    query: "Hanoi",
    center: { latitude: 21.0278, longitude: 105.8342 },
    radius: 22000,
    districts: [
      { name: "Hoan Kiem", query: "Hoan Kiem Hanoi", patterns: ["hoan kiem", "old quarter", "hang"], center: { latitude: 21.0287, longitude: 105.8522 }, radius: 3500 },
      { name: "Tay Ho", query: "Tay Ho Hanoi", patterns: ["tay ho", "west lake"], center: { latitude: 21.0704, longitude: 105.8236 }, radius: 5500 },
      { name: "Ba Dinh", query: "Ba Dinh Hanoi", patterns: ["ba dinh"], center: { latitude: 21.034, longitude: 105.814 }, radius: 4500 },
      { name: "Dong Da", query: "Dong Da Hanoi", patterns: ["dong da"], center: { latitude: 21.0181, longitude: 105.8297 }, radius: 4500 },
      { name: "Cau Giay", query: "Cau Giay Hanoi", patterns: ["cau giay"], center: { latitude: 21.0362, longitude: 105.7906 }, radius: 4500 },
    ],
  },
  {
    slug: "da-lat",
    name: "Da Lat",
    koreanName: "\uB2EC\uB78F",
    query: "Da Lat",
    center: { latitude: 11.9404, longitude: 108.4583 },
    radius: 16000,
    districts: [
      { name: "City Center", query: "Da Lat City Center", patterns: ["city center", "central", "cho da lat", "night market"], center: { latitude: 11.9401, longitude: 108.4378 }, radius: 3500 },
      { name: "Xuan Huong Lake", query: "Xuan Huong Lake Da Lat", patterns: ["xuan huong"], center: { latitude: 11.9431, longitude: 108.4452 }, radius: 3000 },
      { name: "Ward 1", query: "Ward 1 Da Lat", patterns: ["ward 1", "p.1"], center: { latitude: 11.9439, longitude: 108.4372 }, radius: 2500 },
      { name: "Ward 2", query: "Ward 2 Da Lat", patterns: ["ward 2", "p.2"], center: { latitude: 11.9514, longitude: 108.4398 }, radius: 3000 },
    ],
  },
  {
    slug: "da-nang",
    name: "Da Nang",
    koreanName: "\uB2E4\uB0AD",
    query: "Da Nang",
    center: { latitude: 16.0544, longitude: 108.2022 },
    radius: 22000,
    districts: [
      { name: "My Khe", query: "My Khe Beach Da Nang", patterns: ["my khe", "vo nguyen giap"], center: { latitude: 16.0614, longitude: 108.2467 }, radius: 3500 },
      { name: "An Thuong", query: "An Thuong Da Nang", patterns: ["an thuong", "my an"], center: { latitude: 16.0498, longitude: 108.2444 }, radius: 2800 },
      { name: "Hai Chau", query: "Hai Chau Da Nang", patterns: ["hai chau", "bach dang", "han market"], center: { latitude: 16.0678, longitude: 108.2208 }, radius: 4500 },
      { name: "Son Tra", query: "Son Tra Da Nang", patterns: ["son tra", "man thai"], center: { latitude: 16.1003, longitude: 108.2565 }, radius: 6000 },
    ],
  },
  {
    slug: "phu-quoc",
    name: "Phu Quoc",
    koreanName: "\uD478\uAFB8\uC625",
    query: "Phu Quoc",
    center: { latitude: 10.2899, longitude: 103.984 },
    radius: 32000,
    districts: [
      { name: "Duong Dong", query: "Duong Dong Phu Quoc", patterns: ["duong dong"], center: { latitude: 10.2195, longitude: 103.9599 }, radius: 5500 },
      { name: "An Thoi", query: "An Thoi Phu Quoc", patterns: ["an thoi", "sunset town"], center: { latitude: 10.0282, longitude: 104.0068 }, radius: 7000 },
      { name: "Bai Truong", query: "Bai Truong Phu Quoc", patterns: ["bai truong", "long beach", "duong to"], center: { latitude: 10.1394, longitude: 103.9821 }, radius: 9000 },
      { name: "Ong Lang", query: "Ong Lang Phu Quoc", patterns: ["ong lang"], center: { latitude: 10.2773, longitude: 103.9272 }, radius: 5500 },
    ],
  },
];

export const collectorCategories: CollectorCategory[] = [
  { key: "korean-restaurant", label: "Korean restaurant", koreanLabel: "\uD55C\uC2DD\uB2F9", query: "Korean restaurant", allowedTypeHints: ["restaurant", "food", "meal_takeaway", "meal_delivery"], blockedTypeHints: ["spa", "massage", "lodging"] },
  { key: "chinese-restaurant", label: "Chinese restaurant", koreanLabel: "\uC911\uC2DD\uB2F9", query: "Chinese restaurant", allowedTypeHints: ["restaurant", "food"], blockedTypeHints: ["spa", "massage", "lodging"] },
  { key: "japanese-restaurant", label: "Japanese restaurant", koreanLabel: "\uC77C\uC2DD\uB2F9", query: "Japanese restaurant", allowedTypeHints: ["restaurant", "food"], blockedTypeHints: ["spa", "massage", "lodging"] },
  { key: "vietnamese-restaurant", label: "Vietnamese restaurant", koreanLabel: "\uBCA0\uD2B8\uB0A8 \uC74C\uC2DD\uC810", query: "Vietnamese restaurant", allowedTypeHints: ["restaurant", "food"], blockedTypeHints: ["spa", "massage", "lodging"] },
  { key: "cafe", label: "Cafe", koreanLabel: "\uCE74\uD398", query: "Cafe specialty coffee", allowedTypeHints: ["cafe", "coffee_shop", "bakery", "food"], blockedTypeHints: ["spa", "massage", "night_club"] },
  { key: "bbq-restaurant", label: "BBQ restaurant", koreanLabel: "\uBC14\uBE44\uD050", query: "BBQ restaurant", allowedTypeHints: ["restaurant", "barbecue_restaurant", "food"], blockedTypeHints: ["spa", "massage", "lodging"] },
  { key: "seafood-restaurant", label: "Seafood restaurant", koreanLabel: "\uD574\uC0B0\uBB3C", query: "Seafood restaurant", allowedTypeHints: ["restaurant", "seafood_restaurant", "food"], blockedTypeHints: ["spa", "massage", "lodging"] },
  { key: "massage", label: "Massage", koreanLabel: "\uB9C8\uC0AC\uC9C0", query: "Massage spa", allowedTypeHints: ["spa", "massage", "beauty_salon", "health"], blockedTypeHints: ["lodging", "restaurant"] },
];

export function buildCollectorPlan() {
  return collectorCities.flatMap((city) =>
    city.districts.flatMap((district) =>
      collectorCategories.map((category) => ({
        citySlug: city.slug,
        cityName: city.name,
        districtName: district.name,
        categoryKey: category.key,
        categoryLabel: category.label,
      })),
    ),
  );
}

export function buildBalancedCollectorPlan() {
  return collectorCities.flatMap((city) => {
    const steps: CollectorPlanStep[] = [];

    for (let round = 0; round < city.districts.length; round += 1) {
      collectorCategories.forEach((category, categoryIndex) => {
        const district = city.districts[(round + categoryIndex) % city.districts.length];
        steps.push({
          citySlug: city.slug,
          cityName: city.name,
          districtName: district.name,
          categoryKey: category.key,
          categoryLabel: category.label,
        });
      });
    }

    return steps;
  });
}

export function getCollectorCity(slug: string) {
  return collectorCities.find((city) => city.slug === slug);
}

export function getCollectorCategory(key: string) {
  return collectorCategories.find((category) => category.key === key);
}
