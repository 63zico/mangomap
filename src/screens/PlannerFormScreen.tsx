import { useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { Chip } from "../components/Chip";
import { PrimaryButton } from "../components/PrimaryButton";
import { TopBar } from "../components/TopBar";
import {
  accommodationAreasByDestination,
  arrivalTimes,
  budgets,
  companions,
  defaultAccommodationAreaByDestination,
  departureTimes,
  durations,
  preferences,
  styles as travelStyles
} from "../constants/options";
import { destinationCards } from "../data/destinations";
import { colors, shadow } from "../styles/theme";
import type {
  AccommodationArea,
  ArrivalTime,
  Budget,
  Companion,
  DepartureTime,
  Destination,
  Duration,
  PlannerInput,
  Preference,
  TravelStyle
} from "../types";

type PlannerFormScreenProps = {
  initialDestination?: Destination;
  onBack: () => void;
  onGenerate: (input: PlannerInput) => void;
};

type PlannerStep = "destination" | "preference" | "details";

const preferenceIcons: Record<Preference, string> = {
  맛집: "🍜",
  먹방: "🍜",
  카페: "☕",
  "인스타 감성": "📷",
  "로컬 감성": "🏮",
  마사지: "💆",
  "술/힙한바": "🍸",
  가라오케: "🎤",
  "힐링/휴식": "🌿",
  액티비티: "🏄",
  자연선: "🏝️",
  럭셔리: "🛍️",
  "혼자 여행": "🚶",
  "커플 여행": "💞",
  "가족 여행": "👨‍👩‍👧",
  여자끼리: "👭",
  쇼핑: "🛍️",
  로컬: "🏮",
  야경: "🌃",
  "클럽/바": "🍸",
  관광지: "🏛️"
};

export function PlannerFormScreen({ initialDestination, onBack, onGenerate }: PlannerFormScreenProps) {
  const [step, setStep] = useState<PlannerStep>("destination");
  const [destination, setDestination] = useState<Destination>(initialDestination ?? "호치민");
  const [duration, setDuration] = useState<Duration>("2박3일");
  const [companion, setCompanion] = useState<Companion>("커플");
  const [budget, setBudget] = useState<Budget>("보통");
  const [selectedPreferences, setSelectedPreferences] = useState<Preference[]>(["먹방", "카페", "마사지"]);
  const [style, setStyle] = useState<TravelStyle>("반반");
  const [accommodationArea, setAccommodationArea] = useState<AccommodationArea>(
    defaultAccommodationAreaByDestination[initialDestination ?? "호치민"]
  );
  const [arrivalTime, setArrivalTime] = useState<ArrivalTime>("오후 도착");
  const [departureTime, setDepartureTime] = useState<DepartureTime>("밤 출국");
  const [mustVisit, setMustVisit] = useState("");
  const [avoid, setAvoid] = useState("");

  const goBack = () => {
    if (step === "details") {
      setStep("preference");
      return;
    }
    if (step === "preference") {
      setStep("destination");
      return;
    }
    onBack();
  };

  const togglePreference = (preference: Preference) => {
    setSelectedPreferences((current) =>
      current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference]
    );
  };

  const generate = () => {
    onGenerate({
      destination,
      duration,
      companion,
      budget,
      preferences: normalizePreferences(selectedPreferences),
      style,
      accommodationArea,
      arrivalTime,
      departureTime,
      mustVisit,
      avoid
    });
  };

  return (
    <AppShell>
      <TopBar title={getTitle(step)} onBack={goBack} />
      <StepIndicator current={step} />

      {step === "destination" ? (
        <View style={screenStyles.singlePanel}>
          <Text style={screenStyles.step}>1. 여행지 선택</Text>
          <Text style={screenStyles.question}>어디로 가세요?</Text>
          <Text style={screenStyles.hint}>도시를 고르면 그 지역의 맛집·카페·마사지·밤코스 후보로 코스를 만들어요.</Text>

          <View style={screenStyles.destinationList}>
            {destinationCards.map((item) => (
              <Pressable
                key={item.name}
                accessibilityRole="button"
                accessibilityState={{ selected: destination === item.name }}
                onPress={() => {
                  setDestination(item.name);
                  setAccommodationArea(defaultAccommodationAreaByDestination[item.name]);
                }}
                style={[screenStyles.destinationItem, destination === item.name && screenStyles.selectedDestination]}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={screenStyles.destinationImage} />
                ) : (
                  <View style={[screenStyles.destinationImage, screenStyles.destinationImagePlaceholder]}>
                    <Text style={screenStyles.destinationImageInitial}>{item.name.slice(0, 1)}</Text>
                  </View>
                )}
                <View style={screenStyles.destinationTextWrap}>
                  <Text style={screenStyles.destinationName}>{item.name}</Text>
                  <Text style={screenStyles.destinationMood}>{item.subtitle}</Text>
                  <Text style={screenStyles.destinationSubMood}>{item.mood}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={screenStyles.footer}>
            <PrimaryButton label="다음: 취향 고르기" onPress={() => setStep("preference")} />
          </View>
        </View>
      ) : null}

      {step === "preference" ? (
        <View style={screenStyles.singlePanel}>
          <Text style={screenStyles.step}>2. 여행 성향 선택</Text>
          <Text style={screenStyles.question}>어떤 여행을 원하세요?</Text>
          <Text style={screenStyles.hint}>먹고 싶은 것, 쉬고 싶은 정도, 누구랑 가는지까지 같이 고르면 코스가 달라져요.</Text>

          <View style={screenStyles.preferenceGrid}>
            {preferences.map((item) => {
              const selected = selectedPreferences.includes(item);
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => togglePreference(item)}
                  style={[screenStyles.preferenceItem, selected && screenStyles.selectedPreference]}
                >
                  <View style={[screenStyles.iconCircle, selected && screenStyles.selectedIconCircle]}>
                    <Text style={screenStyles.preferenceIcon}>{preferenceIcons[item]}</Text>
                  </View>
                  <Text style={[screenStyles.preferenceLabel, selected && screenStyles.selectedPreferenceLabel]} numberOfLines={2}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={screenStyles.footer}>
            <PrimaryButton
              label="다음: 숙소 위치 넣기"
              disabled={selectedPreferences.length === 0}
              onPress={() => setStep("details")}
            />
          </View>
        </View>
      ) : null}

      {step === "details" ? (
        <View style={screenStyles.singlePanel}>
          <Text style={screenStyles.step}>3. 숙소와 기본 조건</Text>
          <Text style={screenStyles.question}>숙소 기준으로 동선까지 맞춰볼게요</Text>
          <Text style={screenStyles.hint}>
            {destination} · {selectedPreferences.slice(0, 4).join(", ")}
          </Text>

          <ResultPromiseCard />

          <OptionGroup title={`${destination} 숙소 위치`}>
            {accommodationAreasByDestination[destination].map((item) => (
              <Chip key={item} label={item} selected={accommodationArea === item} onPress={() => setAccommodationArea(item)} />
            ))}
          </OptionGroup>

          <OptionGroup title="도착 시간">
            {arrivalTimes.map((item) => (
              <Chip key={item} label={item} selected={arrivalTime === item} onPress={() => setArrivalTime(item)} />
            ))}
          </OptionGroup>

          <OptionGroup title="출국 시간">
            {departureTimes.map((item) => (
              <Chip key={item} label={item} selected={departureTime === item} onPress={() => setDepartureTime(item)} />
            ))}
          </OptionGroup>

          <OptionGroup title="여행일수">
            {durations.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={duration === item}
                onPress={() => {
                  setDuration(item);
                  if (item === "당일치기") {
                    setArrivalTime("오전 도착");
                    setDepartureTime("밤 출국");
                  }
                }}
              />
            ))}
          </OptionGroup>

          <OptionGroup title="인원">
            {companions.map((item) => (
              <Chip key={item} label={item} selected={companion === item} onPress={() => setCompanion(item)} />
            ))}
          </OptionGroup>

          <OptionGroup title="예산">
            {budgets.map((item) => (
              <Chip key={item} label={item} selected={budget === item} onPress={() => setBudget(item)} />
            ))}
          </OptionGroup>

          <OptionGroup title="여행 스타일">
            {travelStyles.map((item) => (
              <Chip key={item} label={item} selected={style === item} onPress={() => setStyle(item)} />
            ))}
          </OptionGroup>

          <View style={screenStyles.textInputGroup}>
            <Text style={screenStyles.optionTitle}>꼭 가고 싶은 곳 <Text style={screenStyles.optionalText}>선택</Text></Text>
            <Text style={screenStyles.inputGuide}>입력하면 일정 안에 우선 반영해요.</Text>
            <TextInput
              value={mustVisit}
              onChangeText={setMustVisit}
              placeholder="예: 핑크성당, 반미 맛집, 루프탑바"
              placeholderTextColor={colors.muted}
              style={screenStyles.textInput}
            />
          </View>

          <View style={screenStyles.textInputGroup}>
            <Text style={screenStyles.optionTitle}>피하고 싶은 것 <Text style={screenStyles.optionalText}>선택</Text></Text>
            <Text style={screenStyles.inputGuide}>시장, 클럽, 긴 이동처럼 싫은 조건을 빼는 데 써요.</Text>
            <TextInput
              value={avoid}
              onChangeText={setAvoid}
              placeholder="예: 클럽, 시장, 너무 먼 거리"
              placeholderTextColor={colors.muted}
              style={screenStyles.textInput}
            />
          </View>

          <View style={screenStyles.footer}>
            <PrimaryButton label={`${destination} 코스 만들기`} onPress={generate} />
          </View>
        </View>
      ) : null}
    </AppShell>
  );
}

function StepIndicator({ current }: { current: PlannerStep }) {
  const steps: Array<{ key: PlannerStep; label: string }> = [
    { key: "destination", label: "여행지" },
    { key: "preference", label: "취향" },
    { key: "details", label: "숙소/조건" }
  ];
  const currentIndex = steps.findIndex((item) => item.key === current);

  return (
    <View style={screenStyles.stepIndicator}>
      {steps.map((item, index) => (
        <View key={item.key} style={screenStyles.stepItem}>
          <View style={[screenStyles.stepDot, index <= currentIndex && screenStyles.stepDotActive]}>
            <Text style={[screenStyles.stepDotText, index <= currentIndex && screenStyles.stepDotTextActive]}>{index + 1}</Text>
          </View>
          <Text style={[screenStyles.stepLabel, index <= currentIndex && screenStyles.stepLabelActive]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function OptionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={screenStyles.optionGroup}>
      <Text style={screenStyles.optionTitle}>{title}</Text>
      <View style={screenStyles.chipWrap}>{children}</View>
    </View>
  );
}

function ResultPromiseCard() {
  return (
    <View style={screenStyles.resultPromiseCard}>
      <Text style={screenStyles.resultPromiseTitle}>결과에 바로 나오는 것</Text>
      <View style={screenStyles.resultPromiseGrid}>
        <PromiseMini title="DAY별 시간표" copy="오전·점심·오후·저녁" />
        <PromiseMini title="숙소 기준 동선" copy="이동 시간·지도 링크" />
        <PromiseMini title="추천 이유" copy="한국어 후기·취향 근거" />
        <PromiseMini title="대체 후보" copy="마음에 안 들 때 교체" />
      </View>
    </View>
  );
}

function PromiseMini({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={screenStyles.promiseMini}>
      <Text style={screenStyles.promiseMiniTitle}>{title}</Text>
      <Text style={screenStyles.promiseMiniCopy}>{copy}</Text>
    </View>
  );
}

function getTitle(step: PlannerStep) {
  if (step === "destination") return "여행지 선택";
  if (step === "preference") return "여행 취향 선택";
  return "숙소와 조건 선택";
}

function normalizePreferences(values: Preference[]): Preference[] {
  const mapped = values.flatMap((item) => {
    if (item === "먹방") return ["맛집" as Preference, "먹방" as Preference];
    if (item === "로컬 감성") return ["로컬" as Preference, "로컬 감성" as Preference];
    if (item === "술/힙한바") return ["클럽/바" as Preference, "야경" as Preference, "술/힙한바" as Preference];
    if (item === "가라오케") return ["가라오케" as Preference, "클럽/바" as Preference, "야경" as Preference];
    if (item === "힐링/휴식") return ["마사지" as Preference, "카페" as Preference, "힐링/휴식" as Preference];
    if (item === "럭셔리") return ["쇼핑" as Preference, "야경" as Preference, "럭셔리" as Preference];
    return [item];
  });
  return Array.from(new Set(mapped));
}

const screenStyles = StyleSheet.create({
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 8,
    marginBottom: 14
  },
  stepItem: {
    alignItems: "center"
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.20)"
  },
  stepDotActive: {
    backgroundColor: colors.mintDark,
    borderColor: colors.mintDark
  },
  stepDotText: {
    color: colors.nightMuted,
    fontSize: 13,
    fontWeight: "900"
  },
  stepDotTextActive: {
    color: colors.midnight
  },
  stepLabel: {
    color: colors.nightMuted,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4
  },
  stepLabelActive: {
    color: colors.mintDark
  },
  singlePanel: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.22)",
    padding: 18,
    ...shadow
  },
  step: {
    color: colors.cyan,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  question: {
    color: colors.nightText,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 18
  },
  hint: {
    color: colors.nightMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6
  },
  resultPromiseCard: {
    backgroundColor: "rgba(255,122,0,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.24)",
    padding: 13,
    marginTop: 16
  },
  resultPromiseTitle: {
    color: colors.sunset,
    fontSize: 13,
    fontWeight: "900"
  },
  resultPromiseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  promiseMini: {
    width: "48%",
    minHeight: 66,
    borderRadius: 16,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)",
    padding: 10,
    justifyContent: "center"
  },
  promiseMiniTitle: {
    color: colors.nightText,
    fontSize: 12,
    fontWeight: "900"
  },
  promiseMiniCopy: {
    color: colors.nightMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 4
  },
  destinationList: {
    gap: 12,
    marginTop: 24
  },
  destinationItem: {
    minHeight: 92,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.18)",
    backgroundColor: "#FFF7DF",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 14
  },
  selectedDestination: {
    borderColor: colors.mintDark,
    backgroundColor: "rgba(255,194,51,0.14)"
  },
  destinationImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.line
  },
  destinationImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.42)",
    backgroundColor: "#FFF1C2"
  },
  destinationImageInitial: {
    color: colors.sunset,
    fontSize: 26,
    fontWeight: "900"
  },
  destinationTextWrap: {
    flex: 1
  },
  destinationName: {
    color: colors.nightText,
    fontSize: 22,
    fontWeight: "900"
  },
  destinationMood: {
    color: colors.nightMuted,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4
  },
  destinationSubMood: {
    color: colors.mintDark,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5
  },
  preferenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 20,
    marginTop: 24
  },
  preferenceItem: {
    width: "31%",
    alignItems: "center",
    minHeight: 86
  },
  selectedPreference: {
    transform: [{ scale: 1.03 }]
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.16)"
  },
  selectedIconCircle: {
    backgroundColor: colors.mint,
    borderColor: colors.mintDark
  },
  preferenceIcon: {
    fontSize: 24
  },
  preferenceLabel: {
    color: colors.nightText,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 7
  },
  selectedPreferenceLabel: {
    color: colors.mintDark
  },
  optionGroup: {
    marginTop: 22
  },
  optionTitle: {
    color: colors.nightText,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10
  },
  optionalText: {
    color: colors.nightMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  inputGuide: {
    color: colors.nightMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: -4,
    marginBottom: 8
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  textInputGroup: {
    marginTop: 18
  },
  textInput: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.20)",
    backgroundColor: "#FFF7DF",
    paddingHorizontal: 14,
    color: colors.nightText,
    fontSize: 15,
    fontWeight: "700"
  },
  footer: {
    gap: 12,
    marginTop: 24,
    marginBottom: 4
  }
});
