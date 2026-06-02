import { AppCard, EmptyState, MetricCard, Pill, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { analyzeLifeDirection } from "@/lib/analysis";
import { getWeeklyLifeEntries } from "@/lib/database";
import { stackDescriptions, stackLabels } from "@/lib/life";
import type { LifeStackKey } from "@/types/domain";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  ChartNoAxesColumn,
  Droplets,
  Footprints,
  Moon,
  Thermometer,
  Utensils
} from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

const stackIcons: Record<LifeStackKey, typeof Footprints> = {
  move: Footprints,
  meal: Utensils,
  recovery: Moon,
  mind: Brain
};

export default function InsightsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const weeklyQuery = useQuery({
    queryKey: ["weekly-life", userId],
    queryFn: () => getWeeklyLifeEntries(userId),
    enabled: Boolean(userId)
  });
  const entries = weeklyQuery.data ?? [];
  const report = analyzeLifeDirection(entries);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Thermometer}
            label="온도"
            value={`${report.temperature}°`}
            helper="Move와 Mind의 에너지"
            tone="mint"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Droplets}
            label="습도"
            value={`${report.humidity}%`}
            helper="Recovery와 규칙성"
            tone="sky"
          />
        </View>
      </View>

      <ScreenSection title="주간 삶의 방향">
        {entries.length ? (
          <AppCard tone="plain">
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <ChartNoAxesColumn color={colors.tomato} size={23} strokeWidth={2.4} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
                  루틴 점수 {report.routineScore}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                  {report.message}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <Pill label={`움직임 ${report.movementMinutes}분`} active />
              <Pill label={`식사 기록 ${report.mealDays}일`} />
              <Pill label={`회복 기록 ${report.recoveryDays}일`} />
              <Pill label={`Mind 기록 ${report.mindDays}일`} />
            </View>
          </AppCard>
        ) : (
          <EmptyState
            title="리포트를 만들 기록이 부족합니다."
            body="이번 주에 네 stack 중 하나라도 남기면 삶의 방향 리포트가 시작됩니다."
          />
        )}
      </ScreenSection>

      <ScreenSection title="Stack 신호">
        <View style={{ gap: spacing.sm }}>
          {report.signals.map((signal) => {
            const Icon = stackIcons[signal.stack];

            return (
              <AppCard key={signal.stack} tone="plain">
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Icon color={colors.ink} size={22} strokeWidth={2.4} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                      {stackLabels[signal.stack]} · {signal.score}
                    </Text>
                    <Text
                      selectable
                      style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}
                    >
                      {stackDescriptions[signal.stack]} · 기록된 날 {signal.count}일
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    backgroundColor: colors.paper,
                    borderRadius: 999,
                    height: 10,
                    overflow: "hidden"
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.moss,
                      height: 10,
                      width: `${Math.max(signal.score, 3)}%`
                    }}
                  />
                </View>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                  {signal.message}
                </Text>
              </AppCard>
            );
          })}
        </View>
      </ScreenSection>

      <ScreenSection title="이번 주 기록">
        {entries.length ? (
          entries.slice(0, 8).map((entry) => (
            <AppCard key={entry.id} tone="plain">
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {entry.entryDate} · {stackLabels[entry.stack]} · {entry.title}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {entry.meaning ?? entry.note ?? "의미 기록이 비어 있습니다."}
              </Text>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="이번 주 기록이 없습니다."
            body="기록은 완성도가 아니라 방향을 보기 위한 온도계입니다."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
