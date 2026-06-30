// hooks/init.ts
import type { InitContext } from "@vellumai/plugin-api";
import { setDataDir, setConfig, ensureCsv } from "../src/storage.ts";

export default async function init(ctx: InitContext): Promise<void> {
  setDataDir(ctx.pluginStorageDir);
  setConfig(ctx.config);

  ensureCsv("meals.csv", [
    "date",
    "timestamp",
    "meal_type",
    "food_name",
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "servings",
    "notes",
  ]);

  ensureCsv("workouts.csv", [
    "date",
    "timestamp",
    "workout_type",
    "exercise",
    "sets",
    "reps",
    "weight_kg",
    "duration_min",
    "intensity",
    "notes",
  ]);

  ensureCsv("weight.csv", ["date", "weight_kg", "body_fat_pct", "notes"]);

  ctx.logger?.info?.("fitness-companion: initialized");
}
