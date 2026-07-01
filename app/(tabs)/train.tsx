import { AppCard, EmptyState, Field, Pill, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  createWorkoutWithLifeEntry,
  getExerciseCatalog,
  getLatestBodyLog,
  getTodayLifeEntries
} from "@/lib/database";
import { calculateExerciseCalories, DEFAULT_BODY_WEIGHT_KG, matchExercise } from "@/lib/exercise";
import { intensityOptions } from "@/lib/life";
import type { LifeIntensity } from "@/types/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flame, Footprints } from "lucide-react-native";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const moveKinds = ["헬스", "러닝", "요가", "필라테스", "산책", "홈트", "기타"];
const bodyParts = ["전신", "팔", "복근", "하체", "등", "어깨", "가슴"];

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function FormGroup({
  label,
  helper,
  children
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
          {label}
        </Text>
        {helper ? (
          <Text selectable style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "800" }}>
            {helper}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function MoveScreen() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [startTime, setStartTime] = useState(currentTime);
  const [kind, setKind] = useState("헬스");
  const [customKind, setCustomKind] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [intensity, setIntensity] = useState<LifeIntensity>("moderate");
  const [bodyPart, setBodyPart] = useState("전신");
  const [strengthDetail, setStrengthDetail] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [pace, setPace] = useState("");
  const [course, setCourse] = useState("");
  const [content, setContent] = useState("");
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
  const bodyQuery = useQuery({
    queryKey: ["latest-body", userId],
    queryFn: () => getLatestBodyLog(userId),
    enabled: Boolean(userId)
  });
  const bodyWeightKg = bodyQuery.data?.weightKg ?? profile?.weightKg ?? DEFAULT_BODY_WEIGHT_KG;
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
      const resolvedTitle = workoutTitle.trim() || `${category} ${minutesNumber}분`;
      const meaning = content.trim();
      const details = {
        workoutTitle: resolvedTitle,
        startTime,
        bodyPart: bodyPart.trim() || null,
        strengthDetail: strengthDetail.trim() || null,
        distanceKm: toNumber(distanceKm),
        pace: pace.trim() || null,
        course: course.trim() || null,
        estimatedCalories,
        metValue: matchedExercise?.metValue ?? null
      };

      const result = await createWorkoutWithLifeEntry(
        userId,
        {
          category,
          title: resolvedTitle,
          durationMinutes: minutesNumber,
          intensity,
          meaning,
          note: null,
          score: selectedIntensity?.score ?? null,
          details
        },
        {
          exerciseId: matchedExercise?.id ?? null,
          exerciseName: category,
          exerciseCategory: matchedExercise?.category ?? category,
          minutes: minutesNumber,
          setCount: null,
          reps: null,
          loadKg: null,
          metValue: matchedExercise?.metValue ?? null,
          estimatedCalories,
          bodyWeightKg,
          memo: resolvedTitle
        }
      );

      return result.lifeEntry;
    },
    onSuccess: () => {
      setError("");
      setWorkoutTitle("");
      setContent("");
      setStrengthDetail("");
      setDistanceKm("");
      setPace("");
      setCourse("");
      queryClient.invalidateQueries({ queryKey: ["today-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["today-workouts", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "운동 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (!category.trim()) {
      setError("운동 종류를 선택하거나 입력해주세요.");
      return;
    }

    if (!minutesNumber) {
      setError("운동 시간을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      setError("오늘 이 움직임이 가진 의미를 남겨주세요.");
      return;
    }

    saveMutation.mutate();
  }

  const now = new Date();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ gap: spacing.xl, padding: spacing.md, paddingBottom: 120 }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 12, fontWeight: "900" }}>
          {now.getFullYear()}년 {String(now.getMonth() + 1).padStart(2, "0")}월{" "}
          {String(now.getDate()).padStart(2, "0")}일
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 30, fontWeight: "900" }}>
          오늘의 운동
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
          제목과 시간만으로도 충분합니다. 자세한 내용은 필요한 만큼 더합니다.
        </Text>
      </View>

      <ScreenSection title="오늘 움직인 것" action={`${moveEntries.length}개`}>
        {moveEntries.length ? (
          <AppCard tone="plain">
            {moveEntries.map((entry, index) => (
              <View
                key={entry.id}
                style={{
                  alignItems: "center",
                  borderBottomColor: colors.line,
                  borderBottomWidth: index === moveEntries.length - 1 ? 0 : 1,
                  flexDirection: "row",
                  gap: spacing.sm,
                  paddingVertical: spacing.md
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: `${colors.tomato}18`,
                    borderRadius: 8,
                    height: 42,
                    justifyContent: "center",
                    width: 42
                  }}
                >
                  <Footprints color={colors.tomato} size={20} strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
                    {entry.title}
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 17 }}>
                    {entry.category} · {entry.durationMinutes ?? "-"}분 · {entry.meaning}
                  </Text>
                </View>
              </View>
            ))}
          </AppCard>
        ) : (
          <EmptyState
            title="오늘 운동은 아직 비어 있습니다."
            body="아래에서 첫 움직임을 추가하세요."
          />
        )}
      </ScreenSection>

      <ScreenSection title="기본 입력" action="필수">
        <View style={{ gap: spacing.lg }}>
          <FormGroup label="운동 제목" helper="비우면 자동 생성">
            <Field
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
              placeholder="예: 퇴근 후 첫 번째 운동"
            />
          </FormGroup>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <FormGroup label="시작 시간">
                <Field value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
              </FormGroup>
            </View>
            <View style={{ flex: 1 }}>
              <FormGroup label="운동 시간">
                <Field
                  keyboardType="numeric"
                  value={minutes}
                  onChangeText={setMinutes}
                  placeholder="분"
                />
              </FormGroup>
            </View>
          </View>

          <FormGroup label="오늘의 의미" helper="필수">
            <Field
              multiline
              value={content}
              onChangeText={setContent}
              placeholder="무엇을 했고, 몸은 어땠는지"
            />
          </FormGroup>
        </View>
      </ScreenSection>

      <ScreenSection title="추가 입력" action="선택">
        <View style={{ gap: spacing.lg }}>
          <FormGroup label="운동 종류">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {moveKinds.map((item) => (
                <Pressable key={item} accessibilityRole="button" onPress={() => setKind(item)}>
                  <Pill label={item} active={item === kind} />
                </Pressable>
              ))}
            </ScrollView>
            {kind === "기타" ? (
              <Field
                value={customKind}
                onChangeText={setCustomKind}
                placeholder="운동 종류 직접 입력"
              />
            ) : null}
          </FormGroup>

          <FormGroup label="운동 강도">
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
          </FormGroup>

          {kind === "헬스" || kind === "홈트" ? (
            <>
              <FormGroup label="운동 부위">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {bodyParts.map((item) => (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      onPress={() => setBodyPart(item)}
                    >
                      <Pill label={item} active={item === bodyPart} />
                    </Pressable>
                  ))}
                </View>
              </FormGroup>
              <FormGroup label="세트 · 무게 · 반복">
                <Field
                  multiline
                  value={strengthDetail}
                  onChangeText={setStrengthDetail}
                  placeholder="예: 스쿼트 40kg 5세트 × 5회"
                />
              </FormGroup>
            </>
          ) : null}

          {kind === "러닝" || kind === "산책" ? (
            <>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <FormGroup label="거리">
                    <Field
                      keyboardType="numeric"
                      value={distanceKm}
                      onChangeText={setDistanceKm}
                      placeholder="km"
                    />
                  </FormGroup>
                </View>
                <View style={{ flex: 1 }}>
                  <FormGroup label="페이스">
                    <Field value={pace} onChangeText={setPace} placeholder="6'20/km" />
                  </FormGroup>
                </View>
              </View>
              <FormGroup label="코스">
                <Field value={course} onChangeText={setCourse} placeholder="예: 동네 한 바퀴" />
              </FormGroup>
            </>
          ) : null}

          <AppCard tone="blush">
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
              <Flame color={colors.tomato} size={22} strokeWidth={2.3} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
                  {estimatedCalories ? `예상 소모 ${estimatedCalories}kcal` : "칼로리 참고값 없음"}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 17 }}>
                  {matchedExercise
                    ? `${matchedExercise.name} · MET ${matchedExercise.metValue} · ${bodyWeightKg}kg 기준`
                    : "운동 종류가 카탈로그와 연결되면 참고값을 보여줍니다."}
                </Text>
              </View>
            </View>
          </AppCard>

          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 13, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={saveMutation.isPending}
            icon={Check}
            label={saveMutation.isPending ? "저장 중" : "이 운동 저장"}
            onPress={handleSave}
          />
        </View>
      </ScreenSection>
    </ScrollView>
  );
}
