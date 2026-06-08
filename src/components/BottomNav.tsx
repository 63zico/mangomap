import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../styles/theme";
import type { ScreenName } from "../types";

const tabs: Array<{ key: ScreenName; label: string; icon: string }> = [
  { key: "places", label: "탐색", icon: "⌕" },
  { key: "home", label: "지도", icon: "⌖" },
  { key: "saved", label: "저장", icon: "♡" },
  { key: "my", label: "마이", icon: "●" }
];

type BottomNavProps = {
  active: ScreenName;
  onChange: (screen: ScreenName) => void;
  badges?: Partial<Record<ScreenName, number>>;
};

export function BottomNav({ active, onChange, badges = {} }: BottomNavProps) {
  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View style={styles.wrap}>
        {tabs.map((tab) => {
          const selected = active === tab.key;
          const badgeCount = badges[tab.key] ?? 0;
          return (
            <Pressable key={tab.key} accessibilityRole="button" onPress={() => onChange(tab.key)} style={[styles.item, selected && styles.itemActive]}>
              <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
                <Text style={[styles.icon, selected && styles.activeIcon]}>{tab.icon}</Text>
              </View>
              {badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
                </View>
              ) : null}
              <Text style={[styles.label, selected && styles.activeLabel]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center"
  },
  wrap: {
    width: "100%",
    maxWidth: 560,
    minHeight: 72,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.12)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 9,
    ...shadow
  },
  item: {
    flex: 1,
    maxWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    borderRadius: 22,
    position: "relative"
  },
  itemActive: {
    backgroundColor: "rgba(255,212,59,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,159,28,0.22)"
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  iconWrapActive: {
    backgroundColor: colors.cyan
  },
  icon: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "900"
  },
  activeIcon: {
    color: colors.ink
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4
  },
  activeLabel: {
    color: "#8A5A00"
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 18,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: "#FFF7DF"
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11
  }
});
