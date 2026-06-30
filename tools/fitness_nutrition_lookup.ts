// tools/fitness_nutrition_lookup.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { round } from "../src/storage.ts";

interface OFFSearchResponse {
  count?: number;
  products?: Array<{
    product_name?: string;
    brands?: string;
    nutriments?: Record<string, number>;
    image_url?: string;
  }>;
}

interface OFFProductResponse {
  status?: number | string;
  product?: {
    product_name?: string;
    brands?: string;
    nutriments?: Record<string, number>;
    image_url?: string;
  };
}

export default {
  description:
    "Look up nutrition information for a food item using the OpenFoodFacts database. Use when the user asks about calories, macros, or nutrition for a specific food, or wants to find a product by barcode. Free API, no key required.",
  defaultRiskLevel: "low" as const,
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Food name to search for, or a barcode number.",
      },
      page_size: {
        type: "number",
        description: "Max results to return. Defaults to 5.",
      },
    },
    required: ["query"],
  },
  async execute(
    input: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    const query = String(input.query ?? "").trim();
    const pageSize = Math.min(Number(input.page_size) || 5, 20);

    if (!query) {
      return {
        content: "Error: query is required.",
        isError: true,
      };
    }

    // If the query is purely numeric and 8-14 digits, treat as barcode
    const isBarcode = /^\d{8,14}$/.test(query);

    const headers = { "User-Agent": "VellumFitnessCompanion/0.1" };

    try {
      if (isBarcode) {
        const url = `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(query)}.json?fields=product_name,brands,nutriments,image_url`;
        const res = await fetchWithRetry(url, headers, ctx.signal);
        if (!res.ok) {
          return {
            content: `OpenFoodFacts returned HTTP ${res.status} for barcode ${query}.`,
            isError: true,
          };
        }
        const data = (await res.json()) as OFFProductResponse;
        // v3 returns status: "success", v2 returns status: 1
        const found = data.status === "success" || data.status === 1;
        if (!found || !data.product) {
          return {
            content: `No product found for barcode ${query}.`,
            isError: false,
          };
        }
        const p = data.product;
        const n = p.nutriments ?? {};
        const result = formatProduct(p.product_name ?? "Unknown", p.brands ?? "", n);
        return { content: result, isError: false };
      }

      // Text search via v2 API (the /cgi/search.pl endpoint is frequently 503)
      const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=product_name,brands,nutriments,image_url&page_size=${pageSize}`;
      const res = await fetchWithRetry(url, headers, ctx.signal);
      if (!res.ok) {
        return {
          content: `OpenFoodFacts search returned HTTP ${res.status}. The service may be temporarily unavailable. Try again in a moment.`,
          isError: true,
        };
      }
      const data = (await res.json()) as OFFSearchResponse;
      const products = data.products ?? [];
      if (products.length === 0) {
        return {
          content: `No results found for "${query}".`,
          isError: false,
        };
      }

      const lines: string[] = [`Found ${data.count ?? products.length} products for "${query}". Top ${products.length}:`];
      products.forEach((p, i) => {
        lines.push(`\n${i + 1}. ${formatProduct(p.product_name ?? "Unknown", p.brands ?? "", p.nutriments ?? {})}`);
      });

      return { content: lines.join("\n"), isError: false };
    } catch (err) {
      return {
        content: `Nutrition lookup failed: ${String(err)}`,
        isError: true,
      };
    }
  },
};

function formatProduct(
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

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
  maxRetries = 2,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new Error("Request aborted");
    const res = await fetch(url, { signal, headers });
    // Retry on 503 (service overloaded) and 429 (rate limited)
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    return res;
  }
  // unreachable but satisfies the type checker
  return new Response(null, { status: 503 });
}
