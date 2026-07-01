// tools/fitness_log_workout.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { appendCsv, todayISO, nowISO } from "../../../src/storage.ts";

export async function run(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolExecutionResult> {
    const workoutType = String(input.workout_type ?? "").trim();
    const exercise = String(input.exercise ?? "").trim();
    const sets = Number(input.sets) || 0;
    const reps = Number(input.reps) || 0;
    const weight = Number(input.weight_kg) || 0;
    const duration = Number(input.duration_min) || 0;
    const intensity = String(input.intensity ?? "").trim();
    const notes = String(input.notes ?? "").trim();

    if (!workoutType || !exercise) {
      return {
        content: "Error: workout_type and exercise are required.",
        isError: true,
      };
    }

    appendCsv("workouts.csv", [
      todayISO(),
      nowISO(),
      workoutType,
      exercise,
      sets,
      reps,
      weight,
      duration,
      intensity,
      notes,
    ]);

    const parts: string[] = [workoutType, exercise];
    if (sets && reps) parts.push(`${sets}x${reps}`);
    if (weight) parts.push(`@${weight}kg`);
    if (duration) parts.push(`${duration}min`);
    if (intensity) parts.push(intensity);

    return {
      content: `Logged workout: ${parts.join(" ")}`,
      isError: false,
    };
}
