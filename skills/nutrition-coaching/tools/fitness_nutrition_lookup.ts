// tools/fitness_nutrition_lookup.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { round, getConfig } from "../../../src/storage.ts";

// --- OpenFoodFacts types ---

interface OFFSearchResponse {
  count?: number;
  products?: Array<{
    product_name?: string;
    brands?: string;
    nutriments?: Record<string, number>;
  }>;
}

interface OFFProductResponse {
  status?: number | string;
  product?: {
    product_name?: string;
    brands?: string;
    nutriments?: Record<string, number>;
  };
}

// --- USDA FoodData Central types ---

interface USDAFood {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  gtinUpc?: string;
  dataType?: string;
  foodNutrients?: Array<{
    nutrientId?: number;
    nutrientName?: string;
    unitName?: string;
    value?: number;
  }>;
}

interface USDASearchResponse {
  totalHits?: number;
  foods?: USDAFood[];
}

// USDA nutrient IDs
const USDA_NUTRIENTS = {
  ENERGY_KCAL: 1008,
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  SUGARS: 2000,
  FIBER: 1079,
  SODIUM: 1093,
} as const;

export async function run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecutionResult> {
    const query = String(input.query ?? "").trim();
    const pageSize = Math.min(Number(input.page_size) || 5, 20);
    const dataSource = String(input.data_source ?? "auto").trim();

    if (!query) {
      return { content: "Error: query is required.", isError: true };
    }

    const isBarcode = /^\d{8,14}$/.test(query);
    const config = getConfig<any>();
    const usdaKey = config?.userProfile?.usda_api_key ?? config?.usda_api_key ?? "";

    // Determine which source(s) to try
    let useUSDA = dataSource === "usda" || (dataSource === "auto" && !!usdaKey);
    let useOFF = dataSource === "openfoodfacts" || dataSource === "auto";

    if (dataSource === "usda" && !usdaKey) {
      return {
        content:
          'No USDA API key configured. Set "usda_api_key" in config.json. You can get a free key at https://fdc.nal.usda.gov/api-key-signup.html — or use data_source: "openfoodfacts" for the free (but less reliable) OpenFoodFacts database.',
        isError: true,
      };
    }

    // Try USDA first if enabled
    if (useUSDA && usdaKey) {
      try {
        const result = await searchUSDA(query, usdaKey, pageSize, isBarcode, ctx.signal);
        if (result) return { content: result, isError: false };
        // USDA returned no results, fall through to OFF if enabled
        if (useOFF) {
          const offResult = await searchOFF(query, pageSize, isBarcode, ctx.signal);
          if (offResult) {
            return {
              content: `(USDA returned no results for "${query}", showing OpenFoodFacts results)\n\n${offResult}`,
              isError: false,
            };
          }
        }
        return { content: `No results found for "${query}".`, isError: false };
      } catch (err) {
        // USDA errored, fall through to OFF if enabled
        if (useOFF) {
          try {
            const offResult = await searchOFF(query, pageSize, isBarcode, ctx.signal);
            if (offResult) {
              return {
                content: `(USDA lookup failed: ${String(err)}. Showing OpenFoodFacts results)\n\n${offResult}`,
                isError: false,
              };
            }
          } catch {
            // both failed
          }
        }
        return {
          content: `Nutrition lookup failed: USDA error: ${String(err)}`,
          isError: true,
        };
      }
    }

    // OFF only
    if (useOFF) {
      try {
        const offResult = await searchOFF(query, pageSize, isBarcode, ctx.signal);
        if (offResult) return { content: offResult, isError: false };
        return { content: `No results found for "${query}".`, isError: false };
      } catch (err) {
        return {
          content: `Nutrition lookup failed: ${String(err)}`,
          isError: true,
        };
      }
    }

    return { content: "No data source available.", isError: true };
}

// --- USDA FoodData Central ---

async function searchUSDA(
  query: string,
  apiKey: string,
  pageSize: number,
  isBarcode: boolean,
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    api_key: apiKey,
    pageSize: String(pageSize),
  });

  if (isBarcode) {
    // USDA doesn't have a barcode endpoint, but we can search by UPC
    params.set("query", query);
  } else {
    params.set("query", query);
  }

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?${params}`;
  const res = await fetchWithRetry(url, { "User-Agent": "VellumFitnessCompanion/0.2" }, signal);
  if (!res.ok) {
    throw new Error(`USDA returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as USDASearchResponse;
  const foods = data.foods ?? [];
  if (foods.length === 0) return null;

  const lines: string[] = [
    `Found ${data.totalHits ?? foods.length} results for "${query}" (USDA FoodData Central). Top ${foods.length}:`,
  ];
  foods.forEach((f, i) => {
    lines.push(`\n${i + 1}. ${formatUSDAFood(f)}`);
  });
  return lines.join("\n");
}

