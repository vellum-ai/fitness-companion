// tools/fitness_log_meal.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { appendCsv, todayISO, nowISO } from "../src/storage.ts";

export default {
  description:
    "Log a meal entry with calories and macronutrients. Use when the user tells you what they ate, mentions a meal, or wants to track food intake. Meal type should be breakfast, lunch, dinner, or snack.",
  defaultRiskLevel: "low" as const,
  input_schema: {
    type: "object",
    properties: {
      meal_type: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "snack"],
        description: "Which meal this entry is for.",
      },
      food_name: {
        type: "string",
        description: "Name of the food or dish.",
      },
      calories: {
        type: "number",
        description: "Calories in this entry.",
      },
      protein_g: {
        type: "number",
        description: "Protein in grams.",
      },
      carbs_g: {
        type: "number",
        description: "Carbohydrates in grams.",
      },
      fat_g: {
        type: "number",
        description: "Fat in grams.",
      },
      servings: {
        type: "number",
        description: "Number of servings. Defaults to 1.",
      },
      notes: {
        type: "string",
        description: "Optional notes about the meal.",
      },
    },
    required: ["meal_type", "food_name", "calories"],
  },
  async execute(
    input: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    const mealType = String(input.meal_type ?? "").trim();
    const foodName = String(input.food_name ?? "").trim();
    const calories = Number(input.calories) || 0;
    const protein = Number(input.protein_g) || 0;
    const carbs = Number(input.carbs_g) || 0;
    const fat = Number(input.fat_g) || 0;
    const servings = Number(input.servings) || 1;
    const notes = String(input.notes ?? "").trim();

    if (!mealType || !foodName) {
      return {
        content: "Error: meal_type and food_name are required.",
        isError: true,
      };
    }

    appendCsv("meals.csv", [
      todayISO(),
      nowISO(),
      mealType,
      foodName,
      calories,
      protein,
      carbs,
      fat,
      servings,
      notes,
    ]);

    return {
      content: `Logged ${mealType}: ${foodName} (${calories} kcal, ${protein}g protein, ${carbs}g carbs, ${fat}g fat)`,
      isError: false,
    };
  },
};
