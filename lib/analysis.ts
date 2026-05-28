import type { MealEntry, WeeklyAnalysisInput, WeeklyRecommendation } from "@/types/domain";

const round = (value: number) => Math.round(value);

export function sumMealCalories(entries: MealEntry[]) {
  return entries.reduce((total, entry) => total + entry.calories, 0);
}

export function sumMacro(entries: MealEntry[], macro: "proteinGram" | "carbsGram" | "fatGram") {
  return entries.reduce((total, entry) => total + entry[macro], 0);
}

export function analyzeWeek(input: WeeklyAnalysisInput): WeeklyRecommendation {
  const dayCount = Math.max(input.days.length, 1);
  const averageCaloriesIn = input.days.reduce((total, day) => total + day.caloriesIn, 0) / dayCount;
  const averageCaloriesOut =
    input.days.reduce((total, day) => total + day.caloriesOut, 0) / dayCount;
  const averageWorkoutMinutes =
    input.days.reduce((total, day) => total + day.workoutMinutes, 0) / dayCount;
  const calorieDeltaFromTarget = averageCaloriesIn - input.dailyCalorieTarget;

  const direction = input.goalMode === "gain" ? 1 : input.goalMode === "cut" ? -1 : 0;
  const adjustmentBase = Math.min(Math.abs(calorieDeltaFromTarget), 350);
  const recommendedDailyCalorieAdjustment =
    direction === 0 ? -round(calorieDeltaFromTarget / 2) : direction * round(adjustmentBase);
  const workoutGap = Math.max(0, 45 - averageWorkoutMinutes);
  const recommendedWeeklyWorkoutMinutes = round(workoutGap * 7);

  const message =
    input.goalMode === "gain"
      ? "증량 목표라면 회복을 해치지 않는 선에서 하루 섭취량을 조금 올리고, 하체/등 중심의 근력 볼륨을 유지하세요."
      : input.goalMode === "cut"
        ? "감량 목표라면 급하게 줄이기보다 하루 평균 섭취량을 작게 조정하고, 낮은 강도의 유산소를 꾸준히 더하세요."
        : "유지 목표라면 섭취량보다 루틴 지속률과 수면 리듬을 먼저 안정시키세요.";

  return {
    averageCaloriesIn: round(averageCaloriesIn),
    averageCaloriesOut: round(averageCaloriesOut),
    averageWorkoutMinutes: round(averageWorkoutMinutes),
    calorieDeltaFromTarget: round(calorieDeltaFromTarget),
    recommendedDailyCalorieAdjustment,
    recommendedWeeklyWorkoutMinutes,
    message
  };
}
