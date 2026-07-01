import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";

type RawRecord = Record<string, unknown>;

type FoodItem = {
  id: string;
  name: string;
  brandName: string | null;
  servingGram: number;
  servingUnit: "g";
  caloriesPerServing: number;
  proteinGram: number;
  carbsGram: number;
  fatGram: number;
  source: string;
  sourceId: string | null;
  sourceDescription: string;
  sourceReference: string | null;
  contributorDisplayName: null;
  originalName?: string;
};

const MFDS_ENDPOINT = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";
const MATERIAL_ENDPOINT = "https://api.data.go.kr/openapi/tn_pubr_public_nutri_material_info_api";
const sourceDescriptions = new Map([
  ["가정식(분석 함량)", "가정식 실제 분석값"],
  ["외식(분석 함량)", "외식 실제 분석값"],
  ["외식(재료량 기반 산출 함량)", "외식 재료량 산출값"],
  ["가공식품", "가공식품"]
]);

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseServingGram(value: unknown) {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*g$/i);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function compactFoodName(value: string) {
  return value
    .replaceAll("계란", "달걀")
    .replaceAll("후라이", "프라이")
    .replaceAll("_", "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function searchTerms(query: string) {
  const terms = new Set([query.trim()]);
  const normalized = query.replaceAll("계란", "달걀").replaceAll("후라이", "프라이").trim();

  if (normalized) {
    terms.add(normalized);
  }

  if (compactFoodName(normalized).includes("달걀프라이")) {
    terms.add("달걀프라이");
    terms.add("달걀, 부침");
  }

  return [...terms].filter(Boolean).slice(0, 3);
}

function foodScore(query: string, food: FoodItem) {
  const compactQuery = compactFoodName(query);
  const compactName = compactFoodName(food.name);
  const compactOriginalName = compactFoodName(food.originalName ?? food.name);
  const misleading = ["모양", "젤리", "맛"].some(
    (word) => compactName.includes(word) && !compactQuery.includes(word)
  );
  const penalty = misleading ? 80 : 0;
  const rawFreshBonus =
    food.source === "data-go-kr:nutri-material" && compactOriginalName.includes("생것") ? 8 : 0;
  const rawGenericBonus =
    food.source === "data-go-kr:nutri-material" && compactOriginalName === `${compactName}생것`
      ? 12
      : 0;
  const driedPenalty =
    food.source === "data-go-kr:nutri-material" &&
    ["말린것", "건조", "동결건조"].some((word) =>
      compactOriginalName.includes(compactFoodName(word))
    ) &&
    !["말린", "건조"].some((word) => compactQuery.includes(compactFoodName(word)))
      ? 30
      : 0;

  if (compactQuery === "달걀프라이" && compactName.includes("달걀부침달걀프라이")) {
    return 135;
  }

  if (compactName === compactQuery) {
    return 140 + rawFreshBonus + rawGenericBonus - driedPenalty;
  }

  if (compactName.includes(compactQuery) || compactQuery.includes(compactName)) {
    return 100 + rawFreshBonus + rawGenericBonus - penalty - driedPenalty;
  }

  return (
    compactQuery.split("").filter((letter) => compactName.includes(letter)).length -
    penalty -
    driedPenalty
  );
}

function normalizeMfdsFood(record: RawRecord): FoodItem | null {
  const name = String(record.FOOD_NM_KR ?? "").trim();
  const sourceId = String(record.FOOD_CD ?? "").trim();
  const sourceDescription = sourceDescriptions.get(String(record.FOOD_OR_NM ?? "").trim());
  const brandName = String(record.MAKER_NM ?? "").trim();
  const servingGram = parseServingGram(record.SERVING_SIZE);
  const calories = parseNumber(record.AMT_NUM1);
  const protein = parseNumber(record.AMT_NUM3);
  const fat = parseNumber(record.AMT_NUM4);
  const carbs = parseNumber(record.AMT_NUM6);

  // A volume-based serving cannot be converted to grams without food-specific density data.
  if (
    !name ||
    !sourceDescription ||
    servingGram === null ||
    calories <= 0 ||
    protein + carbs + fat <= 0
  ) {
    return null;
  }

  return {
    id: `data-go-kr:mfds-food-nutrition-db:${sourceId || name}`,
    name,
    brandName: brandName || null,
    servingGram,
    servingUnit: "g",
    caloriesPerServing: Math.round(calories),
    proteinGram: Math.round(protein * 10) / 10,
    carbsGram: Math.round(carbs * 10) / 10,
    fatGram: Math.round(fat * 10) / 10,
    source: "data-go-kr:mfds-food-nutrition-db",
    sourceId: sourceId || null,
    sourceDescription,
    sourceReference: null,
    contributorDisplayName: null
  };
}

function normalizeMaterialFood(record: RawRecord): FoodItem | null {
  const sourceId = String(record.foodCd ?? "").trim();
  const rawName = String(record.foodNm ?? "").trim();
  const materialName = String(record.foodLv4Nm ?? "").trim();
  const fallbackName = rawName.split("_")[0]?.trim() ?? "";
  const name = materialName && materialName !== "해당없음" ? materialName : fallbackName;
  const sourceDescription = String(record.typeNm ?? "").trim();
  const sourceReference = String(record.srcNm ?? "").trim();
  const servingGram = parseServingGram(record.nutConSrtrQua);
  const calories = parseNumber(record.enerc);
  const protein = parseNumber(record.prot);
  const fat = parseNumber(record.fatce);
  const carbs = parseNumber(record.chocdf);

  if (
    !sourceId ||
    !name ||
    sourceDescription !== "원재료성 식품" ||
    !sourceReference ||
    servingGram === null ||
    calories <= 0 ||
    protein + carbs + fat <= 0
  ) {
    return null;
  }

  return {
    id: `data-go-kr:nutri-material:${sourceId}`,
    name,
    brandName: null,
    servingGram,
    servingUnit: "g",
    caloriesPerServing: Math.round(calories),
    proteinGram: Math.round(protein * 10) / 10,
    carbsGram: Math.round(carbs * 10) / 10,
    fatGram: Math.round(fat * 10) / 10,
    source: "data-go-kr:nutri-material",
    sourceId,
    sourceDescription,
    sourceReference,
    contributorDisplayName: null,
    originalName: rawName.replaceAll("_", " ")
  };
}

async function getServiceKey() {
  const envKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY");

  if (envKey) {
    return envKey.trim();
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  const { data, error } = await client
    .from("secure_app_config")
    .select("value")
    .eq("name", "DATA_GO_KR_SERVICE_KEY")
    .maybeSingle();

  if (error) {
    console.error("Unable to read food API key", error);
    return null;
  }

  return typeof data?.value === "string" ? data.value.trim() : null;
}

async function searchMfdsDb(query: string, serviceKey: string) {
  const url = new URL(MFDS_ENDPOINT);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("type", "json");
  url.searchParams.set("FOOD_NM_KR", query);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`MFDS API request failed: ${response.status}`);
  }

  const payload = await response.json();
  const resultCode = String(payload?.header?.resultCode ?? "");

  if (resultCode === "03") {
    return [];
  }

  if (resultCode && resultCode !== "00") {
    throw new Error(`MFDS API response failed: ${resultCode}`);
  }

  const records = Array.isArray(payload?.body?.items) ? payload.body.items : [];

  return records
    .filter((record: unknown): record is RawRecord => Boolean(record && typeof record === "object"))
    .map(normalizeMfdsFood)
    .filter((item: FoodItem | null): item is FoodItem => Boolean(item));
}

