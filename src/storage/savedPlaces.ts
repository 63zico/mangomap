import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "tripbuddy:vietnam:saved-place-ids";

export async function loadSavedPlaceIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

export async function savePlaceIds(placeIds: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(placeIds));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueIds));
  return uniqueIds;
}
