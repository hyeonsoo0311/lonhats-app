export type GoalMode = "cut" | "maintain" | "gain";

export type Exercise = {
  id: string;
  name: string;
  target: string;
  purpose: string;
  cue: string;
  level: "beginner" | "intermediate" | "advanced";
};

export type WorkoutSet = {
  exerciseName: string;
  sets: number;
  reps: number;
  loadKg?: number;
  minutes?: number;
};

export type MealEntry = {
  name: string;
  calories: number;
  proteinGram: number;
  carbsGram: number;
  fatGram: number;
};

export type DaySummary = {
  date: string;
  caloriesIn: number;
  caloriesOut: number;
  workoutMinutes: number;
};

export type WeeklyAnalysisInput = {
  goalMode: GoalMode;
  dailyCalorieTarget: number;
  days: DaySummary[];
};

export type WeeklyRecommendation = {
  averageCaloriesIn: number;
  averageCaloriesOut: number;
  averageWorkoutMinutes: number;
  calorieDeltaFromTarget: number;
  recommendedDailyCalorieAdjustment: number;
  recommendedWeeklyWorkoutMinutes: number;
  message: string;
};
