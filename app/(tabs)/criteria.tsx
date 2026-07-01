import {
  AppCard,
  EmptyState,
  Field,
  MetricCard,
  Pill,
  PrimaryButton,
  ScreenSection,
  SecondaryButton
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { analyzeLifeDirection } from "@/lib/analysis";
import { calendarWeekStartKey, localDateKey } from "@/lib/date";
import {
  defaultGaugeCriteria,
  gaugeRangeLabel,
  lifeTemperatureToScore,
  scoreToLifeTemperature
} from "@/lib/gauge";
import {
  createLifeRoutine,
  createUserFeedback,
  deactivateLifeRoutine,
  getActiveAccountDeletionRequest,
  getLifeGaugeCriteria,
  getLifeRoutines,
  getRoutineCheckins,
  getWeeklyLifeEntries,
  requestAccountDeletion,
  upsertLifeGaugeCriteria,
  upsertRoutineCheckin
} from "@/lib/database";
import type { LifeStackKey, RoutineCadence } from "@/types/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Droplets,
  MessageCircle,
  Plus,
  Save,
  Send,
  SlidersHorizontal,
  Thermometer,
  Trash2,
  UserX
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const meaningPlaceholders = {
  temperatureDefinition: "예: 온도는 Move와 Mind처럼 실행형 기준을 지킨 정도로 읽겠습니다.",
  temperatureLowNote: "예: 온도가 낮으면 기준을 더 작게 쪼개거나 이번 주 목표 횟수를 낮춥니다.",
  temperatureHighNote: "예: 온도가 높아도 피로가 크면 다음 목표를 무리하게 올리지 않습니다.",
  humidityDefinition: "예: 습도는 회복, 식사 리듬, 마음의 안정감처럼 하루를 유지시키는 질감입니다.",
  humidityLowNote: "예: 습도가 낮으면 수면, 식사, 휴식 기준부터 다시 챙깁니다.",
  humidityHighNote: "예: 습도가 높으면 생활 리듬이 안정적으로 유지되고 있는지 봅니다."
};

const stackOptions: { label: string; value: LifeStackKey | null }[] = [
  { label: "Life", value: null },
  { label: "Move", value: "move" },
  { label: "Meal", value: "meal" },
  { label: "Recovery", value: "recovery" },
  { label: "Mind", value: "mind" }
];

const cadenceOptions: { label: string; value: RoutineCadence }[] = [
  { label: "주간", value: "weekly" }
];

const cadenceLabels: Record<RoutineCadence, string> = {
  daily: "매일",
  weekly: "주간",
  monthly: "월간"
};

const routineExamples: {
  label: string;
  title: string;
  stack: LifeStackKey | null;
  targetCount: string;
  helper: string;
}[] = [
  {
    label: "주 3회 헬스장",
    title: "헬스장 가기",
    stack: "move",
    targetCount: "3",
    helper: "Move · 이번 주 3회"
  },
  {
    label: "하루 물 2L",
    title: "물 2L 마시기",
    stack: "meal",
    targetCount: "7",
    helper: "Meal · 매일 1회, 주 7회"
  },
  {
    label: "월 1권 독서",
    title: "책 읽기",
    stack: "mind",
    targetCount: "2",
    helper: "Mind · 월간 목표를 주간 행동 2회로 환산"
  },
  {
    label: "6시간 이상 숙면",
    title: "6시간 이상 숙면",
    stack: "recovery",
    targetCount: "7",
    helper: "Recovery · 매일 1회, 주 7회"
  }
];

const feedbackCategories = [
  { label: "막힌 부분", value: "blocker" },
  { label: "불편한 부분", value: "friction" },
  { label: "필요한 기능", value: "feature_request" },
  { label: "기타", value: "general" }
] as const;

type FeedbackCategory = (typeof feedbackCategories)[number]["value"];

function todayKey() {
  return localDateKey();
}

function routineWeights(stack: LifeStackKey | null) {
  if (stack === "move") {
    return { temperatureWeight: 3, humidityWeight: 0 };
  }

  if (stack === "meal") {
    return { temperatureWeight: 1, humidityWeight: 3 };
  }

  if (stack === "recovery") {
    return { temperatureWeight: 0, humidityWeight: 3 };
  }

  if (stack === "mind") {
    return { temperatureWeight: 2, humidityWeight: 2 };
  }

  return { temperatureWeight: 2, humidityWeight: 2 };
}

function targetCountFrom(value: string, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 1), 31) : fallback;
}

