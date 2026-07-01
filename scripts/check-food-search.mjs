import { readFile } from "node:fs/promises";

const envText = await readFile(new URL("../.env", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    })
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Supabase URL 또는 publishable key가 .env에 없습니다.");
}

const cases = [
  { query: "현미밥", expectedName: "현미밥" },
  { query: "계란후라이", expectedName: "달걀프라이" },
  { query: "김치찌개", expectedName: "김치찌개" },
  { query: "햇반", expectedName: "햇반" },
  { query: "바나나", expectedName: "바나나", expectedFirstName: "바나나" },
  { query: "사과", expectedName: "사과", expectedFirstName: "사과" },
  { query: "오이", expectedName: "오이", expectedFirstName: "오이" }
];

for (const testCase of cases) {
  const response = await fetch(`${url}/functions/v1/search-food`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: testCase.query })
  });

  if (!response.ok) {
    throw new Error(`${testCase.query}: 검색 요청 실패 (${response.status})`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const expected = testCase.expectedName.replace(/[^\p{L}\p{N}]/gu, "");
  const hasExpectedFood = items.some((item) =>
    String(item.name ?? "")
      .replace(/[^\p{L}\p{N}]/gu, "")
      .includes(expected)
  );
  const hasInvalidItem = items.some(
    (item) =>
      item.servingUnit !== "g" ||
      (!["가정식 실제 분석값", "외식 실제 분석값", "외식 재료량 산출값", "가공식품"].includes(
        item.sourceDescription
      ) &&
        item.sourceDescription !== "원재료성 식품")
  );

  if (!hasExpectedFood) {
    throw new Error(`${testCase.query}: 기대한 공식 음식 결과가 없습니다.`);
  }

  if (testCase.expectedFirstName && items[0]?.name !== testCase.expectedFirstName) {
    throw new Error(
      `${testCase.query}: 첫 검색 결과가 일반명으로 표시되지 않습니다. 현재: ${items[0]?.name}`
    );
  }

  if (hasInvalidItem) {
    throw new Error(`${testCase.query}: 허용되지 않은 출처 또는 g 이외 단위가 포함됐습니다.`);
  }

  console.log(`${testCase.query}: ${items.length}개 결과 확인`);
}
