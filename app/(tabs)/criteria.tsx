import {
  AppCard,
  EmptyState,
  Field,
  MetricCard,
  Pill,
  PrimaryButton,
  ScreenSection
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { analyzeLifeDirection } from "@/lib/analysis";
import { defaultGaugeCriteria, gaugeRangeLabel, scoreToLifeTemperature } from "@/lib/gauge";
import {
  createLifeRoutine,
  deactivateLifeRoutine,
  getLifeGaugeCriteria,
  getLifeRoutines,
  getRoutineCheckins,
  getWeeklyLifeEntries,
  upsertLifeGaugeCriteria,
  upsertRoutineCheckin
} from "@/lib/database";
import type { LifeStackKey, RoutineCadence } from "@/types/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Droplets,
  Plus,
  Save,
  SlidersHorizontal,
  Thermometer,
  Trash2
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const defaults = {
  temperatureDefinition: "나에게 삶의 온도는 내가 정한 기준을 향해 움직이는 힘이다.",
  temperatureLowNote: "온도가 낮다는 것은 움직임과 몰입 기준이 흔들리는 신호다.",
  temperatureHighNote: "온도가 너무 높다는 것은 무리하거나 과열되는 신호일 수 있다.",
  humidityDefinition: "나에게 삶의 습도는 회복, 식사 리듬, 마음의 안정감이다.",
  humidityLowNote: "습도가 낮다는 것은 회복과 생활 리듬 기준을 다시 봐야 한다는 신호다.",
  humidityHighNote: "습도가 너무 높다는 것은 편안하지만 정체되어 있는지 살펴볼 신호다."
};

const stackOptions: { label: string; value: LifeStackKey | null }[] = [
  { label: "Life", value: null },
  { label: "Move", value: "move" },
  { label: "Meal", value: "meal" },
  { label: "Recovery", value: "recovery" },
  { label: "Mind", value: "mind" }
];

const cadenceOptions: { label: string; value: RoutineCadence }[] = [
  { label: "매일", value: "daily" },
  { label: "주간", value: "weekly" },
  { label: "월간", value: "monthly" }
];

const cadenceLabels: Record<RoutineCadence, string> = {
  daily: "매일",
  weekly: "주간",
  monthly: "월간"
};

function toTemperature(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(1)) : fallback;
}

function toPercent(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 0), 100) : fallback;
}

function temperatureCToScore(value: number) {
  return Math.min(Math.max(Math.round(((value - 35.5) / 2.5) * 100), 0), 100);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function routineWeights(stack: LifeStackKey | null) {
  if (stack === "move") {
    return { temperatureWeight: 3, humidityWeight: 1 };
  }

  if (stack === "meal") {
    return { temperatureWeight: 1, humidityWeight: 2 };
  }

  if (stack === "recovery") {
    return { temperatureWeight: 0, humidityWeight: 3 };
  }

  if (stack === "mind") {
    return { temperatureWeight: 2, humidityWeight: 2 };
  }

  return { temperatureWeight: 1, humidityWeight: 1 };
}

function targetCountFrom(value: string, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 1), 31) : fallback;
}

