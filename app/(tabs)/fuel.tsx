import {
  AppCard,
  EmptyState,
  Field,
  MetricCard,
  PrimaryButton,
  ScreenSection
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { getTodayMealLogs } from "@/lib/database";
import { analyzeAndSaveMeal } from "@/lib/food";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Beef, Flame, Plus, Wheat } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function FuelScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [rawText, setRawText] = useState("닭가슴살 150g");
  const [error, setError] = useState("");

  const mealsQuery = useQuery({
    queryKey: ["today-meals", userId],
    queryFn: () => getTodayMealLogs(userId),
    enabled: Boolean(userId)
  });
  const mealLogs = mealsQuery.data ?? [];
  const calories = mealLogs.reduce((total, meal) => total + meal.calories, 0);
  const protein = Math.round(mealLogs.reduce((total, meal) => total + meal.proteinGram, 0));
  const carbs = Math.round(mealLogs.reduce((total, meal) => total + meal.carbsGram, 0));

  const createMutation = useMutation({
    mutationFn: () => analyzeAndSaveMeal(userId, rawText),
    onSuccess: () => {
      setRawText("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["today-meals", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "식단 저장에 실패했습니다."
      );
    }
  });

  function handleSave() {
    if (!rawText.trim()) {
      setError("음식명을 입력해주세요.");
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
          <MetricCard
            icon={Flame}
            label="칼로리"
            value={`${calories}`}
            helper="오늘 저장"
            tone="blush"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Beef}
            label="단백질"
            value={`${protein}g`}
            helper="오늘 합계"
            tone="mint"
          />
        </View>
      </View>

      <ScreenSection title="식단 기록">
        <View style={{ gap: spacing.sm }}>
          <Field
            value={rawText}
            onChangeText={setRawText}
            placeholder="예: 닭가슴살 150g, 현미밥 1공기"
          />
          <Text selectable style={{ color: colors.mutedInk, fontSize: 13, lineHeight: 19 }}>
            현재는 앱 내부 음식 DB에서 자동 매칭합니다. 식약처 API 키가 연결되면 외부 DB 검색까지
            확장됩니다.
          </Text>
          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 14, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={createMutation.isPending}
            icon={Plus}
            label={createMutation.isPending ? "분석 중" : "자동 분석 후 저장"}
            onPress={handleSave}
          />
        </View>
      </ScreenSection>

      <ScreenSection title="오늘 먹은 것">
        {mealLogs.length ? (
          mealLogs.map((meal) => (
            <AppCard key={meal.id} tone="plain">
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
                <Wheat color={colors.amber} size={22} strokeWidth={2.4} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                    {meal.foodName}
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 13 }}>
                    {meal.calories}kcal · 단백질 {meal.proteinGram}g · 탄수화물 {meal.carbsGram}g
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 12 }}>
                    입력: {meal.rawText} · 출처: {meal.source ?? "내부 DB"}
                  </Text>
                </View>
              </View>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title="아직 식단 기록이 없습니다."
            body="음식을 입력하면 칼로리를 계산해 저장합니다."
          />
        )}
      </ScreenSection>

      <ScreenSection title="칼로리 해석">
        <AppCard tone="amber">
          <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
            지금까지 탄수화물 {carbs}g, 단백질 {protein}g입니다.
          </Text>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
            기록이 7일 이상 쌓이면 분석 탭에서 감량/증량 목표에 맞춘 추천이 더 정확해집니다.
          </Text>
        </AppCard>
      </ScreenSection>
    </ScrollView>
  );
}
