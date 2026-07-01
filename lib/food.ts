import { searchFoodItems } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { FoodItem, MealLog } from "@/types/domain";

const unitPattern = /(\d+(?:\.\d+)?)\s*(g|그램|kg|킬로|ml|미리|공기|개|잔|스쿱|인분)/i;

const foodSourceLabels: Record<string, string> = {
  "data-go-kr:health-functional": "전국 건강기능식품 영양성분정보",
  "data-go-kr:mfds-food-nutrition-db": "식품의약품안전처 식품영양성분DB",
  "data-go-kr:nutri-food": "전국 통합 식품영양성분정보 · 음식",
  "data-go-kr:nutri-integrated": "전국 통합 식품영양성분정보",
  "data-go-kr:nutri-material": "전국 통합 식품영양성분정보 · 원재료",
  "data-go-kr:nutri-process": "전국 통합 식품영양성분정보 · 가공식품",
  "community-approved": "Lonhats 사용자 제안 · 관리자 승인"
};

export function foodSourceLabel(source: string | null) {
  if (!source) {
    return "출처 미확인";
  }

  return foodSourceLabels[source] ?? source;
}

export function foodSourceReference(food: {
  source: string | null;
  sourceId: string | null;
  sourceDescription?: string | null;
  sourceReference?: string | null;
}) {
  if (food.source === "data-go-kr:mfds-food-nutrition-db") {
    if (food.sourceDescription) {
      return `식품의약품안전처 · ${food.sourceDescription}`;
    }

    if (food.sourceId?.match(/^D1\d{2}-/)) {
      return "식품의약품안전처 · 가정식 실제 분석값";
    }

    if (food.sourceId?.match(/^D3\d{2}-/)) {
      return "식품의약품안전처 · 외식 실제 분석값";
    }

    if (food.sourceId?.match(/^D4\d{2}-/)) {
      return "식품의약품안전처 · 외식 재료량 산출값";
    }
  }

  if (food.source === "community-approved" && food.sourceReference) {
    return `Lonhats 사용자 제안 · 관리자 승인 · ${food.sourceReference}`;
  }

  if (food.source === "data-go-kr:nutri-material") {
    const label = foodSourceLabel(food.source);
    return food.sourceReference
      ? `${label} · ${food.sourceReference}`
      : `${label} · ${food.sourceId}`;
  }

  const label = foodSourceLabel(food.source);
  return food.sourceId ? `${label} · ${food.sourceId}` : label;
}

export function isSupportedOfficialFood(
  food: Pick<
    FoodItem,
    "source" | "sourceId" | "sourceDescription" | "sourceReference" | "servingUnit"
  >
) {
  if (food.source !== "data-go-kr:mfds-food-nutrition-db") {
    if (food.source === "data-go-kr:nutri-material") {
      return Boolean(
        food.servingUnit === "g" &&
        food.sourceId &&
        food.sourceDescription === "원재료성 식품" &&
        food.sourceReference
      );
    }

    return food.source === "community-approved" && Boolean(food.sourceReference);
  }

  return Boolean(
    food.servingUnit === "g" &&
    food.sourceDescription &&
    ["가정식 실제 분석값", "외식 실제 분석값", "외식 재료량 산출값", "가공식품"].includes(
      food.sourceDescription
    )
  );
}

export function foodContributorLabel(food: Pick<FoodItem, "contributorDisplayName">) {
  return food.contributorDisplayName ? `등록: ${food.contributorDisplayName}` : null;
}

export function parseFoodText(rawText: string) {
  const trimmed = rawText.trim();
  const unitMatch = trimmed.match(unitPattern);
  const amountValue = unitMatch ? Number(unitMatch[1]) : null;
  const unit = unitMatch?.[2]?.toLowerCase();
  const amountGram =
    amountValue === null
      ? null
      : unit === "kg" || unit === "킬로"
        ? amountValue * 1000
        : amountValue;
  const query = trimmed.replace(unitPattern, "").replace(/[,+/]/g, " ").replace(/\s+/g, " ").trim();

  return {
    amountGram,
    query: query || trimmed
  };
}

