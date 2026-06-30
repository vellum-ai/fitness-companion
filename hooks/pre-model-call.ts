// hooks/pre-model-call.ts
import type { PreModelCallContext } from "@vellumai/plugin-api";
import { readCsv, getConfig, todayISO, round } from "../src/storage.ts";

export default async function preModelCall(
  ctx: PreModelCallContext,
): Promise<void> {
  if (ctx.callSite !== "mainAgent") return;

  const config = getConfig<any>();
  if (config?.preferences?.context_injection_enabled === false) return;

  const today = todayISO();

  const allMeals = readCsv("meals.csv");
  const allWorkouts = readCsv("workouts.csv");
  const weightEntries = readCsv("weight.csv");

  const todayMeals = allMeals.filter((r) => r.date === today);
  const todayWorkouts = allWorkouts.filter((r) => r.date === today);

  const todayCalories = todayMeals.reduce(
    (sum, m) => sum + (Number(m.calories) || 0),
    0,
  );
  const todayProtein = todayMeals.reduce(
    (sum, m) => sum + (Number(m.protein_g) || 0),
    0,
  );
  const todayCarbs = todayMeals.reduce(
    (sum, m) => sum + (Number(m.carbs_g) || 0),
    0,
  );
  const todayFat = todayMeals.reduce(
    (sum, m) => sum + (Number(m.fat_g) || 0),
    0,
  );

  const lastWorkout = allWorkouts[allWorkouts.length - 1] ?? null;
  const latestWeight = weightEntries[weightEntries.length - 1] ?? null;

  // workout streak (consecutive days with at least one workout)
  const workoutDates = [...new Set(allWorkouts.map((w) => w.date))].sort().reverse();
  let streak = 0;
  if (workoutDates.length > 0) {
    const todayDate = new Date(today);
    for (let i = 0; i < workoutDates.length; i++) {
      const wd = new Date(workoutDates[i]);
      const diffDays = Math.round(
        (todayDate.getTime() - wd.getTime()) / 86_400_000,
      );
      if (diffDays === i || diffDays === i + 1) {
        streak++;
      } else {
        break;
      }
    }
  }

  // weight trend (last 7 entries)
  const recentWeights = weightEntries.slice(-7);
  let weightTrend = "";
  if (recentWeights.length >= 2) {
    const first = Number(recentWeights[0].weight_kg) || 0;
    const last = Number(recentWeights[recentWeights.length - 1].weight_kg) || 0;
    const delta = round(last - first, 1);
    weightTrend = ` (${delta >= 0 ? "+" : ""}${delta} kg over ${recentWeights.length} entries)`;
  }

  const profile = config?.userProfile ?? {};
  const lines: string[] = [
    "\n\n[Fitness Companion Context]",
    `Date: ${today}`,
  ];

  if (profile.goal) lines.push(`Goal: ${profile.goal}`);
  if (profile.daily_calories) {
    const remaining = Number(profile.daily_calories) - todayCalories;
    lines.push(
      `Today: ${todayCalories} kcal eaten, ${remaining} kcal remaining (target ${profile.daily_calories})`,
    );
    lines.push(
      `Macros today: ${todayProtein}g protein / ${todayCarbs}g carbs / ${todayFat}g fat`,
    );
    if (profile.daily_protein_g) {
      lines.push(`Protein target: ${profile.daily_protein_g}g (${round((todayProtein / Number(profile.daily_protein_g)) * 100, 0)}% hit)`);
    }
  } else {
    lines.push(`Today: ${todayCalories} kcal, ${todayProtein}g protein (${todayMeals.length} meals logged)`);
  }

  lines.push(`Workouts today: ${todayWorkouts.length}`);
  if (lastWorkout) {
    lines.push(`Last workout: ${lastWorkout.workout_type} on ${lastWorkout.date}`);
  }
  if (streak > 0) lines.push(`Workout streak: ${streak} day(s)`);
  if (latestWeight) {
    lines.push(`Latest weight: ${latestWeight.weight_kg} kg (${latestWeight.date})${weightTrend}`);
  }
  if (profile.eating_window_start && profile.eating_window_end) {
    lines.push(`Eating window: ${profile.eating_window_start} - ${profile.eating_window_end}`);
  }

  lines.push(
    "Use this context to give fitness-aware responses. Call fitness_get_progress for detailed trends.",
  );

  ctx.systemPrompt = (ctx.systemPrompt ?? "") + lines.join("\n");
}
