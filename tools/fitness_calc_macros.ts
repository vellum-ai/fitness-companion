// tools/fitness_calc_macros.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { round, getConfig } from "../src/storage.ts";

export default {
  description:
    "Calculate daily calorie and macronutrient targets from body stats and fitness goal. Uses the Mifflin-St Jeor equation for BMR and activity multipliers for TDEE. Use when the user asks for macro targets, calorie goals, or wants to plan their nutrition.",
  defaultRiskLevel: "low" as const,
  input_schema: {
    type: "object",
    properties: {
      age: {
        type: "number",
        description: "Age in years.",
      },
      sex: {
        type: "string",
        enum: ["male", "female"],
        description: "Biological sex (affects BMR calculation).",
      },
      height_cm: {
        type: "number",
        description: "Height in centimeters.",
      },
      weight_kg: {
        type: "number",
        description: "Body weight in kilograms.",
      },
      activity_level: {
        type: "string",
        enum: ["sedentary", "light", "moderate", "active", "very_active"],
        description: "Activity level: sedentary (little/no exercise), light (1-3 days/week), moderate (3-5 days/week), active (6-7 days/week), very_active (twice daily or physical job).",
      },
      goal: {
        type: "string",
        enum: ["cut", "maintain", "bulk"],
        description: "Fitness goal: cut (lose fat), maintain, bulk (build muscle).",
      },
      deficit_pct: {
        type: "number",
        description: "Calorie deficit/surplus percentage. Defaults to 20% for cut, 0% for maintain, 15% for bulk.",
      },
    },
    required: ["age", "sex", "height_cm", "weight_kg", "activity_level", "goal"],
  },
  async execute(
    input: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    const age = Number(input.age) || 0;
    const sex = String(input.sex ?? "").trim();
    const heightCm = Number(input.height_cm) || 0;
    const weightKg = Number(input.weight_kg) || 0;
    const activityLevel = String(input.activity_level ?? "").trim();
    const goal = String(input.goal ?? "").trim();

    if (!age || !sex || !heightCm || !weightKg || !activityLevel || !goal) {
      return {
        content: "Error: age, sex, height_cm, weight_kg, activity_level, and goal are all required.",
        isError: true,
      };
    }

    // Mifflin-St Jeor BMR
    const bmr =
      sex === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    // Activity multipliers
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = bmr * (multipliers[activityLevel] ?? 1.55);

    // Goal adjustment
    let adjustmentPct = Number(input.deficit_pct) || 0;
    if (!adjustmentPct) {
      if (goal === "cut") adjustmentPct = 20;
      else if (goal === "bulk") adjustmentPct = 15;
      else adjustmentPct = 0;
    }

    let targetCalories: number;
    if (goal === "cut") {
      targetCalories = tdee * (1 - adjustmentPct / 100);
    } else if (goal === "bulk") {
      targetCalories = tdee * (1 + adjustmentPct / 100);
    } else {
      targetCalories = tdee;
    }

    // Macro split
    // Protein: 2.0g/kg for cut, 1.8g/kg for maintain, 1.6g/kg for bulk
    const proteinPerKg = goal === "cut" ? 2.0 : goal === "bulk" ? 1.6 : 1.8;
    const proteinG = round(weightKg * proteinPerKg, 0);

    // Fat: 25% of calories
    const fatG = round((targetCalories * 0.25) / 9, 0);

    // Carbs: remaining calories
    const proteinCals = proteinG * 4;
    const fatCals = fatG * 9;
    const carbsG = round(Math.max(0, (targetCalories - proteinCals - fatCals) / 4), 0);

    const result = [
      `Macro Targets for ${goal.toUpperCase()}`,
      `BMR: ${round(bmr, 0)} kcal`,
      `TDEE (${activityLevel}): ${round(tdee, 0)} kcal`,
      `Adjustment: ${goal === "cut" ? "-" : goal === "bulk" ? "+" : ""}${adjustmentPct}%`,
      ``,
      `Daily Calories: ${round(targetCalories, 0)} kcal`,
      `Protein: ${proteinG}g (${round(proteinCals / targetCalories * 100, 0)}% of calories)`,
      `Carbs: ${carbsG}g (${round(carbsG * 4 / targetCalories * 100, 0)}% of calories)`,
      `Fat: ${fatG}g (${round(fatCals / targetCalories * 100, 0)}% of calories)`,
      ``,
      `Protein: ${proteinPerKg}g/kg bodyweight`,
    ].join("\n");

    // Return config suggestion too
    const configSuggestion = {
      daily_calories: round(targetCalories, 0),
      daily_protein_g: proteinG,
      daily_carbs_g: carbsG,
      daily_fat_g: fatG,
    };

    return {
      content: result + `\n\nUpdate config.json userProfile with: ${JSON.stringify(configSuggestion)}`,
      isError: false,
    };
  },
};
