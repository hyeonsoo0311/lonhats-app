import { AppCard, MetricCard, PrimaryButton, ScreenSection } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { mealEntries } from "@/data/mock-data";
import { sumMacro, sumMealCalories } from "@/lib/analysis";
import { Beef, Flame, Plus, Wheat } from "lucide-react-native";
import { ScrollView, Text, TextInput, View } from "react-native";

export default function FuelScreen() {
  const calories = sumMealCalories(mealEntries);
  const protein = sumMacro(mealEntries, "proteinGram");
  const carbs = sumMacro(mealEntries, "carbsGram");

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
            helper="오늘 기록"
            tone="blush"
          />
        </View>
        <View style={{ flex: 1 }}>
          <MetricCard
            icon={Beef}
            label="단백질"
            value={`${protein}g`}
            helper="기록 합계"
            tone="mint"
          />
        </View>
      </View>

      <ScreenSection title="식단 기록">
        <TextInput
          placeholder="예: 닭가슴살 150g, 현미밥 1공기"
          placeholderTextColor={colors.mutedInk}
          style={{
            backgroundColor: colors.white,
            borderColor: colors.line,
            borderRadius: 14,
            borderWidth: 1,
            color: colors.ink,
            fontSize: 16,
            minHeight: 52,
            paddingHorizontal: spacing.md
          }}
        />
        <PrimaryButton icon={Plus} label="식단 추가" />
      </ScreenSection>

      <ScreenSection title="오늘 먹은 것">
        {mealEntries.map((meal) => (
          <AppCard key={meal.name} tone="plain">
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
              <Wheat color={colors.amber} size={22} strokeWidth={2.4} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                  {meal.name}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 13 }}>
                  {meal.calories}kcal · 단백질 {meal.proteinGram}g · 탄수화물 {meal.carbsGram}g
                </Text>
              </View>
            </View>
          </AppCard>
        ))}
      </ScreenSection>

      <ScreenSection title="칼로리 해석">
        <AppCard tone="amber">
          <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
            지금까지 탄수화물 {carbs}g, 단백질 {protein}g입니다.
          </Text>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
            다음 식사는 단백질을 유지하고 지방이 많은 간식은 조금만 늦추는 방향이 좋습니다.
          </Text>
        </AppCard>
      </ScreenSection>
    </ScrollView>
  );
}
