import {
  AppCard,
  EmptyState,
  MetricCard,
  Pill,
  SecondaryButton,
  ScreenSection
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { analyzeLifeDirection } from "@/lib/analysis";
import { defaultGaugeCriteria, gaugeRangeLabel, scoreToLifeTemperature } from "@/lib/gauge";
import {
  getAppNotices,
  getLatestBodyLog,
  getLifeGaugeCriteria,
  getLifeRoutines,
  getRoutineCheckins,
  getTodayLifeEntries,
  getTodayMealLogs,
  getTodayWorkoutLogs,
  getWeeklyLifeEntries
} from "@/lib/database";
import { stackLabels } from "@/lib/life";
import type { LifeStackKey } from "@/types/domain";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Brain,
  ChartNoAxesColumn,
  Droplets,
  Footprints,
  LogOut,
  Moon,
  SlidersHorizontal,
  Thermometer,
  UserRound,
  Utensils
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

const recordCards: {
  key: "meal" | "move" | "recovery" | "mind" | "body";
  title: string;
  route: "/fuel" | "/train" | "/recovery" | "/reflect" | "/body";
  icon: typeof Utensils;
}[] = [
  { key: "meal", title: "Meal", route: "/fuel", icon: Utensils },
  { key: "move", title: "Move", route: "/train", icon: Footprints },
  { key: "recovery", title: "Recovery", route: "/recovery", icon: Moon },
  { key: "mind", title: "Mind", route: "/reflect", icon: Brain },
  { key: "body", title: "Body", route: "/body", icon: UserRound }
];

const mealOrder = ["아침", "점심", "저녁", "간식"];

function formatMinutes(minutes: number | null) {
  if (!minutes) {
    return "0분";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) {
    return `${rest}분`;
  }

  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

function numberText(value: number | null | undefined, suffix: string) {
  return value === null || value === undefined ? "-" : `${value}${suffix}`;
}

export default function HomeScreen() {
  const { profile, signOut, user } = useAuth();
  const userId = user?.id ?? "";
  const displayName = profile?.displayName ?? user?.email ?? "사용자";

  const todayQuery = useQuery({
    queryKey: ["today-life", userId],
    queryFn: () => getTodayLifeEntries(userId),
    enabled: Boolean(userId)
  });
  const weeklyQuery = useQuery({
    queryKey: ["weekly-life", userId],
    queryFn: () => getWeeklyLifeEntries(userId),
    enabled: Boolean(userId)
  });
  const mealsQuery = useQuery({
    queryKey: ["today-meals", userId],
    queryFn: () => getTodayMealLogs(userId),
    enabled: Boolean(userId)
  });
  const workoutsQuery = useQuery({
    queryKey: ["today-workouts", userId],
    queryFn: () => getTodayWorkoutLogs(userId),
    enabled: Boolean(userId)
  });
  const latestBodyQuery = useQuery({
    queryKey: ["latest-body", userId],
    queryFn: () => getLatestBodyLog(userId),
    enabled: Boolean(userId)
  });
  const noticesQuery = useQuery({
    queryKey: ["app-notices"],
    queryFn: getAppNotices
  });
  const criteriaQuery = useQuery({
    queryKey: ["life-gauge-criteria", userId],
    queryFn: () => getLifeGaugeCriteria(userId),
    enabled: Boolean(userId)
  });
  const routinesQuery = useQuery({
    queryKey: ["life-routines", userId],
    queryFn: () => getLifeRoutines(userId),
    enabled: Boolean(userId)
  });
  const checkinsQuery = useQuery({
    queryKey: ["routine-checkins", userId],
    queryFn: () => getRoutineCheckins(userId),
    enabled: Boolean(userId)
  });

  const todayEntries = todayQuery.data ?? [];
  const weeklyEntries = weeklyQuery.data ?? [];
  const mealLogs = mealsQuery.data ?? [];
  const workoutLogs = workoutsQuery.data ?? [];
  const latestBody = latestBodyQuery.data;
  const report = analyzeLifeDirection(weeklyEntries, {
    routines: routinesQuery.data ?? [],
    routineCheckins: checkinsQuery.data ?? []
  });
  const criteria = criteriaQuery.data;
  const lifeTemperature = scoreToLifeTemperature(report.temperature);
  const temperatureMin = criteria?.temperatureMinC ?? defaultGaugeCriteria.temperatureMinC;
  const temperatureMax = criteria?.temperatureMaxC ?? defaultGaugeCriteria.temperatureMaxC;
  const humidityMin = criteria?.humidityMinPercent ?? defaultGaugeCriteria.humidityMinPercent;
  const humidityMax = criteria?.humidityMaxPercent ?? defaultGaugeCriteria.humidityMaxPercent;
  const calories = mealLogs.reduce((total, meal) => total + meal.calories, 0);
  const protein = Math.round(mealLogs.reduce((total, meal) => total + meal.proteinGram, 0));
  const workoutMinutes = workoutLogs.reduce((total, workout) => total + (workout.minutes ?? 0), 0);
  const sleepEntry = todayEntries.find(
    (entry) => entry.stack === "recovery" && entry.category === "수면"
  );
  const mindEntries = todayEntries.filter((entry) => entry.stack === "mind");
  const completedStacks = new Set(todayEntries.map((entry) => entry.stack));

  function recordSummary(key: (typeof recordCards)[number]["key"]) {
    if (key === "meal") {
      return mealLogs.length
        ? `${mealLogs.length}개 · ${calories}kcal · 단백질 ${protein}g`
        : "아침, 점심, 저녁, 간식을 남길 수 있습니다.";
    }

    if (key === "move") {
      return workoutLogs.length
        ? `${workoutLogs.length}개 · ${workoutMinutes}분`
        : "운동 종류, 시간, 강도, 의미를 남깁니다.";
    }

    if (key === "recovery") {
      return sleepEntry
        ? `수면 ${formatMinutes(sleepEntry.durationMinutes)}`
        : "취침, 기상, 수면 시간, 컨디션을 남깁니다.";
    }

    if (key === "mind") {
      return mindEntries.length
        ? `${mindEntries.length}개 · ${mindEntries[0]?.title ?? "Mind"}`
        : "독서, 공부, 회고, 프로젝트 시간을 남깁니다.";
    }

    return latestBody
      ? `체중 ${numberText(latestBody.weightKg, "kg")} · 체지방 ${numberText(
          latestBody.bodyFatPercent,
          "%"
        )}`
      : "신장, 체중, 골격근량, 체지방률을 개인 기록으로 남깁니다.";
  }

  function recordComplete(key: (typeof recordCards)[number]["key"]) {
    if (key === "body") {
      return Boolean(latestBody && latestBody.measuredOn === new Date().toISOString().slice(0, 10));
    }

    return completedStacks.has(key as LifeStackKey);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 12, fontWeight: "900" }}>
          LONHATS DAILY
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 34, fontWeight: "900" }}>
          {displayName}의 오늘
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 15, lineHeight: 22 }}>
          기록할 항목을 분명히 보고, 필요한 만큼만 남깁니다.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Thermometer}
            label="삶의 온도"
            value={`${lifeTemperature.toFixed(1)}°C`}
            helper={gaugeRangeLabel(lifeTemperature, temperatureMin, temperatureMax, "°C")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Droplets}
            label="삶의 습도"
            value={`${report.humidity}%`}
            helper={gaugeRangeLabel(report.humidity, humidityMin, humidityMax, "%")}
          />
        </View>
      </View>

      <ScreenSection title="오늘의 기준">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <ChartNoAxesColumn color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
                기준 완료율 {report.routineScore}%
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {report.message}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {report.routineSignals.length ? (
              report.routineSignals
                .slice(0, 4)
                .map((signal) => (
                  <Pill
                    key={signal.routineId}
                    label={`${signal.title} ${signal.actualCount}/${signal.expectedCount}`}
                    active={signal.progress >= 80}
                  />
                ))
            ) : (
              <Pill label="기준을 추가하면 완료율이 계산됩니다." />
            )}
          </View>
          <View style={{ alignItems: "flex-start" }}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push("/criteria")}
              style={({ pressed }) => ({
                alignItems: "center",
                flexDirection: "row",
                gap: spacing.xs,
                opacity: pressed ? 0.62 : 1,
                paddingVertical: spacing.xs
              })}
            >
              <SlidersHorizontal color={colors.ink} size={14} strokeWidth={2.4} />
              <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>기준 조정</Text>
            </Pressable>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="오늘 기록">
        <View style={{ gap: spacing.sm }}>
          {recordCards.map((card) => {
            const Icon = card.icon;
            const complete = recordComplete(card.key);

            return (
              <Pressable
                key={card.key}
                accessibilityRole="button"
                onPress={() => router.push(card.route)}
              >
                <AppCard tone="plain">
                  <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                    <Icon color={colors.ink} size={22} strokeWidth={2.4} />
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text
                        selectable
                        style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}
                      >
                        {card.title}
                      </Text>
                      <Text
                        selectable
                        style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}
                      >
                        {recordSummary(card.key)}
                      </Text>
                    </View>
                    <Pill label={complete ? "완료" : "추가"} active={complete} />
                  </View>
                </AppCard>
              </Pressable>
            );
          })}
        </View>
      </ScreenSection>

      <ScreenSection title="끼니 요약">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {mealOrder.map((type) => {
              const typedLogs = mealLogs.filter((meal) => meal.mealType === type);

              return (
                <Pill
                  key={type}
                  label={`${type} ${typedLogs.length ? `${typedLogs.length}개` : "비어 있음"}`}
                  active={typedLogs.length > 0}
                />
              );
            })}
          </View>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
            {mealLogs.length
              ? `오늘 ${calories}kcal, 단백질 ${protein}g을 기록했습니다.`
              : "끼니별로 음식명과 g 단위를 남기면 영양 기준이 선명해집니다."}
          </Text>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="오늘 남긴 것">
        {todayEntries.length ? (
          todayEntries.slice(0, 5).map((entry) => (
            <AppCard key={entry.id} tone="plain">
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {stackLabels[entry.stack]} · {entry.title}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {entry.meaning ?? entry.note ?? "의미 기록이 비어 있습니다."}
              </Text>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 오늘 남긴 것이 없습니다."
            body="Meal, Move, Recovery, Mind, Body 중 하나부터 시작하세요."
          />
        )}
      </ScreenSection>

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
            body="관리자는 Supabase Dashboard에서 공지를 추가할 수 있습니다."
          />
        )}
      </ScreenSection>

      <SecondaryButton icon={LogOut} label="로그아웃" onPress={signOut} />
    </ScrollView>
  );
}
