import { createMealLog, searchFoodItems } from "@/lib/database";
import type { FoodItem, MealLog } from "@/types/domain";

const unitPattern = /(\d+(?:\.\d+)?)\s*(g|그램|kg|킬로|ml|미리|공기|개|잔|스쿱|인분)/i;

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
  const compactQuery = query.replace(/\s+/g, "");
  const compactName = food.name.replace(/\s+/g, "");

  if (compactName === compactQuery) {
    return 100;
  }

  if (compactName.includes(compactQuery) || compactQuery.includes(compactName)) {
    return 80;
  }

  return compactQuery.split("").filter((letter) => compactName.includes(letter)).length;
}

export async function analyzeFoodInput(rawText: string) {
  const parsed = parseFoodText(rawText);
  const foods = await searchFoodItems(parsed.query);
  const best = foods.sort((a, b) => scoreFood(parsed.query, b) - scoreFood(parsed.query, a))[0];

  if (!best) {
    throw new Error("음식 DB에서 일치하는 항목을 찾지 못했습니다. 예: 닭가슴살 150g");
  }

  const amountGram = parsed.amountGram ?? best.servingGram;
  const ratio = amountGram / best.servingGram;

  return {
    mealType: "식사",
    rawText,
    foodName: best.name,
    amountGram,
    calories: Math.round(best.caloriesPerServing * ratio),
    proteinGram: Math.round(best.proteinGram * ratio * 10) / 10,
    carbsGram: Math.round(best.carbsGram * ratio * 10) / 10,
    fatGram: Math.round(best.fatGram * ratio * 10) / 10,
    source: best.source,
    confidence: Math.min(0.96, scoreFood(parsed.query, best) / 100)
  } satisfies Omit<MealLog, "id" | "eatenOn">;
}

export async function analyzeAndSaveMeal(userId: string, rawText: string) {
  const analyzed = await analyzeFoodInput(rawText);
  return createMealLog(userId, analyzed);
}
