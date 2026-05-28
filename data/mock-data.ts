import type { DaySummary, Exercise, MealEntry, WorkoutSet } from "@/types/domain";

export const todayWorkout: WorkoutSet[] = [
  { exerciseName: "스쿼트", sets: 4, reps: 8, loadKg: 45 },
  { exerciseName: "루마니안 데드리프트", sets: 3, reps: 10, loadKg: 35 },
  { exerciseName: "인클라인 걷기", sets: 1, reps: 1, minutes: 22 }
];

export const exerciseLibrary: Exercise[] = [
  {
    id: "squat",
    name: "스쿼트",
    target: "하체, 코어",
    purpose: "하체 근력과 전신 안정성을 키우는 기본 동작",
    cue: "무릎은 발끝 방향, 가슴은 접히지 않게 유지",
    level: "beginner"
  },
  {
    id: "rdl",
    name: "루마니안 데드리프트",
    target: "햄스트링, 둔근",
    purpose: "엉덩이와 후면 사슬의 힘을 만드는 힌지 동작",
    cue: "허리는 길게, 엉덩이를 뒤로 보내며 내려가기",
    level: "intermediate"
  },
  {
    id: "pushup",
    name: "푸시업",
    target: "가슴, 삼두, 코어",
    purpose: "상체 밀기 힘과 몸통 긴장도를 함께 훈련",
    cue: "몸을 한 줄로 만들고 팔꿈치는 과하게 벌리지 않기",
    level: "beginner"
  }
];

export const mealEntries: MealEntry[] = [
  { name: "현미밥 1공기", calories: 310, proteinGram: 6, carbsGram: 67, fatGram: 2 },
  { name: "닭가슴살 150g", calories: 248, proteinGram: 46, carbsGram: 0, fatGram: 5 },
  { name: "그릭요거트와 베리", calories: 190, proteinGram: 18, carbsGram: 22, fatGram: 4 }
];

export const weekDays: DaySummary[] = [
  { date: "월", caloriesIn: 1980, caloriesOut: 420, workoutMinutes: 54 },
  { date: "화", caloriesIn: 2140, caloriesOut: 250, workoutMinutes: 32 },
  { date: "수", caloriesIn: 1870, caloriesOut: 510, workoutMinutes: 61 },
  { date: "목", caloriesIn: 2050, caloriesOut: 380, workoutMinutes: 45 },
  { date: "금", caloriesIn: 2210, caloriesOut: 180, workoutMinutes: 24 },
  { date: "토", caloriesIn: 1940, caloriesOut: 620, workoutMinutes: 73 },
  { date: "일", caloriesIn: 2030, caloriesOut: 300, workoutMinutes: 38 }
];

export const diaryPrompts = [
  "오늘 내가 포기하지 않은 한 가지",
  "내일의 나에게 남기는 짧은 부탁",
  "완벽하지 않았지만 괜찮았던 순간"
];
