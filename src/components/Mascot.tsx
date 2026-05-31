import { StyleSheet, View } from "react-native";

import { BrandLogo } from "./BrandLogo";

type MascotProps = {
  compact?: boolean;
};

export function Mascot({ compact }: MascotProps) {
  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      <BrandLogo size={compact ? 92 : 152} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 152,
    height: 152,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10
  },
  compactWrap: {
    width: 92,
    height: 92,
    marginVertical: -10,
    marginHorizontal: -10
  }
});
