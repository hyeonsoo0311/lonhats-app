# Data Model Draft

## Core Tables

- `profiles`: user goal, physical stats, and preference settings.
- `exercise_library`: reusable exercise movement guide.
- `workout_sessions`: one workout day.
- `workout_sets`: exercise records inside a workout.
- `meals`: meal-level record.
- `meal_items`: food-level calories and macro record.
- `journal_entries`: mood, one-line diary, and small win.
- `weekly_reviews`: generated weekly summaries and recommendations.

## Ownership

Every user-owned table should include `user_id uuid references auth.users(id)` and Row Level Security policies that only allow the owner to read or write their records.
