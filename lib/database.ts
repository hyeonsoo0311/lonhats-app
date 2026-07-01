import { supabase } from "@/lib/supabase";
import { defaultGaugeCriteria } from "@/lib/gauge";
import { calendarWeekStartKey, localDateKey, rollingWindowStartKey } from "@/lib/date";
import type {
  AccountDeletionRequest,
  AppNotice,
  BodyLog,
  CommunityComment,
  CommunityPost,
  CommunityPostType,
  CommunityProofKind,
  DaySummary,
  ExerciseActivity,
  FoodItem,
  FoodSubmission,
  GoalMode,
  JournalEntry,
  LifeGaugeCriteria,
  LifeEntry,
  LifeIntensity,
  LifeRoutine,
  LifeStackKey,
  MealLog,
  Profile,
  RoutineCadence,
  RoutineCheckin,
  WorkoutLog
} from "@/types/domain";

type DbRecord = Record<string, any>;
type LifeEntryInput = {
  stack: LifeStackKey;
  category: string;
  title: string;
  durationMinutes?: number | null;
  intensity?: LifeIntensity | null;
  meaning?: string | null;
  note?: string | null;
  score?: number | null;
  details?: Record<string, unknown>;
};
type WorkoutLogInput = Omit<WorkoutLog, "id" | "sourceLifeEntryId" | "trainedOn">;
type MealLogInput = Omit<MealLog, "id" | "sourceLifeEntryId" | "eatenOn">;

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  return supabase;
}

function today() {
  return localDateKey();
}

function weekStartDate() {
  return calendarWeekStartKey();
}

function routineWindowStartDate() {
  return rollingWindowStartKey(41);
}

function toProfile(row: DbRecord): Profile {
  return {
    id: row.id,
    displayName: row.display_name ?? null,
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    role: row.role ?? "member",
    goalMode: (row.goal_mode ?? "maintain") as GoalMode,
    weightKg: row.weight_kg ?? null,
    dailyCalorieTarget: row.daily_calorie_target ?? null
  };
}

function toWorkoutLog(row: DbRecord): WorkoutLog {
  return {
    id: row.id,
    sourceLifeEntryId: row.source_life_entry_id ?? null,
    exerciseId: row.exercise_id ?? null,
    exerciseName: row.exercise_name,
    exerciseCategory: row.exercise_category ?? null,
    trainedOn: row.trained_on,
    minutes: row.minutes ?? null,
    setCount: row.set_count ?? null,
    reps: row.reps ?? null,
    loadKg: row.load_kg ?? null,
    metValue: row.met_value ?? null,
    estimatedCalories: row.estimated_calories ?? null,
    bodyWeightKg: row.body_weight_kg ?? null,
    memo: row.memo ?? null
  };
}

function toExerciseActivity(row: DbRecord): ExerciseActivity {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    name: row.name,
    aliases: row.aliases ?? [],
    metValue: Number(row.met_value ?? 1),
    intensity: row.intensity,
    defaultMinutes: row.default_minutes ?? 30,
    description: row.description ?? "",
    source: row.source ?? "Compendium of Physical Activities"
  };
}

function toMealLog(row: DbRecord): MealLog {
  return {
    id: row.id,
    sourceLifeEntryId: row.source_life_entry_id ?? null,
    eatenOn: row.eaten_on,
    mealType: row.meal_type ?? "식사",
    rawText: row.raw_text ?? "",
    foodName: row.food_name,
    amountGram: row.amount_gram ?? null,
    calories: row.calories ?? 0,
    proteinGram: row.protein_gram ?? 0,
    carbsGram: row.carbs_gram ?? 0,
    fatGram: row.fat_gram ?? 0,
    source: row.source ?? null,
    sourceId: row.source_id ?? null,
    confidence: row.confidence ?? null
  };
}

function toBodyLog(row: DbRecord): BodyLog {
  return {
    id: row.id,
    measuredOn: row.measured_on,
    heightCm: row.height_cm === null || row.height_cm === undefined ? null : Number(row.height_cm),
    weightKg: row.weight_kg === null || row.weight_kg === undefined ? null : Number(row.weight_kg),
    birthDate: row.birth_date ?? null,
    sex: row.sex ?? null,
    skeletalMuscleKg:
      row.skeletal_muscle_kg === null || row.skeletal_muscle_kg === undefined
        ? null
        : Number(row.skeletal_muscle_kg),
    bodyFatPercent:
      row.body_fat_percent === null || row.body_fat_percent === undefined
        ? null
        : Number(row.body_fat_percent),
    condition: row.condition ?? null,
    note: row.note ?? null,
    createdAt: row.created_at
  };
}

