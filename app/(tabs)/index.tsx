import { AppCard, EmptyState, MetricCard, SecondaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { analyzeLifeDirection } from "@/lib/analysis";
import { defaultGaugeCriteria, gaugeRangeLabel, scoreToLifeTemperature } from "@/lib/gauge";
import {
  getAppNotices,
  getLifeGaugeCriteria,
  getTodayLifeEntries,
  getWeeklyLifeEntries
} from "@/lib/database";
import { stackDescriptions, stackLabels } from "@/lib/life";
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
  Utensils
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

const stacks: {
  key: LifeStackKey;
  icon: typeof Footprints;
}[] = [
  { key: "move", icon: Footprints },
  { key: "meal", icon: Utensils },
  { key: "recovery", icon: Moon },
  { key: "mind", icon: Brain }
];

export default function TodayScreen() {
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
  const noticesQuery = useQuery({
    queryKey: ["app-notices"],
    queryFn: getAppNotices
  });
  const criteriaQuery = useQuery({
    queryKey: ["life-gauge-criteria", userId],
    queryFn: () => getLifeGaugeCriteria(userId),
    enabled: Boolean(userId)
  });

  const todayEntries = todayQuery.data ?? [];
  const weeklyEntries = weeklyQuery.data ?? [];
  const report = analyzeLifeDirection(weeklyEntries);
  const criteria = criteriaQuery.data;
  const lifeTemperature = scoreToLifeTemperature(report.temperature);
  const temperatureMin = criteria?.temperatureMinC ?? defaultGaugeCriteria.temperatureMinC;
  const temperatureMax = criteria?.temperatureMaxC ?? defaultGaugeCriteria.temperatureMaxC;
  const humidityMin = criteria?.humidityMinPercent ?? defaultGaugeCriteria.humidityMinPercent;
  const humidityMax = criteria?.humidityMaxPercent ?? defaultGaugeCriteria.humidityMaxPercent;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 12, fontWeight: "900" }}>
          LONHATS
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 34, fontWeight: "900" }}>
          {displayName}의 오늘
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 15, lineHeight: 22 }}>
          작은 것을 쌓고, 필요할 때만 나눕니다. 비교가 아니라 방향을 봅니다.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Thermometer}
            label="삶의 온도"
            value={`${lifeTemperature.toFixed(1)}°C`}
            helper={gaugeRangeLabel(lifeTemperature, temperatureMin, temperatureMax, "°C")}
            tone="mint"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Droplets}
            label="삶의 습도"
            value={`${report.humidity}%`}
            helper={gaugeRangeLabel(report.humidity, humidityMin, humidityMax, "%")}
            tone="sky"
          />
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
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

      <ScreenSection title="Stack">
        <View style={{ gap: spacing.sm }}>
          {stacks.map((stack) => {
            const Icon = stack.icon;
            const todayCount = todayEntries.filter((entry) => entry.stack === stack.key).length;

            return (
              <AppCard key={stack.key} tone="plain">
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Icon color={colors.ink} size={22} strokeWidth={2.4} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                      {stackLabels[stack.key]}
                    </Text>
                    <Text
                      selectable
                      style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}
                    >
                      {stackDescriptions[stack.key]} · 오늘 {todayCount}개
                    </Text>
                  </View>
                </View>
              </AppCard>
            );
          })}
        </View>
      </ScreenSection>

      <ScreenSection title="오늘 쌓은 것">
        {todayEntries.length ? (
          todayEntries.slice(0, 6).map((entry) => (
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
            title="아직 오늘 쌓은 것이 없습니다."
            body="한 줄이라도 남기면 오늘의 온도와 습도가 생깁니다."
          />
        )}
      </ScreenSection>

      <ScreenSection title="주간 방향">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <ChartNoAxesColumn color={colors.tomato} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                루틴 점수 {report.routineScore}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {report.message}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-start" }}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push("/insights")}
              style={({ pressed }) => ({
                alignItems: "center",
                flexDirection: "row",
                gap: spacing.xs,
                opacity: pressed ? 0.62 : 1,
                paddingVertical: spacing.xs
              })}
            >
              <ChartNoAxesColumn color={colors.ink} size={14} strokeWidth={2.4} />
              <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
                Report 보기
              </Text>
            </Pressable>
          </View>
        </AppCard>
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
