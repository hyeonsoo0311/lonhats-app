import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";

type RawRecord = Record<string, unknown>;

type FoodItem = {
  id: string;
  name: string;
  brandName: string | null;
  servingGram: number;
  caloriesPerServing: number;
  proteinGram: number;
  carbsGram: number;
  fatGram: number;
  source: string;
  sourceId: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const standardEndpoints = [
  {
    source: "data-go-kr:nutri-food",
    url: "https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api"
  },
  {
    source: "data-go-kr:nutri-integrated",
    url: "https://api.data.go.kr/openapi/tn_pubr_public_nutri_info_api"
  },
  {
    source: "data-go-kr:nutri-process",
    url: "https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api"
  },
  {
    source: "data-go-kr:nutri-material",
    url: "https://api.data.go.kr/openapi/tn_pubr_public_nutri_material_info_api"
  },
  {
    source: "data-go-kr:health-functional",
    url: "https://api.data.go.kr/openapi/tn_pubr_public_health_functional_food_nutrition_info_api"
  }
] as const;

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

function readFirst(record: RawRecord, names: string[]) {
  const lowerMap = new Map(
    Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
  );

  for (const name of names) {
    const direct = record[name];

    if (direct !== undefined && direct !== null && String(direct).trim()) {
      return direct;
    }

    const lower = lowerMap.get(name.toLowerCase());

    if (lower !== undefined && lower !== null && String(lower).trim()) {
      return lower;
    }
  }

  return null;
}

function extractItems(payload: unknown): RawRecord[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = payload as RawRecord;
  const candidates = [
    data.items,
    data.data,
    data.records,
    (data.response as RawRecord | undefined)?.body &&
      ((data.response as RawRecord).body as RawRecord).items,
    (data.body as RawRecord | undefined)?.items
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is RawRecord =>
        Boolean(item && typeof item === "object")
      );
    }

    if (candidate && typeof candidate === "object") {
      const item = (candidate as RawRecord).item;

      if (Array.isArray(item)) {
        return item.filter((entry): entry is RawRecord =>
          Boolean(entry && typeof entry === "object")
        );
      }

      if (item && typeof item === "object") {
        return [item as RawRecord];
      }
    }
  }

  return [];
}

function normalizeFood(record: RawRecord, source: string): FoodItem | null {
  const name = String(
    readFirst(record, [
      "foodNm",
      "foodName",
      "FOOD_NM_KR",
      "FOOD_NM",
      "DESC_KOR",
      "PRDLST_NM",
      "식품명"
    ]) ?? ""
  ).trim();

  if (!name) {
    return null;
  }

  const servingGram =
    parseNumber(
      readFirst(record, [
        "nutrContBaseAmt",
        "servingSize",
        "SERVING_SIZE",
        "총내용량",
        "식품중량",
        "영양성분함량기준량",
        "1인(회)분량 참고량"
      ])
    ) || 100;
  const calories = parseNumber(
    readFirst(record, [
      "enerc",
      "energy",
      "ENERC_KCAL",
      "NUTR_CONT1",
      "AMT_NUM1",
      "에너지(kcal)",
      "에너지"
    ])
  );
  const protein = parseNumber(
    readFirst(record, ["prot", "protein", "PROT", "NUTR_CONT3", "AMT_NUM3", "단백질(g)", "단백질"])
  );
  const carbs = parseNumber(
    readFirst(record, [
      "chocdf",
      "carbohydrate",
      "CHOCDF",
      "NUTR_CONT2",
      "AMT_NUM7",
      "탄수화물(g)",
      "탄수화물"
    ])
  );
  const fat = parseNumber(
    readFirst(record, ["fatce", "fat", "FATCE", "NUTR_CONT4", "AMT_NUM4", "지방(g)", "지방"])
  );
  const sourceId = String(
    readFirst(record, [
      "foodCd",
      "foodCode",
      "FOOD_CD",
      "FOOD_CODE",
      "식품코드",
      "PRDLST_REPORT_NO"
    ]) ?? ""
  ).trim();
  const brandName = String(
    readFirst(record, ["mfrNm", "manufacturer", "업체명", "MAKER_NM"]) ?? ""
  ).trim();

  if (!calories && !protein && !carbs && !fat) {
    return null;
  }

  return {
    id: `${source}:${sourceId || name}`,
    name,
    brandName: brandName || null,
    servingGram,
    caloriesPerServing: Math.round(calories),
    proteinGram: Math.round(protein * 10) / 10,
    carbsGram: Math.round(carbs * 10) / 10,
    fatGram: Math.round(fat * 10) / 10,
    source,
    sourceId: sourceId || null
  };
}

async function getServiceKey() {
  const envKey = Deno.env.get("DATA_GO_KR_SERVICE_KEY");

  if (envKey) {
    return envKey;
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
    console.error("Unable to read service key", error);
    return null;
  }

  return data?.value ?? null;
}

async function fetchJson(url: URL) {
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return JSON.parse(text);
}

async function searchStandardEndpoint(
  query: string,
  serviceKey: string,
  endpoint: (typeof standardEndpoints)[number]
) {
  const url = new URL(endpoint.url);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "10");
  url.searchParams.set("type", "json");
  url.searchParams.set("foodNm", query);

  const payload = await fetchJson(url);
  return extractItems(payload)
    .map((record) => normalizeFood(record, endpoint.source))
    .filter((item): item is FoodItem => Boolean(item));
}

async function searchMfdsDb(query: string, serviceKey: string) {
  const url = new URL("https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02");
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "10");
  url.searchParams.set("type", "json");
  url.searchParams.set("FOOD_NM_KR", query);

  const payload = await fetchJson(url);
  return extractItems(payload)
    .map((record) => normalizeFood(record, "data-go-kr:mfds-food-nutrition-db"))
    .filter((item): item is FoodItem => Boolean(item));
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

  const results = await Promise.allSettled([
    searchMfdsDb(query, serviceKey),
    ...standardEndpoints.map((endpoint) => searchStandardEndpoint(query, serviceKey, endpoint))
  ]);
  const items = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index)
    .slice(0, 15);

  return jsonResponse({ items });
});
