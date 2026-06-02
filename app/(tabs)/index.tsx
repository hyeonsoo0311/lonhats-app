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
import { analyzeLifeDirection } from "@/lib/analysis";
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
  NotebookPen,
  SlidersHorizontal,
  Thermometer,
  Utensils
} from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

const stacks: {
  key: LifeStackKey;
  route: "/train" | "/fuel" | "/recovery" | "/reflect";
  cta: string;
  icon: typeof Footprints;
  tone: "mint" | "blush" | "sky" | "amber";
}[] = [
  { key: "move", route: "/train", cta: "Move 기록", icon: Footprints, tone: "mint" },
  { key: "meal", route: "/fuel", cta: "Meal 기록", icon: Utensils, tone: "blush" },
  { key: "recovery", route: "/recovery", cta: "Recovery 기록", icon: Moon, tone: "sky" },
  { key: "mind", route: "/reflect", cta: "Mind 기록", icon: Brain, tone: "amber" }
];

function gaugeHelper(current: number, target?: number) {
  if (typeof target !== "number") {
    return "나의 기준을 설정할 수 있습니다";
  }

  const gap = current - target;

  if (Math.abs(gap) <= 8) {
    return `내 기준 ${target}에 가깝습니다`;
  }

  return gap > 0 ? `내 기준 ${target}보다 높습니다` : `내 기준 ${target}보다 낮습니다`;
}

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
        <Text selectable style={{ color: colors.ink, fontSize: 30, fontWeight: "900" }}>
          {displayName}의 오늘
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 15, lineHeight: 22 }}>
          론하츠는 삶을 평가하지 않고 살핍니다. 기록을 통해 내가 정한 온도와 습도를 확인합니다.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Thermometer}
            label="삶의 온도"
            value={`${report.temperature}°`}
            helper={gaugeHelper(report.temperature, criteria?.targetTemperature)}
            tone="mint"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Droplets}
            label="삶의 습도"
            value={`${report.humidity}%`}
            helper={gaugeHelper(report.humidity, criteria?.targetHumidity)}
            tone="sky"
          />
        </View>
      </View>

      <ScreenSection title="Stack 기록">
        <View style={{ gap: spacing.sm }}>
          {stacks.map((stack) => {
            const Icon = stack.icon;
            const todayCount = todayEntries.filter((entry) => entry.stack === stack.key).length;

            return (
              <AppCard key={stack.key} tone={stack.tone}>
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
                <PrimaryButton
                  icon={stack.icon}
                  label={stack.cta}
                  onPress={() => router.push(stack.route)}
                />
              </AppCard>
            );
          })}
        </View>
      </ScreenSection>

      <ScreenSection title="오늘 남긴 기록">
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
            title="아직 오늘의 기록이 없습니다."
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
          <PrimaryButton
            icon={ChartNoAxesColumn}
            label="Report 보기"
            onPress={() => router.push("/insights")}
          />
          <SecondaryButton
            icon={SlidersHorizontal}
            label="나의 기준 보기"
            onPress={() => router.push("/criteria")}
          />
        </AppCard>
      </ScreenSection>

      <ScreenSection title="하루 정리">
        <AppCard tone="amber">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <NotebookPen color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                조금 더 길게 남기고 싶은 날
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                Stack 기록보다 긴 마음과 생각은 일기에 따로 보관합니다.
              </Text>
            </View>
          </View>
          <PrimaryButton
            icon={NotebookPen}
            label="일기 쓰기"
            onPress={() => router.push("/diary")}
          />
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
