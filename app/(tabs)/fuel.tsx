import {
  AppCard,
  EmptyState,
  Field,
  Pill,
  PrimaryButton,
  ScreenSection,
  SecondaryButton
} from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  createFoodReport,
  createFoodSubmission,
  createMealWaterEntry,
  createMealWithLifeEntry,
  getTodayLifeEntries,
  getTodayMealLogs
} from "@/lib/database";
import {
  foodContributorLabel,
  foodSourceReference,
  mealLogFromFoodItem,
  searchFoodOptions
} from "@/lib/food";
import type { FoodItem, MealLog } from "@/types/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Droplets,
  FilePlus2,
  Flag,
  Plus,
  Search,
  Send,
  Trash2,
  Utensils
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const mealTypes = ["아침", "아점", "점심", "점저", "저녁", "야식", "간식"];
const fullnessOptions = ["가볍게", "적당히", "배부르게", "과하게"];
const mealScores = [1, 2, 3, 4, 5];
type MealDraftItem = Omit<MealLog, "id" | "sourceLifeEntryId" | "eatenOn"> & {
  draftId: string;
};

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function defaultMealType() {
  const hour = new Date().getHours();

  if (hour < 10) return "아침";
  if (hour < 15) return "점심";
  if (hour < 21) return "저녁";
  return "야식";
}

function toAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function toNonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function foodDraftId(food: FoodItem) {
  return `${food.source}:${food.sourceId ?? food.id}`;
}

function mealTotals(items: MealDraftItem[]) {
  return items.reduce(
    (totals, item) => ({
      amount: totals.amount + (item.amountGram ?? 0),
      calories: totals.calories + item.calories,
      carbs: Math.round((totals.carbs + item.carbsGram) * 10) / 10,
      protein: Math.round((totals.protein + item.proteinGram) * 10) / 10,
      fat: Math.round((totals.fat + item.fatGram) * 10) / 10
    }),
    { amount: 0, calories: 0, carbs: 0, protein: 0, fat: 0 }
  );
}

