import type {
  LifeDirectionReport,
  LifeEntry,
  LifeStackKey,
  MealEntry,
  StackSignal,
  WeeklyAnalysisInput,
  WeeklyRecommendation
} from "@/types/domain";

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

const stackLabels: Record<LifeStackKey, string> = {
  move: "Move",
  meal: "Meal",
  recovery: "Recovery",
  mind: "Mind"
};

function uniqueDays(entries: LifeEntry[], stack: LifeStackKey) {
  return new Set(entries.filter((entry) => entry.stack === stack).map((entry) => entry.entryDate))
    .size;
}

function averageScore(entries: LifeEntry[], stack: LifeStackKey) {
  const scores = entries
    .filter((entry) => entry.stack === stack && typeof entry.score === "number")
    .map((entry) => entry.score ?? 0);

  if (!scores.length) {
    return 0;
  }

  return round(scores.reduce((total, score) => total + score, 0) / scores.length);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function buildSignal(
  stack: LifeStackKey,
  count: number,
  score: number,
  message: string
): StackSignal {
  return {
    stack,
    label: stackLabels[stack],
    count,
    score: clamp(score),
    message
  };
}

export function analyzeLifeDirection(entries: LifeEntry[]): LifeDirectionReport {
  const movementMinutes = entries
    .filter((entry) => entry.stack === "move")
    .reduce((total, entry) => total + (entry.durationMinutes ?? 0), 0);
  const mealDays = uniqueDays(entries, "meal");
  const recoveryDays = uniqueDays(entries, "recovery");
  const mindDays = uniqueDays(entries, "mind");
  const moveDays = uniqueDays(entries, "move");

  const movementScore = clamp(round((movementMinutes / 150) * 100));
  const mealScore = clamp(round((mealDays / 5) * 100));
  const recoveryScore = clamp(
    Math.max(round((recoveryDays / 4) * 100), averageScore(entries, "recovery"))
  );
  const mindScore = clamp(round((mindDays / 4) * 100));
  const routineScore = round((movementScore + mealScore + recoveryScore + mindScore) / 4);
  const temperature = clamp(
    round(movementScore * 0.45 + mindScore * 0.25 + mealScore * 0.2 + recoveryScore * 0.1)
  );
  const humidity = clamp(round(recoveryScore * 0.55 + mealScore * 0.2 + mindScore * 0.25));

  const signals = [
    buildSignal(
      "move",
      moveDays,
      movementScore,
      movementMinutes >= 150
        ? "움직임은 충분했습니다. 강도보다 지속 리듬을 유지하세요."
        : "움직임이 부족했습니다. 짧은 산책이나 가벼운 홈트를 더해도 충분합니다."
    ),
    buildSignal(
      "meal",
      mealDays,
      mealScore,
      mealDays >= 5
        ? "식단 기록은 규칙적입니다. 완벽한 식단보다 반복성이 좋습니다."
        : "식단 기록이 드문 편입니다. 한 끼라도 기록하면 패턴이 보입니다."
    ),
    buildSignal(
      "recovery",
      recoveryDays,
      recoveryScore,
      recoveryDays >= 4
        ? "회복을 살피는 기록이 있습니다. 몸의 신호를 놓치지 않고 있습니다."
        : "회복 기록이 부족합니다. 수면, 휴식, 피로도를 따로 살펴야 합니다."
    ),
    buildSignal(
      "mind",
      mindDays,
      mindScore,
      mindDays >= 4
        ? "마음과 자기계발 기록이 이어졌습니다. 방향감이 유지되고 있습니다."
        : "마음의 기록이 부족합니다. 독서, 공부, 생각의 흔적을 남겨보세요."
    )
  ];

  const message =
    routineScore >= 75
      ? "이번 주는 삶의 온도와 습도가 안정적입니다. 지금의 리듬을 크게 흔들 필요는 없습니다."
      : routineScore >= 45
        ? "이번 주는 일부 stack은 살아 있고 일부는 비어 있습니다. 부족한 stack 하나만 골라 작게 보완하세요."
        : "이번 주는 기록의 밀도가 낮습니다. 성과보다 상태를 보는 기록부터 다시 시작하는 것이 좋습니다.";

  return {
    temperature,
    humidity,
    routineScore,
    movementMinutes,
    mealDays,
    recoveryDays,
    mindDays,
    signals,
    message
  };
}
