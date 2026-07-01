import { AppCard, EmptyState, SecondaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { analyzeLifeDirection } from "@/lib/analysis";
import {
  getJournalEntries,
  getLatestBodyLog,
  getLifeEntriesInRange,
  getLifeGaugeCriteria,
  getLifeRoutines,
  getRoutineCheckins,
  getTodayLifeEntries,
  getTodayMealLogs,
  getWeeklyLifeEntries
} from "@/lib/database";
import { localDateKey, monthEndKey, monthStartKey } from "@/lib/date";
import { defaultGaugeCriteria, gaugeRangeLabel, scoreToLifeTemperature } from "@/lib/gauge";
import { stackLabels } from "@/lib/life";
import type { LifeEntry, LifeStackKey } from "@/types/domain";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  BookOpen,
  Brain,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Footprints,
  LogOut,
  Moon,
  NotebookPen,
  SlidersHorizontal,
  UserRound,
  Utensils
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const monthLabels = Array.from({ length: 12 }).map((_, index) => `${index + 1}월`);
const stackDotColors: Record<LifeStackKey, string> = {
  meal: colors.moss,
  mind: colors.amber,
  move: colors.tomato,
  recovery: colors.sky
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function monthTitle(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function makeCenteredDays(referenceDate: Date) {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(referenceDate, index - 3);

    return {
      key: localDateKey(date),
      date,
      dateNumber: date.getDate(),
      isToday: isSameDay(date, referenceDate),
      label: weekdayLabels[date.getDay()]
    };
  });
}

function makeMonthCells(referenceDate: Date) {
  const firstDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const lastDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  const leadingEmptyCells = firstDate.getDay();
  const cells: (Date | null)[] = Array.from({ length: leadingEmptyCells }, () => null);

  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    cells.push(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function detailNumber(details: Record<string, unknown>, key: string) {
  const value = details[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatMinutes(minutes: number | null | undefined) {
  if (!minutes) {
    return "시간 미입력";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) {
    return `${rest}분`;
  }

  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

function entriesByDate(entries: LifeEntry[]) {
  return entries.reduce<Record<string, LifeEntry[]>>((result, entry) => {
    result[entry.entryDate] = [...(result[entry.entryDate] ?? []), entry];
    return result;
  }, {});
}

function selectedDayLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function HomeCalendar({
  entries,
  monthDate,
  onMonthChange
}: {
  entries: LifeEntry[];
  monthDate: Date;
  onMonthChange: (date: Date) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const today = useMemo(() => new Date(), []);
  const centeredDays = useMemo(() => makeCenteredDays(today), [today]);
  const monthCells = useMemo(() => makeMonthCells(monthDate), [monthDate]);
  const entryMap = useMemo(() => entriesByDate(entries), [entries]);
  const activeSelectedDate =
    selectedDate && sameMonth(selectedDate, monthDate)
      ? selectedDate
      : sameMonth(today, monthDate)
        ? today
        : new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const selectedEntries = entryMap[localDateKey(activeSelectedDate)] ?? [];

  function changeYear(amount: number) {
    onMonthChange(new Date(monthDate.getFullYear() + amount, monthDate.getMonth(), 1));
  }

  function selectMonth(monthIndex: number) {
    onMonthChange(new Date(monthDate.getFullYear(), monthIndex, 1));
    setSelectedDate(null);
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => ({
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          opacity: pressed ? 0.76 : 1
        })}
      >
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
          <CalendarDays color={colors.ink} size={21} strokeWidth={2.4} />
          <Text selectable style={{ color: colors.ink, fontSize: 28, fontWeight: "900" }}>
            {monthTitle(monthDate)}
          </Text>
        </View>
        <ChevronDown
          color={colors.mutedInk}
          size={20}
          strokeWidth={2.4}
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => ({
          flexDirection: "row",
          justifyContent: "space-between",
          opacity: pressed ? 0.76 : 1
        })}
      >
        {centeredDays.map((day) => {
          const dayEntries = entryMap[day.key] ?? [];

          return (
            <View key={day.key} style={{ alignItems: "center", gap: spacing.xs }}>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "800" }}>
                {day.label}
              </Text>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: day.isToday ? colors.ink : "transparent",
                  borderColor: day.isToday ? colors.ink : colors.line,
                  borderRadius: 999,
                  borderWidth: 1,
                  height: 38,
                  justifyContent: "center",
                  width: 38
                }}
              >
                <Text
                  selectable
                  style={{
                    color: day.isToday ? colors.canvas : colors.mutedInk,
                    fontSize: 14,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "900"
                  }}
                >
                  {day.dateNumber}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 2, height: 4 }}>
                {dayEntries.slice(0, 3).map((entry) => (
                  <View
                    key={entry.id}
                    style={{
                      backgroundColor: stackDotColors[entry.stack],
                      borderRadius: 999,
                      height: 4,
                      width: 4
                    }}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </Pressable>

      {expanded ? (
        <AppCard tone="plain">
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between"
            }}
          >
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => changeYear(-1)}>
              <ChevronLeft color={colors.ink} size={19} strokeWidth={2.4} />
            </Pressable>
            <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              {monthDate.getFullYear()}년
            </Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => changeYear(1)}>
              <ChevronRight color={colors.ink} size={19} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {monthLabels.map((label, index) => {
              const active = monthDate.getMonth() === index;

              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  onPress={() => selectMonth(index)}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    backgroundColor: active ? colors.ink : colors.paper,
                    borderColor: active ? colors.ink : colors.line,
                    borderRadius: 999,
                    borderWidth: 1,
                    minWidth: 52,
                    opacity: pressed ? 0.7 : 1,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 8
                  })}
                >
                  <Text
                    selectable
                    style={{
                      color: active ? colors.canvas : colors.ink,
                      fontSize: 12,
                      fontWeight: "900"
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row" }}>
            {weekdayLabels.map((label) => (
              <View key={label} style={{ alignItems: "center", width: `${100 / 7}%` }}>
                <Text
                  selectable
                  style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "900" }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: spacing.xs }}>
            {monthCells.map((date, index) => {
              const key = date ? localDateKey(date) : `empty-${index}`;
              const active = date ? isSameDay(date, today) : false;
              const selected = date ? isSameDay(date, activeSelectedDate) : false;
              const dayEntries = date ? (entryMap[localDateKey(date)] ?? []) : [];

              return (
                <View
                  key={key}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 48,
                    width: `${100 / 7}%`
                  }}
                >
                  {date ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSelectedDate(date)}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        backgroundColor: active
                          ? colors.ink
                          : selected
                            ? colors.paper
                            : "transparent",
                        borderColor: selected ? colors.ink : "transparent",
                        borderRadius: 10,
                        borderWidth: 1,
                        gap: 3,
                        minHeight: 42,
                        justifyContent: "center",
                        opacity: pressed ? 0.65 : 1,
                        width: 38
                      })}
                    >
                      <Text
                        selectable
                        style={{
                          color: active ? colors.canvas : colors.ink,
                          fontSize: 13,
                          fontVariant: ["tabular-nums"],
                          fontWeight: active || selected ? "900" : "700"
                        }}
                      >
                        {date.getDate()}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 2, minHeight: 4 }}>
                        {dayEntries.slice(0, 3).map((entry) => (
                          <View
                            key={entry.id}
                            style={{
                              backgroundColor: active ? colors.canvas : stackDotColors[entry.stack],
                              borderRadius: 999,
                              height: 4,
                              width: 4
                            }}
                          />
                        ))}
                      </View>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View
            style={{
              borderTopColor: colors.line,
              borderTopWidth: 1,
              gap: spacing.sm,
              paddingTop: spacing.sm
            }}
          >
            <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
              {selectedDayLabel(activeSelectedDate)}
            </Text>
            {selectedEntries.length ? (
              selectedEntries.slice(0, 4).map((entry) => (
                <View key={entry.id} style={{ gap: 2 }}>
                  <Text selectable style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
                    {stackLabels[entry.stack]} · {entry.title}
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 12 }}>
                    {entry.meaning ?? entry.note ?? entry.category}
                  </Text>
                </View>
              ))
            ) : (
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                이 날은 아직 남긴 기록이 없습니다.
              </Text>
            )}
          </View>
        </AppCard>
      ) : null}
    </View>
  );
}

function PulseMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text selectable style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "800" }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: colors.ink,
          fontSize: 23,
          fontVariant: ["tabular-nums"],
          fontWeight: "900"
        }}
      >
        {value}
      </Text>
      <Text selectable style={{ color: colors.mutedInk, fontSize: 11, lineHeight: 15 }}>
        {helper}
      </Text>
    </View>
  );
}

function RecordRow({
  title,
  value,
  helper,
  icon: Icon,
  accent,
  complete,
  onPress,
  last = false
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof Footprints;
  accent: string;
  complete: boolean;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        borderBottomColor: colors.line,
        borderBottomWidth: last ? 0 : 1,
        flexDirection: "row",
        gap: spacing.sm,
        paddingVertical: spacing.md
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: `${accent}18`,
          borderRadius: 8,
          height: 42,
          justifyContent: "center",
          width: 42
        }}
      >
        <Icon color={accent} size={21} strokeWidth={2.3} />
      </View>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => ({ flex: 1, gap: 3, opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}>
          <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
            {title}
          </Text>
          <View
            style={{
              backgroundColor: complete ? accent : "transparent",
              borderColor: complete ? accent : colors.line,
              borderRadius: 999,
              borderWidth: 1,
              height: 8,
              width: 8
            }}
          />
        </View>
        <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>
          {value}
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 17 }}>
          {helper}
        </Text>
      </Pressable>
      {onPress ? <ChevronRight color={colors.mutedInk} size={18} strokeWidth={2.3} /> : null}
    </View>
  );
}

