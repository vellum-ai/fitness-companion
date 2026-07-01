// tools/fitness_log_meal.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { appendCsv, todayISO, nowISO } from "../../../src/storage.ts";

export async function run(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolExecutionResult> {
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
}