export default function CriteriaScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
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
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("friction");
  const [feedbackBody, setFeedbackBody] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");
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
  const deletionRequestQuery = useQuery({
    queryKey: ["account-deletion-request", userId],
    queryFn: () => getActiveAccountDeletionRequest(userId),
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
  const temperatureDefinitionValue = temperatureDefinition ?? criteria?.temperatureDefinition ?? "";
  const temperatureLowNoteValue = temperatureLowNote ?? criteria?.temperatureLowNote ?? "";
  const temperatureHighNoteValue = temperatureHighNote ?? criteria?.temperatureHighNote ?? "";
  const humidityDefinitionValue = humidityDefinition ?? criteria?.humidityDefinition ?? "";
  const humidityLowNoteValue = humidityLowNote ?? criteria?.humidityLowNote ?? "";
  const humidityHighNoteValue = humidityHighNote ?? criteria?.humidityHighNote ?? "";
  const temperatureMin = defaultGaugeCriteria.temperatureMinC;
  const temperatureMax = defaultGaugeCriteria.temperatureMaxC;
  const humidityMin = defaultGaugeCriteria.humidityMinPercent;
  const humidityMax = defaultGaugeCriteria.humidityMaxPercent;
  const lifeTemperature = scoreToLifeTemperature(report.temperature);
  const today = todayKey();
  const weekStart = calendarWeekStartKey();

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertLifeGaugeCriteria(userId, {
        targetTemperature: lifeTemperatureToScore((temperatureMin + temperatureMax) / 2),
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
        cadence: "weekly",
        targetCount: targetCountFrom(routineTargetCount),
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
        mutationError instanceof Error ? mutationError.message : "루틴 비활성화에 실패했습니다."
      );
    }
  });

  const deletionMutation = useMutation({
    mutationFn: () =>
      requestAccountDeletion(userId, {
        email: user?.email ?? null,
        reason: deletionReason
      }),
    onSuccess: () => {
      setError("");
      setDeletionReason("");
      setAccountNotice("계정 삭제 요청이 접수되었습니다. 관리자가 데이터를 확인합니다.");
      queryClient.invalidateQueries({ queryKey: ["account-deletion-request", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "계정 삭제 요청에 실패했습니다."
      );
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      createUserFeedback(userId, {
        category: feedbackCategory,
        body: feedbackBody
      }),
    onSuccess: () => {
      setError("");
      setFeedbackBody("");
      setFeedbackNotice("피드백이 저장되었습니다. 베타 개선 목록에 반영하겠습니다.");
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "피드백 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
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

  function handleDeletionRequest() {
    if (!userId) {
      setError("로그인 상태를 확인할 수 없습니다.");
      return;
    }

    deletionMutation.mutate();
  }

  function handleFeedbackSubmit() {
    if (!userId) {
      setError("로그인 상태를 확인할 수 없습니다.");
      return;
    }

    if (feedbackBody.trim().length < 4) {
      setError("피드백을 한 줄 이상 남겨주세요.");
      return;
    }

    feedbackMutation.mutate();
  }

  const deletionRequest = deletionRequestQuery.data;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="기준" action="My">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <SlidersHorizontal color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                나의 목표 루틴이 온도와 습도를 만듭니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
                사용자는 목표를 세우고, 앱은 그 목표가 지켜진 정도를 고정 기준으로 해석합니다.
                범위는 앱이 정하고 사용자는 의미와 루틴만 정합니다.
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

      <ScreenSection title="앱 기준">
        <AppCard tone="plain">
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
              온도 15-25°C
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
              정량적 실행 신호입니다. 운동, 공부, 프로젝트처럼 목표를 실제 행동으로 옮긴 정도를 더
              크게 봅니다.
            </Text>
          </View>
          <View
            style={{
              borderTopColor: colors.line,
              borderTopWidth: 1,
              gap: spacing.xs,
              paddingTop: spacing.sm
            }}
          >
            <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
              습도 40-50%
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
              정성적 리듬 신호입니다. 식사, 회복, 수면, 마음의 안정처럼 하루가 마르지 않게
              유지되는지를 봅니다.
            </Text>
          </View>
        </AppCard>
      </ScreenSection>

      <ScreenSection title="나의 주간 루틴 기준" action={`${routines.length}/7`}>
        <AppCard tone="plain">
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
              평가 가능한 기준으로 적어주세요.
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
              좋은 기준은 행동, 기간, 숫자가 함께 있습니다. 예: 일주일 3번 헬스장 가기, 하루 물 2L
              마시기, 하루 6시간 이상 숙면.
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
              현재 MVP는 주간 횟수로 평가합니다. 매일 해야 하는 기준은 목표 횟수를 7로 두고, 월간
              목표는 이번 주에 할 행동 단위로 바꿔 입력하세요.
            </Text>
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
              예시로 시작하기
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {routineExamples.map((example) => (
                <Pressable
                  key={example.label}
                  accessibilityRole="button"
                  onPress={() => {
                    setRoutineTitle(example.title);
                    setRoutineStack(example.stack);
                    setRoutineCadence("weekly");
                    setRoutineTargetCount(example.targetCount);
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                >
                  <View
                    style={{
                      borderColor: colors.line,
                      borderRadius: 999,
                      borderWidth: 1,
                      gap: 2,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm
                    }}
                  >
                    <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
                      {example.label}
                    </Text>
                    <Text style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "800" }}>
                      {example.helper}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
          <Text selectable style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
            기준 이름
          </Text>
          <Field
            value={routineTitle}
            onChangeText={setRoutineTitle}
            placeholder="예: 헬스장 가기, 물 2L 마시기, 6시간 이상 숙면"
          />
          <Text selectable style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
            어느 Stack에 가까운가요?
          </Text>
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
          <Text selectable style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
            평가 기간
          </Text>
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
          <Text selectable style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
            이번 주 목표 횟수
          </Text>
          <Field
            keyboardType="numeric"
            value={routineTargetCount}
            onChangeText={setRoutineTargetCount}
            placeholder="이번 주 목표 횟수"
          />
          <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
            앱이 자동으로 알 수 없는 기준은 아래 주간 기준 상태에서 직접 체크합니다. 체크한 1회는
            이번 주 진행률과 온도, 습도에 반영됩니다.
          </Text>
          <PrimaryButton
            disabled={createRoutineMutation.isPending}
            icon={Plus}
            label={createRoutineMutation.isPending ? "추가 중" : "루틴 기준 추가"}
            onPress={handleCreateRoutine}
          />
        </AppCard>
      </ScreenSection>

      <ScreenSection title="주간 기준 상태">
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
              const checkedThisWeek = checkins.some(
                (checkin) =>
                  checkin.routineId === routine.id &&
                  checkin.checkedOn >= weekStart &&
                  checkin.completed
              );
              const progress = signal?.progress ?? 0;
              const actualCount = signal?.actualCount ?? 0;
              const expectedCount = signal?.expectedCount ?? routine.targetCount;

              return (
                <AppCard key={routine.id} tone="plain">
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <CheckCircle2
                      color={
                        progress >= 100
                          ? colors.ink
                          : checkedThisWeek
                            ? colors.moss
                            : colors.mutedInk
                      }
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
                    <Pill label={`${actualCount}/${expectedCount}`} active={progress >= 80} />
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
                      disabled={checkinMutation.isPending || checkedToday}
                      hitSlop={8}
                      onPress={() => checkinMutation.mutate(routine.id)}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        flexDirection: "row",
                        gap: spacing.xs,
                        opacity: checkedToday ? 0.45 : pressed ? 0.62 : 1,
                        paddingVertical: spacing.xs
                      })}
                    >
                      <CheckCircle2 color={colors.ink} size={15} strokeWidth={2.4} />
                      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
                        {checkedToday
                          ? "이번 주에 반영됨"
                          : checkedThisWeek
                            ? "이번 주 1회 더 지킴"
                            : "이번 주 1회 지킴"}
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

      <ScreenSection title="온도와 습도의 의미">
        <View style={{ gap: spacing.sm }}>
          <AppCard tone="plain">
            <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
              평가는 위의 루틴 기준으로 합니다.
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
              이곳은 헬스장 가기, 물 2L 마시기 같은 평가 기준을 쓰는 곳이 아닙니다. 온도와 습도 값은
              위에서 만든 주간 루틴 기준과 체크 여부로 계산됩니다.
            </Text>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
              아래 문장은 결과가 낮거나 높게 나왔을 때 내가 어떻게 읽고 조정할지 정하는 해석
              기준입니다.
            </Text>
          </AppCard>
          <Field
            multiline
            value={temperatureDefinitionValue}
            onChangeText={setTemperatureDefinition}
            placeholder={meaningPlaceholders.temperatureDefinition}
          />
          <Field
            multiline
            value={temperatureLowNoteValue}
            onChangeText={setTemperatureLowNote}
            placeholder={meaningPlaceholders.temperatureLowNote}
          />
          <Field
            multiline
            value={temperatureHighNoteValue}
            onChangeText={setTemperatureHighNote}
            placeholder={meaningPlaceholders.temperatureHighNote}
          />
          <Field
            multiline
            value={humidityDefinitionValue}
            onChangeText={setHumidityDefinition}
            placeholder={meaningPlaceholders.humidityDefinition}
          />
          <Field
            multiline
            value={humidityLowNoteValue}
            onChangeText={setHumidityLowNote}
            placeholder={meaningPlaceholders.humidityLowNote}
          />
          <Field
            multiline
            value={humidityHighNoteValue}
            onChangeText={setHumidityHighNote}
            placeholder={meaningPlaceholders.humidityHighNote}
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
        label={saveMutation.isPending ? "저장 중" : "의미 저장"}
        onPress={handleSave}
      />

      <ScreenSection title="베타 피드백" action="Beta">
        <AppCard tone="plain">
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <MessageCircle color={colors.ink} size={22} strokeWidth={2.4} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                써보다가 막힌 지점을 남겨주세요.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                칭찬보다 막힘, 불편함, 빠진 기능이 더 중요합니다. 작성한 내용은 관리자만 확인합니다.
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {feedbackCategories.map((category) => (
              <Pressable
                key={category.value}
                accessibilityRole="button"
                onPress={() => setFeedbackCategory(category.value)}
              >
                <Pill label={category.label} active={feedbackCategory === category.value} />
              </Pressable>
            ))}
          </View>
          <Field
            multiline
            value={feedbackBody}
            onChangeText={setFeedbackBody}
            placeholder="예: 식단 검색에서 무엇을 눌러야 할지 헷갈렸어요."
          />
          <SecondaryButton
            disabled={feedbackMutation.isPending}
            icon={Send}
            label={feedbackMutation.isPending ? "저장 중" : "피드백 보내기"}
            onPress={handleFeedbackSubmit}
          />
          {feedbackNotice ? (
            <Text selectable style={{ color: colors.moss, fontSize: 13, fontWeight: "800" }}>
              {feedbackNotice}
            </Text>
          ) : null}
        </AppCard>
      </ScreenSection>

      <View style={{ alignItems: "flex-end", gap: spacing.sm }}>
        <Pressable
          accessibilityLabel="계정 관리"
          accessibilityRole="button"
          onPress={() => setShowAccountManagement((current) => !current)}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: showAccountManagement ? colors.ink : colors.white,
            borderColor: colors.line,
            borderRadius: 999,
            borderWidth: 1,
            height: 42,
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
            width: 42
          })}
        >
          <UserX
            color={showAccountManagement ? colors.canvas : colors.mutedInk}
            size={18}
            strokeWidth={2.4}
          />
        </Pressable>

        {showAccountManagement ? (
          <AppCard tone="plain">
            <View style={{ gap: spacing.sm }}>
              <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                계정 삭제 요청
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                요청이 접수되면 관리자가 Supabase Dashboard에서 계정과 사용자 데이터를 확인해
                처리합니다. 처리 전에는 다시 로그인할 수 있습니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 18 }}>
                계정: {user?.email ?? "이메일 없음"}
              </Text>
              {deletionRequest ? (
                <Pill
                  label={deletionRequest.status === "reviewing" ? "검토 중" : "삭제 요청 접수됨"}
                  active
                />
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Field
                    multiline
                    value={deletionReason}
                    onChangeText={setDeletionReason}
                    placeholder="삭제 요청 사유를 남길 수 있습니다. 선택"
                  />
                  <SecondaryButton
                    disabled={deletionMutation.isPending}
                    icon={UserX}
                    label={deletionMutation.isPending ? "요청 중" : "계정 삭제 요청"}
                    onPress={handleDeletionRequest}
                  />
                </View>
              )}
              {accountNotice ? (
                <Text selectable style={{ color: colors.moss, fontSize: 13, fontWeight: "800" }}>
                  {accountNotice}
                </Text>
              ) : null}
            </View>
          </AppCard>
        ) : null}
      </View>
    </ScrollView>
  );
}
