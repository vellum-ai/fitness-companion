// tools/fitness_log_weight.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { appendCsv, todayISO, readCsv, round } from "../src/storage.ts";

export default {
  description:
    "Log a body weight entry, optionally with body fat percentage. Use when the user shares their weight, steps on a scale, or mentions a weigh-in.",
  defaultRiskLevel: "low" as const,
  input_schema: {
    type: "object",
    properties: {
      weight_kg: {
        type: "number",
        description: "Body weight in kilograms.",
      },
      body_fat_pct: {
        type: "number",
        description: "Body fat percentage, if known.",
      },
      notes: {
        type: "string",
        description: "Optional notes (e.g. morning weigh-in, post-workout).",
      },
    },
    required: ["weight_kg"],
  },
  async execute(
    input: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    const weight = Number(input.weight_kg) || 0;
    const bodyFat = input.body_fat_pct != null ? Number(input.body_fat_pct) || 0 : 0;
    const notes = String(input.notes ?? "").trim();

    if (weight <= 0) {
      return {
        content: "Error: weight_kg must be a positive number.",
        isError: true,
      };
    }

    appendCsv("weight.csv", [
      todayISO(),
      weight,
      bodyFat || "",
      notes,
    ]);

    // compute delta from last entry
    const entries = readCsv("weight.csv");
    let deltaMsg = "";
    if (entries.length >= 2) {
      const prev = Number(entries[entries.length - 2].weight_kg) || 0;
      if (prev > 0) {
        const delta = round(weight - prev, 1);
        deltaMsg = ` (${delta >= 0 ? "+" : ""}${delta} kg from last entry)`;
      }
    }

    return {
      content: `Logged weight: ${weight} kg${deltaMsg}`,
      isError: false,
    };
  },
};
