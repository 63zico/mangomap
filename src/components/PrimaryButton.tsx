import { Pressable, StyleSheet, Text } from "react-native";

import { colors, sunsetGlow } from "../styles/theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  tone?: "primary" | "light" | "coral";
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, tone = "primary", disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={(state) => {
        const hovered = Boolean((state as unknown as { hovered?: boolean }).hovered);
        return [
          styles.button,
          styles[tone],
          tone === "primary" && styles.primaryGlow,
          tone === "coral" && styles.sunsetGlow,
          disabled && styles.disabled,
          hovered && !disabled && styles.hovered,
          state.pressed && !disabled && styles.pressed
        ];
      }}
    >
      <Text style={[styles.label, tone === "light" && styles.lightLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    borderWidth: 1
  },
  primary: {
    backgroundColor: colors.sunset,
    borderColor: "rgba(255,216,189,0.40)"
  },
  coral: {
    backgroundColor: colors.sunset,
    borderColor: "rgba(255,216,189,0.40)"
  },
  light: {
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "rgba(255,194,51,0.24)"
  },
  primaryGlow: {
    ...sunsetGlow
  },
  sunsetGlow: {
    ...sunsetGlow
  },
  label: {
    color: "#FFF7F0",
    fontSize: 17,
    fontWeight: "900"
  },
  lightLabel: {
    color: colors.nightText
  },
  disabled: {
    opacity: 0.45
  },
  hovered: {
    transform: [{ scale: 1.015 }]
  },
  pressed: {
    transform: [{ scale: 0.97 }]
  }
});