async function searchMaterialDb(query: string, serviceKey: string) {
  const url = new URL(MATERIAL_ENDPOINT);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("type", "json");
  url.searchParams.set("foodLv4Nm", query);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Raw material nutrition API request failed: ${response.status}`);
  }

  const payload = await response.json();
  const resultCode = String(payload?.response?.header?.resultCode ?? "");

  if (resultCode === "03") {
    return [];
  }

  if (resultCode && resultCode !== "00") {
    throw new Error(`Raw material nutrition API response failed: ${resultCode}`);
  }

  const records = Array.isArray(payload?.response?.body?.items) ? payload.response.body.items : [];

  return records
    .filter((record: unknown): record is RawRecord => Boolean(record && typeof record === "object"))
    .map(normalizeMaterialFood)
    .filter((item: FoodItem | null): item is FoodItem => Boolean(item));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await req.json().catch(() => null);
  const query = String(body?.query ?? "").trim();

  if (!query) {
    return jsonResponse({ items: [] });
  }

  const serviceKey = await getServiceKey();

  if (!serviceKey) {
    return jsonResponse({ error: "Food API key is not configured" }, 500);
  }

  const searches = searchTerms(query).flatMap((term) => [
    searchMfdsDb(term, serviceKey),
    searchMaterialDb(term, serviceKey)
  ]);
  const results = await Promise.allSettled(searches);
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : String(result.reason)
    );

  if (errors.length === results.length) {
    console.error("All MFDS food searches failed", errors);
    return jsonResponse({ error: "공식 식품 DB 연결에 실패했습니다." }, 502);
  }

  const sortedItems = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => foodScore(query, b) - foodScore(query, a));
  const items = sortedItems
    .filter((item, index, array) => {
      const key =
        item.source === "data-go-kr:nutri-material"
          ? `${item.source}:${item.name}:${item.servingGram}`
          : item.id;

      return (
        array.findIndex((entry) => {
          const entryKey =
            entry.source === "data-go-kr:nutri-material"
              ? `${entry.source}:${entry.name}:${entry.servingGram}`
              : entry.id;

          return entryKey === key;
        }) === index
      );
    })
    .map(({ originalName: _originalName, ...item }) => item)
    .slice(0, 30);

  return jsonResponse({ items });
});
