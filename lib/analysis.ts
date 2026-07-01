import type {
  LifeDirectionReport,
  LifeEntry,
  LifeRoutine,
  LifeStackKey,
  MealEntry,
  RoutineCadence,
  RoutineCheckin,
  RoutineSignal,
  StackSignal,
  WeeklyAnalysisInput,
  WeeklyRecommendation
} from "@/types/domain";
import { adherenceToLifeHumidity, adherenceToLifeTemperatureScore } from "@/lib/gauge";
import { localDateKey, monthStart } from "@/lib/date";
import { differenceInCalendarDays, startOfWeek } from "date-fns";

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
  return new Set(
    entries
      .filter((entry) => isAnalysisEntry(entry) && entry.stack === stack)
      .map((entry) => entry.entryDate)
  ).size;
}

function averageScore(entries: LifeEntry[], stack: LifeStackKey) {
  const scores = entries
    .filter(
      (entry) => isAnalysisEntry(entry) && entry.stack === stack && typeof entry.score === "number"
    )
    .map((entry) => entry.score ?? 0);

  if (!scores.length) {
    return 0;
  }

  return round(scores.reduce((total, score) => total + score, 0) / scores.length);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function dateKey(date: Date) {
  return localDateKey(date);
}

function isAnalysisEntry(entry: LifeEntry) {
  const waterCategories = new Set(["물", "water", "Water", "WATER"]);
  return !(entry.stack === "recovery" && waterCategories.has(entry.category));
}

function routineMatchesEntry(routine: LifeRoutine, entry: LifeEntry) {
  if (!routine.stack || routine.stack !== entry.stack || !isAnalysisEntry(entry)) {
    return false;
  }

  const routineTitle = routine.title.replace(/\s+/g, "").toLocaleLowerCase();
  const category = entry.category.replace(/\s+/g, "").toLocaleLowerCase();
  const entryTitle = entry.title.replace(/\s+/g, "").toLocaleLowerCase();

  return routineTitle.includes(category) || entryTitle.includes(routineTitle);
}

function getRoutinePeriodStart(cadence: RoutineCadence, referenceDate: Date) {
  if (cadence === "monthly") {
    return monthStart(referenceDate);
  }

  return startOfWeek(referenceDate, { weekStartsOn: 1 });
}

function countDaysInclusive(start: Date, end: Date) {
  return Math.max(1, differenceInCalendarDays(end, start) + 1);
}

function getRoutineExpectedCount(routine: LifeRoutine, start: Date, end: Date) {
  if (routine.cadence === "daily") {
    return countDaysInclusive(start, end);
  }

  return Math.max(1, routine.targetCount);
}

function buildRoutineMessage(progress: number, actualCount: number, expectedCount: number) {
  if (progress >= 100) {
    return `이번 주 기준을 채웠습니다 · ${actualCount}/${expectedCount}`;
  }

  if (progress >= 60) {
    return `이번 주 기준에 가까워지고 있습니다 · ${actualCount}/${expectedCount}`;
  }

  return `이번 주 기준이 아직 비어 있습니다 · ${actualCount}/${expectedCount}`;
}

function buildRoutineSignals(
  entries: LifeEntry[],
  routines: LifeRoutine[],
  checkins: RoutineCheckin[],
  referenceDate: Date
) {
  return routines
    .filter((routine) => routine.isActive)
    .slice(0, 7)
    .map((routine): RoutineSignal => {
      const end = new Date(referenceDate);
      const start = getRoutinePeriodStart(routine.cadence, end);
      const startKey = dateKey(start);
      const completedDates = new Set(
        checkins
          .filter(
            (checkin) =>
              checkin.routineId === routine.id && checkin.completed && checkin.checkedOn >= startKey
          )
          .map((checkin) => checkin.checkedOn)
      );

      if (routine.stack) {
        entries
          .filter((entry) => routineMatchesEntry(routine, entry) && entry.entryDate >= startKey)
          .forEach((entry) => completedDates.add(entry.entryDate));
      }

      const expectedCount = getRoutineExpectedCount(routine, start, end);
      const actualCount = completedDates.size;
      const progress = clamp(round((actualCount / expectedCount) * 100));

      return {
        routineId: routine.id,
        title: routine.title,
        stack: routine.stack,
        cadence: routine.cadence,
        expectedCount,
        actualCount,
        progress,
        temperatureWeight: routine.temperatureWeight,
        humidityWeight: routine.humidityWeight,
        message: buildRoutineMessage(progress, actualCount, expectedCount)
      };
    });
}

function weightedAverage(signals: RoutineSignal[], key: "temperatureWeight" | "humidityWeight") {
  const weighted = signals.reduce(
    (result, signal) => ({
      score: result.score + signal.progress * signal[key],
      weight: result.weight + signal[key]
    }),
    { score: 0, weight: 0 }
  );

  if (!weighted.weight) {
    return 0;
  }

  return round(weighted.score / weighted.weight);
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

export function analyzeLifeDirection(
  entries: LifeEntry[],
  options: {
    routines?: LifeRoutine[];
    routineCheckins?: RoutineCheckin[];
    referenceDate?: Date;
  } = {}
): LifeDirectionReport {
  const movementMinutes = entries
    .filter((entry) => isAnalysisEntry(entry) && entry.stack === "move")
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
  const routineSignals = buildRoutineSignals(
    entries,
    options.routines ?? [],
    options.routineCheckins ?? [],
    options.referenceDate ?? new Date()
  );
  const hasRoutineCriteria = routineSignals.length > 0;
  const routineAdherence = hasRoutineCriteria
    ? round(
        routineSignals.reduce((total, signal) => total + signal.progress, 0) / routineSignals.length
      )
    : routineScore;
  const routineTemperature = hasRoutineCriteria
    ? adherenceToLifeTemperatureScore(weightedAverage(routineSignals, "temperatureWeight"))
    : temperature;
  const routineHumidity = hasRoutineCriteria
    ? adherenceToLifeHumidity(weightedAverage(routineSignals, "humidityWeight"))
    : humidity;

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

  const fallbackMessage =
    routineScore >= 75
      ? "이번 주는 삶의 온도와 습도가 안정적입니다. 지금의 리듬을 크게 흔들 필요는 없습니다."
      : routineScore >= 45
        ? "이번 주는 일부 stack은 살아 있고 일부는 비어 있습니다. 부족한 stack 하나만 골라 작게 보완하세요."
        : "이번 주는 기록의 밀도가 낮습니다. 성과보다 상태를 보는 기록부터 다시 시작하는 것이 좋습니다.";

  const routineMessage =
    routineAdherence >= 85
      ? "내가 정한 기준이 대체로 유지되고 있습니다. 온도와 습도는 안정권에 가깝습니다."
      : routineAdherence >= 55
        ? "일부 기준은 이어졌고 일부는 흔들렸습니다. 가장 작은 기준 하나만 다시 붙잡아도 충분합니다."
        : "이번 기간에는 내가 정한 기준이 많이 비어 있습니다. 실패가 아니라 현재 상태를 보는 신호입니다.";

  return {
    temperature: routineTemperature,
    humidity: routineHumidity,
    routineScore: hasRoutineCriteria ? routineAdherence : routineScore,
    movementMinutes,
    mealDays,
    recoveryDays,
    mindDays,
    signals,
    routineSignals,
    hasRoutineCriteria,
    message: hasRoutineCriteria ? routineMessage : fallbackMessage
  };
}