export default function HomeScreen() {
  const { profile, signOut, user } = useAuth();
  const userId = user?.id ?? "";
  const displayName = profile?.displayName ?? user?.email?.split("@")[0] ?? "사용자";
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const calendarStart = monthStartKey(calendarMonth);
  const calendarEnd = monthEndKey(calendarMonth);

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
  const calendarQuery = useQuery({
    queryKey: ["calendar-life", userId, calendarStart, calendarEnd],
    queryFn: () => getLifeEntriesInRange(userId, calendarStart, calendarEnd),
    enabled: Boolean(userId)
  });
  const mealsQuery = useQuery({
    queryKey: ["today-meals", userId],
    queryFn: () => getTodayMealLogs(userId),
    enabled: Boolean(userId)
  });
  const bodyQuery = useQuery({
    queryKey: ["latest-body", userId],
    queryFn: () => getLatestBodyLog(userId),
    enabled: Boolean(userId)
  });
  const journalQuery = useQuery({
    queryKey: ["journal", userId],
    queryFn: () => getJournalEntries(userId),
    enabled: Boolean(userId)
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
  const calendarEntries = calendarQuery.data ?? [];
  const meals = mealsQuery.data ?? [];
  const report = analyzeLifeDirection(weeklyEntries, {
    routines: routinesQuery.data ?? [],
    routineCheckins: checkinsQuery.data ?? []
  });
  const criteria = criteriaQuery.data;
  const lifeTemperature = scoreToLifeTemperature(report.temperature);
  const moveEntry = todayEntries.find((entry) => entry.stack === "move");
  const recoveryEntry = todayEntries.find(
    (entry) => entry.stack === "recovery" && !["물", "water", "Water"].includes(entry.category)
  );
  const mindEntry = todayEntries.find((entry) => entry.stack === "mind");
  const mealEntry = todayEntries.find((entry) => entry.stack === "meal");
  const waterMl = todayEntries
    .filter((entry) => entry.stack === "meal" && entry.category === "물")
    .reduce((sum, entry) => sum + detailNumber(entry.details, "amountMl"), 0);
  const latestMeal = meals[0];
  const latestBody = bodyQuery.data;
  const bodyLoggedToday = latestBody?.measuredOn === localDateKey();
  const todayJournal = (journalQuery.data ?? []).find(
    (entry) => entry.entryDate === localDateKey()
  );
  const routineCount = report.routineSignals.length;
  const completedRoutines = report.routineSignals.filter((signal) => signal.progress >= 100).length;
  const temperatureRange = `${defaultGaugeCriteria.temperatureMinC}-${defaultGaugeCriteria.temperatureMaxC}°C`;
  const temperatureStatus = gaugeRangeLabel(
    lifeTemperature,
    defaultGaugeCriteria.temperatureMinC,
    defaultGaugeCriteria.temperatureMaxC,
    "°C"
  );
  const humidityStatus = gaugeRangeLabel(
    report.humidity,
    defaultGaugeCriteria.humidityMinPercent,
    defaultGaugeCriteria.humidityMaxPercent,
    "%"
  );
  const hasMealSignal = meals.length > 0 || waterMl > 0 || Boolean(mealEntry);
  const completedDailyItems = [
    hasMealSignal,
    Boolean(moveEntry),
    Boolean(recoveryEntry),
    Boolean(mindEntry),
    Boolean(bodyLoggedToday),
    Boolean(todayJournal)
  ].filter(Boolean).length;
  const remainingDailyItems = 6 - completedDailyItems;
  const mealCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const mealSummary = [
    meals.length ? `${meals.length}개` : null,
    mealCalories ? `${mealCalories}kcal` : null,
    waterMl ? `물 ${waterMl.toLocaleString()}mL` : null
  ]
    .filter(Boolean)
    .join(" · ");
  const userTemperatureMeaning = criteria?.temperatureDefinition;
  const userHumidityMeaning = criteria?.humidityDefinition;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.xl, padding: spacing.md, paddingBottom: 110 }}
    >
      <HomeCalendar
        entries={calendarEntries}
        monthDate={calendarMonth}
        onMonthChange={setCalendarMonth}
      />

      <View style={{ alignItems: "flex-end", flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 12, fontWeight: "900" }}>
            LONHATS · TODAY
          </Text>
          <Text selectable style={{ color: colors.ink, fontSize: 30, fontWeight: "900" }}>
            {displayName}의 오늘
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/criteria")}
          style={({ pressed }) => ({
            alignItems: "center",
            borderColor: colors.line,
            borderRadius: 8,
            borderWidth: 1,
            flexDirection: "row",
            gap: spacing.xs,
            opacity: pressed ? 0.6 : 1,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm
          })}
        >
          <SlidersHorizontal color={colors.ink} size={15} strokeWidth={2.3} />
          <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "900" }}>기준</Text>
        </Pressable>
      </View>

      <AppCard tone="plain">
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <PulseMetric
            label="삶의 온도"
            value={`${lifeTemperature.toFixed(1)}°C`}
            helper={`${temperatureRange} · ${temperatureStatus}`}
          />
          <PulseMetric label="삶의 습도" value={`${report.humidity}%`} helper={humidityStatus} />
          <PulseMetric
            label="이번 주 기준"
            value={
              routineCount ? `${completedRoutines}/${routineCount}` : `${report.routineScore}%`
            }
            helper="주간 루틴"
          />
        </View>
        {userTemperatureMeaning || userHumidityMeaning ? (
          <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 18 }}>
            {userTemperatureMeaning ?? "온도는 실행의 신호입니다."} ·{" "}
            {userHumidityMeaning ?? "습도는 리듬의 신호입니다."}
          </Text>
        ) : null}
      </AppCard>

      <ScreenSection title="오늘 채울 것" action={`${remainingDailyItems}개 남음`}>
        <AppCard tone="plain">
          <RecordRow
            accent={colors.moss}
            complete={hasMealSignal}
            helper={
              latestMeal
                ? `${latestMeal.foodName} · ${latestMeal.amountGram ?? "-"}g${
                    waterMl ? ` · 물 ${waterMl.toLocaleString()}mL` : ""
                  }`
                : "아침, 점심, 저녁, 간식과 물을 함께 남겨보세요."
            }
            icon={Utensils}
            onPress={() => router.push("/fuel")}
            title="식단"
            value={mealSummary || mealEntry?.title || "비어 있음"}
          />
          <RecordRow
            accent={colors.tomato}
            complete={Boolean(moveEntry)}
            helper={moveEntry?.meaning ?? "움직임의 종류, 시간, 강도를 남겨보세요."}
            icon={Footprints}
            onPress={() => router.push("/train")}
            title="운동"
            value={
              moveEntry
                ? `${moveEntry.category} · ${formatMinutes(moveEntry.durationMinutes)}`
                : "비어 있음"
            }
          />
          <RecordRow
            accent={colors.sky}
            complete={Boolean(recoveryEntry)}
            helper={recoveryEntry?.meaning ?? "수면, 피로, 휴식의 상태를 남겨보세요."}
            icon={Moon}
            onPress={() => router.push("/recovery")}
            title="회복"
            value={recoveryEntry?.title ?? "비어 있음"}
          />
          <RecordRow
            accent={colors.amber}
            complete={Boolean(mindEntry)}
            helper={mindEntry?.meaning ?? "독서, 공부, 생각의 흔적을 남겨보세요."}
            icon={Brain}
            onPress={() => router.push("/reflect")}
            title="마음"
            value={mindEntry?.title ?? "비어 있음"}
          />
          <RecordRow
            accent="#7AD9B2"
            complete={Boolean(bodyLoggedToday)}
            helper={
              latestBody
                ? `체지방률 ${latestBody.bodyFatPercent ?? "-"}% · 컨디션 ${
                    latestBody.condition ?? "-"
                  }`
                : "몸의 현재 상태를 남겨보세요."
            }
            icon={UserRound}
            onPress={() => router.push("/body")}
            title="신체"
            value={latestBody?.weightKg ? `${latestBody.weightKg}kg` : "비어 있음"}
          />
          <RecordRow
            accent="#D4D7E2"
            complete={Boolean(todayJournal)}
            helper={todayJournal?.smallWin ?? "오늘을 한 문장으로 남겨보세요."}
            icon={NotebookPen}
            last
            onPress={() => router.push("/diary")}
            title="일기"
            value={todayJournal?.mood ?? "오늘의 문장"}
          />
        </AppCard>
      </ScreenSection>

      <ScreenSection title="오늘 남긴 것" action="최근 4개">
        {todayEntries.length ? (
          <AppCard tone="plain">
            {todayEntries.slice(0, 4).map((entry, index) => (
              <View
                key={entry.id}
                style={{
                  borderBottomColor: colors.line,
                  borderBottomWidth: index === Math.min(todayEntries.length, 4) - 1 ? 0 : 1,
                  gap: spacing.xs,
                  paddingVertical: spacing.md
                }}
              >
                <Text
                  selectable
                  style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "900" }}
                >
                  {stackLabels[entry.stack]} · {entry.category}
                </Text>
                <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                  {entry.title}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 18 }}>
                  {entry.meaning ?? entry.note ?? "작게 남긴 오늘의 흔적"}
                </Text>
              </View>
            ))}
          </AppCard>
        ) : (
          <EmptyState
            title="오늘은 아직 비어 있습니다."
            body="식단, 운동, 회복 중 하나부터 가볍게 시작하세요."
          />
        )}
      </ScreenSection>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/community")}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.paper,
          borderColor: colors.line,
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: "row",
          gap: spacing.sm,
          opacity: pressed ? 0.7 : 1,
          padding: spacing.md
        })}
      >
        <BookOpen color={colors.moss} size={20} strokeWidth={2.3} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
            작은 인증 보기
          </Text>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 12 }}>
            다른 사람들의 조용한 노력을 확인합니다.
          </Text>
        </View>
        <ChevronRight color={colors.mutedInk} size={18} strokeWidth={2.3} />
      </Pressable>

      <SecondaryButton icon={LogOut} label="로그아웃" onPress={signOut} />
    </ScrollView>
  );
}