export default function CriteriaScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [temperatureMinC, setTemperatureMinC] = useState<string | null>(null);
  const [temperatureMaxC, setTemperatureMaxC] = useState<string | null>(null);
  const [humidityMinPercent, setHumidityMinPercent] = useState<string | null>(null);
  const [humidityMaxPercent, setHumidityMaxPercent] = useState<string | null>(null);
  const [temperatureDefinition, setTemperatureDefinition] = useState<string | null>(null);
  const [temperatureLowNote, setTemperatureLowNote] = useState<string | null>(null);
  const [temperatureHighNote, setTemperatureHighNote] = useState<string | null>(null);
  const [humidityDefinition, setHumidityDefinition] = useState<string | null>(null);
  const [humidityLowNote, setHumidityLowNote] = useState<string | null>(null);
  const [humidityHighNote, setHumidityHighNote] = useState<string | null>(null);
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineStack, setRoutineStack] = useState<LifeStackKey | null>("move");
  const [routineCadence, setRoutineCadence] = useState<RoutineCadence>("weekly");
  const [routineTargetCount, setRoutineTargetCount] = useState("3");
  const [error, setError] = useState("");

  const criteriaQuery = useQuery({
    queryKey: ["life-gauge-criteria", userId],
    queryFn: () => getLifeGaugeCriteria(userId),
    enabled: Boolean(userId)
  });
  const weeklyQuery = useQuery({
    queryKey: ["weekly-life", userId],
    queryFn: () => getWeeklyLifeEntries(userId),
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

  const routines = useMemo(() => routinesQuery.data ?? [], [routinesQuery.data]);
  const checkins = useMemo(() => checkinsQuery.data ?? [], [checkinsQuery.data]);
  const report = useMemo(
    () =>
      analyzeLifeDirection(weeklyQuery.data ?? [], {
        routines,
        routineCheckins: checkins
      }),
    [checkins, routines, weeklyQuery.data]
  );
  const criteria = criteriaQuery.data;
  const temperatureMinValue =
    temperatureMinC ??
    String(criteria?.temperatureMinC ?? defaultGaugeCriteria.temperatureMinC.toFixed(1));
  const temperatureMaxValue =
    temperatureMaxC ??
    String(criteria?.temperatureMaxC ?? defaultGaugeCriteria.temperatureMaxC.toFixed(1));
  const humidityMinValue =
    humidityMinPercent ??
    String(criteria?.humidityMinPercent ?? defaultGaugeCriteria.humidityMinPercent);
  const humidityMaxValue =
    humidityMaxPercent ??
    String(criteria?.humidityMaxPercent ?? defaultGaugeCriteria.humidityMaxPercent);
  const temperatureDefinitionValue =
    temperatureDefinition ?? criteria?.temperatureDefinition ?? defaults.temperatureDefinition;
  const temperatureLowNoteValue =
    temperatureLowNote ?? criteria?.temperatureLowNote ?? defaults.temperatureLowNote;
  const temperatureHighNoteValue =
    temperatureHighNote ?? criteria?.temperatureHighNote ?? defaults.temperatureHighNote;
  const humidityDefinitionValue =
    humidityDefinition ?? criteria?.humidityDefinition ?? defaults.humidityDefinition;
  const humidityLowNoteValue =
    humidityLowNote ?? criteria?.humidityLowNote ?? defaults.humidityLowNote;
  const humidityHighNoteValue =
    humidityHighNote ?? criteria?.humidityHighNote ?? defaults.humidityHighNote;
  const temperatureMin = toTemperature(temperatureMinValue, defaultGaugeCriteria.temperatureMinC);
  const temperatureMax = toTemperature(temperatureMaxValue, defaultGaugeCriteria.temperatureMaxC);
  const humidityMin = toPercent(humidityMinValue, defaultGaugeCriteria.humidityMinPercent);
  const humidityMax = toPercent(humidityMaxValue, defaultGaugeCriteria.humidityMaxPercent);
  const lifeTemperature = scoreToLifeTemperature(report.temperature);
  const today = todayKey();

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertLifeGaugeCriteria(userId, {
        targetTemperature: temperatureCToScore((temperatureMin + temperatureMax) / 2),
        targetHumidity: Math.round((humidityMin + humidityMax) / 2),
        temperatureMinC: temperatureMin,
        temperatureMaxC: temperatureMax,
        humidityMinPercent: humidityMin,
        humidityMaxPercent: humidityMax,
        temperatureDefinition: temperatureDefinitionValue.trim(),
        temperatureLowNote: temperatureLowNoteValue.trim(),
        temperatureHighNote: temperatureHighNoteValue.trim(),
        humidityDefinition: humidityDefinitionValue.trim(),
        humidityLowNote: humidityLowNoteValue.trim(),
        humidityHighNote: humidityHighNoteValue.trim()
      }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["life-gauge-criteria", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "기준 저장에 실패했습니다."
      );
    }
  });

  const createRoutineMutation = useMutation({
    mutationFn: () => {
      const weights = routineWeights(routineStack);

      return createLifeRoutine(userId, {
        title: routineTitle.trim(),
        stack: routineStack,
        cadence: routineCadence,
        targetCount: routineCadence === "daily" ? 1 : targetCountFrom(routineTargetCount),
        ...weights
      });
    },
    onSuccess: () => {
      setError("");
      setRoutineTitle("");
      queryClient.invalidateQueries({ queryKey: ["life-routines", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "루틴 기준 추가에 실패했습니다."
      );
    }
  });

  const checkinMutation = useMutation({
    mutationFn: (routineId: string) => upsertRoutineCheckin(userId, { routineId }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["routine-checkins", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-life", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "오늘 지킨 기준 저장에 실패했습니다."
      );
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (routineId: string) => deactivateLifeRoutine(userId, routineId),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["life-routines", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "루틴 기준 비활성화에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (temperatureMin > temperatureMax || humidityMin > humidityMax) {
      setError("기준 범위의 시작값이 끝값보다 클 수 없습니다.");
      return;
    }

    if (!temperatureDefinitionValue.trim() || !humidityDefinitionValue.trim()) {
      setError("온도와 습도의 의미를 입력해주세요.");
      return;
    }

    saveMutation.mutate();
  }

  function handleCreateRoutine() {
    if (routines.length >= 7) {
      setError("MVP에서는 활성 루틴 기준을 최대 7개까지 둘 수 있습니다.");
      return;
    }

    if (!routineTitle.trim()) {
      setError("루틴 기준 이름을 입력해주세요.");
      return;
    }

    createRoutineMutation.mutate();
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="기준" action="Home setting">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <SlidersHorizontal color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                나의 루틴이 온도와 습도를 만듭니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                기본 적정 범위는 온도 36.0°C-37.3°C, 습도 40%-50%입니다. 숫자는 유지하되, 평가는
                내가 정한 기준이 얼마나 지켜졌는지로 봅니다.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScreenSection>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Thermometer}
            label="현재 온도"
            value={`${lifeTemperature.toFixed(1)}°C`}
            helper={gaugeRangeLabel(lifeTemperature, temperatureMin, temperatureMax, "°C")}
            tone="plain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Droplets}
            label="현재 습도"
            value={`${report.humidity}%`}
            helper={gaugeRangeLabel(report.humidity, humidityMin, humidityMax, "%")}
            tone="plain"
          />
        </View>
      </View>

      <ScreenSection title="나의 루틴 기준" action={`${routines.length}/7`}>
        <AppCard tone="plain">
          <Field
            value={routineTitle}
            onChangeText={setRoutineTitle}
            placeholder="예: 주 3회 운동 가기"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {stackOptions.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                onPress={() => setRoutineStack(option.value)}
              >
                <Pill label={option.label} active={routineStack === option.value} />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {cadenceOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => setRoutineCadence(option.value)}
              >
                <Pill label={option.label} active={routineCadence === option.value} />
              </Pressable>
            ))}
          </View>
          {routineCadence === "daily" ? (
            <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
              매일 기준은 하루에 한 번 지키는 것으로 계산합니다.
            </Text>
          ) : (
            <Field
              keyboardType="numeric"
              value={routineTargetCount}
              onChangeText={setRoutineTargetCount}
              placeholder="목표 횟수"
            />
          )}
          <PrimaryButton
            disabled={createRoutineMutation.isPending}
            icon={Plus}
            label={createRoutineMutation.isPending ? "추가 중" : "루틴 기준 추가"}
            onPress={handleCreateRoutine}
          />
        </AppCard>
      </ScreenSection>

      <ScreenSection title="기준 상태">
        {routines.length ? (
          <View style={{ gap: spacing.sm }}>
            {routines.map((routine) => {
              const signal = report.routineSignals.find((item) => item.routineId === routine.id);
              const checkedToday = checkins.some(
                (checkin) =>
                  checkin.routineId === routine.id &&
                  checkin.checkedOn === today &&
                  checkin.completed
              );

              return (
                <AppCard key={routine.id} tone="plain">
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <CheckCircle2
                      color={checkedToday ? colors.ink : colors.mutedInk}
                      size={22}
                      strokeWidth={2.4}
                    />
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text
                        selectable
                        style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}
                      >
                        {routine.title}
                      </Text>
                      <Text
                        selectable
                        style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}
                      >
                        {cadenceLabels[routine.cadence]} 기준 ·{" "}
                        {routine.stack ? `${routine.stack.toUpperCase()} Stack` : "Life"}
                      </Text>
                    </View>
                    <Pill
                      label={`${signal?.progress ?? 0}%`}
                      active={(signal?.progress ?? 0) >= 80}
                    />
                  </View>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                    {signal?.message ?? "아직 계산할 기준 기록이 없습니다."}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: spacing.sm
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      disabled={checkinMutation.isPending}
                      hitSlop={8}
                      onPress={() => checkinMutation.mutate(routine.id)}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        flexDirection: "row",
                        gap: spacing.xs,
                        opacity: pressed ? 0.62 : checkedToday ? 0.7 : 1,
                        paddingVertical: spacing.xs
                      })}
                    >
                      <CheckCircle2 color={colors.ink} size={15} strokeWidth={2.4} />
                      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
                        {checkedToday ? "오늘 지킴" : "오늘 지킴 표시"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={deactivateMutation.isPending}
                      hitSlop={8}
                      onPress={() => deactivateMutation.mutate(routine.id)}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        flexDirection: "row",
                        gap: spacing.xs,
                        opacity: pressed ? 0.62 : 1,
                        paddingVertical: spacing.xs
                      })}
                    >
                      <Trash2 color={colors.mutedInk} size={15} strokeWidth={2.4} />
                      <Text style={{ color: colors.mutedInk, fontSize: 13, fontWeight: "900" }}>
                        비활성화
                      </Text>
                    </Pressable>
                  </View>
                </AppCard>
              );
            })}
          </View>
        ) : (
          <EmptyState
            title="아직 루틴 기준이 없습니다."
            body="아침 기상, 물 마시기, 운동, 독서처럼 내 삶의 온도와 습도를 만드는 기준을 정하세요."
          />
        )}
      </ScreenSection>

      <ScreenSection title="적정 범위">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={temperatureMinValue}
                onChangeText={setTemperatureMinC}
                placeholder="최소 °C"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={temperatureMaxValue}
                onChangeText={setTemperatureMaxC}
                placeholder="최대 °C"
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={humidityMinValue}
                onChangeText={setHumidityMinPercent}
                placeholder="최소 %"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={humidityMaxValue}
                onChangeText={setHumidityMaxPercent}
                placeholder="최대 %"
              />
            </View>
          </View>
        </View>
      </ScreenSection>

      <ScreenSection title="온도와 습도의 의미">
        <View style={{ gap: spacing.sm }}>
          <Field
            multiline
            value={temperatureDefinitionValue}
            onChangeText={setTemperatureDefinition}
            placeholder="나에게 삶의 온도란"
          />
          <Field
            multiline
            value={temperatureLowNoteValue}
            onChangeText={setTemperatureLowNote}
            placeholder="온도가 낮을 때의 신호"
          />
          <Field
            multiline
            value={temperatureHighNoteValue}
            onChangeText={setTemperatureHighNote}
            placeholder="온도가 높을 때의 신호"
          />
          <Field
            multiline
            value={humidityDefinitionValue}
            onChangeText={setHumidityDefinition}
            placeholder="나에게 삶의 습도란"
          />
          <Field
            multiline
            value={humidityLowNoteValue}
            onChangeText={setHumidityLowNote}
            placeholder="습도가 낮을 때의 신호"
          />
          <Field
            multiline
            value={humidityHighNoteValue}
            onChangeText={setHumidityHighNote}
            placeholder="습도가 높을 때의 신호"
          />
        </View>
      </ScreenSection>

      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        disabled={saveMutation.isPending}
        icon={Save}
        label={saveMutation.isPending ? "저장 중" : "범위와 의미 저장"}
        onPress={handleSave}
      />
    </ScrollView>
  );
}
