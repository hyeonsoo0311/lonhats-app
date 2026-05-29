import { AppCard, EmptyState, MetricCard, Pill, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { analyzeWeek } from "@/lib/analysis";
import { getWeeklyDaySummaries } from "@/lib/database";
import { useQuery } from "@tanstack/react-query";
import { Activity, Flame, TimerReset } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

export default function InsightsScreen() {
  const { profile, user } = useAuth();
  const userId = user?.id ?? "";
  const summariesQuery = useQuery({
    queryKey: ["weekly-summary", userId],
    queryFn: () => getWeeklyDaySummaries(userId),
    enabled: Boolean(userId)
  });
  const days = summariesQuery.data ?? [];
  const analysis = analyzeWeek({
    goalMode: profile?.goalMode ?? "maintain",
    dailyCalorieTarget: profile?.dailyCalorieTarget ?? 2050,
    days
  });

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
            label="평균 소모"
            value={`${analysis.averageCaloriesOut}`}
            helper={`${analysis.averageWorkoutMinutes}분 / day`}
            tone="mint"
          />
        </View>
      </View>

      <ScreenSection title="주간 흐름">
        {days.some((day) => day.caloriesIn || day.workoutMinutes) ? (
          <View style={{ gap: spacing.sm }}>
            {days.map((day) => (
              <View
                key={day.date}
                style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}
              >
                <Text
                  selectable
                  style={{ color: colors.ink, fontSize: 13, fontWeight: "900", width: 42 }}
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
        ) : (
          <EmptyState
            title="분석할 기록이 아직 부족합니다."
            body="운동과 식단을 저장하면 주간 흐름이 채워집니다."
          />
        )}
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
