import { AppCard, EmptyState, SecondaryButton, ScreenSection } from "@/components/ui";
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
  getWeeklyLifeEntries
} from "@/lib/database";
import { stackLabels } from "@/lib/life";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowRight,
  Brain,
  Check,
  Footprints,
  LogOut,
  Moon,
  Plus,
  SlidersHorizontal,
  UserRound
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

const mealOrder = ["아침", "점심", "저녁", "간식"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatMinutes(minutes: number | null | undefined) {
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

function detailText(details: Record<string, unknown>, key: string) {
  const value = details[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function ActionLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        flexDirection: "row",
        gap: spacing.xs,
        opacity: pressed ? 0.6 : 1,
        paddingVertical: spacing.xs
      })}
    >
      <Plus color={colors.ink} size={14} strokeWidth={2.5} />
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <View
      style={{
        backgroundColor: active ? colors.ink : colors.white,
        borderColor: active ? colors.ink : colors.line,
        borderRadius: 999,
        borderWidth: 1,
        height: 11,
        width: 11
      }}
    />
  );
}

function StatCell({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text selectable style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "900" }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: colors.ink,
          fontSize: 25,
          fontWeight: "900",
          fontVariant: ["tabular-nums"]
        }}
      >
        {value}
      </Text>
      {helper ? (
        <Text selectable style={{ color: colors.mutedInk, fontSize: 11, lineHeight: 15 }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderRadius: 999,
        height: 6,
        overflow: "hidden"
      }}
    >
      <View
        style={{
          backgroundColor: colors.ink,
          height: 6,
          width: `${Math.max(3, Math.min(value, 100))}%`
        }}
      />
    </View>
  );
}