function detailNumber(details: Record<string, unknown>, key: string) {
  const value = details[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function FormGroup({
  label,
  helper,
  children
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
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

function NutritionPanel({
  calories,
  carbs,
  protein,
  fat,
  serving
}: {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  serving: number;
}) {
  const macroTotal = Math.max(carbs + protein + fat, 1);

  return (
    <AppCard tone="plain">
      <View
        style={{ alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" }}
      >
        <View style={{ gap: 3 }}>
          <Text selectable style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "900" }}>
            선택한 양 기준
          </Text>
          <Text
            selectable
            style={{
              color: colors.ink,
              fontSize: 26,
              fontVariant: ["tabular-nums"],
              fontWeight: "900"
            }}
          >
            {calories}kcal
          </Text>
        </View>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 12, fontWeight: "800" }}>
          {serving}g
        </Text>
      </View>
      <View style={{ flexDirection: "row", height: 7, overflow: "hidden", borderRadius: 999 }}>
        <View style={{ backgroundColor: colors.moss, flex: carbs / macroTotal }} />
        <View style={{ backgroundColor: "#B6A7FF", flex: protein / macroTotal }} />
        <View style={{ backgroundColor: colors.tomato, flex: fat / macroTotal }} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {[
          { label: "탄수화물", value: `${carbs}g` },
          { label: "단백질", value: `${protein}g` },
          { label: "지방", value: `${fat}g` }
        ].map((item) => (
          <View key={item.label} style={{ flex: 1, gap: 3 }}>
            <Text selectable style={{ color: colors.mutedInk, fontSize: 11, fontWeight: "800" }}>
              {item.label}
            </Text>
            <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </AppCard>
  );
}

export default function MealScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [mealType, setMealType] = useState(defaultMealType);
  const [fullness, setFullness] = useState("적당히");
  const [mealScore, setMealScore] = useState(3);
  const [mealTime, setMealTime] = useState(currentTime);
  const [foodQuery, setFoodQuery] = useState("");
  const [amountGram, setAmountGram] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [mealItems, setMealItems] = useState<MealDraftItem[]>([]);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionName, setSubmissionName] = useState("");
  const [submissionBrand, setSubmissionBrand] = useState("");
  const [submissionServing, setSubmissionServing] = useState("100");
  const [submissionCalories, setSubmissionCalories] = useState("");
  const [submissionCarbs, setSubmissionCarbs] = useState("");
  const [submissionProtein, setSubmissionProtein] = useState("");
  const [submissionFat, setSubmissionFat] = useState("");
  const [submissionReference, setSubmissionReference] = useState("");

  const mealsQuery = useQuery({
    queryKey: ["today-meals", userId],
    queryFn: () => getTodayMealLogs(userId),
    enabled: Boolean(userId)
  });
  const todayEntriesQuery = useQuery({
    queryKey: ["today-life", userId],
    queryFn: () => getTodayLifeEntries(userId),
    enabled: Boolean(userId)
  });
  const mealLogs = mealsQuery.data ?? [];
  const waterMl = (todayEntriesQuery.data ?? [])
    .filter((entry) => entry.stack === "meal" && entry.category === "물")
    .reduce((sum, entry) => sum + detailNumber(entry.details, "amountMl"), 0);
  const calories = mealLogs.reduce((total, meal) => total + meal.calories, 0);
  const protein = Math.round(mealLogs.reduce((total, meal) => total + meal.proteinGram, 0));
  const carbs = Math.round(mealLogs.reduce((total, meal) => total + meal.carbsGram, 0));
  const fat = Math.round(mealLogs.reduce((total, meal) => total + meal.fatGram, 0));

  const searchMutation = useMutation({
    mutationFn: searchFoodOptions,
    onSuccess: (foods) => {
      setError(
        foods.length ? "" : "일치하는 음식을 찾지 못했습니다. 음식명을 더 짧게 입력해보세요."
      );
    },
    onError: (searchError) => {
      setError(searchError instanceof Error ? searchError.message : "음식 검색에 실패했습니다.");
    }
  });

  const waterMutation = useMutation({
    mutationFn: (amountMl: number) => createMealWaterEntry(userId, amountMl),
    onSuccess: () => {
      setError("");
      setNotice("물을 식단 리듬에 추가했습니다.");
      queryClient.invalidateQueries({ queryKey: ["today-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-life", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "물 기록 저장에 실패했습니다."
      );
    }
  });

  const preview = useMemo(() => {
    if (!selectedFood) {
      return null;
    }

    const serving = toAmount(amountGram) ?? selectedFood.servingGram;
    const ratio = serving / selectedFood.servingGram;

    return {
      serving,
      calories: Math.round(selectedFood.caloriesPerServing * ratio),
      carbs: Math.round(selectedFood.carbsGram * ratio * 10) / 10,
      protein: Math.round(selectedFood.proteinGram * ratio * 10) / 10,
      fat: Math.round(selectedFood.fatGram * ratio * 10) / 10
    };
  }, [amountGram, selectedFood]);
  const draftTotals = useMemo(() => mealTotals(mealItems), [mealItems]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!mealItems.length) {
        throw new Error("이 식사에 음식을 하나 이상 추가해주세요.");
      }

      const foodNames = mealItems.map((item) => item.foodName);
      const visibleNames = foodNames.slice(0, 2).join(", ");
      const extraCount = Math.max(foodNames.length - 2, 0);
      const result = await createMealWithLifeEntry(
        userId,
        {
          category: mealType,
          title: `${mealType} · ${visibleNames}${extraCount ? ` 외 ${extraCount}가지` : ""}`,
          meaning: memo.trim() || null,
          note: null,
          score: mealScore * 20,
          details: {
            fullness,
            mealScore,
            mealTime,
            itemCount: mealItems.length,
            amountGram: draftTotals.amount,
            calories: draftTotals.calories,
            proteinGram: draftTotals.protein,
            carbsGram: draftTotals.carbs,
            fatGram: draftTotals.fat,
            foods: mealItems.map((item) => ({
              foodName: item.foodName,
              amountGram: item.amountGram,
              calories: item.calories,
              source: item.source,
              sourceId: item.sourceId
            })),
            privacy: "summary_only"
          }
        },
        mealItems.map(({ draftId: _draftId, ...item }) => ({ ...item, mealType }))
      );

      return result.mealLogs;
    },
    onSuccess: () => {
      setError("");
      setFoodQuery("");
      setAmountGram("");
      setSelectedFood(null);
      setMealItems([]);
      setMemo("");
      queryClient.invalidateQueries({ queryKey: ["today-meals", userId] });
      queryClient.invalidateQueries({ queryKey: ["today-life", userId] });
      queryClient.invalidateQueries({ queryKey: ["weekly-life", userId] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "식사 저장에 실패했습니다."
      );
    }
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFood || !reportReason.trim()) {
        throw new Error("잘못된 정보와 신고 이유를 확인해주세요.");
      }

      await createFoodReport(userId, selectedFood, reportReason.trim());
    },
    onSuccess: () => {
      setReportReason("");
      setShowReportForm(false);
      setError("");
      setNotice("신고가 접수되었습니다. 관리자가 데이터와 출처를 확인합니다.");
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "신고 접수에 실패했습니다."
      );
    }
  });

  const submissionMutation = useMutation({
    mutationFn: async () => {
      const servingGram = toNonNegativeNumber(submissionServing);
      const caloriesPerServing = toNonNegativeNumber(submissionCalories);
      const carbsGram = toNonNegativeNumber(submissionCarbs);
      const proteinGram = toNonNegativeNumber(submissionProtein);
      const fatGram = toNonNegativeNumber(submissionFat);

      if (
        !submissionName.trim() ||
        !servingGram ||
        !caloriesPerServing ||
        carbsGram === null ||
        proteinGram === null ||
        fatGram === null
      ) {
        throw new Error("음식명, 기준량, 열량, 탄수화물, 단백질, 지방을 확인해주세요.");
      }

      if (carbsGram + proteinGram + fatGram <= 0) {
        throw new Error("탄수화물, 단백질, 지방 중 하나 이상을 입력해주세요.");
      }

      if (!submissionReference.trim()) {
        throw new Error("제품 영양표시, 공식 자료 등 확인 근거를 남겨주세요.");
      }

      return createFoodSubmission(userId, {
        name: submissionName.trim(),
        brandName: submissionBrand.trim() || null,
        servingGram,
        caloriesPerServing,
        carbsGram,
        proteinGram,
        fatGram,
        referenceNote: submissionReference.trim()
      });
    },
    onSuccess: () => {
      setSubmissionName("");
      setSubmissionBrand("");
      setSubmissionServing("100");
      setSubmissionCalories("");
      setSubmissionCarbs("");
      setSubmissionProtein("");
      setSubmissionFat("");
      setSubmissionReference("");
      setShowSubmissionForm(false);
      setError("");
      setNotice("음식 정보가 제안되었습니다. 관리자 승인 후 정식 검색 결과에 등록됩니다.");
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "음식 정보 제안에 실패했습니다."
      );
    }
  });

  function handleSearch() {
    if (!foodQuery.trim()) {
      setError("검색할 음식명을 입력해주세요.");
      return;
    }

    setSelectedFood(null);
    setNotice("");
    searchMutation.mutate(foodQuery.trim());
  }

  function selectFood(food: FoodItem) {
    setSelectedFood(food);
    setFoodQuery(food.name);
    setAmountGram(String(food.servingGram));
    setShowReportForm(false);
    setReportReason("");
    setError("");
  }

  function addSelectedFood() {
    if (!selectedFood) {
      setError("검색 결과에서 추가할 음식을 선택해주세요.");
      return;
    }

    const amount = toAmount(amountGram);

    if (!amount) {
      setError("먹은 양을 g 단위로 입력해주세요.");
      return;
    }

    const rawText = `${selectedFood.name} ${amount}g`;
    const meal = mealLogFromFoodItem(selectedFood, amount, rawText, mealType);
    const nextItem = { ...meal, draftId: foodDraftId(selectedFood) };

    setMealItems((items) => [
      ...items.filter((item) => item.draftId !== nextItem.draftId),
      nextItem
    ]);
    setFoodQuery("");
    setAmountGram("");
    setSelectedFood(null);
    searchMutation.reset();
    setError("");
  }

  function removeMealItem(draftId: string) {
    setMealItems((items) => items.filter((item) => item.draftId !== draftId));
  }

  function handleSave() {
    if (!mealItems.length) {
      setError("이 식사에 음식을 하나 이상 추가해주세요.");
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
          오늘의 식단
        </Text>
        <Text selectable style={{ color: colors.mutedInk, fontSize: 14, lineHeight: 20 }}>
          끼니를 먼저 고르고, 먹은 음식과 양을 구체적으로 남깁니다.
        </Text>
      </View>

      <ScreenSection title="오늘 먹은 것" action={`${mealLogs.length}개`}>
        {mealLogs.length ? (
          <AppCard tone="plain">
            {mealLogs.map((meal, index) => (
              <View
                key={meal.id}
                style={{
                  alignItems: "center",
                  borderBottomColor: colors.line,
                  borderBottomWidth: index === mealLogs.length - 1 ? 0 : 1,
                  flexDirection: "row",
                  gap: spacing.sm,
                  paddingVertical: spacing.md
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: `${colors.moss}18`,
                    borderRadius: 8,
                    height: 42,
                    justifyContent: "center",
                    width: 42
                  }}
                >
                  <Utensils color={colors.moss} size={20} strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
                    {meal.mealType} · {meal.foodName}
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 12 }}>
                    {meal.amountGram ?? "-"}g · 탄 {meal.carbsGram}g · 단 {meal.proteinGram}g · 지{" "}
                    {meal.fatGram}g
                  </Text>
                  <Text selectable style={{ color: colors.mutedInk, fontSize: 11 }}>
                    출처: {foodSourceReference(meal)}
                  </Text>
                </View>
                <Text selectable style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
                  {meal.calories}kcal
                </Text>
              </View>
            ))}
          </AppCard>
        ) : (
          <EmptyState
            title="오늘 식단은 아직 비어 있습니다."
            body="아래에서 첫 끼니를 추가하세요."
          />
        )}
        <AppCard tone="plain">
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: `${colors.sky}18`,
                borderRadius: 8,
                height: 42,
                justifyContent: "center",
                width: 42
              }}
            >
              <Droplets color={colors.sky} size={20} strokeWidth={2.3} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
                물
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 12 }}>
                오늘 {waterMl.toLocaleString()}mL · 식단 리듬에 포함됩니다
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {[250, 500].map((amountMl) => (
              <Pressable
                key={amountMl}
                accessibilityRole="button"
                disabled={waterMutation.isPending}
                onPress={() => waterMutation.mutate(amountMl)}
                style={({ pressed }) => ({
                  alignItems: "center",
                  backgroundColor: colors.paper,
                  borderColor: colors.line,
                  borderRadius: 8,
                  borderWidth: 1,
                  flex: 1,
                  minHeight: 44,
                  justifyContent: "center",
                  opacity: waterMutation.isPending ? 0.5 : pressed ? 0.7 : 1
                })}
              >
                <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900" }}>
                  +{amountMl}mL
                </Text>
              </Pressable>
            ))}
          </View>
        </AppCard>
        <NutritionPanel
          calories={calories}
          carbs={carbs}
          fat={fat}
          protein={protein}
          serving={mealLogs.reduce((sum, meal) => sum + (meal.amountGram ?? 0), 0)}
        />
      </ScreenSection>

      <ScreenSection title="식사 추가" action={mealType}>
        <View style={{ gap: spacing.lg }}>
          <FormGroup label="분류">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {mealTypes.map((type) => (
                <Pressable key={type} accessibilityRole="button" onPress={() => setMealType(type)}>
                  <Pill label={type} active={type === mealType} />
                </Pressable>
              ))}
            </ScrollView>
          </FormGroup>

          <FormGroup label="시간">
            <Field value={mealTime} onChangeText={setMealTime} placeholder="HH:MM" />
          </FormGroup>

          <FormGroup label="포만감">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {fullnessOptions.map((item) => (
                <Pressable key={item} accessibilityRole="button" onPress={() => setFullness(item)}>
                  <Pill label={item} active={item === fullness} />
                </Pressable>
              ))}
            </View>
          </FormGroup>

          <FormGroup label="식단 점수" helper="오늘의 느낌">
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {mealScores.map((score) => (
                <Pressable
                  key={score}
                  accessibilityRole="button"
                  onPress={() => setMealScore(score)}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    backgroundColor: score === mealScore ? colors.ink : colors.white,
                    borderColor: score === mealScore ? colors.ink : colors.line,
                    borderRadius: 999,
                    borderWidth: 1,
                    height: 42,
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                    width: 42
                  })}
                >
                  <Text
                    style={{
                      color: score === mealScore ? colors.canvas : colors.ink,
                      fontSize: 14,
                      fontWeight: "900"
                    }}
                  >
                    {score}
                  </Text>
                </Pressable>
              ))}
            </View>
          </FormGroup>

          <FormGroup label="먹은 음식" helper="이름으로 검색">
            <Field
              value={foodQuery}
              onChangeText={setFoodQuery}
              placeholder="예: 현미밥, 닭가슴살"
            />
            <SecondaryButton
              disabled={searchMutation.isPending}
              icon={Search}
              label={searchMutation.isPending ? "검색 중" : "음식 검색"}
              onPress={handleSearch}
            />
          </FormGroup>

          {(searchMutation.data ?? []).length ? (
            <FormGroup label="검색 결과" helper={`${searchMutation.data?.length ?? 0}개`}>
              <AppCard tone="plain">
                {(searchMutation.data ?? []).map((food, index) => (
                  <Pressable
                    key={`${food.source}-${food.sourceId ?? food.id}-${index}`}
                    accessibilityRole="button"
                    onPress={() => selectFood(food)}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      borderBottomColor: colors.line,
                      borderBottomWidth: index === (searchMutation.data?.length ?? 0) - 1 ? 0 : 1,
                      flexDirection: "row",
                      gap: spacing.sm,
                      opacity: pressed ? 0.6 : 1,
                      paddingVertical: spacing.md
                    })}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text
                        selectable
                        style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}
                      >
                        {food.name}
                      </Text>
                      <Text selectable style={{ color: colors.mutedInk, fontSize: 11 }}>
                        {food.brandName ? `${food.brandName} · ` : ""}
                        {food.servingGram}g 기준 · {food.caloriesPerServing}kcal
                      </Text>
                      <Text selectable style={{ color: colors.mutedInk, fontSize: 11 }}>
                        출처: {foodSourceReference(food)}
                      </Text>
                      {foodContributorLabel(food) ? (
                        <Text selectable style={{ color: colors.moss, fontSize: 11 }}>
                          {foodContributorLabel(food)}
                        </Text>
                      ) : null}
                    </View>
                    {selectedFood?.id === food.id ? (
                      <Check color={colors.moss} size={18} strokeWidth={2.5} />
                    ) : (
                      <ChevronRight color={colors.mutedInk} size={17} strokeWidth={2.3} />
                    )}
                  </Pressable>
                ))}
              </AppCard>
            </FormGroup>
          ) : null}

          {searchMutation.isSuccess && !(searchMutation.data ?? []).length ? (
            <AppCard tone="plain">
              <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
                표시할 수 있는 공식 데이터가 없습니다.
              </Text>
              <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 18 }}>
                식약처 공식 데이터 또는 검증 자료가 있는 관리자 승인 음식만 표시합니다.
              </Text>
            </AppCard>
          ) : null}

          {preview ? (
            <FormGroup label="선택한 음식" helper={selectedFood?.name}>
              <AppCard tone="plain">
                <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
                  출처: {selectedFood ? foodSourceReference(selectedFood) : ""}
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 18 }}>
                  영양정보는 표시된 출처와 기준량의 참고값이며, 실제 제품과 조리법에 따라 달라질 수
                  있습니다.
                </Text>
                {selectedFood && foodContributorLabel(selectedFood) ? (
                  <Text selectable style={{ color: colors.moss, fontSize: 12, fontWeight: "800" }}>
                    {foodContributorLabel(selectedFood)}
                  </Text>
                ) : null}
                <FormGroup label="먹은 양" helper={`${selectedFood?.servingGram ?? 0}g 기준`}>
                  <Field
                    keyboardType="numeric"
                    value={amountGram}
                    onChangeText={setAmountGram}
                    placeholder="그램"
                  />
                </FormGroup>
              </AppCard>
              <NutritionPanel {...preview} />
              <SecondaryButton icon={Plus} label="이 식사에 추가" onPress={addSelectedFood} />
              <SecondaryButton
                icon={Flag}
                label="이 음식 정보 신고"
                onPress={() => setShowReportForm((visible) => !visible)}
              />
              {showReportForm ? (
                <AppCard tone="plain">
                  <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
                    어떤 정보가 잘못되었나요?
                  </Text>
                  <Field
                    multiline
                    value={reportReason}
                    onChangeText={setReportReason}
                    placeholder="예: 현미밥인데 탄수화물이 0g으로 표시됩니다."
                  />
                  <PrimaryButton
                    disabled={reportMutation.isPending || !reportReason.trim()}
                    icon={Send}
                    label={reportMutation.isPending ? "접수 중" : "신고 접수"}
                    onPress={() => reportMutation.mutate()}
                  />
                </AppCard>
              ) : null}
            </FormGroup>
          ) : null}

          <FormGroup label="검색에 없는 음식" helper="사용자 제안">
            <SecondaryButton
              icon={FilePlus2}
              label="새 음식 정보 제안"
              onPress={() => setShowSubmissionForm((visible) => !visible)}
            />
            {showSubmissionForm ? (
              <AppCard tone="plain">
                <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                  관리자 확인을 위한 음식 정보
                </Text>
                <Text selectable style={{ color: colors.mutedInk, fontSize: 12, lineHeight: 18 }}>
                  승인 전에는 검색 결과에 노출되지 않습니다. 승인 후 등록자의 Lonhats 닉네임이 함께
                  표시됩니다.
                </Text>
                <FormGroup label="음식명">
                  <Field
                    value={submissionName}
                    onChangeText={setSubmissionName}
                    placeholder="예: 집에서 만든 돼지고기 김치찌개"
                  />
                </FormGroup>
                <FormGroup label="브랜드·식당" helper="선택">
                  <Field
                    value={submissionBrand}
                    onChangeText={setSubmissionBrand}
                    placeholder="제품 또는 식당 이름"
                  />
                </FormGroup>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <FormGroup label="기준량(g)">
                      <Field
                        keyboardType="numeric"
                        value={submissionServing}
                        onChangeText={setSubmissionServing}
                        placeholder="100"
                      />
                    </FormGroup>
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormGroup label="열량(kcal)">
                      <Field
                        keyboardType="numeric"
                        value={submissionCalories}
                        onChangeText={setSubmissionCalories}
                        placeholder="0"
                      />
                    </FormGroup>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  {[
                    {
                      label: "탄수화물(g)",
                      value: submissionCarbs,
                      onChangeText: setSubmissionCarbs
                    },
                    {
                      label: "단백질(g)",
                      value: submissionProtein,
                      onChangeText: setSubmissionProtein
                    },
                    { label: "지방(g)", value: submissionFat, onChangeText: setSubmissionFat }
                  ].map((field) => (
                    <View key={field.label} style={{ flex: 1 }}>
                      <FormGroup label={field.label}>
                        <Field
                          keyboardType="numeric"
                          value={field.value}
                          onChangeText={field.onChangeText}
                          placeholder="0"
                        />
                      </FormGroup>
                    </View>
                  ))}
                </View>
                <FormGroup label="확인 근거">
                  <Field
                    multiline
                    value={submissionReference}
                    onChangeText={setSubmissionReference}
                    placeholder="제품 영양표시, 공식 웹페이지, 직접 계량한 조리법 등"
                  />
                </FormGroup>
                <PrimaryButton
                  disabled={submissionMutation.isPending}
                  icon={Send}
                  label={submissionMutation.isPending ? "제안 중" : "관리자 검토 요청"}
                  onPress={() => submissionMutation.mutate()}
                />
              </AppCard>
            ) : null}
          </FormGroup>

          <FormGroup label="이 식사에 담은 음식" helper={`${mealItems.length}가지`}>
            {mealItems.length ? (
              <View style={{ gap: spacing.sm }}>
                <AppCard tone="plain">
                  {mealItems.map((item, index) => (
                    <View
                      key={item.draftId}
                      style={{
                        alignItems: "center",
                        borderBottomColor: colors.line,
                        borderBottomWidth: index === mealItems.length - 1 ? 0 : 1,
                        flexDirection: "row",
                        gap: spacing.sm,
                        paddingVertical: spacing.sm
                      }}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          selectable
                          style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}
                        >
                          {item.foodName} · {item.amountGram ?? "-"}g
                        </Text>
                        <Text selectable style={{ color: colors.mutedInk, fontSize: 11 }}>
                          {item.calories}kcal · 출처: {foodSourceReference(item)}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel={`${item.foodName} 삭제`}
                        accessibilityRole="button"
                        onPress={() => removeMealItem(item.draftId)}
                        style={({ pressed }) => ({
                          alignItems: "center",
                          height: 40,
                          justifyContent: "center",
                          opacity: pressed ? 0.5 : 1,
                          width: 40
                        })}
                      >
                        <Trash2 color={colors.mutedInk} size={18} strokeWidth={2.2} />
                      </Pressable>
                    </View>
                  ))}
                </AppCard>
                <NutritionPanel
                  calories={draftTotals.calories}
                  carbs={draftTotals.carbs}
                  fat={draftTotals.fat}
                  protein={draftTotals.protein}
                  serving={draftTotals.amount}
                />
              </View>
            ) : (
              <EmptyState
                title="아직 담은 음식이 없습니다."
                body="음식을 검색하고 먹은 양을 확인한 뒤 식사에 추가하세요."
              />
            )}
          </FormGroup>

          <FormGroup label="오늘의 의미" helper="선택">
            <Field
              multiline
              value={memo}
              onChangeText={setMemo}
              placeholder="식사 상황이나 오늘의 느낌"
            />
          </FormGroup>

          {error ? (
            <Text selectable style={{ color: colors.danger, fontSize: 13, fontWeight: "800" }}>
              {error}
            </Text>
          ) : null}
          {notice ? (
            <Text selectable style={{ color: colors.moss, fontSize: 13, fontWeight: "800" }}>
              {notice}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={saveMutation.isPending || !mealItems.length}
            icon={Check}
            label={
              saveMutation.isPending
                ? "저장 중"
                : mealItems.length
                  ? `${mealItems.length}가지 음식으로 식사 저장`
                  : "이 식사 저장"
            }
            onPress={handleSave}
          />
        </View>
      </ScreenSection>
    </ScrollView>
  );
}
