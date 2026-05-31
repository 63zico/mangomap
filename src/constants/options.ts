import type {
  AccommodationArea,
  ArrivalTime,
  Budget,
  Companion,
  DepartureTime,
  Destination,
  Duration,
  Preference,
  TravelStyle
} from "../types";

export const destinations: Destination[] = ["호치민", "다낭", "나트랑", "하노이", "달랏", "푸꾸옥"];
export const durations: Duration[] = ["당일치기", "1박2일", "2박3일", "3박4일", "4박5일"];
export const companions: Companion[] = ["혼자", "커플", "친구", "가족"];
export const budgets: Budget[] = ["가성비", "보통", "프리미엄"];
export const styles: TravelStyle[] = ["빡세게", "여유롭게", "반반"];
export const accommodationAreasByDestination: Record<Destination, AccommodationArea[]> = {
  호치민: ["1군/벤탄시장", "응우옌후에/동코이", "부이비엔/팜응라오", "타오디엔", "푸미흥/7군", "공항 근처", "아직 미정"],
  다낭: ["미케비치", "한시장/시내", "용다리/한강", "호이안 올드타운", "리조트 존", "공항 근처", "아직 미정"],
  나트랑: ["쩐푸 해변", "나트랑 시내", "담시장 근처", "혼총/북부", "리조트 존", "공항 근처", "아직 미정"],
  하노이: ["호안끼엠/올드쿼터", "성요셉성당 근처", "서호/떠이호", "바딘/롯데센터", "공항 근처", "아직 미정"],
  달랏: ["달랏 시내", "쑤언흐엉 호수", "달랏 야시장", "뚜옌럼 호수", "리조트 존", "공항 근처", "아직 미정"],
  푸꾸옥: ["즈엉동", "롱비치", "선셋타운/남부", "옹랑/북서부", "리조트 존", "공항 근처", "아직 미정"]
};
export const defaultAccommodationAreaByDestination: Record<Destination, AccommodationArea> = {
  호치민: "1군/벤탄시장",
  다낭: "미케비치",
  나트랑: "쩐푸 해변",
  하노이: "호안끼엠/올드쿼터",
  달랏: "달랏 시내",
  푸꾸옥: "롱비치"
};
export const accommodationAreas: AccommodationArea[] = accommodationAreasByDestination.호치민;
export const arrivalTimes: ArrivalTime[] = ["오전 도착", "오후 도착", "저녁 도착"];
export const departureTimes: DepartureTime[] = ["오전 출국", "오후 출국", "밤 출국"];

export const preferences: Preference[] = [
  "먹방",
  "카페",
  "인스타 감성",
  "로컬 감성",
  "마사지",
  "술/힙한바",
  "가라오케",
  "힐링/휴식",
  "액티비티",
  "자연선",
  "럭셔리",
  "혼자 여행",
  "커플 여행",
  "가족 여행",
  "여자끼리"
];

export const durationToDays: Record<Duration, number> = {
  "당일치기": 1,
  "1박2일": 2,
  "2박3일": 3,
  "3박4일": 4,
  "4박5일": 5
};
