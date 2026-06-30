# Fitness Companion

A Vellum assistant plugin that turns your assistant into a fitness and nutrition coach.

## What it does

- **Logs meals, workouts, and weight** to local CSV files that persist across sessions
- **Looks up nutrition data** from OpenFoodFacts (free, no API key required)
- **Calculates macro targets** from your body stats and goals (Mifflin-St Jeor equation)
- **Tracks progress** with trends, streaks, and weekly summaries
- **Injects daily fitness context** into every conversation so the assistant always knows your current state

## Installation

```
assistant plugins install fitness-companion
```

## Setup

After installing, edit `plugins/fitness-companion/config.json` to fill in your profile:

```json
{
  "userProfile": {
    "age": 30,
    "sex": "female",
    "height_cm": 168,
    "weight_kg": 75,
    "activity_level": "moderate",
    "goal": "cut",
    "daily_calories": 1800,
    "daily_protein_g": 140,
    "daily_carbs_g": 180,
    "daily_fat_g": 60
  }
}
```

The assistant can also calculate targets for you. Just ask: "What should my macros be for a cut?"

## Tools

| Tool | Description |
|------|-------------|
| `fitness_log_meal` | Log a meal with calories and macros |
| `fitness_log_workout` | Log a workout with exercises, sets, reps |
| `fitness_log_weight` | Log a body weight entry |
| `fitness_nutrition_lookup` | Search OpenFoodFacts for nutrition data |
| `fitness_calc_macros` | Calculate calorie and macro targets |
| `fitness_get_progress` | Get progress trends and summaries |

## Skills

- **Nutrition Coaching** — meal structuring, protein targets, hydration, micronutrients
- **Workout Planning** — routines by level, progressive overload, recovery
- **Habit Building** — sleep, steps, consistency strategies

## Data

All logs are stored as CSV in `plugins/fitness-companion/data/`:

- `meals.csv` — meal entries
- `workouts.csv` — workout entries
- `weight.csv` — weight entries

Data is preserved across plugin upgrades. Uninstalling the plugin removes all data.

## Privacy

All data stays local on your device. No external accounts required. Nutrition lookups query the public OpenFoodFacts API.

## License

MIT
