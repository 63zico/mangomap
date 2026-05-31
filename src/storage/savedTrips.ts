import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SavedTrip } from "../types";

const STORAGE_KEY = "tripbuddy:vietnam:saved-trips";

export async function loadSavedTrips(): Promise<SavedTrip[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as SavedTrip[];
}

export async function saveTrip(trip: SavedTrip): Promise<SavedTrip[]> {
  const trips = await loadSavedTrips();
  const nextTrips = [trip, ...trips.filter((item) => item.id !== trip.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextTrips));
  return nextTrips;
}