function toFoodItem(row: DbRecord): FoodItem {
  return {
    id: row.id,
    name: row.name,
    brandName: row.brand_name ?? null,
    servingGram: Number(row.serving_gram ?? 100),
    caloriesPerServing: Number(row.calories_per_serving ?? 0),
    proteinGram: Number(row.protein_gram ?? 0),
    carbsGram: Number(row.carbs_gram ?? 0),
    fatGram: Number(row.fat_gram ?? 0),
    source: row.source,
    sourceId: row.source_id ?? null,
    sourceReference: row.source_reference ?? null,
    contributorDisplayName: row.contributor_display_name ?? null
  };
}

function toFoodSubmission(row: DbRecord): FoodSubmission {
  return {
    id: row.id,
    contributorDisplayName: row.contributor_display_name ?? "Lonhats 사용자",
    name: row.name,
    brandName: row.brand_name ?? null,
    servingGram: Number(row.serving_gram ?? 100),
    caloriesPerServing: Number(row.calories_per_serving ?? 0),
    proteinGram: Number(row.protein_gram ?? 0),
    carbsGram: Number(row.carbs_gram ?? 0),
    fatGram: Number(row.fat_gram ?? 0),
    referenceNote: row.reference_note ?? null,
    status: row.status ?? "pending",
    createdAt: row.created_at
  };
}

function toJournalEntry(row: DbRecord): JournalEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    mood: row.mood ?? null,
    smallWin: row.small_win ?? null,
    body: row.body ?? null
  };
}

function toPost(row: DbRecord): CommunityPost {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    channel: row.channel,
    postType: (row.post_type ?? "discussion") as CommunityPostType,
    stack: (row.stack ?? null) as LifeStackKey | null,
    proofKind: (row.proof_kind ?? null) as CommunityProofKind | null,
    sourceLifeEntryId: row.source_life_entry_id ?? null,
    challengeDay: row.challenge_day ?? null,
    authorId: row.user_id,
    authorName: row.author_display_name ?? null,
    upvoteCount: row.upvote_count ?? 0,
    commentCount: row.comment_count ?? 0,
    createdAt: row.created_at
  };
}

function toComment(row: DbRecord): CommunityComment {
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    authorId: row.user_id,
    authorName: row.author_display_name ?? null,
    createdAt: row.created_at
  };
}

