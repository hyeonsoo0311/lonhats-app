export type GoalMode = "cut" | "maintain" | "gain";

export type UserRole = "member" | "admin";

export type Profile = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: UserRole;
  goalMode: GoalMode;
  dailyCalorieTarget: number | null;
};

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

export type WorkoutLog = {
  id: string;
  exerciseName: string;
  trainedOn: string;
  minutes: number | null;
  setCount: number | null;
  reps: number | null;
  loadKg: number | null;
  memo: string | null;
};

export type MealEntry = {
  name: string;
  calories: number;
  proteinGram: number;
  carbsGram: number;
  fatGram: number;
};

export type FoodItem = {
  id: string;
  name: string;
  brandName: string | null;
  servingGram: number;
  caloriesPerServing: number;
  proteinGram: number;
  carbsGram: number;
  fatGram: number;
  source: string;
  sourceId: string | null;
};

export type MealLog = {
  id: string;
  eatenOn: string;
  mealType: string;
  rawText: string;
  foodName: string;
  amountGram: number | null;
  calories: number;
  proteinGram: number;
  carbsGram: number;
  fatGram: number;
  source: string | null;
  sourceId: string | null;
  confidence: number | null;
};

export type JournalEntry = {
  id: string;
  entryDate: string;
  mood: string | null;
  smallWin: string | null;
  body: string | null;
};

export type CommunityPost = {
  id: string;
  title: string;
  body: string;
  channel: string;
  authorId: string;
  authorName: string | null;
  upvoteCount: number;
  commentCount: number;
  createdAt: string;
};

export type CommunityComment = {
  id: string;
  postId: string;
  body: string;
  authorId: string;
  authorName: string | null;
  createdAt: string;
};

export type AppNotice = {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "important";
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