function formatUSDAFood(food: USDAFood): string {
  const parts: string[] = [food.description ?? "Unknown"];
  if (food.brandOwner) parts.push(`(${food.brandOwner})`);
  if (food.dataType) parts.push(`[${food.dataType}]`);

  const nutrients = food.foodNutrients ?? [];
  const getVal = (id: number): number | null => {
    const n = nutrients.find((x) => x.nutrientId === id);
    return n?.value != null ? Number(n.value) : null;
  };

  const cal = getVal(USDA_NUTRIENTS.ENERGY_KCAL);
  const protein = getVal(USDA_NUTRIENTS.PROTEIN);
  const fat = getVal(USDA_NUTRIENTS.FAT);
  const carbs = getVal(USDA_NUTRIENTS.CARBS);
  const sugars = getVal(USDA_NUTRIENTS.SUGARS);
  const fiber = getVal(USDA_NUTRIENTS.FIBER);
  const sodium = getVal(USDA_NUTRIENTS.SODIUM);

  if (cal != null) parts.push(`${round(cal, 0)} kcal`);
  if (protein != null) parts.push(`${round(protein, 1)}g protein`);
  if (carbs != null) parts.push(`${round(carbs, 1)}g carbs`);
  if (fat != null) parts.push(`${round(fat, 1)}g fat`);
  if (sugars != null) parts.push(`${round(sugars, 1)}g sugar`);
  if (fiber != null) parts.push(`${round(fiber, 1)}g fiber`);
  if (sodium != null) parts.push(`${round(sodium, 3)}g sodium`);

  parts.push("[per 100g]");
  return parts.join(" | ");
}

// --- OpenFoodFacts ---

async function searchOFF(
  query: string,
  pageSize: number,
  isBarcode: boolean,
  signal?: AbortSignal,
): Promise<string | null> {
  const headers = { "User-Agent": "VellumFitnessCompanion/0.2" };

  if (isBarcode) {
    const url = `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(query)}.json?fields=product_name,brands,nutriments`;
    const res = await fetchWithRetry(url, headers, signal);
    if (!res.ok) throw new Error(`OpenFoodFacts returned HTTP ${res.status}`);
    const data = (await res.json()) as OFFProductResponse;
    const found = data.status === "success" || data.status === 1;
    if (!found || !data.product) return null;
    const p = data.product;
    return formatOFFProduct(p.product_name ?? "Unknown", p.brands ?? "", p.nutriments ?? {});
  }

  const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=product_name,brands,nutriments&page_size=${pageSize}`;
  const res = await fetchWithRetry(url, headers, signal);
  if (!res.ok) throw new Error(`OpenFoodFacts returned HTTP ${res.status}`);
  const data = (await res.json()) as OFFSearchResponse;
  const products = data.products ?? [];
  if (products.length === 0) return null;

  const lines: string[] = [
    `Found ${data.count ?? products.length} results for "${query}" (OpenFoodFacts). Top ${products.length}:`,
  ];
  products.forEach((p, i) => {
    lines.push(`\n${i + 1}. ${formatOFFProduct(p.product_name ?? "Unknown", p.brands ?? "", p.nutriments ?? {})}`);
  });
  return lines.join("\n");
}

function formatOFFProduct(
  name: string,
  brands: string,
  n: Record<string, number>,
): string {
  const parts: string[] = [name];
  if (brands) parts.push(`(${brands})`);

  const cal = n["energy-kcal_100g"] ?? n["energy-kcal"] ?? n["energy_100g"];
  if (cal != null) parts.push(`${round(Number(cal), 0)} kcal`);
  if (n["proteins_100g"] != null) parts.push(`${round(Number(n["proteins_100g"]), 1)}g protein`);
  if (n["carbohydrates_100g"] != null) parts.push(`${round(Number(n["carbohydrates_100g"]), 1)}g carbs`);
  if (n["fat_100g"] != null) parts.push(`${round(Number(n["fat_100g"]), 1)}g fat`);
  if (n["sugars_100g"] != null) parts.push(`${round(Number(n["sugars_100g"]), 1)}g sugar`);
  if (n["fiber_100g"] != null) parts.push(`${round(Number(n["fiber_100g"]), 1)}g fiber`);
  if (n["sodium_100g"] != null) parts.push(`${round(Number(n["sodium_100g"]), 3)}g sodium`);

  parts.push("[per 100g]");
  return parts.join(" | ");
}

// --- Shared ---

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
  maxRetries = 2,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new Error("Request aborted");
    const res = await fetch(url, { signal, headers });
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    return res;
  }
  return new Response(null, { status: 503 });
}