function RecordTile({
  title,
  value,
  helper,
  onPress,
  icon: Icon,
  complete
}: {
  title: string;
  value: string;
  helper: string;
  onPress: () => void;
  icon: typeof Footprints;
  complete: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: colors.white,
          borderColor: colors.line,
          borderRadius: 8,
          borderWidth: 1,
          gap: spacing.sm,
          minHeight: 148,
          padding: spacing.md
        }}
      >
        <View
          style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}
        >
          <Icon color={colors.ink} size={21} strokeWidth={2.4} />
          <StatusDot active={complete} />
        </View>
        <View style={{ gap: 4 }}>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 12, fontWeight: "900" }}>
            {title}
          </Text>
          <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
            {value}
          </Text>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 18 }}>
            {helper}
          </Text>
        </View>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}>
          <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "900" }}>
            {complete ? "수정" : "추가"}
          </Text>
          <ArrowRight color={colors.ink} size={13} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
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
  const carbs = Math.round(mealLogs.reduce((total, meal) => total + meal.carbsGram, 0));
  const fat = Math.round(mealLogs.reduce((total, meal) => total + meal.fatGram, 0));
  const today = todayKey();
  const sleepEntry = todayEntries.find(
    (entry) => entry.stack === "recovery" && entry.category === "수면"
  );
  const recoveryEntry = todayEntries.find((entry) => entry.stack === "recovery");
  const moveEntry = todayEntries.find((entry) => entry.stack === "move");
  const mindEntry = todayEntries.find((entry) => entry.stack === "mind");
  const mealEntry = todayEntries.find((entry) => entry.stack === "meal");
  const latestMeal = mealLogs[0];
  const completedRoutineCount = report.routineSignals.filter(
    (signal) => signal.progress >= 100
  ).length;
  const routineTotal = report.routineSignals.length;
  const temperatureHelper = gaugeRangeLabel(lifeTemperature, temperatureMin, temperatureMax, "°C");
  const humidityHelper = gaugeRangeLabel(report.humidity, humidityMin, humidityMax, "%");
  const bedtime = sleepEntry ? detailText(sleepEntry.details, "bedtime") : null;
  const wakeTime = sleepEntry ? detailText(sleepEntry.details, "wakeTime") : null;
  const bodyLoggedToday = Boolean(latestBody && latestBody.measuredOn === today);
  const bodySummary = latestBody
    ? `체중 ${numberText(latestBody.weightKg, "kg")} · 골격근량 ${numberText(
        latestBody.skeletalMuscleKg,
        "kg"
      )}`
    : "아직 Body 기록이 없습니다.";
  const todaySentence =
    todayEntries.find((entry) => entry.meaning?.trim())?.meaning ??
    "오늘 남긴 문장이 아직 없습니다.";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <AppCard tone="plain">
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "900" }}>
              LONHATS
            </Text>
            <Text selectable style={{ color: colors.ink, fontSize: 30, fontWeight: "900" }}>
              {displayName}의 오늘
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push("/criteria")}
            style={({ pressed }) => ({
              alignItems: "center",
              flexDirection: "row",
              gap: spacing.xs,
              opacity: pressed ? 0.62 : 1,
              paddingTop: 2
            })}
          >
            <SlidersHorizontal color={colors.ink} size={14} strokeWidth={2.4} />
            <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "900" }}>기준</Text>
          </Pressable>
        </View>

        <View
          style={{
            borderColor: colors.line,
            borderTopWidth: 1,
            flexDirection: "row",
            gap: spacing.md,
            paddingTop: spacing.md
          }}
        >
          <StatCell
            label="온도"
            value={`${lifeTemperature.toFixed(1)}°`}
            helper={temperatureHelper.replace("기준 범위 ", "")}
          />
          <StatCell label="습도" value={`${report.humidity}%`} helper={humidityHelper} />
          <StatCell
            label="기준"
            value={
              routineTotal ? `${completedRoutineCount}/${routineTotal}` : `${report.routineScore}%`
            }
            helper="완료율"
          />
        </View>
      </AppCard>

      <ScreenSection title="오늘의 식사">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {mealOrder.map((type) => {
              const typedLogs = mealLogs.filter((meal) => meal.mealType === type);

              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  onPress={() => router.push("/fuel")}
                  style={{
                    alignItems: "center",
                    borderColor: colors.line,
                    borderRadius: 8,
                    borderWidth: 1,
                    flexDirection: "row",
                    gap: spacing.xs,
                    minWidth: "46%",
                    padding: spacing.sm
                  }}
                >
                  <StatusDot active={typedLogs.length > 0} />
                  <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>{type}</Text>
                  <Text style={{ color: colors.mutedInk, fontSize: 12 }}>
                    {typedLogs.length ? `${typedLogs.length}` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 5 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 19, fontWeight: "900" }}>
              {latestMeal
                ? `${latestMeal.mealType} · ${latestMeal.foodName}`
                : (mealEntry?.title ?? "아직 식사가 비어 있습니다.")}
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
              {latestMeal
                ? `${latestMeal.amountGram ? `${latestMeal.amountGram}g 기준 · ` : ""}${
                    latestMeal.calories
                  }kcal · 탄 ${latestMeal.carbsGram}g · 단 ${latestMeal.proteinGram}g · 지 ${
                    latestMeal.fatGram
                  }g`
                : "끼니를 선택하고 음식명과 g 단위를 남기면 영양 기준이 선명해집니다."}
            </Text>
          </View>

          <ProgressBar value={calories ? Math.min(100, Math.round((protein / 80) * 100)) : 0} />
          <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 17 }}>
            오늘 합계 {calories}kcal · 탄 {carbs}g · 단 {protein}g · 지 {fat}g
          </Text>
          <ActionLink label="Meal" onPress={() => router.push("/fuel")} />
        </AppCard>
      </ScreenSection>

      <ScreenSection title="수면과 회복">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Moon color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
                {sleepEntry ? `수면 ${formatMinutes(sleepEntry.durationMinutes)}` : "수면 미기록"}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {sleepEntry
                  ? `취침 ${bedtime ?? "-"} · 기상 ${wakeTime ?? "-"}`
                  : (recoveryEntry?.title ??
                    "취침, 기상, 총 수면 시간을 남기면 습도가 선명해집니다.")}
              </Text>
            </View>
            <StatusDot active={Boolean(recoveryEntry)} />
          </View>
          <ActionLink label="Recovery" onPress={() => router.push("/recovery")} />
        </AppCard>
      </ScreenSection>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <RecordTile
          complete={Boolean(moveEntry)}
          helper={moveEntry?.meaning ?? "운동 종류와 시간을 남깁니다."}
          icon={Footprints}
          onPress={() => router.push("/train")}
          title="Move"
          value={
            moveEntry
              ? `${moveEntry.category} · ${formatMinutes(moveEntry.durationMinutes)}`
              : "비어 있음"
          }
        />
        <RecordTile
          complete={Boolean(mindEntry)}
          helper={mindEntry?.meaning ?? "독서, 공부, 회고를 남깁니다."}
          icon={Brain}
          onPress={() => router.push("/reflect")}
          title="Mind"
          value={mindEntry?.title ?? "비어 있음"}
        />
      </View>

      <ScreenSection title="Body">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <UserRound color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 19, fontWeight: "900" }}>
                {bodySummary}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {latestBody
                  ? `체지방률 ${numberText(latestBody.bodyFatPercent, "%")} · 컨디션 ${
                      latestBody.condition ?? "-"
                    }`
                  : "신체 정보는 개인 기록이며 커뮤니티에 자동 공유하지 않습니다."}
              </Text>
            </View>
            <StatusDot active={bodyLoggedToday} />
          </View>
          <ActionLink label="Body" onPress={() => router.push("/body")} />
        </AppCard>
      </ScreenSection>

      <ScreenSection title="나의 기준">
        <AppCard tone="plain">
          <View style={{ gap: spacing.md }}>
            {report.routineSignals.length ? (
              report.routineSignals.slice(0, 4).map((signal) => (
                <View key={signal.routineId} style={{ gap: spacing.xs }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: spacing.sm
                    }}
                  >
                    <Text
                      selectable
                      style={{ color: colors.ink, flex: 1, fontSize: 15, fontWeight: "900" }}
                    >
                      {signal.title}
                    </Text>
                    <Text
                      selectable
                      style={{ color: colors.mutedInk, fontSize: 13, fontWeight: "900" }}
                    >
                      {signal.actualCount}/{signal.expectedCount}
                    </Text>
                  </View>
                  <ProgressBar value={signal.progress} />
                </View>
              ))
            ) : (
              <View style={{ gap: spacing.xs }}>
                <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                  아직 기준이 없습니다.
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                  주 3회 운동, 물 1L, 취침 시간 같은 기준을 정하면 완료율이 보입니다.
                </Text>
              </View>
            )}
          </View>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
            {report.message}
          </Text>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="오늘 남긴 문장">
        <AppCard tone="plain">
          <Text
            selectable
            style={{ color: colors.ink, fontSize: 18, fontWeight: "900", lineHeight: 25 }}
          >
            “{todaySentence}”
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push("/community")}
            style={({ pressed }) => ({
              alignItems: "center",
              flexDirection: "row",
              gap: spacing.xs,
              opacity: pressed ? 0.62 : 1,
              paddingVertical: spacing.xs
            })}
          >
            <Check color={colors.ink} size={14} strokeWidth={2.5} />
            <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
              작은 인증 보기
            </Text>
          </Pressable>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="오늘 남긴 기록">
        {todayEntries.length ? (
          todayEntries.slice(0, 4).map((entry) => (
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
            body="Meal, Recovery, Move, Mind, Body 중 하나부터 시작하세요."
          />
        )}
      </ScreenSection>

      {(noticesQuery.data ?? []).length ? (
        <ScreenSection title="공지">
          {(noticesQuery.data ?? []).map((notice) => (
            <AppCard key={notice.id} tone={notice.priority === "important" ? "amber" : "plain"}>
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {notice.title}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                {notice.body}
              </Text>
            </AppCard>
          ))}
        </ScreenSection>
      ) : null}

      <SecondaryButton icon={LogOut} label="로그아웃" onPress={signOut} />
    </ScrollView>
  );
}
