import { supabase } from "@/lib/supabase";
import type {
  AppNotice,
  CommunityComment,
  CommunityPost,
  DaySummary,
  ExerciseActivity,
  FoodItem,
  GoalMode,
  JournalEntry,
  MealLog,
  Profile,
  WorkoutLog
} from "@/types/domain";

type DbRecord = Record<string, any>;

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  return supabase;
}

function today() {
  return new Date().toISOString().slice(0, 10);
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
    source: row.source ?? "seed",
    sourceId: row.source_id ?? null
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

export async function createWorkoutLog(
  userId: string,
  input: {
    exerciseId?: string | null;
    exerciseName: string;
    exerciseCategory?: string | null;
    minutes?: number | null;
    setCount?: number | null;
    reps?: number | null;
    loadKg?: number | null;
    metValue?: number | null;
    estimatedCalories?: number | null;
    bodyWeightKg?: number | null;
    memo?: string | null;
  }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("workout_logs")
    .insert({
      user_id: userId,
      exercise_id: input.exerciseId,
      exercise_name: input.exerciseName,
      exercise_category: input.exerciseCategory,
      trained_on: today(),
      minutes: input.minutes,
      set_count: input.setCount,
      reps: input.reps,
      load_kg: input.loadKg,
      met_value: input.metValue,
      estimated_calories: input.estimatedCalories,
      body_weight_kg: input.bodyWeightKg,
      memo: input.memo
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toWorkoutLog(data);
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

export async function createMealLog(userId: string, input: Omit<MealLog, "id" | "eatenOn">) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("meal_logs")
    .insert({
      user_id: userId,
      eaten_on: today(),
      meal_type: input.mealType,
      raw_text: input.rawText,
      food_name: input.foodName,
      amount_gram: input.amountGram,
      calories: input.calories,
      protein_gram: input.proteinGram,
      carbs_gram: input.carbsGram,
      fat_gram: input.fatGram,
      source: input.source,
      source_id: input.sourceId,
      confidence: input.confidence
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toMealLog(data);
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
    .or(`name.ilike.%${normalized}%,brand_name.ilike.%${normalized}%`)
    .limit(8);

  if (error) {
    throw error;
  }

  return (data ?? []).map(toFoodItem);
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
  input: { title: string; body: string; authorName?: string | null }
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("community_posts")
    .insert({
      user_id: userId,
      author_display_name: input.authorName,
      title: input.title,
      body: input.body,
      channel: "Better tomorrow"
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
  const startDate = start.toISOString().slice(0, 10);

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
    const key = date.toISOString().slice(0, 10);
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
