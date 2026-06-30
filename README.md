# Fitness Companion

A Vellum assistant plugin that turns your assistant into a fitness and nutrition coach.

## What it does

- **Logs meals, workouts, and weight** to local CSV files that persist across sessions
- **Looks up nutrition data** from USDA FoodData Central (recommended) or OpenFoodFacts (free fallback)
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

## Nutrition Data Sources

The nutrition lookup tool supports two data sources:

### USDA FoodData Central (recommended)

Government-backed, curated, and reliable. Free API key required.

**How to get a free API key:**

1. Go to [https://fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html)
2. Fill in your name and email
3. You will receive your API key by email within a few minutes
4. Add it to your `config.json`:

```json
{
  "userProfile": {
    "usda_api_key": "YOUR_API_KEY_HERE"
  }
}
```

Once configured, the plugin uses USDA automatically as the primary data source. You get 1,000 requests per hour, which is more than enough for personal use.

### OpenFoodFacts (default, no key needed)

Free, crowd-sourced database. No API key or setup required. Works out of the box but can be unreliable (occasional 503 errors during peak times).

### How the fallback works

- If a USDA API key is configured: USDA is tried first, OpenFoodFacts is the fallback on errors or no results
- If no USDA key is set: OpenFoodFacts is used exclusively
- You can force a specific source by telling the assistant: "look this up on OpenFoodFacts" or "use USDA for this search"

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

Ask about any food and the assistant will search for nutrition data. If you have a USDA API key configured (see below), it uses USDA FoodData Central first. Otherwise it uses OpenFoodFacts:

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
| `fitness_nutrition_lookup` | Search USDA FoodData Central or OpenFoodFacts for nutrition data |
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

All data stays local on your device. No external accounts required for basic usage (OpenFoodFacts is free with no key). USDA FoodData Central requires a free API key if you want the more reliable data source. Nutrition lookups query the public USDA or OpenFoodFacts APIs.

## License

MIT
