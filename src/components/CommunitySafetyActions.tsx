import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { saveSafetyAction, type SafetyTargetType } from "../storage/communitySafety";
import { colors } from "../styles/theme";

type CommunitySafetyActionsProps = {
  reporterId?: string;
  targetType: SafetyTargetType;
  targetId: string;
  targetName: string;
  blockTargetType?: SafetyTargetType;
  blockTargetId?: string;
  onRequireAuth?: () => void;
  onBlock?: (targetId: string) => void;
};

export function CommunitySafetyActions({ reporterId, targetType, targetId, targetName, blockTargetType, blockTargetId, onRequireAuth, onBlock }: CommunitySafetyActionsProps) {
  const [status, setStatus] = useState("");

  const submitAction = async (type: "report" | "block") => {
    if (!reporterId) {
      onRequireAuth?.();
      return;
    }

    const actionTargetType = type === "block" ? (blockTargetType ?? targetType) : targetType;
    const actionTargetId = type === "block" ? (blockTargetId ?? targetId) : targetId;

    await saveSafetyAction({
      id: `${type}-${targetType}-${targetId}-${Date.now()}`,
      type,
      targetType: actionTargetType,
      targetId: actionTargetId,
      targetName,
      reporterId,
      reason: type === "report" ? "사용자 신고" : "사용자 차단",
      createdAt: new Date().toISOString()
    });

    if (type === "block") onBlock?.(actionTargetId);
    setStatus(type === "report" ? "신고가 접수됐어요" : "차단했어요");
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => submitAction("report")} style={styles.button}>
          <Text style={styles.buttonText}>신고</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => submitAction("block")} style={styles.button}>
          <Text style={styles.buttonText}>차단</Text>
        </Pressable>
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6
  },
  button: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(11,30,45,0.12)",
    backgroundColor: "rgba(255,255,255,0.82)",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  buttonText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  status: {
    color: colors.sunset,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "right"
  }
});
