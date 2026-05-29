import type { ExerciseActivity } from "@/types/domain";

export const DEFAULT_BODY_WEIGHT_KG = 70;

export function calculateExerciseCalories({
  bodyWeightKg,
  metValue,
  minutes
}: {
  bodyWeightKg: number;
  metValue: number;
  minutes: number;
}) {
  return Math.round(((metValue * 3.5 * bodyWeightKg) / 200) * minutes);
}

function compact(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

export function scoreExercise(query: string, exercise: ExerciseActivity) {
  const normalized = compact(query);
  const names = [exercise.name, ...exercise.aliases].map(compact);

  if (!normalized) {
    return 0;
  }

  if (names.some((name) => name === normalized)) {
    return 100;
  }

  if (names.some((name) => name.includes(normalized) || normalized.includes(name))) {
    return 80;
  }

  return Math.max(
    ...names.map((name) => normalized.split("").filter((letter) => name.includes(letter)).length)
  );
}

export function matchExercise(query: string, exercises: ExerciseActivity[]) {
  return (
    [...exercises].sort((a, b) => scoreExercise(query, b) - scoreExercise(query, a))[0] ?? null
  );
}
