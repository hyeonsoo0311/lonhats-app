import { analyzeWeek, sumMealCalories } from "@/lib/analysis";
import type { DaySummary, MealEntry } from "@/types/domain";
import { describe, expect, it } from "vitest";

describe("analysis helpers", () => {
  it("sums recorded meal calories", () => {
    const meals: MealEntry[] = [
      { name: "A", calories: 100, proteinGram: 10, carbsGram: 5, fatGram: 2 },
      { name: "B", calories: 250, proteinGram: 20, carbsGram: 30, fatGram: 6 }
    ];

    expect(sumMealCalories(meals)).toBe(350);
  });

  it("calculates weekly averages and a conservative cut recommendation", () => {
    const days: DaySummary[] = [
      { date: "1", caloriesIn: 2300, caloriesOut: 300, workoutMinutes: 30 },
      { date: "2", caloriesIn: 2100, caloriesOut: 450, workoutMinutes: 60 }
    ];

    const result = analyzeWeek({ goalMode: "cut", dailyCalorieTarget: 2000, days });

    expect(result.averageCaloriesIn).toBe(2200);
    expect(result.averageWorkoutMinutes).toBe(45);
    expect(result.recommendedDailyCalorieAdjustment).toBe(-200);
    expect(result.recommendedWeeklyWorkoutMinutes).toBe(0);
  });
});
