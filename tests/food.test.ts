import type { FoodItem } from "@/types/domain";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database", () => ({ searchFoodItems: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: null }));

const { foodContributorLabel, foodSourceReference, isSupportedOfficialFood, mealLogFromFoodItem } =
  await import("@/lib/food");

const brownRice: FoodItem = {
  id: "rice-1",
  name: "현미밥",
  brandName: null,
  servingGram: 200,
  caloriesPerServing: 300,
  proteinGram: 6,
  carbsGram: 64,
  fatGram: 2,
  source: "data-go-kr:nutri-food",
  sourceId: "FOOD-001",
  contributorDisplayName: null
};

describe("food helpers", () => {
  it("shows a readable nutrition source with its reference id", () => {
    expect(foodSourceReference(brownRice)).toBe("전국 통합 식품영양성분정보 · 음식 · FOOD-001");
  });

  it("scales nutrition values to the amount the user ate", () => {
    const meal = mealLogFromFoodItem(brownRice, 100, "현미밥 100g", "점심");

    expect(meal.calories).toBe(150);
    expect(meal.carbsGram).toBe(32);
    expect(meal.proteinGram).toBe(3);
    expect(meal.amountGram).toBe(100);
  });

  it("credits an approved community contributor", () => {
    expect(foodContributorLabel({ contributorDisplayName: "현수" })).toBe("등록: 현수");
  });

  it("shows the verification reference for approved community food", () => {
    expect(
      foodSourceReference({
        source: "community-approved",
        sourceId: "submission-id",
        sourceReference: "제품 영양정보 라벨 확인"
      })
    ).toBe("Lonhats 사용자 제안 · 관리자 승인 · 제품 영양정보 라벨 확인");
  });

  it("shows MFDS food origins as readable labels instead of database codes", () => {
    expect(
      foodSourceReference({
        source: "data-go-kr:mfds-food-nutrition-db",
        sourceId: "D106-266100000-0001"
      })
    ).toBe("식품의약품안전처 · 가정식 실제 분석값");
    expect(
      foodSourceReference({
        source: "data-go-kr:mfds-food-nutrition-db",
        sourceId: "D309-417000000-0000",
        sourceDescription: "외식 실제 분석값"
      })
    ).toBe("식품의약품안전처 · 외식 실제 분석값");
  });

  it("shows raw ingredient nutrition source as a readable official reference", () => {
    expect(
      foodSourceReference({
        source: "data-go-kr:nutri-material",
        sourceId: "R108-037000001-0000",
        sourceDescription: "원재료성 식품",
        sourceReference: "농촌진흥청(국가표준식품성분표)"
      })
    ).toBe("전국 통합 식품영양성분정보 · 원재료 · 농촌진흥청(국가표준식품성분표)");
  });

  it("accepts household and restaurant foods with an explicit gram basis", () => {
    expect(
      isSupportedOfficialFood({
        source: "data-go-kr:mfds-food-nutrition-db",
        sourceId: "D106-266100000-0001",
        sourceDescription: "가정식 실제 분석값",
        servingUnit: "g"
      })
    ).toBe(true);
    expect(
      isSupportedOfficialFood({
        source: "data-go-kr:mfds-food-nutrition-db",
        sourceId: "D309-417000000-0000",
        sourceDescription: "외식 실제 분석값",
        servingUnit: "g"
      })
    ).toBe(true);
    expect(
      isSupportedOfficialFood({
        source: "data-go-kr:mfds-food-nutrition-db",
        sourceId: "D401-050000000-0001",
        sourceDescription: "외식 재료량 산출값"
      })
    ).toBe(false);
    expect(
      isSupportedOfficialFood({
        source: "data-go-kr:nutri-material",
        sourceId: "R108-037000001-0000",
        sourceDescription: "원재료성 식품",
        sourceReference: "농촌진흥청(국가표준식품성분표)",
        servingUnit: "g"
      })
    ).toBe(true);
  });

  it("rejects unsourced local food and accepts verified community food", () => {
    expect(
      isSupportedOfficialFood({
        source: "seed",
        sourceId: "brown-rice-bowl",
        sourceReference: null
      })
    ).toBe(false);
    expect(
      isSupportedOfficialFood({
        source: "community-approved",
        sourceId: "submission-id",
        sourceReference: "제품 영양정보 라벨 확인"
      })
    ).toBe(true);
  });
});
