import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../styles/theme";

type AppShellProps = PropsWithChildren<{
  scroll?: boolean;
  withBottomNav?: boolean;
  backgroundColor?: string;
  maxWidth?: number;
  horizontalPadding?: number;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AppShell({
  children,
  scroll = true,
  withBottomNav,
  backgroundColor,
  maxWidth = 560,
  horizontalPadding = 20,
  contentStyle
}: AppShellProps) {
  const content = <View style={[styles.content, { maxWidth, paddingHorizontal: horizontalPadding }, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView style={[styles.safeArea, backgroundColor ? { backgroundColor } : null]}>
      <View pointerEvents="none" style={styles.mangoWash} />
      <View pointerEvents="none" style={styles.softDivider} />
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, withBottomNav && styles.navPadding]} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.fixedContent, withBottomNav && styles.navPadding]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
    overflow: "hidden"
  },
  mangoWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cream
  },
  softDivider: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: "rgba(24,32,42,0.08)"
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    zIndex: 1
  },
  fixedContent: {
    flex: 1,
    alignItems: "center",
    zIndex: 1
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  navPadding: {
    paddingBottom: 112
  }
});
