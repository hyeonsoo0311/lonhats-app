import { AppCard, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { diaryPrompts } from "@/data/mock-data";
import { NotebookPen, Save } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

const moods = ["담담함", "뿌듯함", "흔들림", "가벼움"];

export default function ReflectScreen() {
  const [mood, setMood] = useState("담담함");
  const [entry, setEntry] = useState("오늘은 대단하진 않았지만 도망가지 않았다.");

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="오늘의 나">
        <AppCard tone="sky">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <NotebookPen color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text selectable style={{ color: colors.ink, fontSize: 19, fontWeight: "900" }}>
                {diaryPrompts[0]}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                운동을 못 한 날에도 남길 수 있는 기록이 있어야 루틴이 끊기지 않습니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="기분">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {moods.map((item) => (
            <Pressable key={item} accessibilityRole="button" onPress={() => setMood(item)}>
              <Pill label={item} active={item === mood} />
            </Pressable>
          ))}
        </View>
      </ScreenSection>

      <ScreenSection title="한 줄 일기">
        <TextInput
          multiline
          value={entry}
          onChangeText={setEntry}
          placeholder="오늘의 나를 짧게 남겨주세요."
          placeholderTextColor={colors.mutedInk}
          style={{
            backgroundColor: colors.white,
            borderColor: colors.line,
            borderRadius: 14,
            borderWidth: 1,
            color: colors.ink,
            fontSize: 17,
            minHeight: 132,
            padding: spacing.md,
            textAlignVertical: "top"
          }}
        />
        <PrimaryButton icon={Save} label="오늘 기록 저장" />
      </ScreenSection>
    </ScrollView>
  );
}
