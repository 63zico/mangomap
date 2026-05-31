import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { Header } from "../components/Header";
import { phrasebookSections } from "../data/phrasebook";
import { colors, shadow } from "../styles/theme";

export function TranslateScreen() {
  return (
    <AppShell withBottomNav>
      <Header eyebrow="번역 도우미" title="바로 보여주는 베트남어 카드" subtitle="택시, 식당, 마사지, 흥정, 응급상황 문장을 빠르게 꺼내요." compactMascot />

      {phrasebookSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.phrases.map((phrase) => (
            <View key={phrase.ko} style={styles.phrase}>
              <Text style={styles.ko}>{phrase.ko}</Text>
              <Text style={styles.vi}>{phrase.vi}</Text>
            </View>
          ))}
        </View>
      ))}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8
  },
  phrase: {
    backgroundColor: "#F8FAF8",
    borderRadius: 18,
    padding: 14,
    marginTop: 9
  },
  ko: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  vi: {
    color: colors.mintDark,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 5,
    fontWeight: "800"
  }
});
