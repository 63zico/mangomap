import { StyleSheet, Text, View } from "react-native";

import { colors } from "../styles/theme";

type SectionTitleProps = {
  title: string;
  hint?: string;
};

export function SectionTitle({ title, hint }: SectionTitleProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginBottom: 10
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  }
});
