import { StyleSheet, Text, View } from "react-native";

import { Mascot } from "./Mascot";
import { colors } from "../styles/theme";

type HeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  compactMascot?: boolean;
  dark?: boolean;
};

export function Header({ eyebrow, title, subtitle, compactMascot, dark }: HeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, dark && styles.eyebrowDark]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, dark && styles.subtitleDark]}>{subtitle}</Text> : null}
      </View>
      <View style={compactMascot ? styles.smallMascot : styles.mascot}>
        <Mascot compact={compactMascot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 5
  },
  title: {
    color: colors.nightText,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "900",
    flexShrink: 1
  },
  subtitle: {
    color: colors.nightMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
    flexShrink: 1
  },
  eyebrowDark: {
    color: colors.cyan,
    textShadowColor: "rgba(255,194,51,0.38)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12
  },
  titleDark: {
    color: colors.nightText
  },
  subtitleDark: {
    color: colors.nightMuted
  },
  mascot: {
    width: 152,
    alignItems: "center",
    flexShrink: 0
  },
  smallMascot: {
    width: 92,
    alignItems: "center",
    flexShrink: 0
  }
});
