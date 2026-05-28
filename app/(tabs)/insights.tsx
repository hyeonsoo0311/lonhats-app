import { AppCard, MetricCard, Pill, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { weekDays } from "@/data/mock-data";
import { analyzeWeek } from "@/lib/analysis";
import { Activity, Flame, TimerReset } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

export default function InsightsScreen() {
  const analysis = analyzeWeek({ goalMode: "cut", dailyCalorieTarget: 2050, days: weekDays });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Flame}
            label="평균 섭취"
            value={`${analysis.averageCaloriesIn}`}
            helper="kcal / day"
            tone="blush"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Activity}
            label="평균 운동"
            value={`${analysis.averageWorkoutMinutes}분`}
            helper="day average"
            tone="mint"
          />
        </View>
      </View>

      <ScreenSection title="주간 흐름">
        <View style={{ gap: spacing.sm }}>
          {weekDays.map((day) => (
            <View
              key={day.date}
              style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}
            >
              <Text
                selectable
                style={{ color: colors.ink, fontSize: 13, fontWeight: "900", width: 22 }}
              >
                {day.date}
              </Text>
              <View
                style={{
                  backgroundColor: colors.mint,
                  borderRadius: 999,
                  flex: 1,
                  height: 12,
                  overflow: "hidden"
                }}
              >
                <View
                  style={{
                    backgroundColor: colors.moss,
                    height: 12,
                    width: `${Math.min(day.workoutMinutes / 75, 1) * 100}%`
                  }}
                />
              </View>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 12, width: 42 }}>
                {day.workoutMinutes}분
              </Text>
            </View>
          ))}
        </View>
      </ScreenSection>

      <ScreenSection title="다음 주 추천">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TimerReset color={colors.tomato} size={23} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                하루 {Math.abs(analysis.recommendedDailyCalorieAdjustment)}kcal 조정
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {analysis.message}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <Pill label={`운동 +${analysis.recommendedWeeklyWorkoutMinutes}분/주`} active />
                <Pill label="수면 리듬 체크" />
              </View>
            </View>
          </View>
        </AppCard>
      </ScreenSection>
    </ScrollView>
  );
}
