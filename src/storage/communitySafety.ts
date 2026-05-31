import AsyncStorage from "@react-native-async-storage/async-storage";

import { isSupabaseConfigured, supabaseInsert, supabaseSelect, supabaseUpsert } from "../services/supabaseClient";

const STORAGE_KEY = "mangomap:community-safety-actions";

export type SafetyTargetType = "meetup" | "market_item" | "message" | "profile" | "place_report" | "community_post" | "community_comment";

export type SafetyAction = {
  id: string;
  type: "report" | "block";
  targetType: SafetyTargetType;
  targetId: string;
  targetName: string;
  reporterId: string;
  reason: string;
  createdAt: string;
};

type UserBlockRow = {
  blocker_auth_uid: string;
  blocked_auth_uid: string;
};

async function loadLocalActions() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SafetyAction[]) : [];
}

export async function loadBlockedTargetIds(targetType?: SafetyTargetType, reporterId?: string) {
  const actions = await loadLocalActions();
  const localIds = actions
    .filter((action) => action.type === "block" && (!targetType || action.targetType === targetType) && (!reporterId || action.reporterId === reporterId))
    .map((action) => action.targetId);

  if (!isSupabaseConfigured() || targetType !== "profile" || !reporterId) return localIds;

  try {
    const rows = await supabaseSelect<UserBlockRow>(
      "user_blocks",
      `select=blocked_auth_uid&blocker_auth_uid=eq.${encodeURIComponent(reporterId)}`
    );
    return Array.from(new Set([...localIds, ...rows.map((row) => row.blocked_auth_uid)]));
  } catch {
    return localIds;
  }
}

async function saveLocalAction(action: SafetyAction) {
  const actions = await loadLocalActions();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([action, ...actions.filter((item) => item.id !== action.id)]));
}

export async function saveSafetyAction(action: SafetyAction) {
  await saveLocalAction(action);

  if (!isSupabaseConfigured()) return;

  try {
    if (action.type === "report") {
      await supabaseInsert("content_reports", {
        reporter_auth_uid: action.reporterId,
        target_type: action.targetType,
        target_id: action.targetId,
        reason: action.reason,
        status: "open"
      });
    }

    if (action.type === "block" && action.targetType === "profile") {
      await supabaseUpsert("user_blocks", {
        blocker_auth_uid: action.reporterId,
        blocked_auth_uid: action.targetId
      }, "blocker_auth_uid,blocked_auth_uid");
    }
  } catch {
    // Local fallback keeps the UX responsive until auth RLS/JWT is connected.
  }
}
