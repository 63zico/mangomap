import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../styles/theme";

type TopBarProps = {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
};

export function TopBar({ title, onBack, rightLabel, onRightPress }: TopBarProps) {
  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.side}>
        <Text style={styles.back}>{onBack ? "‹" : ""}</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Pressable accessibilityRole="button" onPress={onRightPress} style={styles.side}>
        <Text style={styles.right}>{rightLabel ?? ""}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  side: {
    width: 72,
    minHeight: 44,
    justifyContent: "center"
  },
  back: {
    color: colors.nightText,
    fontSize: 38,
    fontWeight: "600"
  },
  title: {
    color: colors.nightText,
    fontSize: 18,
    fontWeight: "900"
  },
  right: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right"
  }
});
