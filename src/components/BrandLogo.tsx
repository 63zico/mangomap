import { Image, StyleSheet, View } from "react-native";

import { colors, shadow } from "../styles/theme";

const mangoMapLogo = require("../../assets/mango-map-logo.jpg");

type BrandLogoProps = {
  size?: number;
  framed?: boolean;
};

export function BrandLogo({ size = 132, framed = true }: BrandLogoProps) {
  const radius = Math.max(16, Math.round(size * 0.18));

  return (
    <View
      accessibilityLabel="MANGOMAP 로고"
      style={[styles.wrap, framed && styles.framed, { width: size, height: size, borderRadius: radius }]}
    >
      <Image source={mangoMapLogo} resizeMode="contain" style={[styles.image, { borderRadius: radius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.card
  },
  framed: {
    borderWidth: 1,
    borderColor: "rgba(183,121,0,0.14)",
    ...shadow
  },
  image: {
    width: "100%",
    height: "100%"
  }
});
