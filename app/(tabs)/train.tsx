import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { exerciseLibrary } from "@/data/mock-data";
import { createWorkoutLog, getExerciseCatalog, getTodayWorkoutLogs } from "@/lib/database";
import { calculateExerciseCalories, DEFAULT_BODY_WEIGHT_KG, matchExercise } from "@/lib/exercise";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Flame, Save } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function TrainScreen() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const bodyWeightKg = profile?.weightKg ?? DEFAULT_BODY_WEIGHT_KG;
  const [exerciseName, setExerciseName] = useState("스쿼트");
  const [minutes, setMinutes] = useState("30");
  const [setCount, setSetCount] = useState("3");
  const [reps, setReps] = useState("10");
  const [loadKg, setLoadKg] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const logsQuery = useQuery({
    queryKey: ["today-workouts", userId],
    queryFn: () => getTodayWorkoutLogs(userId),
    enabled: Boolean(userId)
  });
  const catalogQuery = useQuery({
    queryKey: ["exercise-catalog"],
    queryFn: getExerciseCatalog
  });
  const matchedExercise = useMemo(
    () => matchExercise(exerciseName, catalogQuery.data ?? []),
    [catalogQuery.data, exerciseName]
  );
  const minutesNumber = toNumber(minutes) ?? matchedExercise?.defaultMinutes ?? 30;
  const estimatedCalories = matchedExercise
    ? calculateExerciseCalories({
        bodyWeightKg,
        metValue: matchedExercise.metValue,
        minutes: minutesNumber
      })
    : null;

  const createMutation = useMutation({
    mutationFn: () =>
      createWorkoutLog(userId, {
        exerciseId: matchedExercise?.id ?? null,
        exerciseName: exerciseName.trim(),
        exerciseCategory: matchedExercise?.category ?? null,
        minutes: minutesNumber,
        setCount: toNumber(setCount),
        reps: toNumber(reps),
        loadKg: toNumber(loadKg),
        metValue: matchedExercise?.metValue ?? null,
        estimatedCalories,
        bodyWeightKg,
        memo: memo.trim() || null
      }),
    onSuccess: () => {
      setMemo("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["today-workouts", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "운동 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (!exerciseName.trim()) {
      setError("운동명을 입력해주세요.");
      return;
    }

    createMutation.mutate();
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="운동 기록">
        <View style={{ gap: spacing.sm }}>
          <Field value={exerciseName} onChangeText={setExerciseName} placeholder="운동명" />
          {(catalogQuery.data ?? []).length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(catalogQuery.data ?? []).slice(0, 8).map((exercise) => (
                <Pressable
                  key={exercise.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setExerciseName(exercise.name);
                    setMinutes(String(exercise.defaultMinutes));
                  }}
                >
                  <Pill label={exercise.name} active={matchedExercise?.id === exercise.id} />
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={minutes}
                onChangeText={setMinutes}
                placeholder="운동 시간"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={loadKg}
                onChangeText={setLoadKg}
                placeholder="중량 kg"
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={setCount}
                onChangeText={setSetCount}
                placeholder="세트"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                keyboardType="numeric"
                value={reps}
                onChangeText={setReps}
                placeholder="반복"
              />
            </View>
          </View>
          <AppCard tone={matchedExercise ? "mint" : "amber"}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Flame color={colors.tomato} size={22} strokeWidth={2.4} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                  {estimatedCalories
                    ? `예상 소모 ${estimatedCalories}kcal`
                    : "운동 데이터를 찾는 중입니다."}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                  {matchedExercise
                    ? `${matchedExercise.category} · MET ${matchedExercise.metValue} · ${bodyWeightKg}kg 기준`
                    : "헬스, 요가, 필라테스, 러닝 등 대표 운동명을 입력해주세요."}
                </Text>
              </View>
            </View>
          </AppCard>
          <Field multiline value={memo} onChangeText={setMemo} placeholder="오늘 운동 메모" />
          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={createMutation.isPending}
            icon={Save}
            label={createMutation.isPending ? "저장 중" : "운동 저장"}
            onPress={handleSave}
          />
        </View>
      </ScreenSection>

      <ScreenSection title="오늘 저장된 운동">
        {(logsQuery.data ?? []).length ? (
          (logsQuery.data ?? []).map((item) => (
            <AppCard key={item.id} tone="plain">
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}
              >
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                    {item.exerciseName}
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 14 }}>
                    {item.minutes ?? 0}분 · {item.setCount ?? 0}세트 x {item.reps ?? 0}회
                    {item.loadKg ? ` · ${item.loadKg}kg` : ""}
                  </Text>
                  <Text selectable style={{ color: colors.moss, fontSize: 13, fontWeight: "800" }}>
                    예상 소모 {item.estimatedCalories ?? 0}kcal
                    {item.metValue ? ` · MET ${item.metValue}` : ""}
                  </Text>
                </View>
                <Dumbbell color={colors.moss} size={22} strokeWidth={2.4} />
              </View>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 운동 기록이 없습니다."
            body="운동을 저장하면 MET 기준 예상 소모 칼로리도 함께 쌓입니다."
          />
        )}
      </ScreenSection>

      <ScreenSection title="운동 데이터" action="MET 기반">
        {(catalogQuery.data ?? []).slice(0, 10).map((exercise) => (
          <AppCard key={exercise.id} tone={exercise.category === "요가" ? "sky" : "mint"}>
            <View style={{ gap: spacing.sm }}>
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}
              >
                <Text
                  selectable
                  style={{ color: colors.ink, flex: 1, fontSize: 18, fontWeight: "900" }}
                >
                  {exercise.name}
                </Text>
                <Pill label={`${exercise.metValue} MET`} />
              </View>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                {exercise.category} · {exercise.description}
              </Text>
            </View>
          </AppCard>
        ))}
      </ScreenSection>

      <ScreenSection title="동작 라이브러리" action="기본 3개">
        {exerciseLibrary.map((exercise) => (
          <AppCard key={exercise.id} tone={exercise.level === "beginner" ? "mint" : "sky"}>
            <View style={{ gap: spacing.sm }}>
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}
              >
                <Text
                  selectable
                  style={{ color: colors.ink, flex: 1, fontSize: 18, fontWeight: "900" }}
                >
                  {exercise.name}
                </Text>
                <Pill label={exercise.target} />
              </View>
              <Text selectable style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>
                {exercise.purpose}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                체크 포인트: {exercise.cue}
              </Text>
            </View>
          </AppCard>
        ))}
      </ScreenSection>
    </ScrollView>
  );
}
