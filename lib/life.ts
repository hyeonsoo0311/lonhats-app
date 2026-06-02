import type { LifeIntensity, LifeStackKey } from "@/types/domain";

export const stackLabels: Record<LifeStackKey, string> = {
  move: "Move Stack",
  meal: "Meal Stack",
  recovery: "Recovery Stack",
  mind: "Mind Stack"
};

export const stackDescriptions: Record<LifeStackKey, string> = {
  move: "몸을 움직인 방식과 그 의미",
  meal: "먹은 것보다 식사의 리듬과 규칙성",
  recovery: "수면, 휴식, 피로, 회복의 상태",
  mind: "독서, 공부, 생각, 자기계발의 흔적"
};

export const intensityOptions: { value: LifeIntensity; label: string; score: number }[] = [
  { value: "light", label: "가볍게", score: 45 },
  { value: "moderate", label: "적당히", score: 65 },
  { value: "hard", label: "힘들게", score: 82 },
  { value: "limit", label: "한계를 넘김", score: 95 }
];

export function intensityLabel(value: LifeIntensity | null) {
  return intensityOptions.find((item) => item.value === value)?.label ?? "기록 없음";
}
