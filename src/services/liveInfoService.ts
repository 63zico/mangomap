import type { Destination, LiveTravelInfo } from "../types";

const destinationCoordinates: Record<Destination, { latitude: number; longitude: number }> = {
  호치민: { latitude: 10.7769, longitude: 106.7009 },
  다낭: { latitude: 16.0544, longitude: 108.2022 },
  나트랑: { latitude: 12.2388, longitude: 109.1967 },
  하노이: { latitude: 21.0278, longitude: 105.8342 },
  달랏: { latitude: 11.9404, longitude: 108.4583 },
  푸꾸옥: { latitude: 10.2899, longitude: 103.984 }
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    time?: string;
  };
};

type ExchangeRateResponse = {
  result?: string;
  time_last_update_utc?: string;
  rates?: {
    VND?: number;
  };
};

export async function loadLiveTravelInfo(destination: Destination): Promise<LiveTravelInfo> {
  const fallback = createFallbackLiveInfo(destination);
  const [weather, exchange] = await Promise.allSettled([fetchWeather(destination), fetchExchangeRate()]);

  return {
    destination,
    weather: weather.status === "fulfilled" ? weather.value : fallback.weather,
    exchange: exchange.status === "fulfilled" ? exchange.value : fallback.exchange
  };
}

export function createFallbackLiveInfo(destination: Destination): LiveTravelInfo {
  return {
    destination,
    weather: {
      status: "loading",
      tip: "날씨 불러오는 중"
    },
    exchange: {
      status: "loading",
      tip: "환율 불러오는 중"
    }
  };
}

async function fetchWeather(destination: Destination): Promise<LiveTravelInfo["weather"]> {
  const coordinates = destinationCoordinates[destination];
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    timezone: "auto",
    forecast_days: "1"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error("Weather request failed");

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current;
  if (!current || typeof current.temperature_2m !== "number") throw new Error("Weather data missing");

  const precipitation = current.precipitation ?? 0;

  return {
    status: "ready",
    temperatureC: Math.round(current.temperature_2m),
    humidity: current.relative_humidity_2m,
    windKmh: current.wind_speed_10m,
    precipitationMm: precipitation,
    condition: getWeatherCondition(current.weather_code),
    tip: precipitation > 0 ? "비 가능성 있음, 실내 코스 준비" : getWeatherTip(current.temperature_2m),
    updatedAt: current.time
  };
}

async function fetchExchangeRate(): Promise<LiveTravelInfo["exchange"]> {
  const response = await fetch("https://open.er-api.com/v6/latest/KRW");
  if (!response.ok) throw new Error("Exchange request failed");

  const data = (await response.json()) as ExchangeRateResponse;
  const krwToVnd = data.rates?.VND;
  if (data.result !== "success" || typeof krwToVnd !== "number") throw new Error("Exchange data missing");

  return {
    status: "ready",
    krwToVnd,
    tenThousandKrwToVnd: Math.round(krwToVnd * 10000),
    updatedAt: data.time_last_update_utc,
    tip: `100,000 VND ≈ ${Math.round(100000 / krwToVnd).toLocaleString("ko-KR")}원`
  };
}

function getWeatherTip(temperature: number) {
  if (temperature >= 32) return "매우 더움, 카페/마사지 휴식 필수";
  if (temperature >= 29) return "더움, 오후 실내 일정 추천";
  return "걷기 괜찮음";
}

function getWeatherCondition(code?: number) {
  if (code === undefined) return "현재 날씨";
  if ([0, 1].includes(code)) return "맑음";
  if ([2, 3].includes(code)) return "구름";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "비";
  if ([95, 96, 99].includes(code)) return "뇌우";
  return "변동";
}