function toAccountDeletionRequest(row: DbRecord): AccountDeletionRequest {
  return {
    id: row.id,
    status: row.status ?? "open",
    reason: row.reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toLifeEntry(row: DbRecord): LifeEntry {
  return {
    id: row.id,
    stack: row.stack,
    category: row.category,
    title: row.title,
    entryDate: row.entry_date,
    durationMinutes: row.duration_minutes ?? null,
    intensity: row.intensity ?? null,
    meaning: row.meaning ?? null,
    note: row.note ?? null,
    score: row.score ?? null,
    details: row.details ?? {},
    createdAt: row.created_at
  };
}

function toLifeGaugeCriteria(row: DbRecord): LifeGaugeCriteria {
  return {
    userId: row.user_id,
    targetTemperature: row.target_temperature ?? 70,
    targetHumidity: row.target_humidity ?? 70,
    temperatureMinC: Number(row.temperature_min_c ?? defaultGaugeCriteria.temperatureMinC),
    temperatureMaxC: Number(row.temperature_max_c ?? defaultGaugeCriteria.temperatureMaxC),
    humidityMinPercent: row.humidity_min_percent ?? defaultGaugeCriteria.humidityMinPercent,
    humidityMaxPercent: row.humidity_max_percent ?? defaultGaugeCriteria.humidityMaxPercent,
    temperatureDefinition: row.temperature_definition ?? null,
    temperatureLowNote: row.temperature_low_note ?? null,
    temperatureHighNote: row.temperature_high_note ?? null,
    humidityDefinition: row.humidity_definition ?? null,
    humidityLowNote: row.humidity_low_note ?? null,
    humidityHighNote: row.humidity_high_note ?? null,
    updatedAt: row.updated_at
  };
}

function toLifeRoutine(row: DbRecord): LifeRoutine {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    stack: row.stack ?? null,
    cadence: (row.cadence ?? "weekly") as RoutineCadence,
    targetCount: row.target_count ?? 1,
    temperatureWeight: row.temperature_weight ?? 1,
    humidityWeight: row.humidity_weight ?? 1,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRoutineCheckin(row: DbRecord): RoutineCheckin {
  return {
    id: row.id,
    routineId: row.routine_id,
    userId: row.user_id,
    checkedOn: row.checked_on,
    completed: row.completed ?? true,
    note: row.note ?? null,
    createdAt: row.created_at
  };
}

export async function getProfile(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toProfile(data) : null;
}

export async function updateProfile(
  userId: string,
  input: { displayName?: string; goalMode?: GoalMode; dailyCalorieTarget?: number }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .update({
      display_name: input.displayName,
      goal_mode: input.goalMode,
      daily_calorie_target: input.dailyCalorieTarget
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toProfile(data);
}

export async function getTodayLifeEntries(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_date", today())
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toLifeEntry);
}

export async function getWeeklyLifeEntries(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("entry_date", weekStartDate())
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toLifeEntry);
}

export async function getLifeEntriesInRange(userId: string, startDate: string, endDate: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toLifeEntry);
}

export async function createLifeEntry(
  userId: string,
  input: LifeEntryInput & { stack: "recovery" | "mind" }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_entries")
    .insert({
      user_id: userId,
      stack: input.stack,
      category: input.category,
      title: input.title,
      entry_date: today(),
      duration_minutes: input.durationMinutes,
      intensity: input.intensity,
      meaning: input.meaning,
      note: input.note,
      score: input.score,
      details: input.details ?? {}
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toLifeEntry(data);
}

export async function createMealWaterEntry(userId: string, amountMl: number) {
  const client = requireSupabase();
  const safeAmountMl = Math.min(Math.max(Math.round(amountMl), 1), 5000);
  const { data, error } = await client
    .from("life_entries")
    .insert({
      user_id: userId,
      stack: "meal",
      category: "물",
      title: `물 ${safeAmountMl}mL`,
      entry_date: today(),
      duration_minutes: null,
      intensity: null,
      meaning: null,
      note: null,
      score: null,
      details: { amountMl: safeAmountMl, kind: "water" }
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toLifeEntry(data);
}

function lifeEntryRpcInput(input: LifeEntryInput) {
  return {
    category: input.category,
    title: input.title,
    entry_date: today(),
    duration_minutes: input.durationMinutes ?? null,
    intensity: input.intensity ?? null,
    meaning: input.meaning ?? null,
    note: input.note ?? null,
    score: input.score ?? null,
    details: input.details ?? {}
  };
}

export async function createMealWithLifeEntry(
  userId: string,
  lifeInput: Omit<LifeEntryInput, "stack">,
  mealInputs: MealLogInput[]
) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_meal_with_life_entry", {
    p_user_id: userId,
    p_life: lifeEntryRpcInput({ ...lifeInput, stack: "meal" }),
    p_meal: mealInputs.map((mealInput) => ({
      eaten_on: today(),
      meal_type: mealInput.mealType,
      raw_text: mealInput.rawText,
      food_name: mealInput.foodName,
      amount_gram: mealInput.amountGram,
      calories: mealInput.calories,
      protein_gram: mealInput.proteinGram,
      carbs_gram: mealInput.carbsGram,
      fat_gram: mealInput.fatGram,
      source: mealInput.source,
      source_id: mealInput.sourceId,
      confidence: mealInput.confidence
    }))
  });

  if (error) {
    throw error;
  }

  const result = data as DbRecord;
  return {
    lifeEntry: toLifeEntry(result.life_entry),
    mealLogs: ((result.meal_logs ?? []) as DbRecord[]).map(toMealLog)
  };
}

export async function createWorkoutWithLifeEntry(
  userId: string,
  lifeInput: Omit<LifeEntryInput, "stack">,
  workoutInput: WorkoutLogInput
) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_workout_with_life_entry", {
    p_user_id: userId,
    p_life: lifeEntryRpcInput({ ...lifeInput, stack: "move" }),
    p_workout: {
      trained_on: today(),
      exercise_id: workoutInput.exerciseId,
      exercise_name: workoutInput.exerciseName,
      exercise_category: workoutInput.exerciseCategory,
      minutes: workoutInput.minutes,
      set_count: workoutInput.setCount,
      reps: workoutInput.reps,
      load_kg: workoutInput.loadKg,
      met_value: workoutInput.metValue,
      estimated_calories: workoutInput.estimatedCalories,
      body_weight_kg: workoutInput.bodyWeightKg,
      memo: workoutInput.memo
    }
  });

  if (error) {
    throw error;
  }

  const result = data as DbRecord;
  return {
    lifeEntry: toLifeEntry(result.life_entry),
    workoutLog: toWorkoutLog(result.workout_log)
  };
}

