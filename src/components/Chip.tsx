import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../styles/theme";

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.20)",
    marginRight: 8,
    marginBottom: 10
  },
  selected: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan
  },
  text: {
    color: colors.nightText,
    fontSize: 15,
    fontWeight: "700"
  },
  selectedText: {
    color: colors.midnight
  },
  pressed: {
    transform: [{ scale: 0.97 }]
  }
});
