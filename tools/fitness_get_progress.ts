// tools/fitness_get_progress.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { readCsvSince, readCsv, round, getConfig, todayISO } from "../src/storage.ts";

export default {
  description:
    "Read stored fitness logs and compute progress trends. Returns calorie averages, macro breakdowns, workout counts, weight trends, and streaks for a given time window. Use when the user asks about their progress, wants a summary, or asks how they are doing.",
  defaultRiskLevel: "low" as const,
  input_schema: {
    type: "object",
    properties: {
      days: {
        type: "number",
        description: "Number of days to look back. Defaults to 7.",
      },
    },
  },
  async execute(
    input: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    const days = Math.min(Math.max(Number(input.days) || 7, 1), 365);

    const meals = readCsvSince("meals.csv", days);
    const workouts = readCsvSince("workouts.csv", days);
    const weights = readCsv("weight.csv");
    const config = getConfig<any>();
    const profile = config?.userProfile ?? {};

    const lines: string[] = [
      `Fitness Progress (last ${days} days)`,
      `Date: ${todayISO()}`,
      "",
    ];

    // Nutrition summary
    if (meals.length > 0) {
      // Group by date
      const byDate: Record<string, { cal: number; protein: number; carbs: number; fat: number; count: number }> = {};
      for (const m of meals) {
        const d = m.date;
        if (!byDate[d]) byDate[d] = { cal: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
        byDate[d].cal += Number(m.calories) || 0;
        byDate[d].protein += Number(m.protein_g) || 0;
        byDate[d].carbs += Number(m.carbs_g) || 0;
        byDate[d].fat += Number(m.fat_g) || 0;
        byDate[d].count += 1;
      }

      const dates = Object.keys(byDate).sort();
      const loggedDays = dates.length;
      const avgCal = round(dates.reduce((s, d) => s + byDate[d].cal, 0) / loggedDays, 0);
      const avgProtein = round(dates.reduce((s, d) => s + byDate[d].protein, 0) / loggedDays, 0);
      const avgCarbs = round(dates.reduce((s, d) => s + byDate[d].carbs, 0) / loggedDays, 0);
      const avgFat = round(dates.reduce((s, d) => s + byDate[d].fat, 0) / loggedDays, 0);

      lines.push("Nutrition:");
      lines.push(`  Days logged: ${loggedDays} of ${days}`);
      lines.push(`  Avg calories/day: ${avgCal} kcal${profile.daily_calories ? ` (target ${profile.daily_calories})` : ""}`);
      lines.push(`  Avg protein/day: ${avgProtein}g${profile.daily_protein_g ? ` (target ${profile.daily_protein_g}g)` : ""}`);
      lines.push(`  Avg carbs/day: ${avgCarbs}g`);
      lines.push(`  Avg fat/day: ${avgFat}g`);
      lines.push(`  Total meals logged: ${meals.length}`);

      // Recent days detail
      lines.push("");
      lines.push("  Recent days:");
      for (const d of dates.slice(-5)) {
        const e = byDate[d];
        lines.push(`    ${d}: ${round(e.cal, 0)} kcal, ${round(e.protein, 0)}g protein (${e.count} meals)`);
      }
    } else {
      lines.push("Nutrition: No meals logged in this period.");
    }

    // Workout summary
    lines.push("");
    if (workouts.length > 0) {
      const workoutDates = [...new Set(workouts.map((w) => w.date))].sort();
      const workoutTypes: Record<string, number> = {};
      for (const w of workouts) {
        const t = w.workout_type || "unknown";
        workoutTypes[t] = (workoutTypes[t] || 0) + 1;
      }

      lines.push("Workouts:");
      lines.push(`  Total sessions: ${workouts.length}`);
      lines.push(`  Active days: ${workoutDates.length} of ${days}`);
      lines.push(`  Types: ${Object.entries(workoutTypes).map(([t, c]) => `${t} (${c})`).join(", ")}`);

      // streak
      const allWorkoutDates = [...new Set(readCsv("workouts.csv").map((w) => w.date))].sort().reverse();
      let streak = 0;
      if (allWorkoutDates.length > 0) {
        const todayDate = new Date(todayISO());
        for (let i = 0; i < allWorkoutDates.length; i++) {
          const wd = new Date(allWorkoutDates[i]);
          const diffDays = Math.round((todayDate.getTime() - wd.getTime()) / 86_400_000);
          if (diffDays === i || diffDays === i + 1) {
            streak++;
          } else {
            break;
          }
        }
      }
      if (streak > 0) lines.push(`  Current streak: ${streak} day(s)`);
    } else {
      lines.push("Workouts: No workouts logged in this period.");
    }

    // Weight summary
    lines.push("");
    if (weights.length > 0) {
      const recentWeights = weights.slice(-Math.min(days, weights.length));
      const first = Number(recentWeights[0].weight_kg) || 0;
      const last = Number(recentWeights[recentWeights.length - 1].weight_kg) || 0;
      const delta = round(last - first, 1);

      lines.push("Weight:");
      lines.push(`  Latest: ${last} kg (${recentWeights[recentWeights.length - 1].date})`);
      lines.push(`  First in period: ${first} kg (${recentWeights[0].date})`);
      lines.push(`  Change: ${delta >= 0 ? "+" : ""}${delta} kg`);

      if (profile.goal && profile.weight_kg) {
        const goalWeight = Number(profile.weight_kg);
        if (goalWeight > 0) {
          const toGoal = round(goalWeight - last, 1);
          lines.push(`  Goal: ${goalWeight} kg (${toGoal >= 0 ? "+" : ""}${toGoal} kg to go)`);
        }
      }

      // Recent entries
      lines.push("");
      lines.push("  Recent weigh-ins:");
      for (const w of recentWeights.slice(-5)) {
        lines.push(`    ${w.date}: ${w.weight_kg} kg${w.body_fat_pct ? `, ${w.body_fat_pct}% BF` : ""}`);
      }
    } else {
      lines.push("Weight: No weight entries logged.");
    }

    return { content: lines.join("\n"), isError: false };
  },
};
