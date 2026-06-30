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
  status?: number;
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

    try {
      if (isBarcode) {
        const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(query)}.json?fields=product_name,brands,nutriments,image_url`;
        const res = await fetch(url, {
          signal: ctx.signal,
          headers: { "User-Agent": "VellumFitnessCompanion/0.1" },
        });
        if (!res.ok) {
          return {
            content: `OpenFoodFacts returned HTTP ${res.status} for barcode ${query}.`,
            isError: true,
          };
        }
        const data = (await res.json()) as OFFProductResponse;
        if (data.status !== 1 || !data.product) {
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

      // Text search
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&fields=product_name,brands,nutriments,image_url&page_size=${pageSize}`;
      const res = await fetch(url, {
        signal: ctx.signal,
        headers: { "User-Agent": "VellumFitnessCompanion/0.1" },
      });
      if (!res.ok) {
        return {
          content: `OpenFoodFacts search returned HTTP ${res.status}.`,
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
