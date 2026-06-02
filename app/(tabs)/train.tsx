import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  createLifeEntry,
  createWorkoutLog,
  getExerciseCatalog,
  getTodayLifeEntries
} from "@/lib/database";
import { calculateExerciseCalories, DEFAULT_BODY_WEIGHT_KG, matchExercise } from "@/lib/exercise";
import { intensityLabel, intensityOptions } from "@/lib/life";
import type { LifeIntensity } from "@/types/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Save } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const moveKinds = ["헬스", "러닝", "요가", "필라테스", "산책", "홈트", "기타"];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function MoveScreen() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const bodyWeightKg = profile?.weightKg ?? DEFAULT_BODY_WEIGHT_KG;
  const [kind, setKind] = useState("헬스");
  const [customKind, setCustomKind] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [intensity, setIntensity] = useState<LifeIntensity>("moderate");
  const [meaning, setMeaning] = useState("몸을 다시 깨웠다.");
  const [bodyPart, setBodyPart] = useState("");
  const [strengthDetail, setStrengthDetail] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [pace, setPace] = useState("");
  const [course, setCourse] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const catalogQuery = useQuery({
    queryKey: ["exercise-catalog"],
    queryFn: getExerciseCatalog
  });
  const entriesQuery = useQuery({
    queryKey: ["today-life", userId],
    queryFn: () => getTodayLifeEntries(userId),
    enabled: Boolean(userId)
  });
  const category = kind === "기타" ? customKind.trim() || "기타" : kind;
  const matchedExercise = useMemo(
    () => matchExercise(category, catalogQuery.data ?? []),
    [catalogQuery.data, category]
  );
  const minutesNumber = toNumber(minutes) ?? 0;
  const estimatedCalories = matchedExercise
    ? calculateExerciseCalories({
        bodyWeightKg,
        metValue: matchedExercise.metValue,
        minutes: minutesNumber || matchedExercise.defaultMinutes
      })
    : null;
  const moveEntries = (entriesQuery.data ?? []).filter((entry) => entry.stack === "move");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedIntensity = intensityOptions.find((item) => item.value === intensity);
      const details = {
        bodyPart: bodyPart.trim() || null,
        strengthDetail: strengthDetail.trim() || null,
        distanceKm: toNumber(distanceKm),
        pace: pace.trim() || null,
        course: course.trim() || null,
        estimatedCalories,
        metValue: matchedExercise?.metValue ?? null
      };

      const entry = await createLifeEntry(userId, {
        stack: "move",
        category,
        title: `${category} ${minutesNumber || matchedExercise?.defaultMinutes || 0}분`,
        durationMinutes: minutesNumber || matchedExercise?.defaultMinutes || null,
        intensity,
        meaning: meaning.trim(),
        note: note.trim() || null,
        score: selectedIntensity?.score ?? null,
        details
      });

      await createWorkoutLog(userId, {
        exerciseId: matchedExercise?.id ?? null,
        exerciseName: category,
        exerciseCategory: matchedExercise?.category ?? category,
        minutes: minutesNumber || matchedExercise?.defaultMinutes || null,
        metValue: matchedExercise?.metValue ?? null,
        estimatedCalories,
        bodyWeightKg,
        memo: meaning.trim() || note.trim() || null
      });

      return entry;
    },
    onSuccess: () => {
      setError("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["today-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["today-workouts", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Move 기록 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (!category.trim()) {
      setError("운동 종류를 입력해주세요.");
      return;
    }

    if (!minutesNumber) {
      setError("운동 시간을 입력해주세요.");
      return;
    }

    if (!meaning.trim()) {
      setError("오늘 이 움직임의 의미를 남겨주세요.");
      return;
    }

    saveMutation.mutate();
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: 110 }}
    >
      <ScreenSection title="Move stack" action="움직임 기록">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {moveKinds.map((item) => (
              <Pressable key={item} accessibilityRole="button" onPress={() => setKind(item)}>
                <Pill label={item} active={item === kind} />
              </Pressable>
            ))}
          </View>
          {kind === "기타" ? (
            <Field value={customKind} onChangeText={setCustomKind} placeholder="직접 입력" />
          ) : null}
          <Field
            keyboardType="numeric"
            value={minutes}
            onChangeText={setMinutes}
            placeholder="운동 시간(분)"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {intensityOptions.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                onPress={() => setIntensity(item.value)}
              >
                <Pill label={item.label} active={item.value === intensity} />
              </Pressable>
            ))}
          </View>
          <Field
            multiline
            value={meaning}
            onChangeText={setMeaning}
            placeholder="오늘 이 움직임이 나에게 가진 의미"
          />

          <AppCard tone="mint">
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Flame color={colors.tomato} size={22} strokeWidth={2.4} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                  {estimatedCalories
                    ? `예상 소모 ${estimatedCalories}kcal`
                    : "칼로리는 보조 지표입니다."}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                  {matchedExercise
                    ? `${matchedExercise.name} · MET ${matchedExercise.metValue} · ${bodyWeightKg}kg 기준`
                    : "기록의 핵심은 칼로리보다 움직임의 맥락입니다."}
                </Text>
              </View>
            </View>
          </AppCard>
        </View>
      </ScreenSection>

      <ScreenSection title="선택 상세 기록">
        <View style={{ gap: spacing.sm }}>
          {kind === "헬스" || kind === "홈트" ? (
            <>
              <Field
                value={bodyPart}
                onChangeText={setBodyPart}
                placeholder="운동 부위 예: 하체, 등, 코어"
              />
              <Field
                multiline
                value={strengthDetail}
                onChangeText={setStrengthDetail}
                placeholder="세트/무게/반복 예: 스쿼트 40kg 5x5"
              />
            </>
          ) : null}
          {kind === "러닝" || kind === "산책" ? (
            <>
              <Field
                keyboardType="numeric"
                value={distanceKm}
                onChangeText={setDistanceKm}
                placeholder="거리 km"
              />
              <Field value={pace} onChangeText={setPace} placeholder="페이스 예: 6'20/km" />
              <Field
                value={course}
                onChangeText={setCourse}
                placeholder="코스 예: 한강, 동네 한 바퀴"
              />
            </>
          ) : null}
          <Field
            multiline
            value={note}
            onChangeText={setNote}
            placeholder="더 남기고 싶은 세부 기록"
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
        label={saveMutation.isPending ? "저장 중" : "Move 기록 저장"}
        onPress={handleSave}
      />

      <ScreenSection title="오늘의 Move">
        {moveEntries.length ? (
          moveEntries.map((entry) => (
            <AppCard key={entry.id} tone="plain">
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {entry.category} · {entry.durationMinutes ?? 0}분
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13 }}>
                {intensityLabel(entry.intensity)} · {entry.meaning}
              </Text>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 Move 기록이 없습니다."
            body="움직임의 종류보다 오늘 남긴 의미가 중심입니다."
          />
        )}
      </ScreenSection>
    </ScrollView>
  );
}