export async function getLifeGaugeCriteria(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_gauge_criteria")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toLifeGaugeCriteria(data) : null;
}

export async function upsertLifeGaugeCriteria(
  userId: string,
  input: {
    targetTemperature: number;
    targetHumidity: number;
    temperatureMinC?: number;
    temperatureMaxC?: number;
    humidityMinPercent?: number;
    humidityMaxPercent?: number;
    temperatureDefinition: string;
    temperatureLowNote: string;
    temperatureHighNote: string;
    humidityDefinition: string;
    humidityLowNote: string;
    humidityHighNote: string;
  }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_gauge_criteria")
    .upsert(
      {
        user_id: userId,
        target_temperature: input.targetTemperature,
        target_humidity: input.targetHumidity,
        temperature_min_c: input.temperatureMinC ?? defaultGaugeCriteria.temperatureMinC,
        temperature_max_c: input.temperatureMaxC ?? defaultGaugeCriteria.temperatureMaxC,
        humidity_min_percent: input.humidityMinPercent ?? defaultGaugeCriteria.humidityMinPercent,
        humidity_max_percent: input.humidityMaxPercent ?? defaultGaugeCriteria.humidityMaxPercent,
        temperature_definition: input.temperatureDefinition,
        temperature_low_note: input.temperatureLowNote,
        temperature_high_note: input.temperatureHighNote,
        humidity_definition: input.humidityDefinition,
        humidity_low_note: input.humidityLowNote,
        humidity_high_note: input.humidityHighNote,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toLifeGaugeCriteria(data);
}

export async function getLifeRoutines(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_routines")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toLifeRoutine);
}

export async function createLifeRoutine(
  userId: string,
  input: {
    title: string;
    stack?: LifeStackKey | null;
    cadence: RoutineCadence;
    targetCount: number;
    temperatureWeight: number;
    humidityWeight: number;
  }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_routines")
    .insert({
      user_id: userId,
      title: input.title,
      stack: input.stack ?? null,
      cadence: input.cadence,
      target_count: input.targetCount,
      temperature_weight: input.temperatureWeight,
      humidity_weight: input.humidityWeight
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toLifeRoutine(data);
}

export async function deactivateLifeRoutine(userId: string, routineId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_routines")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", routineId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toLifeRoutine(data);
}

export async function getRoutineCheckins(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_routine_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checked_on", routineWindowStartDate())
    .order("checked_on", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toRoutineCheckin);
}

export async function upsertRoutineCheckin(
  userId: string,
  input: { routineId: string; completed?: boolean; note?: string | null }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("life_routine_checkins")
    .upsert(
      {
        user_id: userId,
        routine_id: input.routineId,
        checked_on: today(),
        completed: input.completed ?? true,
        note: input.note ?? null
      },
      { onConflict: "routine_id,checked_on" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toRoutineCheckin(data);
}

export async function getTodayWorkoutLogs(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("trained_on", today())
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toWorkoutLog);
}

export async function getExerciseCatalog() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("exercise_catalog")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toExerciseActivity);
}

export async function getTodayMealLogs(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("eaten_on", today())
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toMealLog);
}

export async function getTodayBodyLogs(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("body_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("measured_on", today())
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toBodyLog);
}

export async function getLatestBodyLog(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("body_logs")
    .select("*")
    .eq("user_id", userId)
    .order("measured_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toBodyLog(data) : null;
}

export async function createBodyLog(
  userId: string,
  input: {
    heightCm?: number | null;
    weightKg?: number | null;
    birthDate?: string | null;
    sex?: BodyLog["sex"];
    skeletalMuscleKg?: number | null;
    bodyFatPercent?: number | null;
    condition?: string | null;
    note?: string | null;
  }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("body_logs")
    .insert({
      user_id: userId,
      measured_on: today(),
      height_cm: input.heightCm ?? null,
      weight_kg: input.weightKg ?? null,
      birth_date: input.birthDate || null,
      sex: input.sex ?? null,
      skeletal_muscle_kg: input.skeletalMuscleKg ?? null,
      body_fat_percent: input.bodyFatPercent ?? null,
      condition: input.condition ?? null,
      note: input.note ?? null
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toBodyLog(data);
}

export async function searchFoodItems(query: string) {
  const client = requireSupabase();
  const normalized = query.trim();

  if (!normalized) {
    return [];
  }

  const { data, error } = await client
    .from("food_items")
    .select("*")
    .eq("source", "community-approved")
    .or(`name.ilike.%${normalized}%,brand_name.ilike.%${normalized}%`)
    .limit(8);

  if (error) {
    throw error;
  }

  return (data ?? []).map(toFoodItem);
}

export async function createFoodSubmission(
  userId: string,
  input: {
    name: string;
    brandName?: string | null;
    servingGram: number;
    caloriesPerServing: number;
    proteinGram: number;
    carbsGram: number;
    fatGram: number;
    referenceNote?: string | null;
  }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("food_submissions")
    .insert({
      user_id: userId,
      name: input.name,
      brand_name: input.brandName ?? null,
      serving_gram: input.servingGram,
      calories_per_serving: input.caloriesPerServing,
      protein_gram: input.proteinGram,
      carbs_gram: input.carbsGram,
      fat_gram: input.fatGram,
      reference_note: input.referenceNote ?? null
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toFoodSubmission(data);
}

export async function createFoodReport(
  userId: string,
  food: Pick<FoodItem, "name" | "source" | "sourceId">,
  reason: string
) {
  const client = requireSupabase();
  const { error } = await client.from("food_reports").insert({
    user_id: userId,
    food_name: food.name,
    food_source: food.source,
    food_source_id: food.sourceId,
    reason
  });

  if (error) {
    throw error;
  }
}

export async function createUserFeedback(
  userId: string,
  input: { category: string; body: string }
) {
  const client = requireSupabase();
  const body = input.body.trim();

  if (!body) {
    throw new Error("피드백 내용을 입력해주세요.");
  }

  const { data, error } = await client
    .from("user_feedback")
    .insert({
      user_id: userId,
      category: input.category,
      body
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function getJournalEntries(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(7);

  if (error) {
    throw error;
  }

  return (data ?? []).map(toJournalEntry);
}

export async function saveJournalEntry(
  userId: string,
  input: { mood: string; smallWin: string; body: string }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("journal_entries")
    .upsert(
      {
        user_id: userId,
        entry_date: today(),
        mood: input.mood,
        small_win: input.smallWin,
        body: input.body
      },
      { onConflict: "user_id,entry_date" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toJournalEntry(data);
}

export async function getCommunityPosts() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("community_posts")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map(toPost);
}

export async function getCommunityBlockedUserIds(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("community_user_blocks")
    .select("blocked_user_id")
    .eq("blocker_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => String(row.blocked_user_id));
}

export async function getCommunityPost(postId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw error;
  }

  return toPost(data);
}

export async function createCommunityPost(
  userId: string,
  input: {
    title: string;
    body: string;
    authorName?: string | null;
    postType?: CommunityPostType;
    stack?: LifeStackKey | null;
    proofKind?: CommunityProofKind | null;
    sourceLifeEntryId?: string | null;
    challengeDay?: number | null;
  }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("community_posts")
    .insert({
      user_id: userId,
      author_display_name: input.authorName,
      title: input.title,
      body: input.body,
      channel: "Better tomorrow",
      post_type: input.postType ?? "discussion",
      stack: input.stack ?? null,
      proof_kind: input.proofKind ?? null,
      source_life_entry_id: input.sourceLifeEntryId ?? null,
      challenge_day: input.challengeDay ?? null
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toPost(data);
}

export async function voteCommunityPost(userId: string, postId: string, value: 1 | -1) {
  const client = requireSupabase();
  const { error } = await client.from("community_votes").upsert(
    {
      user_id: userId,
      post_id: postId,
      value
    },
    { onConflict: "user_id,post_id" }
  );

  if (error) {
    throw error;
  }
}

export async function reportCommunityContent(
  userId: string,
  input: { postId?: string | null; commentId?: string | null; reason: string }
) {
  const client = requireSupabase();

  if (!input.postId && !input.commentId) {
    throw new Error("신고할 게시물 또는 댓글을 선택해주세요.");
  }

  if (!input.reason.trim()) {
    throw new Error("신고 이유를 입력해주세요.");
  }

  const { error } = await client.from("community_reports").insert({
    reporter_id: userId,
    post_id: input.postId ?? null,
    comment_id: input.commentId ?? null,
    reason: input.reason.trim()
  });

  if (error) {
    throw error;
  }
}

export async function blockCommunityUser(
  userId: string,
  blockedUserId: string,
  reason?: string | null
) {
  const client = requireSupabase();

  if (userId === blockedUserId) {
    throw new Error("자기 자신은 차단할 수 없습니다.");
  }

  const { error } = await client.from("community_user_blocks").upsert(
    {
      blocker_id: userId,
      blocked_user_id: blockedUserId,
      reason: reason ?? null
    },
    { onConflict: "blocker_id,blocked_user_id" }
  );

  if (error) {
    throw error;
  }
}

export async function unblockCommunityUser(userId: string, blockedUserId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("community_user_blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_user_id", blockedUserId);

  if (error) {
    throw error;
  }
}

export async function getCommunityComments(postId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toComment);
}

export async function createCommunityComment(
  userId: string,
  input: { postId: string; body: string; authorName?: string | null }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("community_comments")
    .insert({
      user_id: userId,
      post_id: input.postId,
      author_display_name: input.authorName,
      body: input.body
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toComment(data);
}

export async function getActiveAccountDeletionRequest(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toAccountDeletionRequest(data) : null;
}

export async function requestAccountDeletion(
  userId: string,
  input: { email?: string | null; reason?: string | null }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("account_deletion_requests")
    .insert({
      user_id: userId,
      requester_email: input.email ?? null,
      reason: input.reason?.trim() || null
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 처리 대기 중인 계정 삭제 요청이 있습니다.");
    }

    throw error;
  }

  return toAccountDeletionRequest(data);
}

export async function getAppNotices() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("app_notices")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(3);

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (row): AppNotice => ({
      id: row.id,
      title: row.title,
      body: row.body,
      priority: row.priority ?? "normal"
    })
  );
}

export async function getWeeklyDaySummaries(userId: string): Promise<DaySummary[]> {
  const client = requireSupabase();
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const startDate = localDateKey(start);

  const [mealsResult, workoutsResult] = await Promise.all([
    client
      .from("meal_logs")
      .select("eaten_on, calories")
      .eq("user_id", userId)
      .gte("eaten_on", startDate),
    client
      .from("workout_logs")
      .select("trained_on, minutes, estimated_calories")
      .eq("user_id", userId)
      .gte("trained_on", startDate)
  ]);

  if (mealsResult.error) {
    throw mealsResult.error;
  }

  if (workoutsResult.error) {
    throw workoutsResult.error;
  }

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = localDateKey(date);
    const caloriesIn = (mealsResult.data ?? [])
      .filter((meal) => meal.eaten_on === key)
      .reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0);
    const workoutMinutes = (workoutsResult.data ?? [])
      .filter((workout) => workout.trained_on === key)
      .reduce((sum, workout) => sum + Number(workout.minutes ?? 0), 0);
    const caloriesOut = (workoutsResult.data ?? [])
      .filter((workout) => workout.trained_on === key)
      .reduce((sum, workout) => sum + Number(workout.estimated_calories ?? 0), 0);

    return {
      date: key.slice(5),
      caloriesIn,
      caloriesOut,
      workoutMinutes
    };
  });
}
