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
import { createLifeEntry, getTodayLifeEntries, getTodayMealLogs } from "@/lib/database";
import { analyzeAndSaveMeal } from "@/lib/food";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Beef, Flame, Plus, Utensils, Wheat } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const mealTypes = ["아침", "점심", "저녁", "간식", "음료", "기타"];
const rhythmScores = [
  { label: "불규칙", value: 35 },
  { label: "보통", value: 60 },
  { label: "규칙적", value: 82 },
  { label: "잘 챙김", value: 95 }
];

function toAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export default function MealScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [mealType, setMealType] = useState("점심");
  const [rhythm, setRhythm] = useState(rhythmScores[1]);
  const [foodName, setFoodName] = useState("현미밥");
  const [amountGram, setAmountGram] = useState("210");
  const [meaning, setMeaning] = useState("몸을 비우지 않고 챙겼다.");
  const [error, setError] = useState("");

  const mealsQuery = useQuery({
    queryKey: ["today-meals", userId],
    queryFn: () => getTodayMealLogs(userId),
    enabled: Boolean(userId)
  });
  const entriesQuery = useQuery({
    queryKey: ["today-life", userId],
    queryFn: () => getTodayLifeEntries(userId),
    enabled: Boolean(userId)
  });
  const mealLogs = mealsQuery.data ?? [];
  const mealEntries = (entriesQuery.data ?? []).filter((entry) => entry.stack === "meal");
  const calories = mealLogs.reduce((total, meal) => total + meal.calories, 0);
  const protein = Math.round(mealLogs.reduce((total, meal) => total + meal.proteinGram, 0));
  const carbs = Math.round(mealLogs.reduce((total, meal) => total + meal.carbsGram, 0));
  const fat = Math.round(mealLogs.reduce((total, meal) => total + meal.fatGram, 0));

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = toAmount(amountGram);
      const rawText = amount ? `${foodName.trim()} ${amount}g` : foodName.trim();
      const meal = await analyzeAndSaveMeal(userId, rawText, mealType);
      await createLifeEntry(userId, {
        stack: "meal",
        category: mealType,
        title: `${mealType} · ${meal.foodName} ${meal.amountGram ?? amount ?? ""}g`.trim(),
        meaning: meaning.trim(),
        note: rawText,
        score: rhythm.value,
        details: {
          rhythm: rhythm.label,
          amountGram: meal.amountGram,
          calories: meal.calories,
          proteinGram: meal.proteinGram,
          carbsGram: meal.carbsGram,
          fatGram: meal.fatGram,
          source: meal.source,
          sourceId: meal.sourceId,
          privacy: "summary_only"
        }
      });
      return meal;
    },
    onSuccess: () => {
      setFoodName("");
      setAmountGram("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["today-meals", userId] });
      queryClient.invalidateQueries({ queryKey: ["today-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Meal 기록 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (!foodName.trim()) {
      setError("음식명을 입력해주세요.");
      return;
    }

    if (!meaning.trim()) {
      setError("오늘 식사의 의미를 남겨주세요.");
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
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <MetricCard icon={Flame} label="섭취" value={`${calories}`} helper="오늘 kcal" />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard icon={Beef} label="단백질" value={`${protein}g`} helper="오늘 합계" />
        </View>
      </View>

      <ScreenSection title="끼니">
        <View style={{ gap: spacing.sm }}>
          {mealTypes.map((type) => {
            const typedLogs = mealLogs.filter((meal) => meal.mealType === type);
            const typedCalories = typedLogs.reduce((sum, meal) => sum + meal.calories, 0);

            return (
              <Pressable key={type} accessibilityRole="button" onPress={() => setMealType(type)}>
                <AppCard tone="plain">
                  <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                    <Utensils color={colors.ink} size={20} strokeWidth={2.4} />
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text
                        selectable
                        style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}
                      >
                        {type}
                      </Text>
                      <Text selectable style={{ color: colors.mutedInk, fontSize: 13 }}>
                        {typedLogs.length
                          ? `${typedLogs.length}개 · ${typedCalories}kcal`
                          : "아직 비어 있음"}
                      </Text>
                    </View>
                    <Pill label={type === mealType ? "선택" : "추가"} active={type === mealType} />
                  </View>
                </AppCard>
              </Pressable>
            );
          })}
        </View>
      </ScreenSection>

      <ScreenSection title="Meal 입력" action={mealType}>
        <View style={{ gap: spacing.sm }}>
          <Field value={foodName} onChangeText={setFoodName} placeholder="음식명 예: 현미밥" />
          <Field
            keyboardType="numeric"
            value={amountGram}
            onChangeText={setAmountGram}
            placeholder="섭취량 g 예: 210"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {rhythmScores.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => setRhythm(item)}
              >
                <Pill label={item.label} active={item.label === rhythm.label} />
              </Pressable>
            ))}
          </View>
          <Field
            multiline
            value={meaning}
            onChangeText={setMeaning}
            placeholder="오늘 이 식사가 나에게 가진 의미"
          />
          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={createMutation.isPending}
            icon={Plus}
            label={createMutation.isPending ? "분석 중" : "Meal 저장"}
            onPress={handleSave}
          />
        </View>
      </ScreenSection>

      <ScreenSection title="영양 기준">
        {mealLogs.length ? (
          <View style={{ gap: spacing.sm }}>
            {mealLogs.map((meal) => (
              <AppCard key={meal.id} tone="plain">
                <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
                  <Wheat color={colors.ink} size={22} strokeWidth={2.4} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                      {meal.mealType} · {meal.foodName}
                    </Text>
                    <Text
                      selectable
                      style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}
                    >
                      {meal.amountGram ? `${meal.amountGram}g 기준 · ` : ""}
                      {meal.calories}kcal · 탄 {meal.carbsGram}g · 단 {meal.proteinGram}g · 지{" "}
                      {meal.fatGram}g
                    </Text>
                  </View>
                </View>
              </AppCard>
            ))}
          </View>
        ) : (
          <EmptyState
            title="영양 기록이 비어 있습니다."
            body="음식명과 g 단위를 입력하면 기준량에 맞춰 영양 정보를 계산합니다."
          />
        )}
      </ScreenSection>

      <ScreenSection title="오늘의 Meal">
        {mealEntries.length ? (
          mealEntries.map((entry) => (
            <AppCard key={entry.id} tone="plain">
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {entry.title}
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
                {entry.meaning}
              </Text>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 Meal 기록이 없습니다."
            body="식단의 완성도보다 식사 리듬을 먼저 봅니다."
          />
        )}
      </ScreenSection>

      <ScreenSection title="Meal 해석">
        <AppCard tone="plain">
          <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
            탄수화물 {carbs}g · 단백질 {protein}g · 지방 {fat}g
          </Text>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
            숫자는 보조 지표입니다. Lonhats는 식사가 내 생활 리듬 안에 있었는지를 함께 봅니다.
          </Text>
        </AppCard>
      </ScreenSection>
    </ScrollView>
  );
}