function scoreFood(query: string, food: FoodItem) {
  const normalize = (value: string) =>
    value
      .replace(/계란/g, "달걀")
      .replace(/후라이/g, "프라이")
      .replace(/[^\p{L}\p{N}]/gu, "")
      .toLowerCase();
  const compactQuery = normalize(query);
  const compactName = normalize(food.name);
  const misleadingSuffixes = ["모양", "젤리", "맛"];
  const misleadingPenalty = misleadingSuffixes.some(
    (suffix) => compactName.includes(suffix) && !compactQuery.includes(suffix)
  )
    ? 60
    : 0;

  if (compactQuery === "달걀프라이" && compactName.includes("달걀부침달걀프라이")) {
    return 135;
  }

  if (compactName === compactQuery) {
    return 140;
  }

  if (compactName.includes(compactQuery) || compactQuery.includes(compactName)) {
    return 100 - misleadingPenalty;
  }

  return (
    compactQuery.split("").filter((letter) => compactName.includes(letter)).length -
    misleadingPenalty
  );
}

async function searchPublicNutritionApi(query: string) {
  if (!supabase) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  const { data, error } = await supabase.functions.invoke<{ items: FoodItem[] }>("search-food", {
    body: { query }
  });

  if (error) {
    throw new Error("공식 음식 데이터 요청에 실패했습니다. 잠시 후 다시 검색해주세요.");
  }

  return (data?.items ?? []).filter(isSupportedOfficialFood);
}

export async function searchFoodOptions(rawText: string) {
  const parsed = parseFoodText(rawText);

  if (!parsed.query) {
    return [];
  }

  const [externalFoods, localFoods] = await Promise.all([
    searchPublicNutritionApi(parsed.query),
    searchFoodItems(parsed.query)
  ]);
  const uniqueFoods = new Map<string, FoodItem>();

  for (const food of [...externalFoods, ...localFoods]) {
    const key = `${food.source}:${food.sourceId ?? food.id}:${food.name}:${food.servingGram}`;

    if (!uniqueFoods.has(key)) {
      uniqueFoods.set(key, food);
    }
  }

  return [...uniqueFoods.values()]
    .filter(
      (food) =>
        food.caloriesPerServing > 0 &&
        food.servingGram > 0 &&
        food.carbsGram + food.proteinGram + food.fatGram > 0
    )
    .sort((a, b) => scoreFood(parsed.query, b) - scoreFood(parsed.query, a))
    .slice(0, 12);
}

export async function analyzeFoodInput(rawText: string, mealType = "식사") {
  const parsed = parseFoodText(rawText);
  const [externalFoods, localFoods] = await Promise.all([
    searchPublicNutritionApi(parsed.query),
    searchFoodItems(parsed.query)
  ]);
  const foods = [...externalFoods, ...localFoods];
  const best = foods.sort((a, b) => scoreFood(parsed.query, b) - scoreFood(parsed.query, a))[0];

  if (!best) {
    throw new Error("음식 DB에서 일치하는 항목을 찾지 못했습니다. 예: 닭가슴살 150g");
  }

  return mealLogFromFoodItem(
    best,
    parsed.amountGram,
    rawText,
    mealType,
    scoreFood(parsed.query, best)
  );
}

export function mealLogFromFoodItem(
  food: FoodItem,
  requestedAmountGram: number | null,
  rawText: string,
  mealType = "식사",
  matchScore = 100
) {
  const amountGram = requestedAmountGram ?? food.servingGram;
  const ratio = amountGram / food.servingGram;

  return {
    mealType,
    rawText,
    foodName: food.name,
    amountGram,
    calories: Math.round(food.caloriesPerServing * ratio),
    proteinGram: Math.round(food.proteinGram * ratio * 10) / 10,
    carbsGram: Math.round(food.carbsGram * ratio * 10) / 10,
    fatGram: Math.round(food.fatGram * ratio * 10) / 10,
    source: food.source,
    sourceId: food.sourceId,
    confidence: Math.min(0.96, matchScore / 100)
  } satisfies Omit<MealLog, "id" | "sourceLifeEntryId" | "eatenOn">;
}
