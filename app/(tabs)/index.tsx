import {
  AppCard,
  EmptyState,
  MetricCard,
  PrimaryButton,
  SecondaryButton,
  ScreenSection
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { getAppNotices, getTodayMealLogs, getTodayWorkoutLogs } from "@/lib/database";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Flame, LogOut, NotebookPen, Plus, Target, Trophy } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

export default function TodayScreen() {
  const { profile, signOut, user } = useAuth();
  const userId = user?.id ?? "";
  const displayName = profile?.displayName ?? user?.email ?? "멤버";
  const workoutsQuery = useQuery({
    queryKey: ["today-workouts", userId],
    queryFn: () => getTodayWorkoutLogs(userId),
    enabled: Boolean(userId)
  });
  const mealsQuery = useQuery({
    queryKey: ["today-meals", userId],
    queryFn: () => getTodayMealLogs(userId),
    enabled: Boolean(userId)
  });
  const noticesQuery = useQuery({
    queryKey: ["app-notices"],
    queryFn: getAppNotices
  });
  const workoutMinutes = (workoutsQuery.data ?? []).reduce(
    (total, item) => total + (item.minutes ?? 0),
    0
  );
  const caloriesOut = (workoutsQuery.data ?? []).reduce(
    (total, item) => total + (item.estimatedCalories ?? 0),
    0
  );
  const calories = (mealsQuery.data ?? []).reduce((total, item) => total + item.calories, 0);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
        <Text selectable style={{ color: colors.moss, fontSize: 14, fontWeight: "900" }}>
          lonhats
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 32, fontWeight: "900" }}>
          {displayName}의 오늘
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 15, lineHeight: 22 }}>
          운동, 식단, 기록이 이제 계정에 저장됩니다.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Trophy}
            label="운동"
            value={`${workoutMinutes}분`}
            helper={`예상 소모 ${caloriesOut}kcal`}
            tone="mint"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Flame}
            label="섭취"
            value={`${calories}`}
            helper="오늘 저장된 칼로리"
            tone="blush"
          />
        </View>
      </View>

      <ScreenSection title="공지">
        {(noticesQuery.data ?? []).length ? (
          (noticesQuery.data ?? []).map((notice) => (
            <AppCard key={notice.id} tone={notice.priority === "important" ? "amber" : "plain"}>
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {notice.title}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {notice.body}
              </Text>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 공지가 없습니다."
            body="관리자는 Supabase Dashboard에서 공지를 올릴 수 있습니다."
          />
        )}
      </ScreenSection>

      <ScreenSection title="오늘의 작은 승리">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Target color={colors.tomato} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                기록이 쌓이면 내일의 추천이 정확해집니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                오늘 저장한 식단과 운동은 주간 분석과 관리자 운영 데이터의 기반이 됩니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="바로 기록">
        <View style={{ gap: spacing.sm }}>
          <PrimaryButton icon={Plus} label="운동 기록" onPress={() => router.push("/train")} />
          <PrimaryButton
            icon={NotebookPen}
            label="오늘의 한 줄"
            onPress={() => router.push("/reflect")}
          />
          <SecondaryButton icon={LogOut} label="로그아웃" onPress={signOut} />
        </View>
      </ScreenSection>
    </ScrollView>
  );
}
