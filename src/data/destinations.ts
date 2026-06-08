import type { Destination } from "../types";

export const destinationCards: Array<{
  name: Destination;
  subtitle: string;
  imageUrl?: string;
  mood: string;
}> = [
  {
    name: "호치민",
    subtitle: "맛집, 루프탑, 로컬 시장",
    mood: "처음 베트남이면 가장 쉬운 도시"
  },
  {
    name: "다낭",
    subtitle: "해변, 호이안, 리조트",
    mood: "휴양과 관광을 같이"
  },
  {
    name: "나트랑",
    subtitle: "바다, 마사지, 루프탑",
    mood: "느긋한 해변 여행"
  },
  {
    name: "하노이",
    subtitle: "올드쿼터, 카페, 문화",
    mood: "걷고 먹는 북부 감성"
  },
  {
    name: "달랏",
    subtitle: "카페, 야시장, 고산 휴양",
    mood: "선선한 날씨와 감성 카페"
  },
  {
    name: "푸꾸옥",
    subtitle: "리조트, 선셋, 휴양",
    mood: "쉬러 가는 섬 여행"
  }
];

export const quickGuideCards = [
  { title: "날씨", value: "소나기 대비", tone: "#E9F7FF" },
  { title: "택시", value: "Grab 추천", tone: "#EAF9EF" },
  { title: "환전", value: "소액 현금", tone: "#FFF4CC" },
  { title: "주의", value: "소지품 앞으로", tone: "#FFEDE8" }
];
