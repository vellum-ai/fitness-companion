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

## How to Use

You do not need to memorize tool names or commands. Just talk to your assistant naturally and it will use the right tool automatically.

### Logging meals

Tell your assistant what you ate. It will look up the nutrition and log it.

```
"I had a chicken salad bowl for lunch"
"I just ate 200g of Greek yogurt with honey"
"log a snack: two hard-boiled eggs and an apple"
```

If you know the macros already, include them:

```
"log dinner: 600 calories, 45g protein, 50g carbs, 20g fat"
```

### Logging workouts

Describe your workout after you finish it:

```
"I did 3x10 squats at 60kg, 3x10 bench at 50kg"
"just went for a 30-minute run, moderate intensity"
"log my workout: 5x5 deadlifts at 100kg"
```

### Logging weight

Share your weigh-in whenever you step on the scale:

```
"weighed in at 74.5 kg this morning"
"I'm 82kg now"
"log weight: 76.2 kg, 22% body fat"
```

### Looking up nutrition

Ask about any food and the assistant will search OpenFoodFacts:

```
"how many calories in a banana?"
"look up the macros for Chobani Greek yogurt"
"what's the nutrition on a Costco rotisserie chicken?"
```

You can also give a barcode:

```
"look up barcode 3017620422003"
```

### Calculating macro targets

If you have not set up your config yet, ask the assistant to calculate targets:

```
"calculate my macros: 30 years old, female, 168cm, 75kg, moderate activity, goal is to cut"
"what should my calories be for a bulk at 80kg?"
```

The assistant will give you daily calorie and macro targets. Copy them into `config.json` or ask the assistant to update it for you.

### Checking progress

Ask for a summary anytime:

```
"how am I doing this week?"
"give me my progress for the last 30 days"
"what's my workout streak?"
"how much weight have I lost?"
```

### Getting coaching advice

The assistant loads the right coaching skill based on what you need:

```
"what should I eat to hit my protein goal?"
"can you build me a beginner workout routine?"
"I keep skipping workouts, help me stay consistent"
"I'm always hungry in the afternoons, any ideas?"
```

### Daily context

Every time you talk to your assistant, it already knows your fitness state for the day: how many calories you have eaten, how much protein, whether you worked out, and your latest weight. You do not need to call any tool or check anything manually. Just ask questions and the assistant will factor in your current progress automatically.

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
