// tools/fitness_log_workout.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";
import { appendCsv, todayISO, nowISO } from "../src/storage.ts";

export default {
  description:
    "Log a workout entry with exercise details. Use when the user tells you about a workout, exercise session, or physical activity they completed.",
  defaultRiskLevel: "low" as const,
  input_schema: {
    type: "object",
    properties: {
      workout_type: {
        type: "string",
        description: "Type of workout (e.g. strength, cardio, yoga, cycling, swimming).",
      },
      exercise: {
        type: "string",
        description: "Name of the exercise or activity.",
      },
      sets: {
        type: "number",
        description: "Number of sets performed.",
      },
      reps: {
        type: "number",
        description: "Reps per set (or total reps for bodyweight).",
      },
      weight_kg: {
        type: "number",
        description: "Weight used in kilograms, if applicable.",
      },
      duration_min: {
        type: "number",
        description: "Duration in minutes, for cardio or time-based activities.",
      },
      intensity: {
        type: "string",
        enum: ["easy", "moderate", "hard", "max"],
        description: "Perceived intensity level.",
      },
      notes: {
        type: "string",
        description: "Optional notes about the workout.",
      },
    },
    required: ["workout_type", "exercise"],
  },
  async execute(
    input: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
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
  },
};
