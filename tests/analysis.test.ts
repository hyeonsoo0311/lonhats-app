import { analyzeLifeDirection, analyzeWeek, sumMealCalories } from "@/lib/analysis";
import type { DaySummary, LifeEntry, LifeStackKey, MealEntry } from "@/types/domain";
import { describe, expect, it } from "vitest";

function lifeEntry(
  stack: LifeStackKey,
  entryDate: string,
  input: Partial<LifeEntry> = {}
): LifeEntry {
  return {
    id: `${stack}-${entryDate}-${Math.random()}`,
    stack,
    category: input.category ?? stack,
    title: input.title ?? stack,
    entryDate,
    durationMinutes: input.durationMinutes ?? null,
    intensity: input.intensity ?? null,
    meaning: input.meaning ?? null,
    note: input.note ?? null,
    score: input.score ?? null,
    details: input.details ?? {},
    createdAt: input.createdAt ?? `${entryDate}T00:00:00.000Z`
  };
}

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

  it("turns life entries into a weekly direction report", () => {
    const entries: LifeEntry[] = [
      lifeEntry("move", "2026-06-01", { durationMinutes: 60, score: 82 }),
      lifeEntry("move", "2026-06-02", { durationMinutes: 90, score: 82 }),
      lifeEntry("meal", "2026-06-01", { score: 82 }),
      lifeEntry("meal", "2026-06-02", { score: 82 }),
      lifeEntry("recovery", "2026-06-01", { score: 90 }),
      lifeEntry("mind", "2026-06-02", { score: 80 })
    ];

    const report = analyzeLifeDirection(entries);

    expect(report.movementMinutes).toBe(150);
    expect(report.temperature).toBeGreaterThan(50);
    expect(report.humidity).toBeGreaterThan(40);
    expect(report.signals).toHaveLength(4);
    expect(report.signals.find((signal) => signal.stack === "move")?.score).toBe(100);
  });
});
