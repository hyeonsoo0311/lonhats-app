import { AppCard, MetricCard, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { mealEntries, todayWorkout, weekDays } from "@/data/mock-data";
import { analyzeWeek, sumMealCalories } from "@/lib/analysis";
import { Flame, NotebookPen, Plus, Target, Trophy } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

export default function TodayScreen() {
  const workoutMinutes = todayWorkout.reduce((total, item) => total + (item.minutes ?? 12), 0);
  const calories = sumMealCalories(mealEntries);
  const weekly = analyzeWeek({ goalMode: "cut", dailyCalorieTarget: 2050, days: weekDays });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 14, fontWeight: "800" }}>
          BETTER TODAY
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 34, fontWeight: "900" }}>
          어제보다 1mm 나은 오늘
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 15, lineHeight: 22 }}>
          완벽한 하루보다 다시 돌아오는 하루를 기록합니다.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Trophy}
            label="운동"
            value={`${workoutMinutes}분`}
            helper="오늘 루틴 예상 시간"
            tone="mint"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Flame}
            label="섭취"
            value={`${calories}`}
            helper="기록된 칼로리"
            tone="blush"
          />
        </View>
      </View>

      <ScreenSection title="오늘의 작은 승리">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Target color={colors.tomato} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                기록을 남긴 것만으로도 루틴은 이어졌습니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                주간 평균은 목표보다 {Math.abs(weekly.calorieDeltaFromTarget)}kcal 차이입니다. 이번
                주는 조급함보다 반복에 집중합니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="바로 기록">
        <View style={{ gap: spacing.sm }}>
          <PrimaryButton icon={Plus} label="운동 루틴 추가" />
          <PrimaryButton icon={NotebookPen} label="오늘의 한 줄 남기기" />
        </View>
      </ScreenSection>
    </ScrollView>
  );
}
