import { AppCard, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { exerciseLibrary, todayWorkout } from "@/data/mock-data";
import { Dumbbell, Save } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

export default function TrainScreen() {
  const [memo, setMemo] = useState("무릎 컨디션 체크하면서 하체 루틴");

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="오늘 루틴">
        {todayWorkout.map((item) => (
          <AppCard key={item.exerciseName} tone="plain">
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}
            >
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                  {item.exerciseName}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 14 }}>
                  {item.minutes
                    ? `${item.minutes}분`
                    : `${item.sets}세트 x ${item.reps}회${item.loadKg ? ` · ${item.loadKg}kg` : ""}`}
                </Text>
              </View>
              <Dumbbell color={colors.moss} size={22} strokeWidth={2.4} />
            </View>
          </AppCard>
        ))}
      </ScreenSection>

      <ScreenSection title="루틴 메모">
        <TextInput
          multiline
          value={memo}
          onChangeText={setMemo}
          placeholder="오늘의 운동 느낌을 남겨주세요."
          placeholderTextColor={colors.mutedInk}
          style={{
            backgroundColor: colors.white,
            borderColor: colors.line,
            borderRadius: 14,
            borderWidth: 1,
            color: colors.ink,
            fontSize: 16,
            minHeight: 104,
            padding: spacing.md,
            textAlignVertical: "top"
          }}
        />
        <PrimaryButton icon={Save} label="루틴 저장" />
      </ScreenSection>

      <ScreenSection title="동작 라이브러리" action="3개 동작">
        {exerciseLibrary.map((exercise) => (
          <AppCard key={exercise.id} tone={exercise.level === "beginner" ? "mint" : "sky"}>
            <View style={{ gap: spacing.sm }}>
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}
              >
                <Text
                  selectable
                  style={{ color: colors.ink, flex: 1, fontSize: 18, fontWeight: "900" }}
                >
                  {exercise.name}
                </Text>
                <Pill label={exercise.target} />
              </View>
              <Text selectable style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>
                {exercise.purpose}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                체크 포인트: {exercise.cue}
              </Text>
            </View>
          </AppCard>
        ))}
      </ScreenSection>
    </ScrollView>
  );
}
