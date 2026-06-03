export type GoalMode = "cut" | "maintain" | "gain";

export type UserRole = "member" | "admin";

export type LifeStackKey = "move" | "meal" | "recovery" | "mind";

export type LifeIntensity = "light" | "moderate" | "hard" | "limit";

export type CommunityPostType = "discussion" | "proof";

export type CommunityProofKind = "daily_better" | "challenge_day" | "weekly_share";

export type Profile = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: UserRole;
  goalMode: GoalMode;
  weightKg: number | null;
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
  exerciseId: string | null;
  exerciseName: string;
  exerciseCategory: string | null;
  trainedOn: string;
  minutes: number | null;
  setCount: number | null;
  reps: number | null;
  loadKg: number | null;
  metValue: number | null;
  estimatedCalories: number | null;
  bodyWeightKg: number | null;
  memo: string | null;
};

export type ExerciseActivity = {
  id: string;
  slug: string;
  category: "헬스" | "요가" | "필라테스" | "러닝" | "유산소" | "스포츠";
  name: string;
  aliases: string[];
  metValue: number;
  intensity: "light" | "moderate" | "vigorous";
  defaultMinutes: number;
  description: string;
  source: string;
};

export type LifeEntry = {
  id: string;
  stack: LifeStackKey;
  category: string;
  title: string;
  entryDate: string;
  durationMinutes: number | null;
  intensity: LifeIntensity | null;
  meaning: string | null;
  note: string | null;
  score: number | null;
  details: Record<string, unknown>;
  createdAt: string;
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
  postType: CommunityPostType;
  stack: LifeStackKey | null;
  proofKind: CommunityProofKind | null;
  sourceLifeEntryId: string | null;
  challengeDay: number | null;
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

export type StackSignal = {
  stack: LifeStackKey;
  label: string;
  count: number;
  score: number;
  message: string;
};

export type LifeDirectionReport = {
  temperature: number;
  humidity: number;
  routineScore: number;
  movementMinutes: number;
  mealDays: number;
  recoveryDays: number;
  mindDays: number;
  signals: StackSignal[];
  message: string;
};

export type LifeGaugeCriteria = {
  userId: string;
  targetTemperature: number;
  targetHumidity: number;
  temperatureMinC: number;
  temperatureMaxC: number;
  humidityMinPercent: number;
  humidityMaxPercent: number;
  temperatureDefinition: string | null;
  temperatureLowNote: string | null;
  temperatureHighNote: string | null;
  humidityDefinition: string | null;
  humidityLowNote: string | null;
  humidityHighNote: string | null;
  updatedAt: string;
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
