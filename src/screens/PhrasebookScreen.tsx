import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { phrasebookSections } from "../data/phrasebook";
import { colors, shadow } from "../styles/theme";

type PhrasebookScreenProps = {
  onBack: () => void;
};

export function PhrasebookScreen({ onBack }: PhrasebookScreenProps) {
  return (
    <AppShell>
      <TopBar title="베트남어 도움말" onBack={onBack} />
      <Text style={styles.lead}>처음 가도 바로 보여주고 읽을 수 있는 문장만 모았어요.</Text>

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
  lead: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 8
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10
  },
  phrase: {
    backgroundColor: "#F8FAF8",
    borderRadius: 16,
    padding: 14,
    marginTop: 10
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
    marginTop: 6,
    fontWeight: "700"
  }
});
